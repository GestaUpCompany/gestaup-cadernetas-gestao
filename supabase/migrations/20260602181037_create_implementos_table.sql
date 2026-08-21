CREATE TABLE public.implementos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id uuid NOT NULL,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);;
