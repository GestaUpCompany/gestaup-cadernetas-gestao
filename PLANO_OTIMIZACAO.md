# Plano de Otimização - GestaUp Cadernetas Gestão

## Data de Criação
04/05/2026

## Resumo Executivo
Este plano aborda todos os problemas críticos identificados na análise do projeto, focando principalmente em segurança (RLS desativado), performance (índices desnecessários) e configuração do ambiente.

---

## Prioridade 1: CRÍTICO - Segurança do Banco de Dados

### 1.1 Habilitar RLS em Todas as Tabelas Públicas

**Status:** CRÍTICO - RLS desativado em 29 tabelas públicas

**Impacto:** Todos os dados estão expostos publicamente via API

**Tabelas afetadas:**
- usuarios, fazendas, dispositivos, usuario_fazenda, pastos, lotes, categorias
- insumos, mineral, proteinado, racao, dietas, movimentacao_estoque
- fornecedores, frigorificos, peoes, funcionarios
- registros_maternidade, registros_pastagens, registros_rodeio, registros_suplementacao
- registros_bebedouros, registros_movimentacao, registros_enfermaria
- registros_entrada_insumos, registros_saida_insumos
- sync_queue, conflitos, audit_log

**Ação:**
```sql
-- Migration: enable_rls_all_tables
-- Habilitar RLS em todas as tabelas públicas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fazendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_fazenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mineral ENABLE ROW LEVEL SECURITY;
ALTER TABLE proteinado ENABLE ROW LEVEL SECURITY;
ALTER TABLE racao ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE frigorificos ENABLE ROW LEVEL SECURITY;
ALTER TABLE peoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_maternidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_pastagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_rodeio ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_suplementacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_bebedouros ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_movimentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_enfermaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_entrada_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_saida_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Imediato (antes de qualquer outra alteração)
**Validação:** Verificar que RLS está habilitado em todas as tabelas via `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`

---

### 1.2 Revisar e Ativar Políticas RLS Existentes

**Status:** CRÍTICO - 15 tabelas têm políticas mas RLS desativado

**Tabelas afetadas:**
- dietas, fazendas, fornecedores, frigorificos, funcionarios
- insumos, lotes, mineral, pastos, peoes
- proteinado, racao, usuarios

**Ação:**
1. Revisar todas as políticas existentes
2. Verificar se as políticas estão corretas e seguras
3. Testar cada política individualmente
4. Documentar as políticas aprovadas

**Validação:**
```sql
-- Verificar políticas por tabela
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Imediato (após habilitar RLS)
**Dependência:** 1.1

---

### 1.3 Proteger Coluna Password na Tabela Peões

**Status:** CRÍTICO - Coluna sensível exposta sem proteção

**Problema:** Tabela `peoes` tem coluna `password` exposta via API

**Opções de Solução:**

**Opção A (Recomendada):** Remover coluna password e usar apenas Supabase Auth
```sql
-- Migration: remove_password_from_peoes
-- Se a coluna password não é usada, remover
ALTER TABLE peoes DROP COLUMN IF EXISTS password;
```

**Opção B:** Criar política para esconder coluna password
```sql
-- Migration: hide_password_column_peoes
-- Criar view sem coluna password
CREATE OR REPLACE VIEW peoes_safe AS
SELECT id, fazenda_id, nome, telefone, email, ativo, created_at, updated_at
FROM peoes;

-- Grant acesso à view em vez da tabela
GRANT SELECT ON peoes_safe TO authenticated;
GRANT SELECT ON peoes_safe TO anon;

-- Revogar acesso direto à tabela
REVOKE SELECT ON peoes FROM authenticated;
REVOKE SELECT ON peoes FROM anon;
```

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Imediato
**Dependência:** 1.1

---

### 1.4 Fixar search_path na Função update_updated_at_column

**Status:** MÉDIO - Vulnerabilidade de segurança

**Problema:** Função tem search_path mutável

**Ação:**
```sql
-- Migration: fix_search_path_trigger_function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Alta prioridade
**Dependência:** 1.1

---

### 1.5 Restringir Listagem do Bucket Logos

**Status:** MÉDIO - Exposição de dados

**Problema:** Bucket público permite listagem de todos os arquivos

**Ação:**
```sql
-- Via Supabase Dashboard ou SQL
-- Remover política de listagem ampla
-- Manter apenas política de leitura individual por arquivo
```

**Passos no Dashboard:**
1. Acessar Storage > Buckets > logos
2. Ir em Policies
3. Remover política "Public Access" que permite SELECT em storage.objects
4. Criar política que permite SELECT apenas com condições específicas

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Alta prioridade

---

### 1.6 Habilitar Proteção Contra Senhas Vazadas

**Status:** MÉDIO - Segurança de autenticação

**Problema:** HaveIBeenPwned desativado

**Ação:**
1. Acessar Supabase Dashboard
2. Ir em Authentication > Providers
3. Habilitar "Leaked password protection"
4. Configurar conforme documentação: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Alta prioridade

---

## Prioridade 2: ALTA - Performance

### 2.1 Remover Índices Não Utilizados

**Status:** MÉDIO - Performance e manutenção

**Problema:** 44 índices nunca foram usados

**Índices para remover:**
- idx_usuarios_ativo
- idx_fazendas_ativo
- idx_dispositivos_device_id
- idx_dispositivos_ativo
- idx_usuario_fazenda_papel
- idx_usuario_fazenda_ativo
- idx_movimentacao_sync (registros_movimentacao)
- idx_movimentacao_dispositivo (registros_movimentacao)
- idx_pastos_nome
- idx_pastos_ativo
- idx_insumos_nome
- idx_insumos_tipo
- idx_lotes_ativo
- idx_insumos_ativo
- idx_categorias_nome
- idx_categorias_ativo
- idx_movimentacao_estoque_tabela_registro
- idx_movimentacao_estoque_data
- idx_movimentacao_estoque_tipo
- E todos os outros índices marcados como "unused_index"

**Ação:**
```sql
-- Migration: remove_unused_indexes
DROP INDEX IF EXISTS idx_usuarios_ativo;
DROP INDEX IF EXISTS idx_fazendas_ativo;
DROP INDEX IF EXISTS idx_dispositivos_device_id;
DROP INDEX IF EXISTS idx_dispositivos_ativo;
DROP INDEX IF EXISTS idx_usuario_fazenda_papel;
DROP INDEX IF EXISTS idx_usuario_fazenda_ativo;
DROP INDEX IF EXISTS idx_movimentacao_sync;
DROP INDEX IF EXISTS idx_movimentacao_dispositivo;
DROP INDEX IF EXISTS idx_pastos_nome;
DROP INDEX IF EXISTS idx_pastos_ativo;
DROP INDEX IF EXISTS idx_insumos_nome;
DROP INDEX IF EXISTS idx_insumos_tipo;
DROP INDEX IF EXISTS idx_lotes_ativo;
DROP INDEX IF EXISTS idx_insumos_ativo;
DROP INDEX IF EXISTS idx_categorias_nome;
DROP INDEX IF EXISTS idx_categorias_ativo;
DROP INDEX IF EXISTS idx_movimentacao_estoque_tabela_registro;
DROP INDEX IF EXISTS idx_movimentacao_estoque_data;
DROP INDEX IF EXISTS idx_movimentacao_estoque_tipo;
-- ... continuar para todos os 44 índices
```

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Média prioridade (após correções de segurança)
**Validação:** Rodar novamente advisors de performance para confirmar remoção

---

### 2.2 Consolidar Políticas RLS Múltiplas

**Status:** MÉDIO - Performance de queries

**Problema:** 5 tabelas têm múltiplas políticas permissivas para o mesmo role/action

**Tabelas afetadas:**
- fazendas (Admin full access, Controller fazendas)
- funcionarios (Admins, Controllers, Peões)
- insumos (Admins, Controllers, Peões)
- lotes (Admins, Controllers, Peões)
- pastos (Admins, Controllers, Peões)

**Ação:**
Consolidar múltiplas políticas em uma única política usando OR lógico:

**Exemplo para fazendas:**
```sql
-- Antes (múltiplas políticas):
CREATE POLICY "Admin full access" ON fazendas
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Controller fazendas" ON fazendas
  FOR SELECT USING (auth.jwt() ->> 'role' = 'controller');

-- Depois (única política consolidada):
CREATE POLICY "Admin and Controller access" ON fazendas
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'controller'
  );
```

**Responsável:** Desenvolvedor Backend/DBA
**Prazo:** Média prioridade
**Dependência:** 1.2

---

## Prioridade 3: MÉDIA - Configuração

### 3.1 Atualizar Arquivo .env

**Status:** BAIXO - Configuração de ambiente

**Problema:** Chave anon está como placeholder

**Ação:**
```bash
# Atualizar .env com a chave real
VITE_SUPABASE_URL=https://nrwljcvhwbezmoummxbl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2xqY3Zod2Jlem1vdW1teGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjIyNDEsImV4cCI6MjA5MzI5ODI0MX0.-es-LlZ61AtLPjoORm2RHi5AviDoKdI5bV14rukTpww
```

**Responsável:** Desenvolvedor Frontend
**Prazo:** Imediato

---

## Cronograma de Execução

### Fase 1: Segurança Crítica (Dias 1-2)
- [ ] 1.1 Habilitar RLS em todas as tabelas
- [ ] 1.2 Revisar e ativar políticas RLS existentes
- [ ] 1.3 Proteger coluna password na tabela peões
- [ ] 1.4 Fixar search_path na função trigger
- [ ] 3.1 Atualizar arquivo .env

### Fase 2: Segurança Adicional (Dia 3)
- [ ] 1.5 Restringir listagem do bucket logos
- [ ] 1.6 Habilitar proteção contra senhas vazadas

### Fase 3: Performance (Dias 4-5)
- [ ] 2.1 Remover índices não utilizados
- [ ] 2.2 Consolidar políticas RLS múltiplas

### Fase 4: Validação e Testes (Dia 6)
- [ ] Testar todas as funcionalidades da aplicação
- [ ] Verificar logs de erro
- [ ] Rodar advisors de segurança e performance novamente
- [ ] Documentar mudanças

---

## Checklist de Validação

### Segurança
- [ ] RLS habilitado em todas as 29 tabelas públicas
- [ ] Políticas RLS funcionando corretamente
- [ ] Coluna password não exposta via API
- [ ] Função update_updated_at_column com search_path fixado
- [ ] Bucket logos sem listagem ampla
- [ ] HaveIBeenPwned habilitado

### Performance
- [ ] Índices não utilizados removidos (44 índices)
- [ ] Políticas RLS consolidadas (5 tabelas)
- [ ] Advisors de performance sem warnings

### Funcionalidade
- [ ] Login funcionando
- [ ] Dashboard admin acessível
- [ ] Dashboard controller acessível
- [ ] Todas as cadernetas funcionando
- [ ] Criação/edição de registros funcionando

---

## Observações Importantes

1. **Ordem de execução é crítica:** Habilitar RLS antes de qualquer outra mudança
2. **Backup obrigatório:** Fazer backup do banco antes de qualquer alteração de schema
3. **Testes em ambiente de staging:** Testar todas as mudanças em staging antes de produção
4. **Monitoramento:** Monitorar logs após cada mudança para detectar problemas
5. **Rollback:** Ter plano de rollback pronto para cada migração

---

## Comandos Úteis

### Verificar RLS nas tabelas
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Verificar políticas RLS
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Verificar índices não utilizados
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY tablename, indexname;
```

### Verificar colunas sensíveis
```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name ILIKE '%password%'
OR column_name ILIKE '%senha%'
OR column_name ILIKE '%secret%'
OR column_name ILIKE '%token%';
```

---

## Contatos e Responsabilidades

- **Desenvolvedor Backend/DBA:** Responsável por migrations, RLS, índices
- **Desenvolvedor Frontend:** Responsável por .env e testes de integração
- **DevOps:** Responsável por backup e rollback

---

## Documentação Adicional

- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
