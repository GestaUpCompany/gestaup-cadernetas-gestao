-- ============================================================================
-- MIGRATION Z6 — iniciar_plano_lote com modo retroativo
-- ============================================================================
-- Objetivo: restaurar a funcionalidade de iniciar plano retroativamente,
-- agora na arquitetura de plano por lote.
--
-- Quando p_retroativo = true:
--   - Para cada categoria, usa data_pesagem da propria categoria como base
--   - peso_inicio_kg_cab = peso_entrada_kg_cab por categoria
--   - peso_vivo_atual_kg_cab projetado imediatamente:
--       peso_entrada + gmd × (CURRENT_DATE - data_pesagem)
--   - data_inicio do plano = data_pesagem mais antiga entre as categorias
--   - data_ajuste_peso = NULL (cron evolui a partir de peso_inicio_cat)
--   - snapshot com motivo 'inicio_lote_retroativo'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.iniciar_plano_lote(
  p_lote_id uuid,
  p_plano_id uuid DEFAULT NULL::uuid,
  p_retroativo boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plano RECORD;
  v_lote RECORD;
  v_fazenda_id uuid;
  v_cat RECORD;
  v_gmd numeric;
  v_form RECORD;
  v_data_inicio_plano date;
  v_peso_inicio numeric;
  v_peso_projetado numeric;
  v_dias integer;
  v_data_cat date;
BEGIN
  SELECT * INTO v_lote FROM public.lotes WHERE id = p_lote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote nao encontrado'; END IF;
  v_fazenda_id := v_lote.fazenda_id;

  IF p_plano_id IS NULL THEN
    SELECT * INTO v_plano FROM public.planos_nutricionais
      WHERE lote_id = p_lote_id AND data_fim IS NULL AND data_inicio IS NULL
      ORDER BY ordem ASC LIMIT 1;
  ELSE
    SELECT * INTO v_plano FROM public.planos_nutricionais
      WHERE id = p_plano_id AND lote_id = p_lote_id;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum plano disponivel para iniciar'; END IF;

  -- Determinar data de inicio do plano
  IF p_retroativo THEN
    -- Data_pesagem mais antiga entre as categorias ativas
    SELECT MIN(data_pesagem) INTO v_data_inicio_plano
    FROM public.lote_categorias
    WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
      AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerro ao pe'
      AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerra ao pe'
      AND data_pesagem IS NOT NULL;
    -- Se nao houver data_pesagem em nenhuma categoria, fallback para hoje
    v_data_inicio_plano := COALESCE(v_data_inicio_plano, CURRENT_DATE);
  ELSE
    v_data_inicio_plano := CURRENT_DATE;
  END IF;

  -- Atualizar plano
  UPDATE public.planos_nutricionais
  SET ativo = true, data_inicio = v_data_inicio_plano, data_fim = NULL
  WHERE id = v_plano.id;

  -- Atualizar formulacao vigente do lote
  UPDATE public.lotes SET formulacao_id = v_plano.formulacao_id WHERE id = p_lote_id;
  SELECT * INTO v_form FROM public.formulacoes WHERE id = v_plano.formulacao_id;

  -- Iterar sobre categorias ativas (exceto bezerro/bezerra ao pe)
  FOR v_cat IN SELECT * FROM public.lote_categorias
    WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
      AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerro ao pe'
      AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerra ao pe'
  LOOP
    -- GMD da categoria na formulacao
    SELECT fcg.gmd INTO v_gmd FROM public.formulacao_categorias_gmd fcg
    WHERE fcg.formulacao_id = v_plano.formulacao_id
      AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(v_cat.categoria));
    IF NOT FOUND THEN v_gmd := NULL; END IF;

    -- Determinar peso inicial e peso projetado
    IF p_retroativo THEN
      -- Modo retroativo: cada categoria usa sua propria data_pesagem
      v_data_cat := v_cat.data_pesagem;
      v_peso_inicio := v_cat.peso_entrada_kg_cab;
      IF v_gmd IS NOT NULL AND v_peso_inicio IS NOT NULL AND v_data_cat IS NOT NULL THEN
        -- Tem dados retroativos: projeta peso desde data_pesagem
        v_dias := GREATEST((CURRENT_DATE - v_data_cat)::integer, 0);
        v_peso_projetado := v_peso_inicio + (v_gmd * v_dias);
      ELSE
        -- Sem dados retroativos: mantem peso atual e evolui só a partir de hoje
        -- data_ajuste_peso = CURRENT_DATE faz o cron usar o ramo de evolução desde
        -- hoje, não desde o data_inicio retroativo do plano
        v_peso_projetado := v_cat.peso_vivo_atual_kg_cab;
        v_peso_inicio := v_cat.peso_vivo_atual_kg_cab;
      END IF;
    ELSE
      -- Modo normal: peso_inicio = peso atual, sem projecao imediata
      v_peso_inicio := v_cat.peso_vivo_atual_kg_cab;
      v_peso_projetado := v_cat.peso_vivo_atual_kg_cab;
    END IF;

    -- Determinar data_ajuste_peso:
    -- - Retroativo com dados: NULL (cron evolui desde peso_inicio_cat + data_inicio)
    -- - Retroativo sem dados: CURRENT_DATE (cron evolui desde hoje, não retroativo)
    -- - Normal: NULL (cron evolui desde hoje, data_inicio = hoje)

    -- Atualizar categoria
    UPDATE public.lote_categorias
    SET formulacao_id = v_plano.formulacao_id,
        estrategia_nutricional = v_form.nome,
        peso_vivo_meta_kg_cab = v_plano.peso_meta_kg,
        gmd = CASE WHEN v_gmd IS NOT NULL THEN v_gmd::text ELSE NULL END,
        consumo_meta_porcentagem_pesovivo = v_form.consumo_ms_percent_pv,
        peso_vivo_atual_kg_cab = v_peso_projetado,
        data_ajuste_peso = CASE
          WHEN p_retroativo AND (v_cat.data_pesagem IS NULL OR v_cat.peso_entrada_kg_cab IS NULL OR v_gmd IS NULL) THEN CURRENT_DATE
          ELSE NULL
        END,
        data_notificacao_meta = NULL,
        data_notificacao_periodo = NULL
    WHERE id = v_cat.id;

    -- Personalizacao com peso_inicio por categoria
    INSERT INTO public.plano_categoria_personalizacao
      (plano_id, lote_categoria_id, periodo_dias, peso_meta_kg, peso_inicio_kg_cab, ativo)
    VALUES (v_plano.id, v_cat.id, v_plano.periodo_dias, v_plano.peso_meta_kg, v_peso_inicio, true)
    ON CONFLICT (plano_id, lote_categoria_id) DO UPDATE
    SET ativo = true,
        peso_inicio_kg_cab = EXCLUDED.peso_inicio_kg_cab,
        periodo_dias = EXCLUDED.periodo_dias,
        peso_meta_kg = EXCLUDED.peso_meta_kg;

    -- Snapshot de entrada
    PERFORM public.criar_snapshot_entrada(
      v_plano.id,
      v_cat.id,
      CASE WHEN p_retroativo THEN 'inicio_lote_retroativo' ELSE 'inicio_lote' END
    );
  END LOOP;
END;
$function$;
