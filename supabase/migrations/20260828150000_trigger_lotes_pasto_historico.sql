-- Trigger para manter lote_pasto_historico sincronizado quando pasto_id do lote muda no painel web
-- O PWA (trg_registros_pastagens_mover_lote) gerencia seu proprio historico, entao evitamos duplicar usando pg_trigger_depth

CREATE OR REPLACE FUNCTION public.trg_lotes_pasto_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Evita duplicar o historico gerado pelo PWA (disparado dentro de outro trigger)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.pasto_id IS DISTINCT FROM OLD.pasto_id)) THEN
    -- Fechar registro aberto anterior, se houver (lote saindo de um pasto)
    IF TG_OP = 'UPDATE' THEN
      UPDATE public.lote_pasto_historico
      SET
        data_final = now()::date,
        data_hora_saida = now(),
        updated_at = now()
      WHERE lote_id = NEW.id
        AND data_hora_saida IS NULL;
    END IF;

    -- Abrir novo registro se o lote esta indo para um pasto
    IF NEW.pasto_id IS NOT NULL THEN
      INSERT INTO public.lote_pasto_historico (
        lote_id,
        pasto_id,
        modulo_id,
        data_inicial,
        data_hora_entrada
      )
      SELECT
        NEW.id,
        NEW.pasto_id,
        p.modulo_id,
        now()::date,
        now()
      FROM public.pastos p
      WHERE p.id = NEW.pasto_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_lotes_pasto_historico ON public.lotes;
CREATE TRIGGER trg_lotes_pasto_historico
  AFTER INSERT OR UPDATE OF pasto_id ON public.lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lotes_pasto_historico();
