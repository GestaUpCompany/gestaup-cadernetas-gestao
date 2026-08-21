-- Tabela de usuários (para sistema web)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);

-- Tabela de fazendas
CREATE TABLE fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acesso_id TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  planilha_id TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para fazendas
CREATE INDEX idx_fazendas_nome ON fazendas(nome);
CREATE INDEX idx_fazendas_ativo ON fazendas(ativo);
CREATE INDEX idx_fazendas_acesso_id ON fazendas(acesso_id);

-- Tabela de dispositivos
CREATE TABLE dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  nome TEXT,
  modelo TEXT,
  plataforma TEXT,
  ultimo_acesso TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para dispositivos
CREATE INDEX idx_dispositivos_fazenda ON dispositivos(fazenda_id);
CREATE INDEX idx_dispositivos_device_id ON dispositivos(device_id);
CREATE INDEX idx_dispositivos_ativo ON dispositivos(ativo);;
