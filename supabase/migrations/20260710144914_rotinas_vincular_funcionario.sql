-- Ajusta rotinas para apontar para funcionarios que acessam o app
ALTER TABLE public.rotinas
DROP CONSTRAINT IF EXISTS rotinas_usuario_id_fkey;

ALTER TABLE public.rotinas
DROP COLUMN IF EXISTS usuario_id;

ALTER TABLE public.rotinas
ADD COLUMN IF NOT EXISTS funcionario_id uuid NOT NULL;

ALTER TABLE public.rotinas
ADD CONSTRAINT rotinas_funcionario_id_fkey
FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.rotinas.funcionario_id IS 'Funcionário que acessa o app e executa a rotina';;
