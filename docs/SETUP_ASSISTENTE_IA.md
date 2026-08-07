# Assistente de IA — Setup

## Visão geral

Chat com IA (Gemini 3.6 Flash) que responde perguntas sobre a fazenda usando tool-calling. O acesso à IA é controlado por fazenda via tabela `ia_fazenda_config`, gerenciada pelo super administrador no painel de Gerenciamento de IA (`/admin/gerenciamento-ia`).

## Arquivos criados

| Arquivo | Descrição |
|---|---|
| `supabase/migrations/20260804100000_criar_chat_ia_logs.sql` | Tabela `chat_ia_logs` com RLS para auditoria de perguntas/respostas |
| `supabase/migrations/20260806150000_super_admin_ia_config.sql` | Papel `super_admin`, tabela `ia_fazenda_config`, RPC `get_ia_monitoramento`, backfill de `custo_estimado_usd` |
| `supabase/functions/chat-fazenda/index.ts` | Edge Function (Deno) com tool-calling via Gemini |
| `src/services/chatIAService.ts` | Cliente frontend que chama a Edge Function |
| `src/pages/controller/AssistenteIA.tsx` | Página de chat no painel controller |
| `src/pages/admin/GerenciamentoIA.tsx` | Painel de super admin para controle de IA por fazenda |

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Import + rota `/controller/assistente-ia` e `/admin/gerenciamento-ia` |
| `src/components/layout/ControllerLayout.tsx` | Item de menu "Assistente de IA" condicionado a `ia_fazenda_config.ia_ativo = true` |
| `src/components/layout/AdminLayout.tsx` | Item de menu "Gerenciamento de IA" condicionado a `papel = 'super_admin'` |
| `src/components/routes/AdminRoute.tsx` | Aceita `super_admin` além de `admin` |
| `src/services/authService.ts` | Tipo `papel` inclui `super_admin`; super_admin bypassa validação de fazenda |

## Como o controle de acesso funciona

O acesso à IA é controlado em três camadas:

1. **UI (ControllerLayout)**: o item de menu só aparece se `ia_fazenda_config.ia_ativo = true` para a fazenda do usuário. A verificação é feita via query a `ia_fazenda_config` no Supabase.
2. **Página (AssistenteIA.tsx)**: renderiza tela "indisponível" se `ia_ativo !== true`. Também mostra contador de perguntas restantes hoje.
3. **Edge Function**: busca `ia_fazenda_config` da fazenda; retorna 403 se não existir ou `ia_ativo = false`. Retorna 429 se o limite diário for atingido.

O super administrador controla quais fazendas têm acesso e o limite diário de cada uma via painel `/admin/gerenciamento-ia`.

## Rate limit

O rate limit é por fazenda, não por usuário. A Edge Function conta perguntas bem-sucedidas no dia em `chat_ia_logs` (com `erro IS NULL`) e compara com `limite_diario` da configuração. Se o count >= limite, retorna 429 com mensagem "Limite diário de N perguntas atingido".

O limite é por fazenda porque o cliente paga pela fazenda. Se a fazenda tem 3 usuários, os 20 (ou o limite configurado) são compartilhados.

## Funções de tool-calling implementadas (17)

16 funções específicas + 1 genérica:

| Função | O que faz |
|---|---|
| `get_media_trato_periodo` | Média de kg de cocho e depósito de um lote (ou todos) num período |
| `get_peso_medio_lote` | Peso vivo médio atual e cabeças de um lote (ou todos os ativos) |
| `get_mortalidade_periodo` | Contagem de mortes e causas no período, por lote ou fazenda |
| `get_movimentacoes_lote` | Lista movimentações (entrada/saída/transferência) no período |
| `get_plano_nutricional_lote` | Plano nutricional vigente e histórico de planos de um lote |
| `get_pastos_fazenda` | Pastos ativos com ocupação atual (lote, cabeças, taxa de lotação) |
| `get_clima_periodo` | Precipitação e temperatura média no período, por pluviômetro |
| `get_estoque_insumos` | Saldo atual de insumos agrupado por tipo |
| `get_tratamentos_periodo` | Tratamentos veterinários aplicados no período |
| `get_financeiro_lote` | Indicadores financeiros de um lote (custo, margem, arrobas) |
| `get_individuos_fazenda` | Inventário de indivíduos (total, raças, sexo, categorias) |
| `get_abastecimento_periodo` | Consumo de combustível no período |
| `get_maternidade_periodo` | Nascimentos registrados no período |
| `get_bebedouros_status` | Status dos bebedouros (última limpeza, se precisa limpeza) |
| `get_funcionarios_fazenda` | Quadro de funcionários ativos |
| `get_rodeio_periodo` | Registros de rodeio (contagem por categoria, escores) |
| `query_dados_fazenda` | Query genérica (SELECT read-only) em 40 tabelas com whitelist |

Todas filtram por `fazenda_id` resolvido do usuário.

## Setup necessário no Supabase (executar uma vez)

### 1. Aplicar as migrations

```bash
supabase db push
# ou
supabase migration up
```

### 2. Deploy da Edge Function

```bash
supabase functions deploy chat-fazenda
```

### 3. Configurar secrets

A Edge Function precisa de três variáveis de ambiente no Supabase:

```bash
supabase secrets set SUPABASE_URL=https://<seu-projeto>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Promover um usuário a super_admin

```sql
UPDATE usuarios SET papel = 'super_admin' WHERE email = 'usuario@exemplo.com';
```

### 5. Ativar IA para uma fazenda

Via painel `/admin/gerenciamento-ia` (toggle + limite diário), ou via SQL:

```sql
INSERT INTO ia_fazenda_config (fazenda_id, ia_ativo, limite_diario)
VALUES ('<fazenda-id>', true, 20)
ON CONFLICT (fazenda_id) DO UPDATE SET ia_ativo = true, limite_diario = 20;
```

## Custo estimado

Com Gemini 3.6 Flash (~$0.075/M input, ~$0.30/M output, ~$0.01875/M cached):
- Média real observada: ~4.249 input + ~236 output por pergunta
- 20 perguntas/dia/fazenda × 25 fazendas = 500/dia ≈ $54/mês
- O painel de super admin mostra projeção mensal e anual em tempo real

## Painel de monitoramento (super admin)

`/admin/gerenciamento-ia` mostra:
- Resumo global: fazendas com IA, perguntas hoje/30d, custos hoje/30d/total
- Projeção de custos mensal e anual (baseada em média de tokens × limite diário)
- Tabela por fazenda: toggle de IA, edição de limite, perguntas hoje/total, custos, projeções
- Detalhes de tokens por fazenda (input, output, cached, médias)
- A projeção recalcula automaticamente ao ativar IA ou ajustar limite de qualquer fazenda
