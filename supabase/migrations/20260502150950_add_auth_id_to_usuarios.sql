-- Adicionar coluna auth_id para armazenar o ID do Supabase Auth
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- Atualizar usuários existentes para usar o mesmo ID (para compatibilidade)
-- Assumindo que os IDs já correspondem, não fazemos update para evitar dados inconsistentes;
