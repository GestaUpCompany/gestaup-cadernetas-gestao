-- Adiciona coluna rbac_versao na tabela fazendas para invalidacao de cache
-- de funcionarios no PWA. Quando o admin altera funcionarios ou o toggle de
-- RBAC, a versao incrementa e o PWA invalida o cache ao perceber a diferenca.

ALTER TABLE fazendas
  ADD COLUMN IF NOT EXISTS rbac_versao integer NOT NULL DEFAULT 0;

-- Trigger que incrementa rbac_versao da fazenda sempre que um funcionario
-- e' inserido, atualizado ou deletado. Garante que nenhuma alteracao escape,
-- independente do caminho de codigo que fez a mudanca.

CREATE OR REPLACE FUNCTION incrementar_rbac_versao_fazenda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fazenda_id uuid;
BEGIN
  -- Determina o fazenda_id conforme o tipo de operacao
  IF TG_OP = 'DELETE' THEN
    v_fazenda_id := OLD.fazenda_id;
  ELSE
    v_fazenda_id := NEW.fazenda_id;
  END IF;

  -- Se for UPDATE e o fazenda_id mudou, incrementa ambas as fazendas
  IF TG_OP = 'UPDATE' AND OLD.fazenda_id IS DISTINCT FROM NEW.fazenda_id THEN
    UPDATE fazendas SET rbac_versao = rbac_versao + 1 WHERE id = OLD.fazenda_id;
  END IF;

  IF v_fazenda_id IS NOT NULL THEN
    UPDATE fazendas SET rbac_versao = rbac_versao + 1 WHERE id = v_fazenda_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incrementar_rbac_versao ON funcionarios;

CREATE TRIGGER trg_incrementar_rbac_versao
  AFTER INSERT OR UPDATE OR DELETE ON funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION incrementar_rbac_versao_fazenda();;
