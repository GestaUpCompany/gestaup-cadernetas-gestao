-- Remove trigger que forçava ativo=false em currais sem lote associado.
-- A validação de que um curral ativo sem lote não faz sentido operacional
-- passa a ser responsabilidade do frontend, não do banco.
-- Isso permite ativar/desativar currais livremente pelo painel.

DROP TRIGGER IF EXISTS trg_currais_inativar_sem_lote ON currais;
DROP FUNCTION IF EXISTS trg_inativar_curral_sem_lote_func();
