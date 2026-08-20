-- Adicionar triggers de auditoria nas tabelas criticas faltantes

-- registros_morte
DROP TRIGGER IF EXISTS trg_audit_registros_morte ON public.registros_morte;
CREATE TRIGGER trg_audit_registros_morte
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_morte
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- formulacoes
DROP TRIGGER IF EXISTS trg_audit_formulacoes ON public.formulacoes;
CREATE TRIGGER trg_audit_formulacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.formulacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- usuario_fazenda
DROP TRIGGER IF EXISTS trg_audit_usuario_fazenda ON public.usuario_fazenda;
CREATE TRIGGER trg_audit_usuario_fazenda
  AFTER INSERT OR UPDATE OR DELETE ON public.usuario_fazenda
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- currais
DROP TRIGGER IF EXISTS trg_audit_currais ON public.currais;
CREATE TRIGGER trg_audit_currais
  AFTER INSERT OR UPDATE OR DELETE ON public.currais
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- pastos
DROP TRIGGER IF EXISTS trg_audit_pastos ON public.pastos;
CREATE TRIGGER trg_audit_pastos
  AFTER INSERT OR UPDATE OR DELETE ON public.pastos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_leitura_cocho
DROP TRIGGER IF EXISTS trg_audit_registros_leitura_cocho ON public.registros_leitura_cocho;
CREATE TRIGGER trg_audit_registros_leitura_cocho
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_leitura_cocho
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_alimentacao
DROP TRIGGER IF EXISTS trg_audit_registros_alimentacao ON public.registros_alimentacao;
CREATE TRIGGER trg_audit_registros_alimentacao
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_alimentacao
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- programacao_tratos
DROP TRIGGER IF EXISTS trg_audit_programacao_tratos ON public.programacao_tratos;
CREATE TRIGGER trg_audit_programacao_tratos
  AFTER INSERT OR UPDATE OR DELETE ON public.programacao_tratos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- funcionarios
DROP TRIGGER IF EXISTS trg_audit_funcionarios ON public.funcionarios;
CREATE TRIGGER trg_audit_funcionarios
  AFTER INSERT OR UPDATE OR DELETE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- tratamentos
DROP TRIGGER IF EXISTS trg_audit_tratamentos ON public.tratamentos;
CREATE TRIGGER trg_audit_tratamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.tratamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_abastecimento
DROP TRIGGER IF EXISTS trg_audit_registros_abastecimento ON public.registros_abastecimento;
CREATE TRIGGER trg_audit_registros_abastecimento
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_abastecimento
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();;
