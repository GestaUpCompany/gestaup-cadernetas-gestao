ALTER TABLE registros_maternidade ADD COLUMN pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL;;
