CREATE TABLE modulos_pastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  area_util_total_ha numeric DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);;
