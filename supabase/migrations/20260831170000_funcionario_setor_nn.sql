-- Funcionario <-> Setor: migrar de 1:N (funcionarios.setor_id) para N:N
-- 1. Criar tabela de juncao funcionario_setores
-- 2. Backfill a partir de funcionarios.setor_id existente
-- 3. RLS na junction
-- 4. View v_funcionarios_com_setores para leitura agregada
-- 5. Manter funcionarios.setor_id e FK durante transicao (drop futuro)

-- ============================================================
-- 1. Tabela de juncao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funcionario_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (funcionario_id, setor_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_funcionario_setores_funcionario
  ON public.funcionario_setores (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_funcionario_setores_setor
  ON public.funcionario_setores (setor_id);
CREATE INDEX IF NOT EXISTS idx_funcionario_setores_fazenda
  ON public.funcionario_setores (fazenda_id);

-- ============================================================
-- 2. Backfill: copiar vinculos existentes de funcionarios.setor_id
-- ============================================================
INSERT INTO public.funcionario_setores (funcionario_id, setor_id, fazenda_id)
SELECT f.id, f.setor_id, f.fazenda_id
FROM public.funcionarios f
WHERE f.setor_id IS NOT NULL
  AND f.deleted_at IS NULL
ON CONFLICT (funcionario_id, setor_id) DO NOTHING;

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE public.funcionario_setores ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario vinculado a fazenda OU peao da fazenda
CREATE POLICY "Usuario vinculado pode ler funcionario_setores"
  ON public.funcionario_setores FOR SELECT
  TO authenticated
  USING (public.user_has_fazenda_access(fazenda_id));

CREATE POLICY "Peao pode ler funcionario_setores da sua fazenda"
  ON public.funcionario_setores FOR SELECT
  TO authenticated
  USING (public.get_peao_fazenda_id() = fazenda_id);

-- INSERT/UPDATE/DELETE: authenticated (mesmo padrao de funcionarios)
CREATE POLICY "Authenticated insert funcionario_setores"
  ON public.funcionario_setores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update funcionario_setores"
  ON public.funcionario_setores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete funcionario_setores"
  ON public.funcionario_setores FOR DELETE
  TO authenticated
  USING (true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionario_setores TO authenticated;

-- ============================================================
-- 4. View agregada para leitura no frontend
-- ============================================================
CREATE OR REPLACE VIEW public.v_funcionarios_com_setores AS
SELECT
  f.id AS funcionario_id,
  f.fazenda_id,
  f.nome,
  f.cargo,
  f.ativo,
  f.deleted_at,
  COALESCE(
    array_agg(DISTINCT fs.setor_id) FILTER (WHERE fs.setor_id IS NOT NULL AND s.ativo = true AND s.deleted_at IS NULL),
    ARRAY[]::uuid[]
  ) AS setor_ids,
  COALESCE(
    array_agg(DISTINCT s.nome) FILTER (WHERE fs.setor_id IS NOT NULL AND s.ativo = true AND s.deleted_at IS NULL),
    ARRAY[]::text[]
  ) AS setor_nomes
FROM public.funcionarios f
LEFT JOIN public.funcionario_setores fs ON fs.funcionario_id = f.id
LEFT JOIN public.setores s ON s.id = fs.setor_id
GROUP BY f.id, f.fazenda_id, f.nome, f.cargo, f.ativo, f.deleted_at;

GRANT SELECT ON public.v_funcionarios_com_setores TO authenticated;
