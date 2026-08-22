-- Remove currais.formulacao_id
-- A formulação do curral passa a ser consultada da formulação ativa do plano nutricional vigente do lote

-- Soltar qualquer FK que aponte para formulacoes a partir de currais
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'currais_formulacao_id_fkey'
      AND table_name = 'currais'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE currais DROP CONSTRAINT currais_formulacao_id_fkey;
  END IF;
END $$;

ALTER TABLE currais DROP COLUMN IF EXISTS formulacao_id;
