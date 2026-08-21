CREATE TABLE IF NOT EXISTS public.pasto_bebedouros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pasto_id uuid NOT NULL REFERENCES public.pastos(id) ON DELETE CASCADE,
  bebedouro_id uuid NOT NULL REFERENCES public.bebedouros(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pasto_id, bebedouro_id)
);

ALTER TABLE public.pasto_bebedouros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select pasto_bebedouros" ON public.pasto_bebedouros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert pasto_bebedouros" ON public.pasto_bebedouros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update pasto_bebedouros" ON public.pasto_bebedouros FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete pasto_bebedouros" ON public.pasto_bebedouros FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pasto_bebedouros_pasto_id ON public.pasto_bebedouros(pasto_id);
CREATE INDEX IF NOT EXISTS idx_pasto_bebedouros_bebedouro_id ON public.pasto_bebedouros(bebedouro_id);

-- Migrar dados existentes do JSONB para a junction
INSERT INTO public.pasto_bebedouros (pasto_id, bebedouro_id)
SELECT p.id, (b->>'id')::uuid
FROM public.pastos p
CROSS JOIN LATERAL jsonb_array_elements(p.bebedouros) AS b
WHERE jsonb_array_length(p.bebedouros) > 0
  AND (b->>'id') IS NOT NULL
ON CONFLICT (pasto_id, bebedouro_id) DO NOTHING;;
