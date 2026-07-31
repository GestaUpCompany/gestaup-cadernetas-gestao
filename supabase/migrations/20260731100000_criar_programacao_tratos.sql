-- Programação de Tratos do Confinamento
--
-- Cria 4 tabelas para o módulo de programação de tratos:
-- 1. programacao_tratos: configuração vigente (singleton por fazenda)
-- 2. programacao_tratos_percentuais: distribuição percentual por trato
-- 3. programacao_tratos_currais: kg MN por curral para o plano base (Dia 1)
-- 4. registros_oferta_trato: histórico operacional (preenchido pelo PWA na fase 2)

-- ============================================================
-- 1. programacao_tratos (configuração vigente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programacao_tratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  quantidade_tratos integer NOT NULL DEFAULT 2 CHECK (quantidade_tratos > 0),
  modo_total text NOT NULL DEFAULT 'manual' CHECK (modo_total IN ('manual', 'percent_pv')),
  percent_pv numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_programacao_tratos_fazenda ON public.programacao_tratos (fazenda_id);
ALTER TABLE public.programacao_tratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_programacao_tratos_select ON public.programacao_tratos
  FOR SELECT USING (true);
CREATE POLICY rls_programacao_tratos_insert ON public.programacao_tratos
  FOR INSERT WITH CHECK (true);
CREATE POLICY rls_programacao_tratos_update ON public.programacao_tratos
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY rls_programacao_tratos_delete ON public.programacao_tratos
  FOR DELETE USING (true);

-- ============================================================
-- 2. programacao_tratos_percentuais (distribuição por trato)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programacao_tratos_percentuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programacao_id uuid NOT NULL REFERENCES public.programacao_tratos(id) ON DELETE CASCADE,
  ordem_trato integer NOT NULL CHECK (ordem_trato > 0),
  percentual numeric NOT NULL DEFAULT 0 CHECK (percentual >= 0 AND percentual <= 100),
  horario_sugerido time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programacao_id, ordem_trato)
);

CREATE INDEX idx_programacao_tratos_percentuais_prog ON public.programacao_tratos_percentuais (programacao_id);
ALTER TABLE public.programacao_tratos_percentuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_programacao_tratos_percentuais_select ON public.programacao_tratos_percentuais
  FOR SELECT USING (true);
CREATE POLICY rls_programacao_tratos_percentuais_insert ON public.programacao_tratos_percentuais
  FOR INSERT WITH CHECK (true);
CREATE POLICY rls_programacao_tratos_percentuais_update ON public.programacao_tratos_percentuais
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY rls_programacao_tratos_percentuais_delete ON public.programacao_tratos_percentuais
  FOR DELETE USING (true);

-- ============================================================
-- 3. programacao_tratos_currais (kg MN por curral, plano base)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programacao_tratos_currais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programacao_id uuid NOT NULL REFERENCES public.programacao_tratos(id) ON DELETE CASCADE,
  curral_id uuid NOT NULL REFERENCES public.currais(id) ON DELETE CASCADE,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  kg_mn_dia numeric NOT NULL DEFAULT 0,
  n_cabecas_snapshot integer,
  peso_vivo_medio_snapshot numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programacao_id, curral_id)
);

CREATE INDEX idx_programacao_tratos_currais_prog ON public.programacao_tratos_currais (programacao_id);
CREATE INDEX idx_programacao_tratos_currais_curral ON public.programacao_tratos_currais (curral_id);
ALTER TABLE public.programacao_tratos_currais ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_programacao_tratos_currais_select ON public.programacao_tratos_currais
  FOR SELECT USING (true);
CREATE POLICY rls_programacao_tratos_currais_insert ON public.programacao_tratos_currais
  FOR INSERT WITH CHECK (true);
CREATE POLICY rls_programacao_tratos_currais_update ON public.programacao_tratos_currais
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY rls_programacao_tratos_currais_delete ON public.programacao_tratos_currais
  FOR DELETE USING (true);

-- ============================================================
-- 4. registros_oferta_trato (histórico operacional, fase 2 / PWA)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.registros_oferta_trato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  curral_id uuid NOT NULL REFERENCES public.currais(id) ON DELETE CASCADE,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  data date NOT NULL,
  ordem_trato integer NOT NULL CHECK (ordem_trato > 0),
  kg_planejado numeric,
  kg_ofertado_real numeric,
  leitura_cocho_nota integer,
  programacao_id uuid REFERENCES public.programacao_tratos(id) ON DELETE SET NULL,
  nome_usuario text,
  dispositivo_id uuid,
  sync_status text DEFAULT 'pending',
  version integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (curral_id, data, ordem_trato)
);

CREATE INDEX idx_registros_oferta_trato_fazenda ON public.registros_oferta_trato (fazenda_id);
CREATE INDEX idx_registros_oferta_trato_data ON public.registros_oferta_trato (data);
CREATE INDEX idx_registros_oferta_trato_curral ON public.registros_oferta_trato (curral_id);
CREATE INDEX idx_registros_oferta_trato_sync ON public.registros_oferta_trato (sync_status);
ALTER TABLE public.registros_oferta_trato ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_registros_oferta_trato_select ON public.registros_oferta_trato
  FOR SELECT USING (true);
CREATE POLICY rls_registros_oferta_trato_insert ON public.registros_oferta_trato
  FOR INSERT WITH CHECK (true);
CREATE POLICY rls_registros_oferta_trato_update ON public.registros_oferta_trato
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY rls_registros_oferta_trato_delete ON public.registros_oferta_trato
  FOR DELETE USING (true);

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programacao_tratos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programacao_tratos_percentuais TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programacao_tratos_currais TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_oferta_trato TO anon, authenticated;

-- ============================================================
-- Trigger updated_at
-- ============================================================
CREATE OR REPLACE TRIGGER update_programacao_tratos_updated_at
  BEFORE UPDATE ON public.programacao_tratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_programacao_tratos_percentuais_updated_at
  BEFORE UPDATE ON public.programacao_tratos_percentuais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_programacao_tratos_currais_updated_at
  BEFORE UPDATE ON public.programacao_tratos_currais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_registros_oferta_trato_updated_at
  BEFORE UPDATE ON public.registros_oferta_trato
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
