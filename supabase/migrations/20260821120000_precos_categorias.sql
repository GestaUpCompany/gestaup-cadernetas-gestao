-- Tabela de preços por categoria para cálculo de impacto financeiro no relatório de mortalidade.
-- Defaults baseados em cotações de agosto/2026 (Scot Consultoria, CEPEA/ESALQ, Agrifatto, FarmNews).
-- Conversão: R$/arroba ÷ 15 kg × rendimento de carcaça ~50% = R$/kg vivo.

CREATE TABLE IF NOT EXISTS public.precos_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  preco_kg numeric NOT NULL DEFAULT 10.00 CHECK (preco_kg >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.usuarios(id),
  UNIQUE(fazenda_id, categoria)
);

CREATE INDEX IF NOT EXISTS idx_precos_categorias_fazenda ON public.precos_categorias(fazenda_id);

ALTER TABLE public.precos_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ler precos de sua fazenda"
  ON public.precos_categorias FOR SELECT
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id FROM public.usuario_fazenda uf
      WHERE uf.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem escrever precos de sua fazenda"
  ON public.precos_categorias FOR ALL
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id FROM public.usuario_fazenda uf
      WHERE uf.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id FROM public.usuario_fazenda uf
      WHERE uf.usuario_id = auth.uid()
    )
  );

-- Anon pode ler (relatório público valida token no app; preços são referência de mercado)
CREATE POLICY "Anon pode ler precos"
  ON public.precos_categorias FOR SELECT
  TO anon
  USING (true);

-- Grants necessários para PostgREST acessar a tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precos_categorias TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Seed de defaults para todas as fazendas existentes
INSERT INTO public.precos_categorias (fazenda_id, categoria, preco_kg)
SELECT f.id, cat.categoria, cat.preco
FROM public.fazendas f
CROSS JOIN (VALUES
  ('Bezerro', 12.00),
  ('Bezerra', 11.50),
  ('Novilha', 11.00),
  ('Garrote', 9.50),
  ('Boi Magro', 10.00),
  ('Boi Gordo', 11.67),
  ('Vaca', 10.83),
  ('Touro', 15.00)
) AS cat(categoria, preco)
WHERE NOT EXISTS (
  SELECT 1 FROM public.precos_categorias pc
  WHERE pc.fazenda_id = f.id AND pc.categoria = cat.categoria
)
ON CONFLICT (fazenda_id, categoria) DO NOTHING;

-- Trigger para seed automoatico em novas fazendas
CREATE OR REPLACE FUNCTION public.seed_precos_categorias_nova_fazenda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.precos_categorias (fazenda_id, categoria, preco_kg)
  VALUES
    (NEW.id, 'Bezerro', 12.00),
    (NEW.id, 'Bezerra', 11.50),
    (NEW.id, 'Novilha', 11.00),
    (NEW.id, 'Garrote', 9.50),
    (NEW.id, 'Boi Magro', 10.00),
    (NEW.id, 'Boi Gordo', 11.67),
    (NEW.id, 'Vaca', 10.83),
    (NEW.id, 'Touro', 15.00)
  ON CONFLICT (fazenda_id, categoria) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_seed_precos_categorias ON public.fazendas;
CREATE TRIGGER trg_seed_precos_categorias
  AFTER INSERT ON public.fazendas
  FOR EACH ROW EXECUTE FUNCTION public.seed_precos_categorias_nova_fazenda();
