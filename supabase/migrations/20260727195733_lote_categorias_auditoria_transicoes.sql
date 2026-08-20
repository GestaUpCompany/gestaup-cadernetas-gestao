ALTER TABLE public.lote_categorias ADD COLUMN data_fim timestamptz; ALTER TABLE public.lote_categorias ADD COLUMN categoria_origem_id uuid; ALTER TABLE public.lote_categorias ADD CONSTRAINT lote_categorias_origem_fkey FOREIGN KEY (categoria_origem_id) REFERENCES public.lote_categorias(id) ON DELETE SET NULL; CREATE INDEX idx_lote_categorias_data_fim ON public.lote_categorias (data_fim) WHERE data_fim IS NULL; CREATE INDEX idx_lote_categorias_origem_id ON public.lote_categorias (categoria_origem_id);

CREATE TABLE public.lote_categorias_transicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  lote_id uuid NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  lote_categoria_origem_id uuid REFERENCES public.lote_categorias(id) ON DELETE SET NULL,
  lote_categoria_destino_id uuid REFERENCES public.lote_categorias(id) ON DELETE SET NULL,
  categoria_origem text NOT NULL,
  categoria_destino text NOT NULL,
  peso_na_transicao_kg numeric,
  data_transicao timestamptz NOT NULL DEFAULT now(),
  motivo text NOT NULL DEFAULT 'manual' CHECK (motivo IN ('manual','sugestao')),
  usuario_id uuid,
  snapshot_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lote_categorias_transicoes_lote ON public.lote_categorias_transicoes (lote_id);
CREATE INDEX idx_lote_categorias_transicoes_origem ON public.lote_categorias_transicoes (lote_categoria_origem_id);
CREATE INDEX idx_lote_categorias_transicoes_destino ON public.lote_categorias_transicoes (lote_categoria_destino_id);

ALTER TABLE public.lote_categorias_transicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated select lote_categorias_transicoes" ON public.lote_categorias_transicoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert lote_categorias_transicoes" ON public.lote_categorias_transicoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update lote_categorias_transicoes" ON public.lote_categorias_transicoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete lote_categorias_transicoes" ON public.lote_categorias_transicoes FOR DELETE TO authenticated USING (true);

GRANT ALL ON public.lote_categorias_transicoes TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';;
