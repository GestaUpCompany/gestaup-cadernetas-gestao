CREATE TABLE IF NOT EXISTS public.grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: qualquer autenticado pode ler grupos (necessario para o PWA buscar fazendas do mesmo grupo)
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read grupos" ON public.grupos
  FOR SELECT TO authenticated USING (true);;
