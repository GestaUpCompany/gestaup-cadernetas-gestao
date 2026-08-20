CREATE TABLE IF NOT EXISTS public.dietas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.currais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  dieta_id UUID REFERENCES public.dietas(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.dietas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dietas_select ON public.dietas;
DROP POLICY IF EXISTS dietas_insert ON public.dietas;
DROP POLICY IF EXISTS dietas_update ON public.dietas;
DROP POLICY IF EXISTS dietas_delete ON public.dietas;

CREATE POLICY dietas_select ON public.dietas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = dietas.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY dietas_insert ON public.dietas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = dietas.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY dietas_update ON public.dietas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = dietas.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY dietas_delete ON public.dietas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = dietas.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS currais_select ON public.currais;
DROP POLICY IF EXISTS currais_insert ON public.currais;
DROP POLICY IF EXISTS currais_update ON public.currais;
DROP POLICY IF EXISTS currais_delete ON public.currais;

CREATE POLICY currais_select ON public.currais
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY currais_insert ON public.currais
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY currais_update ON public.currais
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY currais_delete ON public.currais
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_dietas_fazenda ON public.dietas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_currais_fazenda ON public.currais(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_currais_lote ON public.currais(lote_id);
CREATE INDEX IF NOT EXISTS idx_currais_dieta ON public.currais(dieta_id);;
