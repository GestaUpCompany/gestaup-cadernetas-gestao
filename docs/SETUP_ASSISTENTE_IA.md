# Protótipo Assistente de IA — Setup

## Visão geral

Protótipo de chat com IA (Gemini 2.5 Flash) que responde perguntas sobre a fazenda usando tool-calling. Restrito à fazenda de testes `d649c65e-16ab-4b77-a84b-df937aa41cc3` (Fazenda Gesta'Up).

## Arquivos criados

| Arquivo | Descrição |
|---|---|
| `supabase/migrations/20260804100000_criar_chat_ia_logs.sql` | Tabela `chat_ia_logs` com RLS para auditoria de perguntas/respostas |
| `supabase/functions/chat-fazenda/index.ts` | Edge Function (Deno) com tool-calling via Gemini |
| `src/services/chatIAService.ts` | Cliente frontend que chama a Edge Function |
| `src/pages/controller/AssistenteIA.tsx` | Página de chat no painel controller |

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Import + rota `/controller/assistente-ia` |
| `src/components/layout/ControllerLayout.tsx` | Item de menu "Assistente de IA" condicionado à fazenda de testes |

## Como o isolamento funciona

Triplo bloqueio, todas as camaras verificam `fazenda_id === d649c65e-16ab-4b77-a84b-df937aa41cc3`:

1. **UI**: o item de menu só aparece se `fazenda.id === FAZENDA_TESTE_ID`. Usuários de outras fazendas não veem a entrada.
2. **Página**: `AssistenteIA.tsx` renderiza tela "indisponível" se `fazenda.id !== FAZENDA_TESTE_ID`.
3. **Edge Function**: bloqueio hard-coded antes de qualquer lógica. Se `fazendaId !== FAZENDA_TESTE_ID`, retorna 403.

Nenhuma outra fazenda consegue disparar a IA mesmo chamando a URL da função diretamente.

## Funções de tool-calling implementadas (4)

| Função | O que faz |
|---|---|
| `get_media_trato_periodo` | Média de kg de cocho e depósito de um lote (ou todos) num período |
| `get_peso_medio_lote` | Peso vivo médio atual e cabeças de um lote (ou todos os ativos) |
| `get_mortalidade_periodo` | Contagem de mortes e causas no período, por lote ou fazenda |
| `get_movimentacoes_lote` | Lista movimentações (entrada/saída/transferência) no período |

Todas filtram por `fazenda_id = FAZENDA_TESTE_ID` hardcoded.

## Setup necessário no Supabase (executar uma vez)

### 1. Aplicar a migration

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
# URL do projeto Supabase (já configurada por padrão)
supabase secrets set SUPABASE_URL=https://<seu-projeto>.supabase.co

# Service Role Key (para queries bypass de RLS dentro da função)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Chave da API do Gemini (obter em https://aistudio.google.com/apikey)
supabase secrets set GEMINI_API_KEY=AIza...
```

A `SUPABASE_ANON_KEY` também precisa estar disponível para validar o JWT do usuário. O Supabase geralmente injeta automaticamente, mas se necessário:

```bash
supabase secrets set SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Obter a GEMINI_API_KEY

1. Acessar https://aistudio.google.com/apikey
2. Criar uma API key (gratuito, com generoso free tier)
3. Copiar a chave (formato `AIza...`)
4. Rodar `supabase secrets set GEMINI_API_KEY=<chave>`

## Como testar

1. Logar com usuário vinculado à fazenda Gesta'Up (`gestaup`)
2. O item "Assistente de IA" aparece no menu lateral
3. Clicar e fazer uma pergunta, ex: "Qual o peso médio atual de todos os lotes?"
4. A IA chama `get_peso_medio_lote`, recebe os dados, redige a resposta
5. Verificar logs em `chat_ia_logs` no Supabase Studio

## Custo estimado

Com Gemini 2.5 Flash (~$0.075/M input, ~$0.30/M output):
- ~5k tokens input + ~400 tokens output por pergunta
- 50 perguntas/dia ≈ $1/mês
- 200 perguntas/dia ≈ $4/mês

Free tier do Google AI Studio cobre os primeiros testes sem custo.

## Próximos passos (não implementados no protótipo)

- Expandir catálogo de funções (atualmente 4, meta: 12)
- Adicionar rate limit por usuário na Edge Function
- Histórico de conversa persistente (hoje é só em memória na sessão)
- Fallback para GPT-4o-mini em perguntas que o Flash errar
