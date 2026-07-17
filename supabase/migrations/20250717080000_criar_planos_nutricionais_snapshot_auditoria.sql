-- ============================================================================
-- Migração: Planos Nutricionais por Categoria de Lote
-- - Adiciona categoria em formulacoes
-- - Cria tabelas planos_nutricionais e planos_nutricionais_snapshots
-- - Migra dados existentes de lote_categorias para planos_nutricionais
-- - Atualiza cron e triggers para ler GMD do plano vigente
-- - Cria função migrar_plano_nutricional()
-- - Configura RLS nas novas tabelas
-- ============================================================================

-- 1. Adicionar categoria em formulacoes
ALTER TABLE public.formulacoes
ADD COLUMN IF NOT EXISTS categoria text;

COMMENT ON COLUMN public.formulacoes.categoria IS 'Categoria do gado (vaca, touro, boi gordo, boi magro, garrote, bezerro, bezerro ao pé, bezerra, bezerra ao pé, novilha, tropa)';

-- 2. Criar tabela de planos nutricionais
CREATE TABLE IF NOT EXISTS public.planos_nutricionais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_categoria_id uuid NOT NULL REFERENCES public.lote_categorias(id) ON DELETE CASCADE,
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id),
  nome text NOT NULL,
  formulacao_id uuid NOT NULL REFERENCES public.formulacoes(id),
  periodo_dias integer NOT NULL,
  peso_meta_kg numeric(10,2) NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean DEFAULT false,
  data_inicio date,
  data_fim date,
  condicao_migracao text DEFAULT 'periodo' CHECK (condicao_migracao IN ('periodo', 'peso', 'ambos')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_nutricionais_lote_categoria_ativo
  ON public.planos_nutricionais(lote_categoria_id, ativo);

CREATE INDEX IF NOT EXISTS idx_planos_nutricionais_fazenda
  ON public.planos_nutricionais(fazenda_id);

-- 3. Criar tabela de snapshots de auditoria
CREATE TABLE IF NOT EXISTS public.planos_nutricionais_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_nutricional_id uuid NOT NULL REFERENCES public.planos_nutricionais(id) ON DELETE CASCADE,
  lote_categoria_id uuid NOT NULL REFERENCES public.lote_categorias(id),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id),
  snapshot jsonb NOT NULL,
  metricas_derivadas jsonb,
  duracao_dias integer,
  ganho_peso_total_kg_cab numeric(10,2),
  gmd_realizado numeric(10,3),
  gmd_planejado numeric(10,3),
  producao_arroba_lote numeric(12,2),
  mortalidade_percent numeric(5,2),
  motivo_migracao text,
  plano_anterior_id uuid REFERENCES public.planos_nutricionais(id),
  plano_posterior_id uuid REFERENCES public.planos_nutricionais(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_snapshots_lote_categoria
  ON public.planos_nutricionais_snapshots(lote_categoria_id);

CREATE INDEX IF NOT EXISTS idx_planos_snapshots_fazenda
  ON public.planos_nutricionais_snapshots(fazenda_id);

-- Trigger updated_at para planos_nutricionais
CREATE OR REPLACE FUNCTION public.handle_updated_at_planos_nutricionais()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_nutricionais_updated_at ON public.planos_nutricionais;
CREATE TRIGGER trg_planos_nutricionais_updated_at
BEFORE UPDATE ON public.planos_nutricionais
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_planos_nutricionais();

-- 4. Migrar lote_categorias existentes para planos_nutricionais
INSERT INTO public.planos_nutricionais (
  lote_categoria_id,
  fazenda_id,
  nome,
  formulacao_id,
  periodo_dias,
  peso_meta_kg,
  ordem,
  ativo,
  data_inicio,
  condicao_migracao
)
SELECT
  lc.id,
  l.fazenda_id,
  COALESCE(f.nome, 'Plano Inicial'),
  lc.formulacao_id,
  COALESCE(lc.periodo, 90),
  COALESCE(lc.peso_vivo_meta_kg_cab, 0),
  0,
  true,
  lc.data_pesagem,
  'periodo'
FROM public.lote_categorias lc
JOIN public.lotes l ON l.id = lc.lote_id
LEFT JOIN public.formulacoes f ON f.id = lc.formulacao_id
WHERE lc.formulacao_id IS NOT NULL
  AND lc.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.planos_nutricionais pn
    WHERE pn.lote_categoria_id = lc.id
  );

INSERT INTO public.planos_nutricionais (
  lote_categoria_id,
  fazenda_id,
  nome,
  formulacao_id,
  periodo_dias,
  peso_meta_kg,
  ordem,
  ativo,
  data_inicio,
  condicao_migracao
)
SELECT
  lc.id,
  l.fazenda_id,
  COALESCE(lc.estrategia_nutricional, 'Plano Inicial'),
  f.id,
  COALESCE(lc.periodo, 90),
  COALESCE(lc.peso_vivo_meta_kg_cab, 0),
  0,
  true,
  lc.data_pesagem,
  'periodo'
FROM public.lote_categorias lc
JOIN public.lotes l ON l.id = lc.lote_id
JOIN public.formulacoes f ON LOWER(TRIM(f.nome)) = LOWER(TRIM(lc.estrategia_nutricional))
WHERE lc.formulacao_id IS NULL
  AND lc.estrategia_nutricional IS NOT NULL
  AND lc.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.planos_nutricionais pn
    WHERE pn.lote_categoria_id = lc.id
  );

-- 5. Atualizar update_dados_lotes() para ler GMD do plano vigente via formulação
CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  calc_peso_entrada_arrobas NUMERIC;
  calc_quant_atual INTEGER;
  gmd_value NUMERIC;
BEGIN
  FOR categoria_record IN
    SELECT lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
           f.gmd AS formulacao_gmd,
           lc.data_pesagem, lc.data_meta_projetada, lc.rc_inicial
    FROM lote_categorias lc
    LEFT JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
    LEFT JOIN formulacoes f ON f.id = pn.formulacao_id
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.data_pesagem IS NOT NULL
      AND lc.ativo = true
      AND f.gmd IS NOT NULL
  LOOP
    gmd_value := categoria_record.formulacao_gmd;
    IF gmd_value IS NULL THEN
      CONTINUE;
    END IF;

    days_diff := (CURRENT_DATE - categoria_record.data_pesagem)::INTEGER;
    new_peso_vivo := categoria_record.peso_entrada_kg_cab + (gmd_value * days_diff);

    IF categoria_record.data_meta_projetada IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta_projetada - categoria_record.data_pesagem)::INTEGER;
      dias_restantes := dias_para_meta - days_diff;
    ELSE
      dias_restantes := NULL;
    END IF;

    IF categoria_record.rc_inicial IS NOT NULL THEN
      calc_peso_entrada_arrobas := (categoria_record.peso_entrada_kg_cab * (categoria_record.rc_inicial / 100)) / 15;
    ELSE
      calc_peso_entrada_arrobas := NULL;
    END IF;

    calc_quant_atual := calculate_quant_atual(categoria_record.lote_id, categoria_record.categoria);

    UPDATE lote_categorias
    SET periodo = days_diff,
        dias_restantes_meta = dias_restantes,
        peso_entrada_arrobas = calc_peso_entrada_arrobas,
        quant_atual = calc_quant_atual,
        peso_vivo_atual_kg_cab = new_peso_vivo,
        gmd = gmd_value::text
    WHERE id = categoria_record.id;
  END LOOP;
END;
$function$;

-- 6. Atualizar trigger de estratégia nutricional do individuo para ler do plano vigente
CREATE OR REPLACE FUNCTION public.atualizar_estrategia_nutricional_individuo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.lote_atual IS NULL OR NEW.categoria IS NULL THEN
    NEW.estrategia_nutricional_id := NULL;
    NEW.estrategia_nutricional_nome := NULL;
    NEW.estrategia_nutricional_tipo := NULL;
    NEW.gmd_kg_cab_dia := NULL;
    NEW.peso_meta_kg := NULL;
    RETURN NEW;
  END IF;

  SELECT
    f.id,
    f.nome,
    f.tipo,
    f.gmd,
    pn.peso_meta_kg
  INTO
    NEW.estrategia_nutricional_id,
    NEW.estrategia_nutricional_nome,
    NEW.estrategia_nutricional_tipo,
    NEW.gmd_kg_cab_dia,
    NEW.peso_meta_kg
  FROM public.lote_categorias lc
  JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
  JOIN public.formulacoes f ON f.id = pn.formulacao_id
  WHERE lc.lote_id = NEW.lote_atual
    AND LOWER(lc.categoria) = LOWER(NEW.categoria)
    AND (lc.ativo IS NULL OR lc.ativo = true)
  LIMIT 1;

  RETURN NEW;
END;
$function$;

-- 7. Atualizar trigger de propagação para ler do plano vigente
CREATE OR REPLACE FUNCTION public.propagar_estrategia_nutricional_para_individuos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote_id uuid;
  v_categoria text;
  v_formulacao_id uuid;
  v_gmd numeric;
  v_nome text;
  v_tipo text;
  v_peso_meta numeric;
BEGIN
  SELECT lc.lote_id, lc.categoria INTO v_lote_id, v_categoria
  FROM lote_categorias lc
  WHERE lc.id = NEW.lote_categoria_id;

  SELECT f.id, f.nome, f.tipo, f.gmd, NEW.peso_meta_kg
  INTO v_formulacao_id, v_nome, v_tipo, v_gmd, v_peso_meta
  FROM formulacoes f
  WHERE f.id = NEW.formulacao_id;

  IF NEW.ativo = true THEN
    UPDATE public.individuos i
    SET
      estrategia_nutricional_id = v_formulacao_id,
      estrategia_nutricional_nome = v_nome,
      estrategia_nutricional_tipo = v_tipo,
      gmd_kg_cab_dia = v_gmd,
      peso_meta_kg = v_peso_meta,
      updated_at = now()
    WHERE i.lote_atual = v_lote_id
      AND LOWER(i.categoria) = LOWER(v_categoria)
      AND i.deleted_at IS NULL;

  ELSIF TG_OP = 'UPDATE' AND OLD.ativo = true AND NEW.ativo = false THEN
    UPDATE public.individuos i
    SET
      estrategia_nutricional_id = NULL,
      estrategia_nutricional_nome = NULL,
      estrategia_nutricional_tipo = NULL,
      gmd_kg_cab_dia = NULL,
      peso_meta_kg = NULL,
      updated_at = now()
    WHERE i.lote_atual = v_lote_id
      AND LOWER(i.categoria) = LOWER(v_categoria)
      AND i.deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_lote_categorias_propagar_estrategia ON public.lote_categorias;

DROP TRIGGER IF EXISTS trg_planos_nutricionais_propagar_individuos ON public.planos_nutricionais;
CREATE TRIGGER trg_planos_nutricionais_propagar_individuos
AFTER INSERT OR UPDATE ON public.planos_nutricionais
FOR EACH ROW
EXECUTE FUNCTION public.propagar_estrategia_nutricional_para_individuos();

-- 8. Criar função de migração entre planos
CREATE OR REPLACE FUNCTION public.migrar_plano_nutricional(
  p_lote_categoria_id uuid,
  p_plano_destino_id uuid DEFAULT NULL,
  p_motivo text DEFAULT 'manual'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plano_atual RECORD;
  v_proximo_plano RECORD;
  v_snapshot jsonb;
  v_metricas jsonb;
  v_duracao integer;
  v_ganho_peso numeric;
  v_gmd_realizado numeric;
  v_gmd_planejado numeric;
  v_prod_arroba_lote numeric;
  v_mortalidade numeric;
  v_lote_id uuid;
  v_fazenda_id uuid;
  v_categoria text;
BEGIN
  SELECT * INTO v_plano_atual
  FROM public.planos_nutricionais
  WHERE lote_categoria_id = p_lote_categoria_id
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_plano_atual
    FROM public.planos_nutricionais
    WHERE lote_categoria_id = p_lote_categoria_id
    ORDER BY ordem ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nenhum plano nutricional encontrado para esta categoria';
    END IF;

    UPDATE public.planos_nutricionais
    SET ativo = true, data_inicio = CURRENT_DATE
    WHERE id = v_plano_atual.id;
  END IF;

  IF p_plano_destino_id IS NOT NULL THEN
    SELECT * INTO v_proximo_plano
    FROM public.planos_nutricionais
    WHERE id = p_plano_destino_id
      AND lote_categoria_id = p_lote_categoria_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Plano destino não encontrado para esta categoria';
    END IF;
  ELSE
    SELECT * INTO v_proximo_plano
    FROM public.planos_nutricionais
    WHERE lote_categoria_id = p_lote_categoria_id
      AND ordem > v_plano_atual.ordem
      AND data_inicio IS NULL
    ORDER BY ordem ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não há próximo plano para migração automática';
    END IF;
  END IF;

  IF v_plano_atual.id = v_proximo_plano.id THEN
    RAISE EXCEPTION 'O plano destino é o mesmo que o plano vigente';
  END IF;

  SELECT to_jsonb(lc.*) INTO v_snapshot
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  SELECT lc.lote_id, lc.categoria INTO v_lote_id, v_categoria
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  SELECT fazenda_id INTO v_fazenda_id
  FROM public.lotes
  WHERE id = v_lote_id;

  v_duracao := COALESCE((CURRENT_DATE - v_plano_atual.data_inicio)::integer, 0);

  SELECT f.gmd INTO v_gmd_planejado
  FROM public.formulacoes f
  WHERE f.id = v_plano_atual.formulacao_id;

  SELECT
    COALESCE(lc.peso_vivo_atual_kg_cab - lc.peso_entrada_kg_cab, 0),
    CASE
      WHEN COALESCE(lc.peso_vivo_atual_kg_cab - lc.peso_entrada_kg_cab, 0) > 0 AND v_duracao > 0
        THEN (lc.peso_vivo_atual_kg_cab - lc.peso_entrada_kg_cab) / v_duracao
      ELSE 0
    END,
    CASE
      WHEN COALESCE(lc.quant_inicial, 0) > 0
        THEN (COALESCE(lc.morte, 0)::numeric / lc.quant_inicial) * 100
      ELSE 0
    END,
    CASE
      WHEN COALESCE(lc.rc_atual, 0) > 0 AND COALESCE(lc.quant_atual, 0) > 0
        THEN ((lc.peso_vivo_atual_kg_cab * (lc.rc_atual / 100)) / 15) * lc.quant_atual
      ELSE 0
    END
  INTO v_ganho_peso, v_gmd_realizado, v_mortalidade, v_prod_arroba_lote
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  SELECT jsonb_build_object(
    'custo_operacional_total_cab', COALESCE(lc.custo_operacional_reais_cab_dia, 0) * v_duracao,
    'custo_total_producao_cab', COALESCE(lc.custo_total_entrada_reais_cab, 0) + (COALESCE(lc.custo_operacional_reais_cab_dia, 0) * v_duracao),
    'progresso_meta_percent', CASE
      WHEN COALESCE(lc.peso_vivo_meta_kg_cab, 0) > 0
        THEN (lc.peso_vivo_atual_kg_cab / lc.peso_vivo_meta_kg_cab) * 100
      ELSE 0
    END,
    'ganho_arroba_cab', CASE
      WHEN COALESCE(lc.rc_atual, 0) > 0 AND COALESCE(lc.rc_inicial, 0) > 0
        THEN ((lc.peso_vivo_atual_kg_cab * (lc.rc_atual / 100)) / 15) - ((lc.peso_entrada_kg_cab * (lc.rc_inicial / 100)) / 15)
      ELSE 0
    END,
    'peso_vivo_medio_lote', lc.peso_vivo_atual_kg_cab,
    'peso_inicial_kg_cab', lc.peso_entrada_kg_cab,
    'quant_inicial', lc.quant_inicial,
    'quant_atual', lc.quant_atual,
    'morte', COALESCE(lc.morte, 0),
    'data_pesagem', lc.data_pesagem,
    'data_meta_projetada', lc.data_meta_projetada,
    'dias_restantes_meta', lc.dias_restantes_meta
  ) INTO v_metricas
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  INSERT INTO public.planos_nutricionais_snapshots (
    plano_nutricional_id,
    lote_categoria_id,
    fazenda_id,
    snapshot,
    metricas_derivadas,
    duracao_dias,
    ganho_peso_total_kg_cab,
    gmd_realizado,
    gmd_planejado,
    producao_arroba_lote,
    mortalidade_percent,
    motivo_migracao,
    plano_anterior_id,
    plano_posterior_id
  ) VALUES (
    v_plano_atual.id,
    p_lote_categoria_id,
    v_fazenda_id,
    v_snapshot,
    v_metricas,
    v_duracao,
    v_ganho_peso,
    v_gmd_realizado,
    v_gmd_planejado,
    v_prod_arroba_lote,
    v_mortalidade,
    p_motivo,
    v_plano_atual.id,
    v_proximo_plano.id
  );

  UPDATE public.planos_nutricionais
  SET ativo = false, data_fim = CURRENT_DATE
  WHERE id = v_plano_atual.id;

  UPDATE public.planos_nutricionais
  SET ativo = true, data_inicio = CURRENT_DATE
  WHERE id = v_proximo_plano.id;

  UPDATE public.lote_categorias lc
  SET
    formulacao_id = v_proximo_plano.formulacao_id,
    estrategia_nutricional = f.nome,
    peso_vivo_meta_kg_cab = v_proximo_plano.peso_meta_kg,
    gmd = f.gmd::text,
    consumo_meta_porcentagem_pesovivo = f.meta_consumo_ms_percent_pv
  FROM public.formulacoes f
  WHERE lc.id = p_lote_categoria_id
    AND f.id = v_proximo_plano.formulacao_id;
END;
$function$;

-- 9. RLS nas novas tabelas
ALTER TABLE public.planos_nutricionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_nutricionais_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_nutricionais_select_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_select_fazenda"
  ON public.planos_nutricionais
  FOR SELECT
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_insert_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_insert_fazenda"
  ON public.planos_nutricionais
  FOR INSERT
  WITH CHECK (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_update_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_update_fazenda"
  ON public.planos_nutricionais
  FOR UPDATE
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_delete_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_delete_fazenda"
  ON public.planos_nutricionais
  FOR DELETE
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_snapshots_select_fazenda" ON public.planos_nutricionais_snapshots;
CREATE POLICY "planos_nutricionais_snapshots_select_fazenda"
  ON public.planos_nutricionais_snapshots
  FOR SELECT
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_snapshots_insert_fazenda" ON public.planos_nutricionais_snapshots;
CREATE POLICY "planos_nutricionais_snapshots_insert_fazenda"
  ON public.planos_nutricionais_snapshots
  FOR INSERT
  WITH CHECK (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );
