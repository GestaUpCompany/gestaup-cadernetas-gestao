-- ============================================================
-- Substitui o JSONB formulacoes.insumos por tabela de junção normalizada.
--
-- Problema: teor_ms e preco_ton_mn de cada insumo ficavam snapshot
-- denormalizado dentro do JSONB. Editar um insumo atômico ou um premix
-- não propagava para as formulações consumidoras, deixando custos e
-- teores stale silenciosamente.
--
-- Solução: tabela formulacao_insumos(formulacao_id, insumo_id, formula_teor_ms, ordem).
-- teor_ms e preco_ton_mn sempre lidos da tabela insumos via JOIN.
-- Campos derivados de formulacoes (teor_ms_dieta, custo_total, etc.)
-- recalculados automaticamente por trigger quando insumos mudam.
--
-- Colunas físicas derivadas em formulacoes são mantidas (PWA depende delas).
-- Coluna JSONB insumos é preservada por segurança (não é mais a fonte de verdade).
-- ============================================================

-- 1. Criar tabela de junção
CREATE TABLE IF NOT EXISTS public.formulacao_insumos (
  formulacao_id uuid NOT NULL REFERENCES public.formulacoes(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  formula_teor_ms numeric(10,2) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  PRIMARY KEY (formulacao_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_formulacao_insumos_insumo
  ON public.formulacao_insumos(insumo_id);

-- 2. RLS
ALTER TABLE public.formulacao_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formulacao_insumos_select_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_select_fazenda"
  ON public.formulacao_insumos
  FOR SELECT
  USING (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS "formulacao_insumos_insert_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_insert_fazenda"
  ON public.formulacao_insumos
  FOR INSERT
  WITH CHECK (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS "formulacao_insumos_update_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_update_fazenda"
  ON public.formulacao_insumos
  FOR UPDATE
  USING (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS "formulacao_insumos_delete_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_delete_fazenda"
  ON public.formulacao_insumos
  FOR DELETE
  USING (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

-- 3. Backfill: extrair insumo_id e formula_teor_ms do JSONB existente
--    Estrutura esperada do JSONB: [{insumo_id, formula_teor_ms, ...}, ...]
--    Campos com nomes antigos (formula_ms_percent) também são cobertos.
INSERT INTO public.formulacao_insumos (formulacao_id, insumo_id, formula_teor_ms, ordem)
SELECT
  f.id,
  (elem.value->>'insumo_id')::uuid,
  COALESCE(
    (elem.value->>'formula_teor_ms')::numeric,
    (elem.value->>'formula_ms_percent')::numeric,
    0
  ),
  elem.ordem::integer
FROM public.formulacoes f
CROSS JOIN LATERAL jsonb_array_elements(f.insumos) WITH ORDINALITY AS elem(value, ordem)
WHERE f.insumos IS NOT NULL
  AND jsonb_typeof(f.insumos) = 'array'
  AND (elem.value->>'insumo_id') IS NOT NULL
ON CONFLICT (formulacao_id, insumo_id) DO NOTHING;

-- 4. Função para recalcular campos derivados de uma formulação
--    Porta a lógica de calcularFormulacao do frontend (Formulacoes.tsx:210-265)
--    para plpgsql. Lê insumos da tabela de junção + insumos via JOIN.
--    Usa loops em vez de temp table para compatibilidade com plpgsql.
CREATE OR REPLACE FUNCTION public.recalcular_formulacao(p_formulacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_formulacao RECORD;
  v_meta_pv numeric;
  v_peso_vivo numeric;
  v_e_premix boolean;
  v_consumo_ms_total numeric;
  v_teor_ms_dieta numeric;
  v_custo_total numeric;
  v_custo_ms_tonelada numeric;
  v_consumo_ms_kg_cab_dia numeric;
  v_consumo_mn_kg_cab_dia numeric;
  v_custo_dieta_reais_cab_dia numeric;
  v_total_bruta numeric;
  v_row RECORD;
  v_mn_bruta numeric;
  v_mn_percent numeric;
  v_consumo_ms numeric;
  v_consumo_mn numeric;
  v_custo_dieta numeric;
BEGIN
  SELECT consumo_ms_percent_pv, peso_vivo_medio, e_premix
  INTO v_formulacao
  FROM public.formulacoes
  WHERE id = p_formulacao_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_meta_pv := COALESCE(v_formulacao.consumo_ms_percent_pv, 0);
  v_peso_vivo := COALESCE(v_formulacao.peso_vivo_medio, 0);
  v_e_premix := COALESCE(v_formulacao.e_premix, false);
  v_consumo_ms_total := v_peso_vivo * (v_meta_pv / 100.0);

  -- Passada 1: calcular mn_bruta total
  v_total_bruta := 0;
  FOR v_row IN
    SELECT COALESCE(i.teor_ms, 0) AS teor_ms,
           COALESCE(i.preco_ton_mn, 0) AS preco_ton_mn,
           COALESCE(fi.formula_teor_ms, 0) AS formula_teor_ms
    FROM public.formulacao_insumos fi
    JOIN public.insumos i ON i.id = fi.insumo_id
    WHERE fi.formulacao_id = p_formulacao_id
  LOOP
    IF v_row.teor_ms > 0 THEN
      v_mn_bruta := v_row.formula_teor_ms / (v_row.teor_ms / 100.0);
    ELSE
      v_mn_bruta := 0;
    END IF;
    v_total_bruta := v_total_bruta + v_mn_bruta;
  END LOOP;

  -- Passada 2: calcular derivados acumulando totais
  v_teor_ms_dieta := 0;
  v_custo_total := 0;
  v_consumo_ms_kg_cab_dia := 0;
  v_consumo_mn_kg_cab_dia := 0;
  v_custo_dieta_reais_cab_dia := 0;

  FOR v_row IN
    SELECT COALESCE(i.teor_ms, 0) AS teor_ms,
           COALESCE(i.preco_ton_mn, 0) AS preco_ton_mn,
           COALESCE(fi.formula_teor_ms, 0) AS formula_teor_ms
    FROM public.formulacao_insumos fi
    JOIN public.insumos i ON i.id = fi.insumo_id
    WHERE fi.formulacao_id = p_formulacao_id
  LOOP
    IF v_row.teor_ms > 0 THEN
      v_mn_bruta := v_row.formula_teor_ms / (v_row.teor_ms / 100.0);
    ELSE
      v_mn_bruta := 0;
    END IF;

    IF v_total_bruta > 0 THEN
      v_mn_percent := (v_mn_bruta / v_total_bruta) * 100.0;
    ELSE
      v_mn_percent := 0;
    END IF;

    v_teor_ms_dieta := v_teor_ms_dieta + (v_mn_percent * v_row.teor_ms);
    v_custo_total := v_custo_total + (v_row.preco_ton_mn * v_mn_percent / 100.0);

    v_consumo_ms := v_consumo_ms_total * (v_row.formula_teor_ms / 100.0);
    IF v_row.teor_ms > 0 THEN
      v_consumo_mn := v_consumo_ms / (v_row.teor_ms / 100.0);
    ELSE
      v_consumo_mn := 0;
    END IF;
    v_custo_dieta := v_consumo_mn * (v_row.preco_ton_mn / 1000.0);

    v_consumo_ms_kg_cab_dia := v_consumo_ms_kg_cab_dia + v_consumo_ms;
    v_consumo_mn_kg_cab_dia := v_consumo_mn_kg_cab_dia + v_consumo_mn;
    v_custo_dieta_reais_cab_dia := v_custo_dieta_reais_cab_dia + v_custo_dieta;
  END LOOP;

  v_teor_ms_dieta := v_teor_ms_dieta / 100.0;

  IF v_teor_ms_dieta > 0 THEN
    v_custo_ms_tonelada := v_custo_total / (v_teor_ms_dieta / 100.0);
  ELSE
    v_custo_ms_tonelada := 0;
  END IF;

  UPDATE public.formulacoes
  SET
    teor_ms_dieta = ROUND(v_teor_ms_dieta, 2),
    custo_total = ROUND(v_custo_total, 2),
    custo_mn_tonelada = ROUND(v_custo_total, 2),
    custo_ms_tonelada = ROUND(v_custo_ms_tonelada, 2),
    consumo_ms_kg_cab_dia = CASE WHEN v_e_premix THEN 0 ELSE ROUND(v_consumo_ms_kg_cab_dia, 3) END,
    consumo_mn_kg_cab_dia = CASE WHEN v_e_premix THEN 0 ELSE ROUND(v_consumo_mn_kg_cab_dia, 3) END,
    custo_dieta_reais_cab_dia = CASE WHEN v_e_premix THEN 0 ELSE ROUND(v_custo_dieta_reais_cab_dia, 2) END
  WHERE id = p_formulacao_id;
END;
$function$;

-- 5. Trigger: recalcula formulação quando insumos da junção mudam
CREATE OR REPLACE FUNCTION public.trigger_recalc_formulacao_on_juncao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_formulacao(OLD.formulacao_id);
  ELSE
    PERFORM public.recalcular_formulacao(NEW.formulacao_id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_formulacao_insumos_recalc ON public.formulacao_insumos;
CREATE TRIGGER trg_formulacao_insumos_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.formulacao_insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_formulacao_on_juncao();

-- 6. Trigger: recalcula todas as formulações que usam um insumo quando
--    teor_ms ou preco_ton_mn do insumo mudam
CREATE OR REPLACE FUNCTION public.trigger_recalc_formulacoes_on_insumo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_formulacao_id uuid;
BEGIN
  IF NEW.teor_ms IS DISTINCT FROM OLD.teor_ms
     OR NEW.preco_ton_mn IS DISTINCT FROM OLD.preco_ton_mn THEN
    FOR v_formulacao_id IN
      SELECT DISTINCT formulacao_id
      FROM public.formulacao_insumos
      WHERE insumo_id = NEW.id
    LOOP
      PERFORM public.recalcular_formulacao(v_formulacao_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_formulacoes_on_insumo ON public.insumos;
CREATE TRIGGER trigger_recalc_formulacoes_on_insumo
  AFTER UPDATE OF teor_ms, preco_ton_mn ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_formulacoes_on_insumo_change();

-- 7. Trigger: recalcula formulação quando consumo_ms_percent_pv,
--    peso_vivo_medio ou e_premix mudam (esses parâmetros afetam os
--    campos derivados mas não disparam o trigger da junção)
CREATE OR REPLACE FUNCTION public.trigger_recalc_formulacao_on_param_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.consumo_ms_percent_pv IS DISTINCT FROM OLD.consumo_ms_percent_pv
     OR NEW.peso_vivo_medio IS DISTINCT FROM OLD.peso_vivo_medio
     OR NEW.e_premix IS DISTINCT FROM OLD.e_premix THEN
    PERFORM public.recalcular_formulacao(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_formulacao_on_param ON public.formulacoes;
CREATE TRIGGER trigger_recalc_formulacao_on_param
  AFTER UPDATE OF consumo_ms_percent_pv, peso_vivo_medio, e_premix ON public.formulacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_formulacao_on_param_change();

-- 8. Recalcular todas as formulações existentes para garantir consistência
--    entre a nova tabela de junção e os campos derivados
DO $$
DECLARE
  v_formulacao_id uuid;
BEGIN
  FOR v_formulacao_id IN SELECT DISTINCT formulacao_id FROM public.formulacao_insumos
  LOOP
    PERFORM public.recalcular_formulacao(v_formulacao_id);
  END LOOP;
END;
$$;

-- 9. Comentários
COMMENT ON TABLE public.formulacao_insumos IS
  'Tabela de junção normalizada substituindo o JSONB formulacoes.insumos. teor_ms e preco_ton_mn sempre lidos da tabela insumos via JOIN. Campos derivados de formulacoes recalculados por trigger.';
COMMENT ON COLUMN public.formulacao_insumos.formula_teor_ms IS
  'Participação do insumo na formulação em matéria seca (%). Único campo editável por insumo além da ordem.';
COMMENT ON COLUMN public.formulacao_insumos.ordem IS
  'Ordem de exibição do insumo na formulação (índice do array original).';
