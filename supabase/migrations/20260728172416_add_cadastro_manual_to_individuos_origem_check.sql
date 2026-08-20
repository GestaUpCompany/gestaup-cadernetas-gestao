ALTER TABLE individuos DROP CONSTRAINT IF EXISTS individuos_origem_check;
ALTER TABLE individuos ADD CONSTRAINT individuos_origem_check 
  CHECK (origem = ANY (ARRAY['Compra'::text, 'Doação'::text, 'Nascimento'::text, 'Transferência'::text, 'Cadastro Manual'::text]));;
