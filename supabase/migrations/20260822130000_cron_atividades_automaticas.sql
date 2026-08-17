-- Funcao para transicoes automaticas de status das atividades
-- 1. inicio_automatico: pendente -> em_andamento quando data_inicio chega
-- 2. atrasado: se data_fim < hoje e status != concluido -> atrasado
CREATE OR REPLACE FUNCTION fn_atualizar_status_atividades_automatico()
RETURNS void AS $$
BEGIN
  -- inicio_automatico: ativar atividades pendentes cuja data_inicio chegou
  UPDATE atividades
  SET status = 'em_andamento', updated_at = now()
  WHERE inicio_automatico = true
    AND status = 'pendente'
    AND data_inicio <= CURRENT_DATE
    AND deleted_at IS NULL;

  -- atrasado: marcar atividades nao concluidas cujo prazo passou
  UPDATE atividades
  SET status = 'atrasado', updated_at = now()
  WHERE data_fim < CURRENT_DATE
    AND status NOT IN ('concluido', 'atrasado')
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar como cron (a cada 1 hora)
SELECT cron.schedule(
  'atualizar_status_atividades',
  '0 * * * *',
  $$SELECT fn_atualizar_status_atividades_automatico()$$
);
