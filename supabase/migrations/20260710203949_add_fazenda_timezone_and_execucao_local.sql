ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Cuiaba';
ALTER TABLE execucoes_rotina ADD COLUMN IF NOT EXISTS primeiro_acesso_local TEXT;
ALTER TABLE execucoes_rotina ADD COLUMN IF NOT EXISTS primeiro_registro_local TEXT;;
