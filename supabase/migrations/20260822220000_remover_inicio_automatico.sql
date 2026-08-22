-- Remove totalmente a funcionalidade de inicio automatico de atividades
-- Atividades programadas para uma data permanecem pendentes ate um responsavel
-- iniciar manualmente via PWA (criando sessao aberta)

-- 1. Soltar trigger e function de inicio automatico on insert
DROP TRIGGER IF EXISTS trg_inicio_automatico_on_insert ON atividades;
DROP FUNCTION IF EXISTS fn_inicio_automatico_on_insert();

-- 2. Reescrever a funcao do cron mantendo apenas a transicao para atrasado
CREATE OR REPLACE FUNCTION fn_atualizar_status_atividades_automatico()
RETURNS void AS $$
BEGIN
  -- atrasado: marcar atividades nao concluidas cujo prazo passou
  UPDATE atividades
  SET status = 'atrasado', updated_at = now()
  WHERE data_fim < CURRENT_DATE
    AND status NOT IN ('concluido', 'atrasado')
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Remover colunas
ALTER TABLE atividades DROP COLUMN IF EXISTS inicio_automatico;
ALTER TABLE atividade_templates DROP COLUMN IF EXISTS inicio_automatico;
