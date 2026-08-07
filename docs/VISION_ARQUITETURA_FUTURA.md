# Vision — Arquitetura futura (documento de referência)
### Documento criado às 20h10min do dia 06/08/2026

> **Status:** possível implementação futura. Nada aqui deve ser tratado como decisão tomada ou trabalho em andamento. Este documento existe apenas para registrar a arquitetura recomendada caso o projeto avance.

## Contexto

O Manejus 360 nasceu da sistematização de uma planilha de manejo. Existe uma segunda planilha, chamada Vision, exclusivamente financeira, que futuramente pode ser sistematizada como produto digital. O Vision usará o mesmo projeto Supabase do Manejus (mesmo banco, mesmo Auth, mesmo PWA).

A pergunta arquitetural é se o Vision deve ser integrado no mesmo app do Manejus ou ser um produto separado.

## Decisão arquitetural recomendada

**Monorepo com dois apps independentes e pacotes compartilhados.**

Não integrar no mesmo app React, mas também não criar dois repositórios isolados. Os dois apps compartilham o mesmo Supabase, a mesma base de tipos e componentes, mas têm build, deploy e domínio próprios.

### Por que não integrar no mesmo app

- Domínios diferentes (manejo operacional vs financeiro) crescem melhor separados; misturar cria um produto que tenta ser duas coisas e cada feature nova polui a navegação do outro.
- Perfis de usuário podem ser diferentes: o produtor usa o Manejus no curral, o contador/administrador usa o Vision no escritório. Separar facilita controle de acesso e experiência.
- Estratégia de produto: se Vision for um módulo cobrado à parte, apps separados facilitam empacotamento e pricing.
- Em 12 meses com 30 telas financeiras, a separação vai ser vista como acerto.

### Por que não dois repositórios isolados

- O dado é compartilhado no Supabase; tipos TypeScript, client Supabase e helpers de formatação seriam duplicados.
- Manter dois repositórios sincronizados em mudanças de schema é fricção desnecessária.
- Monorepo permite refatorar pacotes compartilhados uma vez e ambos os apps herdam.

## Estrutura de diretórios

```
gestaup-monorepo/
├── package.json                 # workspace root (pnpm ou npm workspaces)
├── pnpm-workspace.yaml          # declara packages/* e apps/*
├── tsconfig.base.json           # config TypeScript compartilhada
├── .env                         # variáveis de ambiente compartilhadas (Supabase URL/KEY)
│
├── packages/
│   ├── supabase/                # @gestaup/supabase
│   │   ├── src/
│   │   │   ├── client.ts        # cliente Supabase singleton
│   │   │   ├── types/           # tipos gerados do banco (supabase gen types)
│   │   │   │   ├── database.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                      # @gestaup/ui
│   │   ├── src/
│   │   │   ├── components/      # Button, Card, Input, Modal, Table, etc.
│   │   │   ├── hooks/           # useAuth, useFazenda, useDebounce, etc.
│   │   │   ├── utils/           # formatDate, formatCurrency, formatKg, etc.
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared/                  # @gestaup/shared
│       ├── src/
│       │   ├── services/        # serviços que ambos os apps usam
│       │   │   ├── fazendasService.ts
│       │   │   ├── usuariosService.ts
│       │   │   └── authService.ts
│       │   ├── contexts/        # AuthContext, FazendaContext
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   ├── manejus/                 # app de manejo (atual GestaUp-Cadernetas-Gestao)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── controller/  # AcompanhamentoTratos, Lotes, Currais, etc.
│   │   │   │   ├── admin/       # NovaFazenda, EditarFazenda, DetalhesFazenda, etc.
│   │   │   │   └── public/      # relatórios públicos
│   │   │   ├── services/        # serviços específicos do manejo
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── vision/                  # app financeiro (futuro)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── dashboard/       # fluxo de caixa, DRE, indicadores
│       │   │   ├── contas/          # contas a pagar/receber
│       │   │   ├── lancamentos/     # lançamentos financeiros
│       │   │   ├── custos/          # custo por arroba, por lote, por fazenda
│       │   │   ├── relatorios/      # relatórios financeiros
│       │   │   └── configuracao/    # centros de custo, categorias, planos
│       │   ├── services/            # serviços específicos do financeiro
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
└── supabase/                   # migrations e schema (compartilhado)
    ├── migrations/
    └── functions/              # edge functions
```

## Pacotes compartilhados

### `@gestaup/supabase`

Cliente Supabase singleton e tipos gerados do banco. Ambos os apps importam de aqui, garantindo que mudanças de schema propaguem automaticamente via `supabase gen types`.

```ts
// packages/supabase/src/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### `@gestaup/ui`

Componentes de UI reutilizáveis (Button, Card, Input, Modal, Table, Skeleton, etc.) e hooks utilitários. Hoje esses componentes estão em `src/components/ui/` do Manejus; na migração para monorepo, mover para este pacote.

### `@gestaup/shared`

Serviços e contextos que ambos os apps usam: `AuthContext`, `FazendaContext`, `fazendasService`, `usuariosService`, funções de formatação comuns (`formatDate`, `formatCurrency`). O Vision precisa saber em qual fazenda o usuário está, precisa de auth, e precisa ler dados de lotes e registros para calcular custos; tudo isso já existe no Manejus e seria extraído para este pacote.

## Apps independentes

### Manejus (apps/manejus)

O app de manejo atual, migrado de repositório standalone para workspace do monorepo. Mantém todas as páginas de controller, admin e relatórios públicos. Importa de `@gestaup/supabase`, `@gestaup/ui` e `@gestaup/shared`. Serviços específicos de manejo (acompanhamentoTratosService, programacaoTratosService, etc.) ficam dentro do app.

### Vision (apps/vision)

App financeiro novo. Estrutura inicial de páginas:

| Área | Páginas | Descrição |
|---|---|---|
| Dashboard | Fluxo de caixa, DRE, Indicadores | Visão geral financeira da fazenda |
| Contas | Contas a pagar, Contas a receber | Gestão de compromissos financeiros |
| Lançamentos | Novo lançamento, Listagem, Conciliação | Registro de receitas e despesas |
| Custos | Custo por arroba, Custo por lote, Custo por fazenda | Cross-referencing com dados de manejo do Manejus |
| Relatórios | Relatório financeiro, Relatório de custos | Relatórios exportáveis (PDF/XLSX) |
| Configuração | Centros de custo, Categorias, Plano de contas | Configuração da estrutura financeira |

O Vision lê do mesmo Supabase: tabelas de `fazendas`, `lotes`, `registros_suplementacao`, `usuarios`, e novas tabelas financeiras que seriam criadas (ex: `lancamentos_financeiros`, `contas_pagar`, `contas_receber`, `centros_custo`, `categorias_financeiras`).

## Migração do repositório atual para monorepo

Quando o projeto avançar, a migração seria:

1. Criar estrutura de monorepo (root `package.json` com workspaces, `packages/`, `apps/`).
2. Mover `src/components/ui/` para `packages/ui/`.
3. Mover `src/services/supabaseClient.ts` e tipos para `packages/supabase/`.
4. Mover `src/contexts/`, `src/utils/` e serviços compartilhados para `packages/shared/`.
5. Mover o resto de `src/` para `apps/manejus/src/`.
6. Ajustar imports em todo o app Manejus para usar `@gestaup/*`.
7. Criar `apps/vision/` com estrutura inicial.
8. Configurar builds independentes (cada app com seu próprio `vite.config.ts` e `index.html`).

## Deploy

Cada app faz deploy independente:

- `apps/manejus` -> domínio do Manejus (ex: `manejus360.com.br`)
- `apps/vision` -> domínio do Vision (ex: `vision.manjus360.com.br` ou domínio próprio)

Ambos apontam para o mesmo projeto Supabase. A sessão de auth pode ser compartilhada entre domínios via configuração de cookies do Supabase Auth, permitindo navegação entre os dois apps sem relogin.

## Considerações de banco de dados

Novas tabelas financeiras do Vision seriam criadas no mesmo projeto Supabase, com `fazenda_id` e RLS seguindo o mesmo padrão do Manejus. Tabelas existentes de manejo (`lotes`, `registros_suplementacao`, `lote_categorias`, etc.) são lidas pelo Vision para cálculo de custos, sem necessidade de duplicação.

Migrations continuam em `supabase/migrations/` na raiz do monorepo, compartilhadas entre ambos os apps.
