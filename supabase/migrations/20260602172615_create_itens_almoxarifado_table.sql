CREATE TABLE public.itens_almoxarifado (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id uuid NOT NULL,
  nome text NOT NULL,
  classificacao text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);;
