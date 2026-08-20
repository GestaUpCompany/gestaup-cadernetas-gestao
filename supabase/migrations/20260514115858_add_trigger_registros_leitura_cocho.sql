-- Adicionar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS update_registros_leitura_cocho_updated_at ON registros_leitura_cocho;
CREATE TRIGGER update_registros_leitura_cocho_updated_at BEFORE UPDATE ON registros_leitura_cocho
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;
