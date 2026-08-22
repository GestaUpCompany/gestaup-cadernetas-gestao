-- Corrige: quando um funcionário inicia (pendente -> em_andamento),
-- a atividade deve ir para em_andamento mesmo se estiver "atrasado".
-- Antes a trigger só propagava se a atividade estivesse "pendente",
-- deixando atividades atrasadas travadas nesse status mesmo com alguém em andamento.

CREATE OR REPLACE FUNCTION fn_atividade_status_on_individual_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Propagar: quando um funcionário inicia, atividade vai para em_andamento
  -- (tanto se estiver pendente quanto atrasado)
  IF NEW.status_individual = 'em_andamento' AND OLD.status_individual = 'pendente' THEN
    UPDATE atividades SET status = 'em_andamento'
    WHERE id = NEW.atividade_id AND status IN ('pendente', 'atrasado');
  END IF;
  -- Conclusão da atividade é tratada por fn_concluir_atividade_on_funcionario ("basta um")
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
