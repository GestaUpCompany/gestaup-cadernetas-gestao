
-- ============================================================================
-- MIGRAÇÃO - Soft delete para tabelas auxiliares
-- Adiciona deleted_at em lotes, pastos, racas e fornecedores
-- sem perder dados existentes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Adicionar coluna deleted_at (sem NOT NULL, default NULL)
-- ----------------------------------------------------------------------------
ALTER TABLE public.lotes
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.pastos
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.racas
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.fornecedores
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- ----------------------------------------------------------------------------
-- 2. Garantir que nenhum registro existente fique marcado como excluído
-- ----------------------------------------------------------------------------
UPDATE public.lotes SET deleted_at = NULL WHERE deleted_at IS NOT NULL;
UPDATE public.pastos SET deleted_at = NULL WHERE deleted_at IS NOT NULL;
UPDATE public.racas SET deleted_at = NULL WHERE deleted_at IS NOT NULL;
UPDATE public.fornecedores SET deleted_at = NULL WHERE deleted_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Indexes para performance em filtros de deleted_at
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lotes_fazenda_deleted_at
  ON public.lotes (fazenda_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pastos_fazenda_deleted_at
  ON public.pastos (fazenda_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_racas_fazenda_deleted_at
  ON public.racas (fazenda_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fornecedores_fazenda_deleted_at
  ON public.fornecedores (fazenda_id, deleted_at)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 4. Atualizar políticas RLS para ocultar registros excluídos
-- ----------------------------------------------------------------------------

-- Lotes
DROP POLICY IF EXISTS "Authenticated select lotes" ON public.lotes;
CREATE POLICY "Authenticated select lotes"
  ON public.lotes
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated update lotes" ON public.lotes;
CREATE POLICY "Authenticated update lotes"
  ON public.lotes
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated delete lotes" ON public.lotes;
CREATE POLICY "Authenticated delete lotes"
  ON public.lotes
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

-- Pastos
DROP POLICY IF EXISTS "Authenticated select pastos" ON public.pastos;
CREATE POLICY "Authenticated select pastos"
  ON public.pastos
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated update pastos" ON public.pastos;
CREATE POLICY "Authenticated update pastos"
  ON public.pastos
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated delete pastos" ON public.pastos;
CREATE POLICY "Authenticated delete pastos"
  ON public.pastos
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

-- Raças
DROP POLICY IF EXISTS "Authenticated select" ON public.racas;
CREATE POLICY "Authenticated select"
  ON public.racas
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated update" ON public.racas;
CREATE POLICY "Authenticated update"
  ON public.racas
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated delete" ON public.racas;
CREATE POLICY "Authenticated delete"
  ON public.racas
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

-- Manter política pública de racas ativas, adicionando filtro de deleted_at
DROP POLICY IF EXISTS "Racas ativas podem ser lidas" ON public.racas;
CREATE POLICY "Racas ativas podem ser lidas"
  ON public.racas
  FOR SELECT
  TO public
  USING (ativo = true AND deleted_at IS NULL);

-- Fornecedores
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.fornecedores;
CREATE POLICY "Enable read access for all authenticated users"
  ON public.fornecedores
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.fornecedores;
CREATE POLICY "Enable update for all authenticated users"
  ON public.fornecedores
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON public.fornecedores;
CREATE POLICY "Enable delete for all authenticated users"
  ON public.fornecedores
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);
;
