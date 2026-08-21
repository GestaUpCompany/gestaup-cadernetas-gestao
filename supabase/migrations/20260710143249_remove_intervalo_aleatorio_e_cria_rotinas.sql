-- Remove o tipo intervalo_aleatorio e a coluna intervalo_maximo de checklist_regras
ALTER TABLE public.checklist_regras
DROP CONSTRAINT IF EXISTS checklist_regras_tipo_check;

ALTER TABLE public.checklist_regras
ADD CONSTRAINT checklist_regras_tipo_check
CHECK (tipo = ANY (ARRAY['periodo', 'excecao']));

ALTER TABLE public.checklist_regras
DROP CONSTRAINT IF EXISTS checklist_regras_intervalo_check;

ALTER TABLE public.checklist_regras
DROP COLUMN IF EXISTS intervalo_maximo;

-- Atualiza regras antigas do tipo intervalo_aleatorio para periodo
UPDATE public.checklist_regras SET tipo = 'periodo' WHERE tipo = 'intervalo_aleatorio';

-- Cria tabela de rotinas
CREATE TABLE IF NOT EXISTS public.rotinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cadernetas text[] NOT NULL DEFAULT '{}',
  dias_semana smallint[] NOT NULL DEFAULT '{}',
  horario time,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rotinas IS 'Rotinas de checklist por usuário, cadernetas e dias da semana';

-- Habilita RLS
ALTER TABLE public.rotinas ENABLE ROW LEVEL SECURITY;

-- Policies para rotinas
DROP POLICY IF EXISTS rotinas_select_authenticated ON public.rotinas;
CREATE POLICY rotinas_select_authenticated ON public.rotinas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS rotinas_insert_authenticated ON public.rotinas;
CREATE POLICY rotinas_insert_authenticated ON public.rotinas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS rotinas_update_authenticated ON public.rotinas;
CREATE POLICY rotinas_update_authenticated ON public.rotinas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rotinas_delete_authenticated ON public.rotinas;
CREATE POLICY rotinas_delete_authenticated ON public.rotinas
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS rotinas_select_anon ON public.rotinas;
CREATE POLICY rotinas_select_anon ON public.rotinas
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS rotinas_insert_anon ON public.rotinas;
CREATE POLICY rotinas_insert_anon ON public.rotinas
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS rotinas_update_anon ON public.rotinas;
CREATE POLICY rotinas_update_anon ON public.rotinas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rotinas_delete_anon ON public.rotinas;
CREATE POLICY rotinas_delete_anon ON public.rotinas
  FOR DELETE TO anon USING (true);

-- Grants para rotinas
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.rotinas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.rotinas TO anon;;
