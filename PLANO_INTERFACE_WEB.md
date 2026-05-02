# Plano de Desenvolvimento - Interface Web Administrativa

**Versão:** 1.0  
**Data:** 02/05/2026  
**Status:** Planejamento  
**Repositório:** gestaup-cadernetas-gestao

---

## 1. Visão Geral

### 1.1 Objetivo
Criar interface web administrativa para gestão de fazendas GestaUp, permitindo:
- Admin: Visão macro de todas as fazendas, cadastro/edição de fazendas, upload de logos, gerenciamento de usuários
- Controller (Gerente): Acesso restrito à fazenda específica, visualização de dados, cadastros (pastos, lotes, funcionários, insumos)

### 1.2 Acessos (2 Níveis)
- **Admin**: Acesso total a todas as fazendas, pode criar/editar fazendas, gerenciar usuários
- **Controller (Gerente)**: Acesso restrito à fazenda específica, pode visualizar dados e criar cadastros
- **Peão**: Não usa o site, somente app móvel (cadernetas)

### 1.3 Escopo
- **Sistema Web**: Dashboard administrativo para gestão de fazendas
- **Autenticação**: Supabase Auth (login/senha)
- **Multi-tenant**: 25+ fazendas com isolamento de dados
- **Integração**: Supabase (já configurado)

---

## 2. Requisitos Funcionais

### 2.1 Autenticação
- Login com email/senha (Supabase Auth)
- Cadastro de usuários (apenas Admin pode criar)
- Recuperação de senha
- Sessão persistente
- Proteção de rotas (Admin vs Controller)

### 2.2 Funcionalidades Admin

#### Dashboard Admin
- Visão macro de todas as fazendas
- Lista de fazendas com cards
- Estatísticas: Total fazendas, total usuários, total registros
- Ações rápidas: Nova fazenda, Novo usuário

#### Cadastro de Fazendas
- Formulário com campos:
  - Nome (obrigatório)
  - Acesso ID (obrigatório, único)
  - CNPJ (opcional)
  - Endereço (opcional)
  - Telefone (opcional)
  - Email (opcional)
  - Logo (upload)
  - Planilha ID (opcional)
- Validação de acesso_id único
- Upload de logo para Supabase Storage
- Edição de fazendas existentes
- Ativação/desativação de fazendas

#### Gerenciamento de Usuários
- Lista de usuários
- Criar novo usuário (Admin ou Controller)
- Atribuir fazendas ao usuário (usuario_fazenda)
- Definir papel (admin ou controller)
- Ativação/desativação de usuários
- Edição de dados do usuário

### 2.3 Funcionalidades Controller

#### Dashboard Controller
- Visão da fazenda específica
- Estatísticas da fazenda: Total registros por caderneta
- Acesso às cadernetas (visualização)
- Acesso aos cadastros (pastos, lotes, funcionários, insumos)

#### Cadastros
- **Pastos**: Cadastro de pastos da fazenda
- **Lotes**: Cadastro de lotes da fazenda
- **Funcionários**: Cadastro de funcionários da fazenda
- **Insumos**: Cadastro de insumos da fazenda

#### Visualização de Cadernetas
- Lista de registros por caderneta
- Filtros e busca
- Detalhes do registro
- Exportação (opcional)

---

## 3. Arquitetura

### 3.1 Tecnologias
- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: TailwindCSS
- **Autenticação**: Supabase Auth
- **Banco de Dados**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (logos)
- **Routing**: React Router v6
- **State Management**: React Context ou Redux Toolkit

### 3.2 Estrutura de Pastas
```
gestaup-cadernetas-gestao/
├── src/
│   ├── components/       # Componentes reutilizáveis
│   │   ├── ui/          # Componentes UI (Button, Input, etc)
│   │   ├── layout/      # Layout (Header, Sidebar, etc)
│   │   │   ├── AdminLayout.tsx       # Layout para Admin (Sidebar + Header)
│   │   │   ├── ControllerLayout.tsx # Layout para Controller (apenas Header)
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── forms/       # Formulários reutilizáveis
│   ├── pages/           # Páginas
│   │   ├── auth/        # Login, Cadastro
│   │   ├── admin/       # Rotas /admin/* (Dashboard Admin, Fazendas, Usuários)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Fazendas.tsx
│   │   │   ├── Usuarios.tsx
│   │   │   └── NovaFazenda.tsx
│   │   └── controller/  # Rotas /controller/* (Dashboard Controller, Cadastros, Cadernetas)
│   │       ├── Dashboard.tsx
│   │       ├── Pastos.tsx
│   │       ├── Lotes.tsx
│   │       ├── Funcionarios.tsx
│   │       ├── Insumos.tsx
│   │       └── Cadernetas/
│   ├── services/        # Serviços Supabase
│   │   ├── supabaseClient.ts
│   │   ├── authService.ts
│   │   ├── fazendaService.ts
│   │   └── usuarioService.ts
│   ├── hooks/           # Hooks customizados
│   ├── types/           # Tipos TypeScript
│   ├── utils/           # Utilitários
│   └── App.tsx
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

### 3.3 Rotas e Proteção

#### Rotas Admin (/admin/*)
- `/admin/dashboard` - Dashboard Admin (apenas admin)
- `/admin/fazendas` - Lista de fazendas (apenas admin)
- `/admin/fazendas/nova` - Cadastro de fazenda (apenas admin)
- `/admin/fazendas/:id` - Edição de fazenda (apenas admin)
- `/admin/usuarios` - Lista de usuários (apenas admin)
- `/admin/usuarios/novo` - Cadastro de usuário (apenas admin)

#### Rotas Controller (/controller/*)
- `/controller/dashboard` - Dashboard Controller (apenas controller)
- `/controller/pastos` - Cadastro de pastos (apenas controller)
- `/controller/lotes` - Cadastro de lotes (apenas controller)
- `/controller/funcionarios` - Cadastro de funcionários (apenas controller)
- `/controller/insumos` - Cadastro de insumos (apenas controller)
- `/controller/cadernetas/*` - Visualização de cadernetas (apenas controller)

#### Proteção de Rotas
- **AdminRoute**: Componente que verifica se user.papel === 'admin'
- **ControllerRoute**: Componente que verifica se user.papel === 'controller'
- **Redirect**: Admin redireciona para /admin/*, Controller redireciona para /controller/*

### 3.3 Integração com Supabase
- **Autenticação**: Supabase Auth (email/senha)
- **Banco de Dados**: Tabelas já criadas (fazendas, usuarios, usuario_fazenda, etc)
- **Storage**: Bucket 'logos' já criado
- **Edge Function**: validate-farm-access já implementada

---

## 4. Cronograma de Desenvolvimento

### FASE 1: Setup do Projeto (Dia 1-2)
- Criar projeto Vite + React + TypeScript
- Instalar dependências (TailwindCSS, React Router, Supabase)
- Configurar estrutura de pastas
- Configurar Supabase Client
- Criar componentes UI base (Button, Input, Card, etc)

### FASE 2: Autenticação (Dia 3-4)
- Implementar Supabase Auth
- Criar tela de Login
- Criar tela de Cadastro (apenas Admin pode criar)
- Implementar proteção de rotas
- Criar contexto de autenticação
- Implementar logout

### FASE 3: Dashboard Admin (Dia 5-6)
- Criar layout admin (Header, Sidebar)
- Criar Dashboard Admin (visão macro de fazendas)
- Criar lista de fazendas com cards
- Implementar estatísticas básicas

### FASE 4: Cadastro de Fazendas (Dia 7-8)
- Criar tela de cadastro de fazendas
- Implementar formulário com validações
- Implementar upload de logo
- Criar tela de edição de fazendas
- Implementar ativação/desativação

### FASE 5: Gerenciamento de Usuários (Dia 9-10)
- Criar tela de lista de usuários
- Criar tela de cadastro de usuários
- Implementar atribuição de fazendas (usuario_fazenda)
- Implementar definição de papel (admin/controller)
- Criar tela de edição de usuários

### FASE 6: Dashboard Controller (Dia 11-12)
- Criar layout controller (Header)
- Criar Dashboard Controller (visão fazenda específica)
- Implementar estatísticas da fazenda
- Criar navegação para cadastros e cadernetas

### FASE 7: Cadastros Controller (Dia 13-15)
- Criar tela de cadastro de pastos
- Criar tela de cadastro de lotes
- Criar tela de cadastro de funcionários
- Criar tela de cadastro de insumos
- Implementar listagens e filtros

### FASE 8: Visualização de Cadernetas (Dia 16-17)
- Criar tela de listagem de registros por caderneta
- Implementar filtros e busca
- Criar tela de detalhes do registro
- Implementar exportação (opcional)

### FASE 9: Polimento e Deploy (Dia 18-20)
- Testes end-to-end
- Correção de bugs
- Otimização de performance
- Deploy em produção (Vercel ou Netlify)
- Documentação

---

## 5. Design e UX

### 5.1 Paleta de Cores
- Primária: Verde GestaUp (#1a3a2a)
- Secundária: Verde claro (#2a4a3a)
- Acento: Laranja (#f59e0b)
- Fundo: Branco (#ffffff)
- Texto: Cinza escuro (#1f2937)

### 5.2 Componentes UI
- **Button**: Botões primários, secundários e de ação
- **Input**: Inputs com validação e estados
- **Card**: Cards para exibição de informações
- **Modal**: Modais para ações e confirmações
- **Table**: Tabelas para listagens
- **Badge**: Badges para status e etiquetas

### 5.3 Layout
- **Admin**: Sidebar fixo + Header + Conteúdo principal
- **Controller**: Header + Conteúdo principal (sem sidebar)
- **Mobile**: Responsivo para tablets e smartphones

---

## 6. Segurança

### 6.1 Autenticação
- Supabase Auth (email/senha)
- Sessão JWT com refresh token
- Proteção de rotas baseada em papel (admin/controller)
- Timeout de sessão

### 6.2 Autorização
- **Admin**: Acesso a todas as fazendas
  - RLS: `CREATE POLICY "Admin full access" ON fazendas FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin')`
  - Pode ver, criar, editar e deletar todas as fazendas
- **Controller**: Acesso apenas às fazendas atribuídas (via usuario_fazenda)
  - RLS: `CREATE POLICY "Controller fazendas" ON fazendas FOR SELECT TO authenticated USING (id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid()))`
  - Pode ver apenas fazendas vinculadas
  - Pode criar cadastros apenas nas fazendas vinculadas
- **RLS (Row Level Security)** no Supabase
  - Tabela fazendas: Admin vê todas, Controller vê apenas as vinculadas
  - Tabelas de cadastros (pastos, lotes, etc): Controller acessa apenas da fazenda vinculada
  - Tabela usuarios: Admin pode criar/gerenciar, Controller apenas pode ver próprio perfil
- Validação de permissões no frontend e backend

### 6.3 Validação
- Validação de formulários no frontend
- Validação de dados no Supabase
- Sanitização de inputs
- Proteção contra XSS e CSRF

---

## 7. Integração com Supabase

### 7.1 Tabelas Utilizadas
- **fazendas**: Cadastro de fazendas
- **usuarios**: Usuários do sistema
- **usuario_fazenda**: Relação N:N entre usuários e fazendas
- **pastos**: Cadastro de pastos
- **lotes**: Cadastro de lotes
- **categorias**: Cadastro de categorias
- **insumos**: Cadastro de insumos
- **funcionarios**: Cadastro de funcionários
- **registros_maternidade**: Caderneta Maternidade
- **registros_pastagens**: Caderneta Pastagens
- **registros_rodeio**: Caderneta Rodeio
- **registros_suplementacao**: Caderneta Suplementação
- **registros_bebedouros**: Caderneta Bebedouros
- **registros_movimentacao**: Caderneta Movimentação
- **registros_enfermaria**: Caderneta Enfermaria
- **registros_entrada_insumos**: Caderneta Entrada Insumos
- **registros_saida_insumos**: Caderneta Saída Insumos

### 7.2 Storage
- **Bucket logos**: Armazenamento de logos de fazendas
- Upload via Supabase Storage API
- URLs públicas para exibição

### 7.3 Edge Functions
- **validate-farm-access**: Validação de acesso à fazenda (já implementada)

---

## 8. Deploy

### 8.1 Ambiente de Produção
- **Frontend**: Vercel ou Netlify
- **Banco de Dados**: Supabase (já configurado)
- **Storage**: Supabase Storage (já configurado)

### 8.2 Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 8.3 CI/CD
- GitHub Actions para deploy automático
- Testes antes do deploy
- Rollback automático em caso de erro

---

## 9. Métricas de Sucesso

### 9.1 Métricas Técnicas
- Tempo de carregamento: <2s
- Bundle size: <2MB
- Compatibilidade: Chrome, Firefox, Safari, Edge
- Uptime: >99%

### 9.2 Métricas de Negócio
- Adoção: >80% dos controllers usando o sistema
- Satisfação: >90%
- Tempo de treinamento: <30 minutos
- Suporte: <5 chamadas/semana

---

## 10. Próximos Passos

1. Criar repositório gestaup-cadernetas-gestao
2. Criar projeto Vite + React + TypeScript
3. Configurar Supabase Client
4. Implementar autenticação
5. Criar Dashboard Admin
6. Criar cadastro de fazendas
7. Criar gerenciamento de usuários
8. Criar Dashboard Controller
9. Criar cadastros para controller
10. Criar visualização de cadernetas
11. Testar e deployar
