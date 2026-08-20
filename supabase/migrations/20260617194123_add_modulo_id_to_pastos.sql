ALTER TABLE pastos ADD COLUMN modulo_id uuid REFERENCES modulos_pastos(id) ON DELETE SET NULL;;
