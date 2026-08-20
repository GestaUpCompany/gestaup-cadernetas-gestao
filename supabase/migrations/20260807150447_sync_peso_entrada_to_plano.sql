CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_lote_cat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se peso_entrada_kg_cab mudou, sincronizar com o plano ativo
  -- para que a baseline da projeção seja corrigida retroativamente.
  -- O trigger do plano (trigger_recalc_peso_plano) vai disparar e
  -- recalcular peso_vivo_kg em todos os registros_suplementacao.
  IF NEW.peso_entrada_kg_cab IS DISTINCT FROM OLD.peso_entrada_kg_cab THEN
    UPDATE public.planos_nutricionais
    SET peso_inicio_kg_cab = NEW.peso_entrada_kg_cab
    WHERE lote_categoria_id = NEW.id
      AND ativo = true
      AND data_fim IS NULL;
  END IF;

  -- Recalcular registros de suplementação (cobre caso de data_ajuste_peso tambem)
  PERFORM recalcular_peso_vivo_lote(
    NEW.lote_id,
    NEW.data_ajuste_peso IS DISTINCT FROM OLD.data_ajuste_peso
  );

  RETURN NEW;
END;
$function$;;
