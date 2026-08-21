
ALTER TABLE registros_pastagens
ADD COLUMN pasto_saida_id uuid REFERENCES pastos(id),
ADD COLUMN pasto_entrada_id uuid REFERENCES pastos(id);
;
