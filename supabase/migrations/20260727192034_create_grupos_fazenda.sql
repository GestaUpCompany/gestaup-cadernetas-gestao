
CREATE TABLE public.grupos_fazenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grupos_fazenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_fazenda_select" ON public.grupos_fazenda
  FOR SELECT USING (true);

CREATE POLICY "grupos_fazenda_admin_all" ON public.grupos_fazenda
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.papel = 'admin' AND u.ativo = true
    )
  );

ALTER TABLE public.fazendas
  ADD COLUMN grupo_id UUID REFERENCES public.grupos_fazenda(id) ON DELETE SET NULL;

CREATE POLICY "fazendas_grupo_id_select" ON public.fazendas
  FOR SELECT USING (true);

COMMENT ON COLUMN public.fazendas.grupo_id IS 'Grupo ao qual a fazenda pertence. Nullable para compatibilidade com fazendas existentes.';
;
