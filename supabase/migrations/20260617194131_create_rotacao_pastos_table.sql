CREATE TABLE rotacao_pastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id uuid NOT NULL REFERENCES modulos_pastos(id) ON DELETE CASCADE,
  pasto_id uuid NOT NULL REFERENCES pastos(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(modulo_id, pasto_id)
);;
