-- ============================================================================
-- MIGRATION K — Planos nutricionais por lote (não por categoria)
-- ============================================================================
-- Mudança de modelo: a fila de planos passa a ser do lote, não da categoria.
-- Cada categoria personaliza o plano vigente com seu próprio período e peso meta.
-- Encerrar o plano vigente encerra para o lote inteiro e avança
-- lotes.formulacao_id para o próximo plano da fila.
-- ============================================================================

-- 1. Adicionar lote_id em planos_nutricionais
ALTER TABLE public.planos_nutricionais
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes(id) ON DELETE CASCADE;

-- Tornar lote_categoria_id nullable (planos novos usam lote_id)
ALTER TABLE public.planos_nutricionais
  ALTER COLUMN lote_categoria_id DROP NOT NULL;

-- 2. Backfill: preencher lote_id a partir de lote_categoria_id
UPDATE public.planos_nutricionais pn
SET lote_id = lc.lote_id
FROM public.lote_categorias lc
WHERE pn.lote_categoria_id = lc.id
  AND pn.lote_id IS NULL;

-- 3. Criar tabela de personalização por categoria
CREATE TABLE IF NOT EXISTS public.plano_categoria_personalizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.planos_nutricionais(id) ON DELETE CASCADE,
  lote_categoria_id uuid NOT NULL REFERENCES public.lote_categorias(id) ON DELETE CASCADE,
  periodo_dias integer,
  peso_meta_kg numeric,
  data_fim_individual date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plano_id, lote_categoria_id)
);

-- RLS
ALTER TABLE public.plano_categoria_personalizacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage plano_categoria_personalizacao" ON public.plano_categoria_personalizacao
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Backfill de personalizações: para cada plano vigente ativo, criar
-- personalização para cada categoria ativa do lote com os dados do plano
INSERT INTO public.plano_categoria_personalizacao (plano_id, lote_categoria_id, periodo_dias, peso_meta_kg, ativo)
SELECT DISTINCT ON (pn.id, lc.id)
  pn.id,
  lc.id,
  pn.periodo_dias,
  pn.peso_meta_kg,
  true
FROM public.planos_nutricionais pn
JOIN public.lote_categorias lc ON lc.lote_id = pn.lote_id
WHERE pn.ativo = true
  AND pn.data_fim IS NULL
  AND lc.ativo = true
  AND lc.data_fim IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.plano_categoria_personalizacao pcp
    WHERE pcp.plano_id = pn.id AND pcp.lote_categoria_id = lc.id
  );

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_planos_nutricionais_lote_id ON public.planos_nutricionais(lote_id);
CREATE INDEX IF NOT EXISTS idx_planos_nutricionais_lote_ativo ON public.planos_nutricionais(lote_id, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_plano_categoria_personalizacao_plano ON public.plano_categoria_personalizacao(plano_id);
CREATE INDEX IF NOT EXISTS idx_plano_categoria_personalizacao_cat ON public.plano_categoria_personalizacao(lote_categoria_id);

-- ============================================================================
-- 6. Nova RPC: encerrar_plano_lote
-- Encerra o plano vigente do lote inteiro e avança lotes.formulacao_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.encerrar_plano_lote(p_lote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plano RECORD;
  v_proximo_plano RECORD;
  v_lote RECORD;
  v_fazenda_id uuid;
  v_cat RECORD;
  v_snapshot jsonb;
  v_metricas jsonb;
  v_duracao integer;
  v_ganho_peso numeric;
  v_gmd_realizado numeric;
  v_gmd_planejado numeric;
  v_prod_arroba_lote numeric;
  v_mortalidade numeric;
  v_peso_inicio numeric;
  v_rc_inicio numeric;
  v_peso_atual numeric;
  v_rc_atual numeric;
  v_quant_atual integer;
  v_quant_inicial integer;
  v_morte integer;
  v_gmd_proximo numeric;
  v_form_proximo RECORD;
BEGIN
  -- Buscar lote
  SELECT * INTO v_lote FROM public.lotes WHERE id = p_lote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote não encontrado';
  END IF;
  v_fazenda_id := v_lote.fazenda_id;

  -- Buscar plano vigente do lote
  SELECT * INTO v_plano
  FROM public.planos_nutricionais
  WHERE lote_id = p_lote_id
    AND ativo = true
    AND data_fim IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum plano vigente encontrado para este lote';
  END IF;

  -- Para cada categoria ativa do lote (exceto bezerros ao pé que não têm plano)
  FOR v_cat IN
    SELECT * FROM public.lote_categorias
    WHERE lote_id = p_lote_id
      AND ativo = true
      AND data_fim IS NULL
      AND categoria NOT ILIKE 'bezerro ao pé'
      AND categoria NOT ILIKE 'bezerro ao pe'
      AND categoria NOT ILIKE 'bezerra ao pé'
      AND categoria NOT ILIKE 'bezerra ao pe'
  LOOP
    -- Snapshot de saída
    SELECT to_jsonb(lc.*) INTO v_snapshot
    FROM public.lote_categorias lc WHERE lc.id = v_cat.id;

    SELECT
      COALESCE(lc.peso_vivo_atual_kg_cab, 0),
      COALESCE(lc.rc_final, 0),
      COALESCE(lc.quant_atual, 0),
      COALESCE(lc.quant_inicial, 0),
      COALESCE(lc.morte, 0)
    INTO v_peso_atual, v_rc_atual, v_quant_atual, v_quant_inicial, v_morte
    FROM public.lote_categorias lc WHERE lc.id = v_cat.id;

    v_peso_inicio := COALESCE(v_plano.peso_inicio_kg_cab, v_cat.peso_entrada_kg_cab, 0);
    v_rc_inicio := COALESCE(v_plano.rc_inicio, v_cat.rc_inicial, 0);
    v_duracao := COALESCE((CURRENT_DATE - v_plano.data_inicio)::integer, 0);

    SELECT f.gmd INTO v_gmd_planejado
    FROM public.formulacoes f WHERE f.id = v_plano.formulacao_id;

    v_ganho_peso := v_peso_atual - v_peso_inicio;
    IF v_ganho_peso > 0 AND v_duracao > 0 THEN
      v_gmd_realizado := v_ganho_peso / v_duracao;
    ELSE
      v_gmd_realizado := 0;
    END IF;

    IF v_quant_inicial > 0 THEN
      v_mortalidade := (v_morte::numeric / v_quant_inicial) * 100;
    ELSE
      v_mortalidade := 0;
    END IF;

    IF v_rc_atual > 0 AND v_quant_atual > 0 THEN
      v_prod_arroba_lote := ((v_peso_atual * (v_rc_atual / 100)) / 15) * v_quant_atual;
    ELSE
      v_prod_arroba_lote := 0;
    END IF;

    SELECT jsonb_build_object(
      'custo_operacional_total_cab', COALESCE(lc.custo_operacional_reais_cab_dia, 0) * v_duracao,
      'progresso_meta_percent', CASE WHEN COALESCE(v_plano.peso_meta_kg, 0) > 0 THEN (v_peso_atual / v_plano.peso_meta_kg) * 100 ELSE 0 END,
      'ganho_arroba_cab', CASE WHEN v_rc_atual > 0 AND v_rc_inicio > 0 THEN ((v_peso_atual * (v_rc_atual / 100)) / 15) - ((v_peso_inicio * (v_rc_inicio / 100)) / 15) ELSE 0 END,
      'peso_vivo_medio_lote', v_peso_atual,
      'peso_inicial_kg_cab', v_peso_inicio,
      'rc_inicio', v_rc_inicio,
      'rc_atual', v_rc_atual,
      'quant_inicial', v_quant_inicial,
      'quant_atual', v_quant_atual,
      'morte', v_morte
    ) INTO v_metricas
    FROM public.lote_categorias lc WHERE lc.id = v_cat.id;

    INSERT INTO public.planos_nutricionais_snapshots (
      plano_nutricional_id, lote_categoria_id, fazenda_id,
      snapshot, metricas_derivadas,
      duracao_dias, ganho_peso_total_kg_cab, gmd_realizado, gmd_planejado,
      producao_arroba_lote, mortalidade_percent, motivo_migracao,
      plano_anterior_id, plano_posterior_id, tipo_snapshot
    ) VALUES (
      v_plano.id, v_cat.id, v_fazenda_id,
      v_snapshot, v_metricas,
      v_duracao, v_ganho_peso, v_gmd_realizado, v_gmd_planejado,
      v_prod_arroba_lote, v_mortalidade, 'encerramento_lote',
      v_plano.id, NULL, 'saida'
    );

    -- Limpar categoria
    UPDATE public.lote_categorias
    SET formulacao_id = NULL,
        estrategia_nutricional = NULL,
        peso_vivo_meta_kg_cab = NULL,
        gmd = NULL,
        consumo_meta_porcentagem_pesovivo = NULL
    WHERE id = v_cat.id;
  END LOOP;

  -- Marcar plano como encerrado
  UPDATE public.planos_nutricionais
  SET ativo = false, data_fim = CURRENT_DATE
  WHERE id = v_plano.id;

  -- Marcar personalizações como inativas
  UPDATE public.plano_categoria_personalizacao
  SET ativo = false
  WHERE plano_id = v_plano.id;

  -- Buscar próximo plano na fila
  SELECT * INTO v_proximo_plano
  FROM public.planos_nutricionais
  WHERE lote_id = p_lote_id
    AND ordem > v_plano.ordem
    AND data_inicio IS NULL
    AND data_fim IS NULL
  ORDER BY ordem ASC
  LIMIT 1;

  IF FOUND THEN
    -- Ativar próximo plano
    UPDATE public.planos_nutricionais
    SET ativo = true, data_inicio = CURRENT_DATE, data_fim = NULL
    WHERE id = v_proximo_plano.id;

    -- Avançar lotes.formulacao_id
    UPDATE public.lotes
    SET formulacao_id = v_proximo_plano.formulacao_id
    WHERE id = p_lote_id;

    -- Buscar dados da formulação do próximo plano
    SELECT * INTO v_form_proximo
    FROM public.formulacoes WHERE id = v_proximo_plano.formulacao_id;

    -- Para cada categoria ativa, aplicar novo plano
    FOR v_cat IN
      SELECT * FROM public.lote_categorias
      WHERE lote_id = p_lote_id
        AND ativo = true
        AND data_fim IS NULL
        AND categoria NOT ILIKE 'bezerro ao pé'
        AND categoria NOT ILIKE 'bezerro ao pe'
        AND categoria NOT ILIKE 'bezerra ao pé'
        AND categoria NOT ILIKE 'bezerra ao pe'
    LOOP
      -- GMD do próximo plano
      SELECT COALESCE(v_proximo_plano.gmd_planejado, f.gmd) INTO v_gmd_proximo
      FROM public.formulacoes f WHERE f.id = v_proximo_plano.formulacao_id;

      -- Atualizar categoria com novo plano
      UPDATE public.lote_categorias
      SET formulacao_id = v_proximo_plano.formulacao_id,
          estrategia_nutricional = v_form_proximo.nome,
          peso_vivo_meta_kg_cab = v_proximo_plano.peso_meta_kg,
          gmd = v_gmd_proximo::text,
          consumo_meta_porcentagem_pesovivo = v_form_proximo.consumo_ms_percent_pv
      WHERE id = v_cat.id;

      -- Criar personalização para o novo plano
      INSERT INTO public.plano_categoria_personalizacao (plano_id, lote_categoria_id, periodo_dias, peso_meta_kg, ativo)
      VALUES (v_proximo_plano.id, v_cat.id, v_proximo_plano.periodo_dias, v_proximo_plano.peso_meta_kg, true)
      ON CONFLICT (plano_id, lote_categoria_id) DO UPDATE SET ativo = true;

      -- Snapshot de entrada
      PERFORM public.criar_snapshot_entrada(v_proximo_plano.id, v_cat.id, 'migracao_lote');
    END LOOP;
  ELSE
    -- Não há próximo plano: formulação vigente fica NULL
    UPDATE public.lotes
    SET formulacao_id = NULL
    WHERE id = p_lote_id;
  END IF;
END;
$function$;

-- ============================================================================
-- 7. Nova RPC: migrar_plano_lote (migração manual para plano específico)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.migrar_plano_lote(p_lote_id uuid, p_plano_destino_id uuid, p_motivo text DEFAULT 'manual')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plano_atual RECORD;
  v_plano_destino RECORD;
  v_lote RECORD;
  v_fazenda_id uuid;
  v_cat RECORD;
  v_gmd_proximo numeric;
  v_form_proximo RECORD;
BEGIN
  SELECT * INTO v_lote FROM public.lotes WHERE id = p_lote_id;
  v_fazenda_id := v_lote.fazenda_id;

  -- Plano vigente atual
  SELECT * INTO v_plano_atual
  FROM public.planos_nutricionais
  WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum plano vigente encontrado para este lote';
  END IF;

  -- Plano destino
  SELECT * INTO v_plano_destino
  FROM public.planos_nutricionais
  WHERE id = p_plano_destino_id AND lote_id = p_lote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano destino não encontrado para este lote';
  END IF;

  IF v_plano_destino.data_fim IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível migrar para um plano já encerrado';
  END IF;

  -- Encerrar plano atual (reusa encerrar_plano_lote)
  PERFORM public.encerrar_plano_lote(p_lote_id);

  -- Se o destino não é o próximo automático, precisamos ativá-lo manualmente
  -- encerrar_plano_lote já ativou o próximo na ordem. Se for diferente, ajustar.
  IF v_plano_destino.id != (
    SELECT id FROM public.planos_nutricionais
    WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
    LIMIT 1
  ) THEN
    -- Desativar o que foi auto-ativado
    UPDATE public.planos_nutricionais SET ativo = false, data_inicio = NULL
    WHERE lote_id = p_lote_id AND ativo = true AND id != v_plano_destino.id;

    -- Ativar o destino
    UPDATE public.planos_nutricionais
    SET ativo = true, data_inicio = CURRENT_DATE, data_fim = NULL
    WHERE id = v_plano_destino.id;

    -- Atualizar lotes.formulacao_id
    UPDATE public.lotes SET formulacao_id = v_plano_destino.formulacao_id WHERE id = p_lote_id;

    -- Reaplicar categorias
    SELECT * INTO v_form_proximo FROM public.formulacoes WHERE id = v_plano_destino.formulacao_id;
    FOR v_cat IN
      SELECT * FROM public.lote_categorias
      WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
        AND categoria NOT ILIKE 'bezerro ao pé' AND categoria NOT ILIKE 'bezerro ao pe'
        AND categoria NOT ILIKE 'bezerra ao pé' AND categoria NOT ILIKE 'bezerra ao pe'
    LOOP
      SELECT COALESCE(v_plano_destino.gmd_planejado, f.gmd) INTO v_gmd_proximo
      FROM public.formulacoes f WHERE f.id = v_plano_destino.formulacao_id;

      UPDATE public.lote_categorias
      SET formulacao_id = v_plano_destino.formulacao_id,
          estrategia_nutricional = v_form_proximo.nome,
          peso_vivo_meta_kg_cab = v_plano_destino.peso_meta_kg,
          gmd = v_gmd_proximo::text,
          consumo_meta_porcentagem_pesovivo = v_form_proximo.consumo_ms_percent_pv
      WHERE id = v_cat.id;

      INSERT INTO public.plano_categoria_personalizacao (plano_id, lote_categoria_id, periodo_dias, peso_meta_kg, ativo)
      VALUES (v_plano_destino.id, v_cat.id, v_plano_destino.periodo_dias, v_plano_destino.peso_meta_kg, true)
      ON CONFLICT (plano_id, lote_categoria_id) DO UPDATE SET ativo = true;
    END LOOP;
  END IF;
END;
$function$;

-- ============================================================================
-- 8. Nova RPC: iniciar_plano_lote (inicia o primeiro plano da fila)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.iniciar_plano_lote(p_lote_id uuid, p_plano_id uuid DEFAULT NULL)
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
BEGIN
  SELECT * INTO v_lote FROM public.lotes WHERE id = p_lote_id;
  v_fazenda_id := v_lote.fazenda_id;

  -- Se p_plano_id for NULL, pegar o primeiro da fila
  IF p_plano_id IS NULL THEN
    SELECT * INTO v_plano
    FROM public.planos_nutricionais
    WHERE lote_id = p_lote_id AND data_fim IS NULL AND data_inicio IS NULL
    ORDER BY ordem ASC LIMIT 1;
  ELSE
    SELECT * INTO v_plano
    FROM public.planos_nutricionais
    WHERE id = p_plano_id AND lote_id = p_lote_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum plano disponível para iniciar';
  END IF;

  -- Ativar plano
  UPDATE public.planos_nutricionais
  SET ativo = true, data_inicio = CURRENT_DATE, data_fim = NULL
  WHERE id = v_plano.id;

  -- Atualizar lotes.formulacao_id
  UPDATE public.lotes SET formulacao_id = v_plano.formulacao_id WHERE id = p_lote_id;

  -- Buscar formulação
  SELECT * INTO v_form FROM public.formulacoes WHERE id = v_plano.formulacao_id;

  -- Aplicar a cada categoria ativa
  FOR v_cat IN
    SELECT * FROM public.lote_categorias
    WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
      AND categoria NOT ILIKE 'bezerro ao pé' AND categoria NOT ILIKE 'bezerro ao pe'
      AND categoria NOT ILIKE 'bezerra ao pé' AND categoria NOT ILIKE 'bezerra ao pe'
  LOOP
    SELECT COALESCE(v_plano.gmd_planejado, f.gmd) INTO v_gmd
    FROM public.formulacoes f WHERE f.id = v_plano.formulacao_id;

    UPDATE public.lote_categorias
    SET formulacao_id = v_plano.formulacao_id,
        estrategia_nutricional = v_form.nome,
        peso_vivo_meta_kg_cab = v_plano.peso_meta_kg,
        gmd = v_gmd::text,
        consumo_meta_porcentagem_pesovivo = v_form.consumo_ms_percent_pv
    WHERE id = v_cat.id;

    INSERT INTO public.plano_categoria_personalizacao (plano_id, lote_categoria_id, periodo_dias, peso_meta_kg, ativo)
    VALUES (v_plano.id, v_cat.id, v_plano.periodo_dias, v_plano.peso_meta_kg, true)
    ON CONFLICT (plano_id, lote_categoria_id) DO UPDATE SET ativo = true;

    PERFORM public.criar_snapshot_entrada(v_plano.id, v_cat.id, 'inicio_lote');
  END LOOP;
END;
$function$;
