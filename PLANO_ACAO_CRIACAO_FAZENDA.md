# Plano de Ação: Criação Automática de Conta Controller

## Objetivo
Implementar a criação automática de conta controller ao criar uma nova fazenda, eliminando a necessidade de criar o usuário manualmente.

## Regra de Senha
A senha será gerada automaticamente usando o formato: `acesso_id + "2026"`

**Exemplo:**
- acesso_id = "alegria" → senha = "alegria2026"
- acesso_id = "fazenda123" → senha = "fazenda1232026"

## Tarefas

### 1. Modificar NovaFazenda.tsx para incluir campos de criação de usuário
- Adicionar campo **obrigatório** para email do controller
- Adicionar checkbox para criar usuário automaticamente (padrão: marcado)

### 2. Criar função em fazendasService que gera senha e cria usuário controller
- Implementar função `createFazendaWithController` que:
  - Gera senha usando a regra `acesso_id + "2026"`
  - Chama `signUp` do authService para criar usuário no Supabase Auth
  - Cria registro na tabela `usuarios` com papel='controller'
  - Cria registro na tabela `fazendas`

### 3. Inserir registro na tabela usuario_fazenda
- Após criar usuário e fazenda, inserir registro na tabela `usuario_fazenda`
- Associar o usuário à fazenda criada
- Definir papel como 'controller' e ativo como true

### 4. Exibir credenciais de acesso após criação da fazenda
- Mostrar modal ou alerta com as credenciais de acesso:
  - Email do controller
  - Senha gerada (acesso_id + 2026)
- Incluir opção para copiar as credenciais
- Instruir o admin a enviar as credenciais para o controller

## Fluxo Atual vs Fluxo Proposto

### Fluxo Atual (Incompleto)
1. Admin cria fazenda → apenas insere na tabela `fazendas`
2. Admin precisa criar usuário controller separadamente
3. Admin precisa associar usuário à fazenda manualmente

### Fluxo Proposto (Automatizado)
1. Admin preenche dados da fazenda + email do controller (opcional)
2. Sistema cria fazenda, usuário controller e associação automaticamente
3. Sistema exibe credenciais de acesso para o admin enviar ao controller

## Benefícios
- Elimina etapas manuais
- Garante que toda fazenda tenha um usuário controller associado
- Reduz erros humanos
- Melhora experiência do usuário
- Padroniza o processo de onboarding de novas fazendas
