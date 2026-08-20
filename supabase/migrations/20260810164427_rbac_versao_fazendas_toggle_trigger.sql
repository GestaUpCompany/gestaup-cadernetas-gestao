-- Trigger que incrementa rbac_versao quando controle_acesso_habilitado muda
-- na propria fazenda (toggle de RBAC no Painel Web).

CREATE OR REPLACE FUNCTION incrementar_rbac_versao_on_toggle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- So incrementa se o controle_acesso_habilitado mudou de valor
  IF NEW.controle_acesso_habilitado IS DISTINCT FROM OLD.controle_acesso_habilitado THEN
    NEW.rbac_versao := OLD.rbac_versao + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incrementar_rbac_versao_on_toggle ON fazendas;

CREATE TRIGGER trg_incrementar_rbac_versao_on_toggle
  BEFORE UPDATE ON fazendas
  FOR EACH ROW
  EXECUTE FUNCTION incrementar_rbac_versao_on_toggle();;
