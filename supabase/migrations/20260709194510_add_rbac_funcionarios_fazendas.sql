-- Adiciona colunas de controle de acesso (RBAC) para funcionários do app
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS acessa_app BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS cadernetas_permitidas JSONB DEFAULT '[]'::jsonb;

-- Adiciona flag na fazenda para ativar/desativar RBAC no app
ALTER TABLE public.fazendas
  ADD COLUMN IF NOT EXISTS controle_acesso_habilitado BOOLEAN DEFAULT false;

-- Documentação das colunas
COMMENT ON COLUMN public.funcionarios.acessa_app IS 'Indica se o funcionário pode usar o app das cadernetas';
COMMENT ON COLUMN public.funcionarios.pin_hash IS 'Hash do PIN numérico para acesso ao app';
COMMENT ON COLUMN public.funcionarios.cadernetas_permitidas IS 'Lista de slugs das cadernetas que o funcionário pode acessar';
COMMENT ON COLUMN public.fazendas.controle_acesso_habilitado IS 'Quando true, o app exige identificação de funcionário com PIN e filtra cadernetas permitidas';;
