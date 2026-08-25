-- Altera a check constraint de formulacoes.sistema_producao para aceitar
-- os novos valores "Pasto" e "Confinamento" (além de Cria, Recria, Engorda).
-- O campo agora distingue formulações de pasto vs confinamento.

ALTER TABLE formulacoes DROP CONSTRAINT IF EXISTS dietas_sistema_producao_check;

ALTER TABLE formulacoes ADD CONSTRAINT dietas_sistema_producao_check
  CHECK (sistema_producao IS NULL OR sistema_producao = ANY (ARRAY['Cria', 'Recria', 'Engorda', 'Pasto', 'Confinamento']));
