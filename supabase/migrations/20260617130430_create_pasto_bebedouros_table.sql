CREATE TABLE pasto_bebedouros (
  pasto_id uuid REFERENCES pastos(id) ON DELETE CASCADE,
  bebedouro_id uuid REFERENCES bebedouros(id) ON DELETE CASCADE,
  PRIMARY KEY (pasto_id, bebedouro_id)
);;
