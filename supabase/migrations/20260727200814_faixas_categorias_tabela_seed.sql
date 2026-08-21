CREATE TABLE public.faixas_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sexo text NOT NULL CHECK (sexo IN ('M','F')),
  peso_min numeric NOT NULL DEFAULT 0,
  peso_max numeric NOT NULL DEFAULT 1000,
  ordem integer NOT NULL DEFAULT 0,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fazenda_id, nome, sexo)
);

CREATE INDEX idx_faixas_categorias_fazenda ON public.faixas_categorias (fazenda_id);
CREATE INDEX idx_faixas_categorias_fazenda_sexo_ordem ON public.faixas_categorias (fazenda_id, sexo, ordem);

ALTER TABLE public.faixas_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated select faixas_categorias" ON public.faixas_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert faixas_categorias" ON public.faixas_categorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update faixas_categorias" ON public.faixas_categorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete faixas_categorias" ON public.faixas_categorias FOR DELETE TO authenticated USING (true);
GRANT ALL ON public.faixas_categorias TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_faixas_categorias_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.faixas_categorias (fazenda_id, nome, sexo, peso_min, peso_max, ordem, cor)
  VALUES
    (NEW.id, 'Bezerro ao Pé', 'M', 0, 120, 1, '#fde68a'),
    (NEW.id, 'Bezerro ao Pé', 'F', 0, 120, 1, '#fde68a'),
    (NEW.id, 'Bezerro', 'M', 120, 210, 2, '#fcd34d'),
    (NEW.id, 'Bezerra', 'F', 120, 210, 2, '#fcd34d'),
    (NEW.id, 'Garrote', 'M', 210, 360, 3, '#f59e0b'),
    (NEW.id, 'Novilha', 'F', 210, 330, 3, '#f59e0b'),
    (NEW.id, 'Boi Magro', 'M', 360, 450, 4, '#3b82f6'),
    (NEW.id, 'Boi Gordo', 'M', 450, 520, 5, '#1d4ed8'),
    (NEW.id, 'Touro', 'M', 450, 700, 4, '#7c3aed'),
    (NEW.id, 'Vaca', 'F', 330, 600, 4, '#7c3aed')
  ON CONFLICT (fazenda_id, nome, sexo) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_seed_faixas_categorias
AFTER INSERT ON public.fazendas
FOR EACH ROW EXECUTE FUNCTION public.seed_faixas_categorias_default();

INSERT INTO public.faixas_categorias (fazenda_id, nome, sexo, peso_min, peso_max, ordem, cor)
SELECT f.id, x.nome, x.sexo, x.peso_min, x.peso_max, x.ordem, x.cor
FROM public.fazendas f
CROSS JOIN (VALUES
  ('Bezerro ao Pé','M',0,120,1,'#fde68a'),
  ('Bezerro ao Pé','F',0,120,1,'#fde68a'),
  ('Bezerro','M',120,210,2,'#fcd34d'),
  ('Bezerra','F',120,210,2,'#fcd34d'),
  ('Garrote','M',210,360,3,'#f59e0b'),
  ('Novilha','F',210,330,3,'#f59e0b'),
  ('Boi Magro','M',360,450,4,'#3b82f6'),
  ('Boi Gordo','M',450,520,5,'#1d4ed8'),
  ('Touro','M',450,700,4,'#7c3aed'),
  ('Vaca','F',330,600,4,'#7c3aed')
) AS x(nome, sexo, peso_min, peso_max, ordem, cor)
ON CONFLICT (fazenda_id, nome, sexo) DO NOTHING;

NOTIFY pgrst, 'reload schema';;
