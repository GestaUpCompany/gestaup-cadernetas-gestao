-- ============================================================================
-- MIGRAÇÃO - Fábrica Confinamento (registros de fabricação de suplemento TMR)
-- Master-detail: registros_fabrica_confinamento + registros_fabrica_confinamento_insumos
-- Registra a quantidade de suplemento fabricada e carregada no vagão TMR
-- para tratar os cochos dos currais em um índice de trato do dia.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabela master: registros_fabrica_confinamento
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros_fabrica_confinamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data timestamptz NOT NULL,
  ordem_trato integer NOT NULL,
  tipo text NOT NULL DEFAULT 'engorda',
  formulacao_id uuid REFERENCES public.formulacoes(id) ON DELETE SET NULL,
  vagao_id uuid REFERENCES public.vagoes(id) ON DELETE SET NULL,
  total_previsto numeric(14,2) NOT NULL DEFAULT 0,
  total_produzido numeric(14,2) NOT NULL DEFAULT 0,
  concluido boolean NOT NULL DEFAULT false,
  nome_usuario text,
  dispositivo_id uuid,
  sync_status text NOT NULL DEFAULT 'pending',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Tabela detail: registros_fabrica_confinamento_insumos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros_fabrica_confinamento_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros_fabrica_confinamento(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  kg_previsto numeric(14,2) NOT NULL DEFAULT 0,
  kg_produzido numeric(14,2) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fabrica_conf_fazenda_data
  ON public.registros_fabrica_confinamento (fazenda_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_fabrica_conf_fazenda_deleted_at
  ON public.registros_fabrica_confinamento (fazenda_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fabrica_conf_tipo_dieta
  ON public.registros_fabrica_confinamento (fazenda_id, tipo, formulacao_id, data DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fabrica_conf_insumos_registro_id
  ON public.registros_fabrica_confinamento_insumos (registro_id);

-- ----------------------------------------------------------------------------
-- RLS - registros_fabrica_confinamento
-- ----------------------------------------------------------------------------
ALTER TABLE public.registros_fabrica_confinamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated select fabrica conf" ON public.registros_fabrica_confinamento;
CREATE POLICY "Authenticated select fabrica conf"
  ON public.registros_fabrica_confinamento
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated insert fabrica conf" ON public.registros_fabrica_confinamento;
CREATE POLICY "Authenticated insert fabrica conf"
  ON public.registros_fabrica_confinamento
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update fabrica conf" ON public.registros_fabrica_confinamento;
CREATE POLICY "Authenticated update fabrica conf"
  ON public.registros_fabrica_confinamento
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete fabrica conf" ON public.registros_fabrica_confinamento;
CREATE POLICY "Authenticated delete fabrica conf"
  ON public.registros_fabrica_confinamento
  FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- RLS - registros_fabrica_confinamento_insumos
-- ----------------------------------------------------------------------------
ALTER TABLE public.registros_fabrica_confinamento_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated select fabrica conf insumos" ON public.registros_fabrica_confinamento_insumos;
CREATE POLICY "Authenticated select fabrica conf insumos"
  ON public.registros_fabrica_confinamento_insumos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert fabrica conf insumos" ON public.registros_fabrica_confinamento_insumos;
CREATE POLICY "Authenticated insert fabrica conf insumos"
  ON public.registros_fabrica_confinamento_insumos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update fabrica conf insumos" ON public.registros_fabrica_confinamento_insumos;
CREATE POLICY "Authenticated update fabrica conf insumos"
  ON public.registros_fabrica_confinamento_insumos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete fabrica conf insumos" ON public.registros_fabrica_confinamento_insumos;
CREATE POLICY "Authenticated delete fabrica conf insumos"
  ON public.registros_fabrica_confinamento_insumos
  FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Triggers updated_at
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_fabrica_conf_updated_at ON public.registros_fabrica_confinamento;

CREATE TRIGGER trg_fabrica_conf_updated_at
  BEFORE UPDATE ON public.registros_fabrica_confinamento
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fabrica_conf_insumos_updated_at ON public.registros_fabrica_confinamento_insumos;

CREATE TRIGGER trg_fabrica_conf_insumos_updated_at
  BEFORE UPDATE ON public.registros_fabrica_confinamento_insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_fabrica_confinamento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_fabrica_confinamento_insumos TO authenticated;
