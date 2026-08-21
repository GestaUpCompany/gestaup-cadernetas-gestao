
CREATE OR REPLACE FUNCTION public.sync_meta_historico_pasto()
RETURNS trigger AS $$
BEGIN
  IF OLD.meta_intervalo_ocupacao_dias IS DISTINCT FROM NEW.meta_intervalo_ocupacao_dias THEN
    UPDATE public.lote_pasto_historico
    SET meta_intervalo_ocupacao_dias = NEW.meta_intervalo_ocupacao_dias
    WHERE pasto_id = NEW.id
      AND data_hora_saida IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_meta_pasto ON public.pastos;
CREATE TRIGGER trg_sync_meta_pasto
AFTER UPDATE OF meta_intervalo_ocupacao_dias ON public.pastos
FOR EACH ROW
EXECUTE FUNCTION public.sync_meta_historico_pasto();

CREATE OR REPLACE FUNCTION public.sync_meta_historico_modulo()
RETURNS trigger AS $$
BEGIN
  IF OLD.meta_intervalo_ocupacao_dias IS DISTINCT FROM NEW.meta_intervalo_ocupacao_dias THEN
    UPDATE public.lote_modulo_historico
    SET meta_intervalo_ocupacao_dias = NEW.meta_intervalo_ocupacao_dias
    WHERE modulo_id = NEW.id
      AND data_hora_saida IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_meta_modulo ON public.modulos_pastos;
CREATE TRIGGER trg_sync_meta_modulo
AFTER UPDATE OF meta_intervalo_ocupacao_dias ON public.modulos_pastos
FOR EACH ROW
EXECUTE FUNCTION public.sync_meta_historico_modulo();
;
