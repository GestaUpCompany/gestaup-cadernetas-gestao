ALTER TABLE registros_leitura_cocho
ADD COLUMN nota_config_id uuid REFERENCES notas_leitura_cocho_config(id) ON DELETE SET NULL;;
