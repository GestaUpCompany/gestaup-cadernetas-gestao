-- Criar tabela peoes para armazenar credenciais de login
CREATE TABLE peoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- Senha em texto simples (será usada pela Edge Function)
  fazenda_id TEXT NOT NULL, -- acesso_id da fazenda
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por fazenda_id
CREATE INDEX idx_peoes_fazenda_id ON peoes(fazenda_id);

-- Criar índice para busca rápida por email
CREATE INDEX idx_peoes_email ON peoes(email);;
