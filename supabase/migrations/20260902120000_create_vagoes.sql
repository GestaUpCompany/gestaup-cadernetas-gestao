-- ============================================================================
-- MIGRAÇÃO - Cria tabela vagoes (Cadastros Auxiliares > Máquinas & Equipamentos)
-- Campos: marca, modelo, capacidade (kg)
-- Padrão equivalente a implementos/maquinas_veiculos, com RLS e soft delete.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vagoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  capacidade_kg numeric(12,2) NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vagoes_fazenda_id
  ON public.vagoes (fazenda_id);

CREATE INDEX IF NOT EXISTS idx_vagoes_fazenda_deleted_at
  ON public.vagoes (fazenda_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vagoes_deleted_at
  ON public.vagoes (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.vagoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated select vagoes" ON public.vagoes;
CREATE POLICY "Authenticated select vagoes"
  ON public.vagoes
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated insert vagoes" ON public.vagoes;
CREATE POLICY "Authenticated insert vagoes"
  ON public.vagoes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update vagoes" ON public.vagoes;
CREATE POLICY "Authenticated update vagoes"
  ON public.vagoes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete vagoes" ON public.vagoes;
CREATE POLICY "Authenticated delete vagoes"
  ON public.vagoes
  FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Trigger updated_at
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_vagoes_updated_at ON public.vagoes;

CREATE TRIGGER trg_vagoes_updated_at
  BEFORE UPDATE ON public.vagoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
