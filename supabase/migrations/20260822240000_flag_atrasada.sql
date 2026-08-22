-- Substitui o status "atrasado" por uma flag booleana "atrasada"
-- Status de execucao (pendente, em_andamento, concluido) fica separado do estado de prazo
-- O cron marca atrasada=true quando data_fim < hoje e nao concluida, sem mudar o status
-- Atividades nunca iniciadas permanecem "pendente" + atrasada=true (antes viravam "atrasado")

-- 1. Adicionar coluna
ALTER TABLE atividades ADD COLUMN IF NOT EXISTS atrasada boolean NOT NULL DEFAULT false;

-- 2. Backfill: marcar atividades nao concluidas cujo prazo passou
UPDATE atividades
SET atrasada = true
WHERE data_fim < CURRENT_DATE
  AND status NOT IN ('concluido')
  AND deleted_at IS NULL;

-- 3. Reverter status "atrasado" existentes para "pendente" (nunca foram iniciadas)
UPDATE atividades
SET status = 'pendente'
WHERE status = 'atrasado'
  AND deleted_at IS NULL;

-- 4. Reescrever cron: so marca a flag, nao muda status
CREATE OR REPLACE FUNCTION fn_atualizar_status_atividades_automatico()
RETURNS void AS $$
BEGIN
  -- Marcar flag atrasada para atividades nao concluidas cujo prazo passou
  UPDATE atividades
  SET atrasada = true, updated_at = now()
  WHERE data_fim < CURRENT_DATE
    AND status NOT IN ('concluido')
    AND atrasada = false
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Simplificar trigger: so propaga pendente -> em_andamento (atrasado nao existe mais)
CREATE OR REPLACE FUNCTION fn_atividade_status_on_individual_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_individual = 'em_andamento' AND OLD.status_individual = 'pendente' THEN
    UPDATE atividades SET status = 'em_andamento'
    WHERE id = NEW.atividade_id AND status = 'pendente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
