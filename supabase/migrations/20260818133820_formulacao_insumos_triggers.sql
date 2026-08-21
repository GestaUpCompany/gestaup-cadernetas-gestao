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

-- Recalcular todas as formulacoes existentes
DO $$
DECLARE
  v_formulacao_id uuid;
BEGIN
  FOR v_formulacao_id IN SELECT DISTINCT formulacao_id FROM public.formulacao_insumos
  LOOP
    PERFORM public.recalcular_formulacao(v_formulacao_id);
  END LOOP;
END;
$$;;
