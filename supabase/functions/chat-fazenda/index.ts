// Edge Function: chat-fazenda
// Protótipo de assistente de IA com tool-calling.
//
// RESTRITO à fazenda de testes d649c65e-16ab-4b77-a84b-df937aa41cc3.
// Qualquer outra fazenda recebe 403 antes de qualquer lógica.
//
// Fluxo:
//   1. Recebe JWT do Supabase Auth, valida usuário.
//   2. Resolve fazenda_id do usuário via usuario_fazenda.
//   3. Bloqueia se não for a fazenda de testes.
//   4. Envia pergunta + catálogo de funções ao Gemini 2.5 Flash.
//   5. Se a IA chamar uma função, executa a query Supabase (filtrada por fazenda_id),
//      devolve o resultado à IA, ela redige a resposta final.
//   6. Registra log em chat_ia_logs.
//   7. Devolve { resposta, funcoes_chamadas }.

// @ts-nocheck (Deno runtime, sem tipos locais)

const FAZENDA_TESTE_ID = "d649c65e-16ab-4b77-a84b-df937aa41cc3";
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ---------------------------------------------------------------------------
// Whitelist de tabelas permitidas para a tool genérica query_dados_fazenda.
// Apenas tabelas de dados de negócio com fazenda_id direto.
// Tabelas de auth, config, logs e junctions sem fazenda_id são excluídas.
// excludedColumns bloqueia colunas sensíveis (ex: pin_hash, cpf em funcionarios).
// ---------------------------------------------------------------------------
const QUERY_WHITELIST: Record<string, { descricao: string; excludedColumns: string[] }> = {
  "registros_pastagens": { descricao: "Manejo de pastagem (roçada, adubação, cerca)", excludedColumns: [] },
  "registros_manutencao_maquinas": { descricao: "Manutenção de máquinas e veículos", excludedColumns: [] },
  "registros_operacoes_maquinas": { descricao: "Operações de máquinas", excludedColumns: [] },
  "registros_limpeza": { descricao: "Registros de limpeza de áreas", excludedColumns: [] },
  "registros_leitura_cocho": { descricao: "Leitura de cocho (sobras)", excludedColumns: [] },
  "registros_oferta_trato": { descricao: "Oferta de trato", excludedColumns: [] },
  "registros_almoxarifado": { descricao: "Retiradas de almoxarifado", excludedColumns: [] },
  "registros_alimentacao": { descricao: "Alimentação de cantina", excludedColumns: [] },
  "registros_problemas": { descricao: "Problemas registrados no campo", excludedColumns: [] },
  "programacao_tratos": { descricao: "Programação de tratos", excludedColumns: [] },
  "maquinas_veiculos": { descricao: "Máquinas e veículos", excludedColumns: [] },
  "fornecedores": { descricao: "Fornecedores", excludedColumns: [] },
  "frigorificos": { descricao: "Frigoríficos", excludedColumns: [] },
  "currais": { descricao: "Currais", excludedColumns: [] },
  "modulos_pastos": { descricao: "Módulos de pastos", excludedColumns: [] },
  "setores": { descricao: "Setores da fazenda", excludedColumns: [] },
  "racas": { descricao: "Raças cadastradas", excludedColumns: [] },
  "faixas_categorias": { descricao: "Faixas de categorias por peso", excludedColumns: [] },
  "causas_morte": { descricao: "Causas de morte cadastradas", excludedColumns: [] },
  "movimentacao_estoque": { descricao: "Movimentação de estoque de insumos", excludedColumns: [] },
  "lote_categorias_transicoes": { descricao: "Auditoria de transições de categorias", excludedColumns: [] },
  "historico_limpezas_bebedouros": { descricao: "Histórico de limpeza de bebedouros", excludedColumns: [] },
  "bebedouros": { descricao: "Bebedouros", excludedColumns: [] },
  "pluviometros": { descricao: "Pluviômetros", excludedColumns: [] },
  "medicamentos": { descricao: "Medicamentos cadastrados", excludedColumns: [] },
  "tratamentos": { descricao: "Tratamentos (catálogo)", excludedColumns: [] },
  "individuos": { descricao: "Indivíduos do rebanho", excludedColumns: [] },
  "pastos": { descricao: "Pastos", excludedColumns: [] },
  "lotes": { descricao: "Lotes", excludedColumns: [] },
  "insumos": { descricao: "Insumos", excludedColumns: [] },
  "formulacoes": { descricao: "Formulações nutricionais", excludedColumns: [] },
  "planos_nutricionais": { descricao: "Planos nutricionais", excludedColumns: [] },
  "planos_nutricionais_snapshots": { descricao: "Snapshots de planos nutricionais", excludedColumns: [] },
  "registros_suplementacao": { descricao: "Registros de suplementação/trato", excludedColumns: [] },
  "registros_morte": { descricao: "Registros de morte", excludedColumns: [] },
  "registros_movimentacao": { descricao: "Registros de movimentação", excludedColumns: [] },
  "registros_clima": { descricao: "Registros de clima", excludedColumns: [] },
  "registros_enfermaria": { descricao: "Registros de enfermaria", excludedColumns: [] },
  "registros_maternidade": { descricao: "Registros de maternidade", excludedColumns: [] },
  "registros_rodeio": { descricao: "Registros de rodeio", excludedColumns: [] },
  "registros_abastecimento": { descricao: "Registros de abastecimento", excludedColumns: [] },
  "funcionarios": { descricao: "Funcionários", excludedColumns: ["pin_hash", "cpf"] },
};

// Regex para validar nomes de coluna: apenas alphanumeric + underscore.
const VALID_COLUMN_NAME = /^[a-z_][a-z0-9_]*$/i;

interface SupabaseAuthUser {
  id: string;
  email?: string;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

interface FunctionResult {
  name: string;
  id?: string;
  result: unknown;
}

// ---------------------------------------------------------------------------
// Auth: valida JWT via Supabase Auth API.
// ---------------------------------------------------------------------------
async function getAuthUser(authHeader: string | null, supabaseUrl: string): Promise<SupabaseAuthUser | null> {
  if (!authHeader) return null;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  console.log("[chat-fazenda] getAuthUser SUPABASE_URL:", supabaseUrl ? "present" : "missing");
  console.log("[chat-fazenda] getAuthUser ANON_KEY length:", anonKey.length);
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
    },
  });
  console.log("[chat-fazenda] getAuthUser res.status:", res.status);
  if (!res.ok) {
    const errText = await res.text();
    console.error("[chat-fazenda] getAuthUser error:", errText);
    return null;
  }
  const data = await res.json();
  console.log("[chat-fazenda] getAuthUser user id:", data?.id, "email:", data?.email);
  return data?.id ? { id: data.id, email: data.email } : null;
}

// ---------------------------------------------------------------------------
// Resolve fazenda_id ativa do usuário.
// ---------------------------------------------------------------------------
async function getFazendaIdForUser(authUserId: string, supabaseUrl: string, serviceRoleKey: string): Promise<string | null> {
  // auth.users.id != usuarios.id. Precisamos mapear via usuarios.auth_id.
  const userRes = await fetch(
    `${supabaseUrl}/rest/v1/usuarios?select=id,papel&auth_id=eq.${authUserId}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  if (!userRes.ok) {
    console.error("[chat-fazenda] erro ao buscar usuarios por auth_id:", userRes.status);
    return null;
  }
  const userRows = await userRes.json() as { id: string; papel: string }[];
  if (!userRows || userRows.length === 0) {
    console.error("[chat-fazenda] usuario nao encontrado na tabela usuarios para auth_id:", authUserId);
    return null;
  }
  const usuarioId = userRows[0].id;
  const papel = userRows[0].papel;
  console.log("[chat-fazenda] usuarioId:", usuarioId, "papel:", papel);

  // Buscar vínculos de fazenda.
  const url = `${supabaseUrl}/rest/v1/usuario_fazenda?select=fazenda_id&usuario_id=eq.${usuarioId}&ativo=eq.true`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  console.log("[chat-fazenda] getFazendaIdForUser res.status:", res.status);
  if (!res.ok) {
    const errText = await res.text();
    console.error("[chat-fazenda] getFazendaIdForUser error body:", errText);
    return null;
  }
  const rows = await res.json() as { fazenda_id: string }[];
  console.log("[chat-fazenda] getFazendaIdForUser rows:", JSON.stringify(rows));
  if (!rows || rows.length === 0) return null;
  return rows[0].fazenda_id;
}

// ---------------------------------------------------------------------------
// Catálogo de funções (tool declarations no formato Gemini).
// ---------------------------------------------------------------------------
const TOOLS_DECLARATION = [
  {
    functionDeclarations: [
      {
        name: "get_media_trato_periodo",
        description:
          "Calcula a média de trato (kg de cocho e kg de depósito) de um lote específico dentro de um período. " +
          "Se lote_nome for omitido, calcula para todos os lotes da fazenda. " +
          "Retorna média, soma, contagem de registros e período.",
        parameters: {
          type: "OBJECT",
          properties: {
            lote_nome: {
              type: "STRING",
              description: "Nome do lote (ex: 'Lote 1', 'Boi Magro A'). Se omitido, agrega todos os lotes.",
            },
            data_inicio: {
              type: "STRING",
              description: "Data inicial no formato YYYY-MM-DD. Se omitido, usa 30 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final no formato YYYY-MM-DD. Se omitido, usa hoje.",
            },
          },
        },
      },
      {
        name: "get_peso_medio_lote",
        description:
          "Retorna o peso vivo médio atual (kg/cab) e cabeças atuais de um lote, somando suas categorias ativas. " +
          "Se lote_nome for omitido, retorna todos os lotes ativos da fazenda com seus pesos.",
        parameters: {
          type: "OBJECT",
          properties: {
            lote_nome: {
              type: "STRING",
              description: "Nome do lote. Se omitido, retorna todos os lotes ativos.",
            },
          },
        },
      },
      {
        name: "get_mortalidade_periodo",
        description:
          "Retorna contagem de mortes e causas no período especificado, opcionalmente filtrado por lote. " +
          "Lista as causas mais frequentes.",
        parameters: {
          type: "OBJECT",
          properties: {
            lote_nome: {
              type: "STRING",
              description: "Nome do lote. Se omitido, considera todas as mortes da fazenda.",
            },
            data_inicio: {
              type: "STRING",
              description: "Data inicial YYYY-MM-DD. Se omitido, 90 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final YYYY-MM-DD. Se omitido, hoje.",
            },
          },
        },
      },
      {
        name: "get_movimentacoes_lote",
        description:
          "Lista as movimentações (entrada/saída de pasto, transferência) de um lote no período. " +
          "Retorna tipo, data, pasto de origem/destino e quantidade.",
        parameters: {
          type: "OBJECT",
          properties: {
            lote_nome: {
              type: "STRING",
              description: "Nome do lote. Se omitido, todas as movimentações da fazenda.",
            },
            data_inicio: {
              type: "STRING",
              description: "Data inicial YYYY-MM-DD. Se omitido, 30 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final YYYY-MM-DD. Se omitido, hoje.",
            },
          },
        },
      },
      {
        name: "get_plano_nutricional_lote",
        description:
          "Retorna o plano nutricional vigente e o histórico de planos de um lote: formulação, GMD planejada vs realizada, " +
          "peso meta vs atual, dias decorridos, progresso da meta, e snapshots de performance dos planos encerrados. " +
          "Se lote_nome for omitido, retorna um resumo de todos os lotes ativos com plano nutricional.",
        parameters: {
          type: "OBJECT",
          properties: {
            lote_nome: {
              type: "STRING",
              description: "Nome do lote (ex: 'Boi Magro A', 'Lote 1'). Se omitido, resume todos os lotes.",
            },
          },
        },
      },
      {
        name: "get_pastos_fazenda",
        description:
          "Lista os pastos ativos da fazenda com ocupação atual (qual lote está em qual pasto, cabeças, " +
          "taxa de lotação em UA/ha, período de ocupação em dias, e se o tempo excedeu a meta). " +
          "Se apenas_ocupados for true, retorna apenas pastos com lote atualmente alocado.",
        parameters: {
          type: "OBJECT",
          properties: {
            apenas_ocupados: {
              type: "BOOLEAN",
              description: "Se true, retorna apenas pastos com lote atualmente alocado. Default: false (todos).",
            },
          },
        },
      },
      {
        name: "get_clima_periodo",
        description:
          "Retorna precipitação (chuva) e temperatura média no período especificado, agrupados por pluviômetro e por dia. " +
          "Inclui total de chuva acumulada, média de temperatura, e número de dias com registro.",
        parameters: {
          type: "OBJECT",
          properties: {
            data_inicio: {
              type: "STRING",
              description: "Data inicial YYYY-MM-DD. Se omitido, 30 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final YYYY-MM-DD. Se omitido, hoje.",
            },
          },
        },
      },
      {
        name: "get_estoque_insumos",
        description:
          "Retorna o saldo atual de insumos da fazenda agrupado por tipo (mineral, proteinado, ração, etc). " +
          "Para cada insumo: nome, tipo, estoque atual, unidade, custo unitário e custo total do estoque. " +
          "Se apenas_baixo_estoque for true, retorna apenas insumos com estoque abaixo de 100 (unidade ou kg).",
        parameters: {
          type: "OBJECT",
          properties: {
            apenas_baixo_estoque: {
              type: "BOOLEAN",
              description: "Se true, retorna apenas insumos com estoque atual abaixo de 100. Default: false.",
            },
          },
        },
      },
      {
        name: "get_tratamentos_periodo",
        description:
          "Retorna os tratamentos veterinários aplicados no período, agrupados por medicamento e por lote. " +
          "Inclui tipo de medicamento, nome comercial, dose aplicada, diagnósticos mais frequentes, " +
          "e total de animais tratados.",
        parameters: {
          type: "OBJECT",
          properties: {
            data_inicio: {
              type: "STRING",
              description: "Data inicial YYYY-MM-DD. Se omitido, 90 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final YYYY-MM-DD. Se omitido, hoje.",
            },
          },
        },
      },
      {
        name: "get_financeiro_lote",
        description:
          "Retorna indicadores financeiros de um lote: custo total de entrada, custo operacional diário, " +
          "preço de venda projetado por arroba, margem de lucro percentual, faturamento projetado, " +
          "produção em arrobas, ágio/deságio, e custo por arroba produzida. " +
          "Se lote_nome for omitido, retorna todos os lotes ativos.",
        parameters: {
          type: "OBJECT",
          properties: {
            lote_nome: {
              type: "STRING",
              description: "Nome do lote. Se omitido, retorna todos os lotes ativos.",
            },
          },
        },
      },
      {
        name: "get_individuos_fazenda",
        description:
          "Retorna o inventário de indivíduos da fazenda: total de animais, distribuição por raça, sexo, " +
          "categoria e status. Inclui média de peso atual e idade. Útil para perguntas sobre o rebanho como um todo.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "get_abastecimento_periodo",
        description:
          "Retorna o consumo de combustível no período, agrupado por máquina/veículo e por tipo de combustível. " +
          "Inclui total abastecido (litros), número de abastecimentos, e custo estimado se disponível.",
        parameters: {
          type: "OBJECT",
          properties: {
            data_inicio: {
              type: "STRING",
              description: "Data inicial YYYY-MM-DD. Se omitido, 30 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final YYYY-MM-DD. Se omitido, hoje.",
            },
          },
        },
      },
      {
        name: "get_maternidade_periodo",
        description:
          "Retorna os nascimentos registrados no período: total de crias, distribuição por sexo, " +
          "peso médio ao nascer, tipos de parto, e raças mais frequentes. " +
          "Útil para perguntas sobre parição, nascimentos e desempenho reprodutivo.",
        parameters: {
          type: "OBJECT",
          properties: {
            data_inicio: {
              type: "STRING",
              description: "Data inicial YYYY-MM-DD. Se omitido, 90 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final YYYY-MM-DD. Se omitido, hoje.",
            },
          },
        },
      },
      {
        name: "get_bebedouros_status",
        description:
          "Retorna o status dos bebedouros da fazenda: capacidade, data da última limpeza, dias desde a última " +
          "limpeza, e se precisa de limpeza (comparando com o intervalo meta). " +
          "Se apenas_precisa_limpeza for true, retorna apenas bebedouros que ultrapassaram o intervalo meta.",
        parameters: {
          type: "OBJECT",
          properties: {
            apenas_precisa_limpeza: {
              type: "BOOLEAN",
              description: "Se true, retorna apenas bebedouros que precisam de limpeza. Default: false.",
            },
          },
        },
      },
      {
        name: "get_funcionarios_fazenda",
        description:
          "Retorna o quadro de funcionários ativos da fazenda: nome, cargo, telefone, se acessa o app, " +
          "e quantas cadernetas tem permissão. Agrupado por cargo.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "get_rodeio_periodo",
        description:
          "Retorna os registros de rodeio (manejo) no período: total de cabeças contadas por categoria " +
          "(vaca, touro, bezerro, garrote, novilha, boi), escore de gado, escore de fezes, " +
          "e diagnósticos observados. Útil para perguntas sobre manejo e contagem de gado.",
        parameters: {
          type: "OBJECT",
          properties: {
            data_inicio: {
              type: "STRING",
              description: "Data inicial YYYY-MM-DD. Se omitido, 90 dias antes de hoje.",
            },
            data_fim: {
              type: "STRING",
              description: "Data final YYYY-MM-DD. Se omitido, hoje.",
            },
          },
        },
      },
      {
        name: "query_dados_fazenda",
        description:
          "Executa uma query de leitura (SELECT) em uma tabela de dados da fazenda. " +
          "Use APENAS quando nenhuma das outras funções específicas cobrir a pergunta. " +
          "A consulta é sempre read-only (GET) e filtrada automaticamente por fazenda_id. " +
          "Filtros usam sintaxe PostgREST: eq (igual), gt (maior), gte (maior ou igual), lt (menor), " +
          "lte (menor ou igual), like.*padrao* (LIKE), in.(a,b,c) (IN lista), is.null (IS NULL), isnot.null (IS NOT NULL). " +
          "Ex de filtros: {\"data\": \"gte.2026-07-01\", \"tipo\": \"eq.Rocada\", \"deleted_at\": \"is.null\"}. " +
          "order no formato 'coluna.asc' ou 'coluna.desc'. " +
          "Tabelas disponíveis: registros_pastagens, registros_manutencao_maquinas, registros_operacoes_maquinas, " +
          "registros_limpeza, registros_leitura_cocho, registros_oferta_trato, registros_almoxarifado, " +
          "registros_alimentacao, registros_problemas, programacao_tratos, maquinas_veiculos, fornecedores, " +
          "frigorificos, currais, modulos_pastos, setores, racas, faixas_categorias, causas_morte, " +
          "movimentacao_estoque, lote_categorias_transicoes, historico_limpezas_bebedouros, bebedouros, " +
          "pluviometros, medicamentos, tratamentos, individuos, pastos, lotes, insumos, formulacoes, " +
          "planos_nutricionais, planos_nutricionais_snapshots, registros_suplementacao, registros_morte, " +
          "registros_movimentacao, registros_clima, registros_enfermaria, registros_maternidade, " +
          "registros_rodeio, registros_abastecimento, funcionarios.",
        parameters: {
          type: "OBJECT",
          properties: {
            tabela: {
              type: "STRING",
              description: "Nome da tabela (ex: 'registros_pastagens', 'maquinas_veiculos'). Deve estar na lista de tabelas disponíveis.",
            },
            select: {
              type: "STRING",
              description: "Colunas separadas por vírgula (ex: 'data,pasto,tipo_manejo'). Use '*' para todas as colunas.",
            },
            filtros: {
              type: "OBJECT",
              description: "Filtros PostgREST chave-valor. Ex: {\"data\": \"gte.2026-07-01\", \"deleted_at\": \"is.null\"}.",
            },
            order: {
              type: "STRING",
              description: "Ordenação no formato 'coluna.asc' ou 'coluna.desc'.",
            },
            limit: {
              type: "NUMBER",
              description: "Máximo de linhas (1-500). Default: 100.",
            },
          },
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers de query Supabase via REST.
// ---------------------------------------------------------------------------
async function supabaseSelect(
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  select: string,
  filters: Record<string, string>,
): Promise<unknown[] | null> {
  const params = new URLSearchParams({ select });
  for (const [key, value] of Object.entries(filters)) {
    params.append(key, value);
  }
  const url = `${supabaseUrl}/rest/v1/${table}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Range: "0-999", // limite de 1000 linhas
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`supabaseSelect ${table} falhou: ${res.status}`, text);
    return null;
  }
  return await res.json() as unknown[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Implementação das 4 funções de tool-calling.
// Todas filtram por fazenda_id = FAZENDA_TESTE_ID.
// ---------------------------------------------------------------------------
async function getMediaTratoPeriodo(args: {
  lote_nome?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(30);
  const dataFim = args.data_fim || todayISO();

  // Se lote_nome informado, buscar o lote_id primeiro.
  let loteId: string | undefined;
  if (args.lote_nome) {
    const lotes = await supabaseSelect(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      "lotes",
      "id,nome",
      {
        "fazenda_id": `eq.${FAZENDA_TESTE_ID}`,
        "ativo": "eq.true",
        "nome": `eq.${args.lote_nome}`,
      },
    );
    if (!lotes || lotes.length === 0) {
      return { erro: `Lote "${args.lote_nome}" não encontrado na fazenda.`, count: 0 };
    }
    loteId = (lotes[0] as { id: string }).id;
  }

  const filters: Record<string, string> = {
    "fazenda_id": `eq.${FAZENDA_TESTE_ID}`,
    "deleted_at": "is.null",
    "data": `gte.${dataInicio}T00:00:00Z`,
  };
  // Para gte/lt na mesma coluna precisamos de dois filtros; REST do Supabase
  // suporta múltiplos filtros na mesma coluna repetindo o parâmetro.
  // Como nosso helper usa Record, vamos montar a URL manualmente aqui.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const params = new URLSearchParams({ select: "kg_cocho,kg_deposito,consumo_medio_geral_kg_mn,consumo_medio_geral_kg_ms,consumo_medio_geral_percent_pv,lote,data" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  if (loteId) {
    params.append("lote_id", `eq.${loteId}`);
  }
  const url = `${supabaseUrl}/rest/v1/registros_suplementacao?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Range: "0-4999",
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[chat-fazenda] getMediaTratoPeriodo error:", res.status, errText);
    return { erro: "Falha ao consultar registros_suplementacao", status: res.status };
  }
  const rows = await res.json() as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return {
      count: 0,
      mensagem: "Não há registros de suplementação no período informado.",
      periodo: { inicio: dataInicio, fim: dataFim },
      lote: args.lote_nome || "Todos os lotes",
    };
  }
  const sum = (field: string) => rows.reduce((acc, r) => acc + (typeof r[field] === "number" ? r[field] as number : 0), 0);
  const count = rows.length;
  const media = (field: string) => (count > 0 ? sum(field) / count : 0);
  return {
    count,
    periodo: { inicio: dataInicio, fim: dataFim },
    lote: args.lote_nome || "Todos os lotes",
    media_kg_cocho: Number(media("kg_cocho").toFixed(2)),
    media_kg_deposito: Number(media("kg_deposito").toFixed(2)),
    media_consumo_kg_mn: Number(media("consumo_medio_geral_kg_mn").toFixed(2)),
    media_consumo_kg_ms: Number(media("consumo_medio_geral_kg_ms").toFixed(2)),
    media_consumo_percent_pv: Number(media("consumo_medio_geral_percent_pv").toFixed(2)),
    soma_kg_cocho: Number(sum("kg_cocho").toFixed(2)),
    soma_kg_deposito: Number(sum("kg_deposito").toFixed(2)),
  };
}

async function getPesoMedioLote(args: { lote_nome?: string }): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Buscar lotes ativos da fazenda.
  let lotesFilters: Record<string, string> = {
    "fazenda_id": `eq.${FAZENDA_TESTE_ID}`,
    "ativo": "eq.true",
  };
  if (args.lote_nome) {
    lotesFilters["nome"] = `eq.${args.lote_nome}`;
  }
  const lotes = await supabaseSelect(supabaseUrl, serviceRoleKey, "lotes", "id,nome", lotesFilters);
  if (!lotes || lotes.length === 0) {
    return { erro: args.lote_nome ? `Lote "${args.lote_nome}" não encontrado.` : "Nenhum lote ativo na fazenda." };
  }
  const lotesArr = lotes as { id: string; nome: string }[];
  const loteIds = lotesArr.map(l => l.id);

  // Buscar categorias ativas.
  const params = new URLSearchParams({ select: "lote_id,quant_atual,quant_inicial,peso_vivo_atual_kg_cab,peso_entrada_kg_cab,categoria,ativo" });
  params.append("ativo", "eq.true");
  // Filtro IN nos lote_ids.
  params.append("lote_id", `in.(${loteIds.join(",")})`);
  const url = `${supabaseUrl}/rest/v1/lote_categorias?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Range: "0-999",
    },
  });
  if (!res.ok) {
    return { erro: "Falha ao consultar lote_categorias", status: res.status };
  }
  const cats = await res.json() as Array<Record<string, unknown>>;

  // Agrupar por lote.
  const porLote: Record<string, { cabecas: number; totalPeso: number; categorias: string[] }> = {};
  for (const c of cats) {
    const lid = c.lote_id as string;
    if (!porLote[lid]) porLote[lid] = { cabecas: 0, totalPeso: 0, categorias: [] };
    const q = (c.quant_atual as number) ?? (c.quant_inicial as number) ?? 0;
    const pesoAtual = c.peso_vivo_atual_kg_cab ? parseFloat(String(c.peso_vivo_atual_kg_cab)) : 0;
    const pesoEntrada = c.peso_entrada_kg_cab ? parseFloat(String(c.peso_entrada_kg_cab)) : 0;
    const p = pesoAtual || pesoEntrada || 0;
    porLote[lid].cabecas += q;
    porLote[lid].totalPeso += q * p;
    if (c.categoria) porLote[lid].categorias.push(c.categoria as string);
  }

  return lotesArr.map(l => {
    const stats = porLote[l.id] || { cabecas: 0, totalPeso: 0, categorias: [] };
    const pesoMedio = stats.cabecas > 0 ? stats.totalPeso / stats.cabecas : 0;
    return {
      lote: l.nome,
      cabecas: stats.cabecas,
      peso_medio_kg: Number(pesoMedio.toFixed(1)),
      categorias: stats.categorias,
    };
  });
}

async function getMortalidadePeriodo(args: {
  lote_nome?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(90);
  const dataFim = args.data_fim || todayISO();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let loteId: string | undefined;
  if (args.lote_nome) {
    const lotes = await supabaseSelect(supabaseUrl, serviceRoleKey, "lotes", "id,nome", {
      "fazenda_id": `eq.${FAZENDA_TESTE_ID}`,
      "ativo": "eq.true",
      "nome": `eq.${args.lote_nome}`,
    });
    if (!lotes || lotes.length === 0) {
      return { erro: `Lote "${args.lote_nome}" não encontrado.`, count: 0 };
    }
    loteId = (lotes[0] as { id: string }).id;
  }

  const params = new URLSearchParams({ select: "causa_morte,lote,data" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  if (loteId) {
    params.append("lote_id", `eq.${loteId}`);
  }
  const url = `${supabaseUrl}/rest/v1/registros_morte?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Range: "0-999",
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[chat-fazenda] getMortalidadePeriodo error:", res.status, errText);
    return { erro: "Falha ao consultar registros_morte", status: res.status };
  }
  const rows = await res.json() as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return {
      count: 0,
      periodo: { inicio: dataInicio, fim: dataFim },
      lote: args.lote_nome || "Todos os lotes",
      mensagem: "Não há registros de morte no período.",
    };
  }
  // Cada linha é uma morte individual (não há campo quantidade).
  const causas: Record<string, number> = {};
  for (const r of rows) {
    const causa = (r.causa_morte as string) || "Não informada";
    causas[causa] = (causas[causa] || 0) + 1;
  }
  const causasOrdenadas = Object.entries(causas)
    .sort((a, b) => b[1] - a[1])
    .map(([causa, count]) => ({ causa, quantidade: count }));
  return {
    count: rows.length,
    total_quantidade: rows.length,
    periodo: { inicio: dataInicio, fim: dataFim },
    lote: args.lote_nome || "Todos os lotes",
    causas: causasOrdenadas,
  };
}

async function getMovimentacoesLote(args: {
  lote_nome?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(30);
  const dataFim = args.data_fim || todayISO();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let loteId: string | undefined;
  if (args.lote_nome) {
    const lotes = await supabaseSelect(supabaseUrl, serviceRoleKey, "lotes", "id,nome", {
      "fazenda_id": `eq.${FAZENDA_TESTE_ID}`,
      "ativo": "eq.true",
      "nome": `eq.${args.lote_nome}`,
    });
    if (!lotes || lotes.length === 0) {
      return { erro: `Lote "${args.lote_nome}" não encontrado.`, count: 0 };
    }
    loteId = (lotes[0] as { id: string }).id;
  }

  const params = new URLSearchParams({ select: "motivo_movimentacao,subtipo,tipo_saida,tipo_entrada,data,numero_cabecas,peso_vivo_atual_kg,lote_origem,destino,causa_observacao,lote_origem_id,lote_destino_id" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  if (loteId) {
    params.append("lote_origem_id", `eq.${loteId}`);
  }
  const url = `${supabaseUrl}/rest/v1/registros_movimentacao?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Range: "0-499",
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[chat-fazenda] getMovimentacoesLote error:", res.status, errText);
    return { erro: "Falha ao consultar registros_movimentacao", status: res.status };
  }
  const rows = await res.json() as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return {
      count: 0,
      periodo: { inicio: dataInicio, fim: dataFim },
      lote: args.lote_nome || "Todos os lotes",
      mensagem: "Não há movimentações no período.",
    };
  }
  // Resumir para não estourar o contexto da IA.
  const resumidas = rows.slice(0, 50).map(r => ({
    motivo: r.motivo_movimentacao,
    subtipo: r.subtipo,
    tipo_saida: r.tipo_saida,
    tipo_entrada: r.tipo_entrada,
    data: r.data,
    numero_cabecas: r.numero_cabecas,
    peso_vivo_kg: r.peso_vivo_atual_kg,
    lote_origem: r.lote_origem,
    destino: r.destino,
    observacao: r.causa_observacao,
  }));
  return {
    count: rows.length,
    mostrando: resumidas.length,
    periodo: { inicio: dataInicio, fim: dataFim },
    lote: args.lote_nome || "Todos os lotes",
    movimentacoes: resumidas,
  };
}

// ---------------------------------------------------------------------------
// Tool 5: get_plano_nutricional_lote
// Retorna plano vigente + histórico de planos + snapshots de performance.
// ---------------------------------------------------------------------------
async function getPlanoNutricionalLote(args: { lote_nome?: string }): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Buscar lotes ativos da fazenda.
  let lotesFilters: Record<string, string> = {
    "fazenda_id": `eq.${FAZENDA_TESTE_ID}`,
    "ativo": "eq.true",
  };
  if (args.lote_nome) {
    lotesFilters["nome"] = `eq.${args.lote_nome}`;
  }
  const lotes = await supabaseSelect(supabaseUrl, serviceRoleKey, "lotes", "id,nome", lotesFilters);
  if (!lotes || lotes.length === 0) {
    return { erro: args.lote_nome ? `Lote "${args.lote_nome}" não encontrado.` : "Nenhum lote ativo na fazenda." };
  }
  const lotesArr = lotes as { id: string; nome: string }[];

  // Buscar categorias ativas desses lotes.
  const loteIds = lotesArr.map(l => l.id);
  const catParams = new URLSearchParams({ select: "id,lote_id,categoria,peso_vivo_atual_kg_cab,peso_vivo_meta_kg_cab,quant_atual,ativo,formulacao_id" });
  catParams.append("ativo", "eq.true");
  catParams.append("lote_id", `in.(${loteIds.join(",")})`);
  const catUrl = `${supabaseUrl}/rest/v1/lote_categorias?${catParams.toString()}`;
  const catRes = await fetch(catUrl, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-999" } });
  if (!catRes.ok) return { erro: "Falha ao consultar lote_categorias", status: catRes.status };
  const cats = await catRes.json() as Array<Record<string, unknown>>;
  const catIds = cats.map(c => c.id as string);

  if (catIds.length === 0) {
    return { erro: "Nenhuma categoria ativa encontrada para o(s) lote(s).", lotes: lotesArr.map(l => l.nome) };
  }

  // Buscar planos nutricionais dessas categorias.
  const planoParams = new URLSearchParams({ select: "id,lote_categoria_id,nome,formulacao_id,periodo_dias,peso_meta_kg,peso_inicio_kg_cab,ordem,ativo,data_inicio,data_fim,condicao_migracao,migracao_automatica,gmd_planejado" });
  planoParams.append("lote_categoria_id", `in.(${catIds.join(",")})`);
  planoParams.append("order", "ordem.asc");
  const planoUrl = `${supabaseUrl}/rest/v1/planos_nutricionais?${planoParams.toString()}`;
  const planoRes = await fetch(planoUrl, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  if (!planoRes.ok) return { erro: "Falha ao consultar planos_nutricionais", status: planoRes.status };
  const planos = await planoRes.json() as Array<Record<string, unknown>>;

  // Buscar snapshots de planos encerrados.
  const planoIds = planos.map(p => p.id as string);
  let snapshots: Array<Record<string, unknown>> = [];
  if (planoIds.length > 0) {
    const snapParams = new URLSearchParams({ select: "plano_nutricional_id,duracao_dias,ganho_peso_total_kg_cab,gmd_realizado,gmd_planejado,producao_arroba_lote,mortalidade_percent,motivo_migracao,tipo_snapshot" });
    snapParams.append("plano_nutricional_id", `in.(${planoIds.join(",")})`);
    const snapUrl = `${supabaseUrl}/rest/v1/planos_nutricionais_snapshots?${snapParams.toString()}`;
    const snapRes = await fetch(snapUrl, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
    if (snapRes.ok) {
      snapshots = await snapRes.json() as Array<Record<string, unknown>>;
    }
  }

  // Buscar formulações para nomes.
  const formIds = [...new Set(planos.map(p => p.formulacao_id as string).filter(Boolean))];
  let formMap: Record<string, { nome: string; tipo: string | null; gmd: number | null; custo_dieta: number | null }> = {};
  if (formIds.length > 0) {
    const formParams = new URLSearchParams({ select: "id,nome,tipo,gmd,custo_dieta_reais_cab_dia" });
    formParams.append("id", `in.(${formIds.join(",")})`);
    const formUrl = `${supabaseUrl}/rest/v1/formulacoes?${formParams.toString()}`;
    const formRes = await fetch(formUrl, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-499" } });
    if (formRes.ok) {
      const forms = await formRes.json() as Array<Record<string, unknown>>;
      for (const f of forms) {
        formMap[f.id as string] = {
          nome: f.nome as string,
          tipo: (f.tipo as string) || null,
          gmd: f.gmd ? parseFloat(String(f.gmd)) : null,
          custo_dieta: f.custo_dieta_reais_cab_dia ? parseFloat(String(f.custo_dieta_reais_cab_dia)) : null,
        };
      }
    }
  }

  // Mapear categoria → lote_nome.
  const catToLote: Record<string, { lote_nome: string; categoria: string; peso_atual: number; peso_meta: number; cabecas: number }> = {};
  for (const c of cats) {
    const catId = c.id as string;
    const loteId = c.lote_id as string;
    const loteNome = lotesArr.find(l => l.id === loteId)?.nome || "Desconhecido";
    catToLote[catId] = {
      lote_nome: loteNome,
      categoria: (c.categoria as string) || "N/A",
      peso_atual: c.peso_vivo_atual_kg_cab ? parseFloat(String(c.peso_vivo_atual_kg_cab)) : 0,
      peso_meta: c.peso_vivo_meta_kg_cab ? parseFloat(String(c.peso_vivo_meta_kg_cab)) : 0,
      cabecas: (c.quant_atual as number) ?? 0,
    };
  }

  // Agrupar planos por lote.
  const porLote: Record<string, unknown> = {};
  for (const p of planos) {
    const catId = p.lote_categoria_id as string;
    const info = catToLote[catId];
    if (!info) continue;
    const loteNome = info.lote_nome;
    if (!porLote[loteNome]) {
      porLote[loteNome] = {
        lote: loteNome,
        categoria: info.categoria,
        peso_atual_kg: info.peso_atual,
        peso_meta_kg: info.peso_meta,
        cabecas: info.cabecas,
        plano_vigente: null as unknown,
        planos_encerrados: [] as Array<Record<string, unknown>>,
        proximo_plano: null as unknown,
      };
    }
    const loteData = porLote[loteNome] as Record<string, unknown>;
    const formId = p.formulacao_id as string;
    const form = formId ? formMap[formId] : null;
    const isVigente = p.ativo === true && !p.data_fim && p.data_inicio;
    const planoInfo: Record<string, unknown> = {
      nome: p.nome,
      formulacao: form?.nome || null,
      tipo_formulacao: form?.tipo || null,
      gmd_planejado: p.gmd_planejado ? parseFloat(String(p.gmd_planejado)) : (form?.gmd || null),
      custo_dieta_reais_cab_dia: form?.custo_dieta || null,
      peso_meta_kg: p.peso_meta_kg ? parseFloat(String(p.peso_meta_kg)) : null,
      peso_inicio_kg: p.peso_inicio_kg_cab ? parseFloat(String(p.peso_inicio_kg_cab)) : null,
      periodo_dias: p.periodo_dias,
      ordem: p.ordem,
      data_inicio: p.data_inicio,
      data_fim: p.data_fim,
      condicao_migracao: p.condicao_migracao,
      migracao_automatica: p.migracao_automatica,
    };

    if (isVigente) {
      // Calcular dias decorridos.
      let diasDecorridos: number | null = null;
      if (p.data_inicio) {
        const inicio = new Date(p.data_inicio as string);
        const hoje = new Date();
        diasDecorridos = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      }
      // Calcular progresso da meta.
      let progressoMeta: number | null = null;
      if (info.peso_atual > 0 && p.peso_inicio_kg_cab && p.peso_meta_kg) {
        const pesoInicio = parseFloat(String(p.peso_inicio_kg_cab));
        const pesoMeta = parseFloat(String(p.peso_meta_kg));
        const denominador = pesoMeta - pesoInicio;
        if (denominador > 0) {
          progressoMeta = ((info.peso_atual - pesoInicio) / denominador) * 100;
        }
      }
      // GMD realizada até agora.
      let gmdRealizada: number | null = null;
      if (diasDecorridos && diasDecorridos > 0 && p.peso_inicio_kg_cab && info.peso_atual > 0) {
        const pesoInicio = parseFloat(String(p.peso_inicio_kg_cab));
        gmdRealizada = (info.peso_atual - pesoInicio) / diasDecorridos;
      }
      planoInfo.dias_decorridos = diasDecorridos;
      planoInfo.progresso_meta_percent = progressoMeta != null ? Number(progressoMeta.toFixed(1)) : null;
      planoInfo.gmd_realizada = gmdRealizada != null ? Number(gmdRealizada.toFixed(3)) : null;
      loteData.plano_vigente = planoInfo;
    } else if (p.data_fim) {
      // Plano encerrado: buscar snapshot.
      const snap = snapshots.find(s => s.plano_nutricional_id === p.id);
      if (snap) {
        planoInfo.duracao_dias = snap.duracao_dias;
        planoInfo.ganho_peso_total_kg = snap.ganho_peso_total_kg_cab ? parseFloat(String(snap.ganho_peso_total_kg_cab)) : null;
        planoInfo.gmd_realizada = snap.gmd_realizado ? parseFloat(String(snap.gmd_realizado)) : null;
        planoInfo.producao_arroba_lote = snap.producao_arroba_lote ? parseFloat(String(snap.producao_arroba_lote)) : null;
        planoInfo.mortalidade_percent = snap.mortalidade_percent ? parseFloat(String(snap.mortalidade_percent)) : null;
        planoInfo.motivo_migracao = snap.motivo_migracao;
      }
      (loteData.planos_encerrados as Array<Record<string, unknown>>).push(planoInfo);
    } else {
      // Plano futuro (não iniciado).
      if (!loteData.proximo_plano) {
        loteData.proximo_plano = planoInfo;
      }
    }
  }

  const resultado = Object.values(porLote);
  if (resultado.length === 0) {
    return { mensagem: "Nenhum plano nutricional encontrado para o(s) lote(s).", lotes: lotesArr.map(l => l.nome) };
  }
  return { count: resultado.length, lotes: resultado };
}

// ---------------------------------------------------------------------------
// Tool 6: get_pastos_fazenda
// Lista pastos ativos com ocupação atual via view v_lote_pasto_ocupacao_atual.
// ---------------------------------------------------------------------------
async function getPastosFazenda(args: { apenas_ocupados?: boolean }): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Buscar pastos ativos da fazenda.
  const pastosParams = new URLSearchParams({ select: "id,nome,area_util_ha,area_total_ha,setor,tipo,especie,ativo" });
  pastosParams.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  pastosParams.append("deleted_at", "is.null");
  pastosParams.append("order", "nome.asc");
  const pastosUrl = `${supabaseUrl}/rest/v1/pastos?${pastosParams.toString()}`;
  const pastosRes = await fetch(pastosUrl, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  if (!pastosRes.ok) return { erro: "Falha ao consultar pastos", status: pastosRes.status };
  const pastos = await pastosRes.json() as Array<Record<string, unknown>>;

  if (pastos.length === 0) {
    return { count: 0, mensagem: "Nenhum pasto ativo na fazenda." };
  }

  // Buscar ocupação atual via view.
  const pastoIds = pastos.map(p => p.id as string);
  const ocupParams = new URLSearchParams({ select: "pasto_id,pasto_nome,lote_id,lote_nome,modulo_nome,cabecas_atual,peso_vivo_medio_atual_kg,taxa_lotacao_ua_ha,periodo_ocupacao_dias,dias_acima_meta,meta_excedida" });
  ocupParams.append("pasto_id", `in.(${pastoIds.join(",")})`);
  const ocupUrl = `${supabaseUrl}/rest/v1/v_lote_pasto_ocupacao_atual?${ocupParams.toString()}`;
  const ocupRes = await fetch(ocupUrl, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  const ocupMap: Record<string, Record<string, unknown>> = {};
  if (ocupRes.ok) {
    const ocupRows = await ocupRes.json() as Array<Record<string, unknown>>;
    for (const o of ocupRows) {
      ocupMap[o.pasto_id as string] = o;
    }
  }

  // Montar resultado.
  let resultado = pastos.map(p => {
    const pid = p.id as string;
    const ocup = ocupMap[pid];
    const areaUtil = p.area_util_ha ? parseFloat(String(p.area_util_ha)) : (p.area_total_ha ? parseFloat(String(p.area_total_ha)) : null);
    return {
      pasto: p.nome,
      setor: p.setor || null,
      tipo: p.tipo || null,
      especie: p.especie || null,
      area_util_ha: areaUtil,
      ocupado: !!ocup,
      lote: ocup?.lote_nome || null,
      cabecas: ocup?.cabecas_atual ? Number(ocup.cabecas_atual) : 0,
      peso_medio_kg: ocup?.peso_vivo_medio_atual_kg ? parseFloat(String(ocup.peso_vivo_medio_atual_kg)) : null,
      taxa_lotacao_ua_ha: ocup?.taxa_lotacao_ua_ha ? parseFloat(String(ocup.taxa_lotacao_ua_ha)) : null,
      periodo_ocupacao_dias: ocup?.periodo_ocupacao_dias ? Math.round(parseFloat(String(ocup.periodo_ocupacao_dias))) : null,
      dias_acima_meta: ocup?.dias_acima_meta ? Math.round(parseFloat(String(ocup.dias_acima_meta))) : null,
      meta_excedida: ocup?.meta_excedida || false,
    };
  });

  if (args.apenas_ocupados) {
    resultado = resultado.filter(r => r.ocupado);
  }

  const ocupados = resultado.filter(r => r.ocupado).length;
  const vagos = resultado.length - ocupados;
  return {
    total: resultado.length,
    ocupados,
    vagos,
    pastos: resultado,
  };
}

// ---------------------------------------------------------------------------
// Tool 7: get_clima_periodo
// Precipitação e temperatura no período, agrupados por pluviômetro e dia.
// ---------------------------------------------------------------------------
async function getClimaPeriodo(args: { data_inicio?: string; data_fim?: string }): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(30);
  const dataFim = args.data_fim || todayISO();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "data,temperatura_media,umidade_relativa,medicoes" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  params.append("order", "data.asc");
  const url = `${supabaseUrl}/rest/v1/registros_clima?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  if (!res.ok) return { erro: "Falha ao consultar registros_clima", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return {
      count: 0,
      periodo: { inicio: dataInicio, fim: dataFim },
      mensagem: "Não há registros de clima no período.",
    };
  }

  // Agregar precipitação por pluviômetro e temperatura por dia.
  const chuvaPorPluviometro: Record<string, { nome: string, total: number, dias: number }> = {};
  let tempSum = 0, tempCount = 0, umidadeSum = 0, umidadeCount = 0;
  let chuvaTotalGeral = 0;
  const chuvaPorDia: Array<{ data: string; total: number }> = [];

  for (const r of rows) {
    const data = (r.data as string).slice(0, 10);
    const temp = r.temperatura_media ? parseFloat(String(r.temperatura_media)) : null;
    const umid = r.umidade_relativa ? parseFloat(String(r.umidade_relativa)) : null;
    if (temp != null) { tempSum += temp; tempCount++; }
    if (umid != null) { umidadeSum += umid; umidadeCount++; }

    // Processar medicoes (JSONB array de {medicao, pluviometro_nome, ...}).
    let chuvaDia = 0;
    const medicoes = r.medicoes as Array<Record<string, unknown>> | null;
    if (medicoes && Array.isArray(medicoes)) {
      for (const m of medicoes) {
        const medicao = m.medicao ? parseFloat(String(m.medicao)) : 0;
        const pluvNome = (m.pluviometro_nome as string) || "Desconhecido";
        chuvaDia += medicao;
        if (!chuvaPorPluviometro[pluvNome]) {
          chuvaPorPluviometro[pluvNome] = { nome: pluvNome, total: 0, dias: 0 };
        }
        chuvaPorPluviometro[pluvNome].total += medicao;
        if (medicao > 0) chuvaPorPluviometro[pluvNome].dias++;
      }
    }
    chuvaTotalGeral += chuvaDia;
    chuvaPorDia.push({ data, total: Number(chuvaDia.toFixed(1)) });
  }

  const pluvResumo = Object.values(chuvaPorPluviometro).map(p => ({
    pluviometro: p.nome,
    chuva_total_mm: Number(p.total.toFixed(1)),
    dias_com_chuva: p.dias,
  })).sort((a, b) => b.chuva_total_mm - a.chuva_total_mm);

  return {
    periodo: { inicio: dataInicio, fim: dataFim },
    dias_com_registro: rows.length,
    temperatura_media: tempCount > 0 ? Number((tempSum / tempCount).toFixed(1)) : null,
    umidade_media: umidadeCount > 0 ? Number((umidadeSum / umidadeCount).toFixed(1)) : null,
    chuva_total_mm: Number(chuvaTotalGeral.toFixed(1)),
    chuva_media_dia_mm: rows.length > 0 ? Number((chuvaTotalGeral / rows.length).toFixed(1)) : 0,
    chuva_por_pluviometro: pluvResumo,
    chuva_por_dia: chuvaPorDia.slice(-30), // últimos 30 dias com registro
  };
}

// ---------------------------------------------------------------------------
// Tool 8: get_estoque_insumos
// Saldo atual de insumos por tipo.
// ---------------------------------------------------------------------------
async function getEstoqueInsumos(args: { apenas_baixo_estoque?: boolean }): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "id,nome,tipo,estoque_atual,unidade,custo_unitario,custo_total_estoque,fornecedor,ativo" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("ativo", "eq.true");
  params.append("order", "tipo.asc,nome.asc");
  const url = `${supabaseUrl}/rest/v1/insumos?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-999" } });
  if (!res.ok) return { erro: "Falha ao consultar insumos", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { count: 0, mensagem: "Nenhum insumo ativo na fazenda." };
  }

  let insumos = rows.map(r => ({
    nome: r.nome as string,
    tipo: (r.tipo as string) || "Outro",
    estoque_atual: r.estoque_atual ? parseFloat(String(r.estoque_atual)) : 0,
    unidade: (r.unidade as string) || "un",
    custo_unitario: r.custo_unitario ? parseFloat(String(r.custo_unitario)) : null,
    custo_total_estoque: r.custo_total_estoque ? parseFloat(String(r.custo_total_estoque)) : null,
    fornecedor: (r.fornecedor as string) || null,
  }));

  if (args.apenas_baixo_estoque) {
    insumos = insumos.filter(i => i.estoque_atual < 100);
  }

  // Agrupar por tipo.
  const porTipo: Record<string, { count: number; custo_total: number; itens: typeof insumos }> = {};
  for (const i of insumos) {
    if (!porTipo[i.tipo]) porTipo[i.tipo] = { count: 0, custo_total: 0, itens: [] };
    porTipo[i.tipo].count++;
    porTipo[i.tipo].custo_total += i.custo_total_estoque || 0;
    porTipo[i.tipo].itens.push(i);
  }

  const resumoTipo = Object.entries(porTipo).map(([tipo, dados]) => ({
    tipo,
    count: dados.count,
    custo_total_estoque: Number(dados.custo_total.toFixed(2)),
  }));

  return {
    total_insumos: insumos.length,
    resumo_por_tipo: resumoTipo,
    insumos,
  };
}

// ---------------------------------------------------------------------------
// Tool 9: get_tratamentos_periodo
// Tratamentos veterinários aplicados, agrupados por medicamento e lote.
// ---------------------------------------------------------------------------
async function getTratamentosPeriodo(args: { data_inicio?: string; data_fim?: string }): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(90);
  const dataFim = args.data_fim || todayISO();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "data,lote,pasto,categoria,sexo,raca,idade,tratamento_obs,tratamento_outros,medicamentos,diagnosticos,brinco" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  params.append("order", "data.desc");
  const url = `${supabaseUrl}/rest/v1/registros_enfermaria?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  if (!res.ok) return { erro: "Falha ao consultar registros_enfermaria", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return {
      count: 0,
      periodo: { inicio: dataInicio, fim: dataFim },
      mensagem: "Não há registros de tratamento no período.",
    };
  }

  // Agregar por medicamento.
  const porMedicamento: Record<string, { tipo: string; nome: string; count: number; lotes: Set<string> }> = {};
  // Agregar por lote.
  const porLote: Record<string, number> = {};
  // Diagnosticos mais frequentes.
  const diagCount: Record<string, number> = {};

  for (const r of rows) {
    const lote = (r.lote as string) || "Não informado";
    porLote[lote] = (porLote[lote] || 0) + 1;

    // Processar medicamentos (JSONB array).
    const meds = r.medicamentos as Array<Record<string, unknown>> | null;
    if (meds && Array.isArray(meds)) {
      for (const m of meds) {
        const nomeComercial = (m.nomeComercial as string) || "Desconhecido";
        const tipo = (m.tipo as string) || "Outro";
        const key = `${tipo}|${nomeComercial}`;
        if (!porMedicamento[key]) {
          porMedicamento[key] = { tipo, nome: nomeComercial, count: 0, lotes: new Set() };
        }
        porMedicamento[key].count++;
        porMedicamento[key].lotes.add(lote);
      }
    }

    // Processar diagnosticos (JSONB object com {chave: {valor: "S"/"N"}}).
    const diags = r.diagnosticos as Record<string, { valor: string }> | null;
    if (diags && typeof diags === "object") {
      for (const [chave, val] of Object.entries(diags)) {
        if (val && val.valor === "S") {
          diagCount[chave] = (diagCount[chave] || 0) + 1;
        }
      }
    }
  }

  const medicamentosResumo = Object.values(porMedicamento).map(m => ({
    tipo: m.tipo,
    nome_comercial: m.nome,
    animais_tratados: m.count,
    lotes_afetados: Array.from(m.lotes),
  })).sort((a, b) => b.animais_tratados - a.animais_tratados);

  const lotesResumo = Object.entries(porLote)
    .map(([lote, count]) => ({ lote, animais_tratados: count }))
    .sort((a, b) => b.animais_tratados - a.animais_tratados);

  const diagResumo = Object.entries(diagCount)
    .map(([diag, count]) => ({ diagnostico: diag, ocorrencias: count }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias)
    .slice(0, 10);

  return {
    total_registros: rows.length,
    periodo: { inicio: dataInicio, fim: dataFim },
    medicamentos: medicamentosResumo,
    por_lote: lotesResumo,
    diagnosticos_frequentes: diagResumo,
  };
}

// ---------------------------------------------------------------------------
// Tool 10: get_financeiro_lote
// Indicadores financeiros de um lote a partir de lote_categorias.
// ---------------------------------------------------------------------------
async function getFinanceiroLote(args: { lote_nome?: string }): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Buscar lotes ativos.
  let lotesFilters: Record<string, string> = {
    "fazenda_id": `eq.${FAZENDA_TESTE_ID}`,
    "ativo": "eq.true",
  };
  if (args.lote_nome) {
    lotesFilters["nome"] = `eq.${args.lote_nome}`;
  }
  const lotes = await supabaseSelect(supabaseUrl, serviceRoleKey, "lotes", "id,nome", lotesFilters);
  if (!lotes || lotes.length === 0) {
    return { erro: args.lote_nome ? `Lote "${args.lote_nome}" não encontrado.` : "Nenhum lote ativo na fazenda." };
  }
  const lotesArr = lotes as { id: string; nome: string }[];
  const loteIds = lotesArr.map(l => l.id);

  // Buscar categorias ativas com campos financeiros.
  const selectFields = "lote_id,categoria,quant_atual,peso_vivo_atual_kg_cab,peso_vivo_meta_kg_cab," +
    "preco_entrada_reais_kg,preco_entrada_reais_cab,preco_entrada_reais_arroba," +
    "custo_operacional_reais_cab_dia,margem_lucro_percent,preco_custo_reais_arroba,preco_custo_cab," +
    "preco_venda_projetado_reais_arroba,preco_venda_sugerido_cab," +
    "faturamento_projetado_reais_lote_categoria,venda_total_arroba_lote_categoria," +
    "agio_percent,custo_frete_reais_cab,custo_comissao_reais_cab,custo_sanidade_reais_cab," +
    "custo_identificacao_rastreabilidade_reais_cab,custo_total_entrada_reais_cab,custo_total_entrada_reais_lote," +
    "peso_venda_meta_arroba,producao_atual_arroba_cab,producao_projetada_arroba_cab,peso_vivo_atual_arroba_cab";
  const params = new URLSearchParams({ select: selectFields });
  params.append("ativo", "eq.true");
  params.append("lote_id", `in.(${loteIds.join(",")})`);
  const url = `${supabaseUrl}/rest/v1/lote_categorias?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-999" } });
  if (!res.ok) return { erro: "Falha ao consultar lote_categorias", status: res.status };
  const cats = await res.json() as Array<Record<string, unknown>>;

  if (cats.length === 0) {
    return { erro: "Nenhuma categoria ativa encontrada.", lotes: lotesArr.map(l => l.nome) };
  }

  // Agrupar por lote, somando cabeças e calculando totais.
  const porLote: Record<string, Record<string, unknown>> = {};
  for (const c of cats) {
    const loteId = c.lote_id as string;
    const loteNome = lotesArr.find(l => l.id === loteId)?.nome || "Desconhecido";
    if (!porLote[loteNome]) {
      porLote[loteNome] = {
        lote: loteNome,
        categorias: [] as string[],
        cabecas: 0,
        custo_total_entrada_reais_lote: 0,
        faturamento_projetado_reais: 0,
        venda_total_arroba: 0,
      };
    }
    const d = porLote[loteNome];
    const cabecas = (c.quant_atual as number) ?? 0;
    d.cabecas += cabecas;
    if (c.categoria) (d.categorias as string[]).push(c.categoria as string);
    d.custo_total_entrada_reais_lote += c.custo_total_entrada_reais_lote ? parseFloat(String(c.custo_total_entrada_reais_lote)) : 0;
    d.faturamento_projetado_reais += c.faturamento_projetado_reais_lote_categoria ? parseFloat(String(c.faturamento_projetado_reais_lote_categoria)) : 0;
    d.venda_total_arroba += c.venda_total_arroba_lote_categoria ? parseFloat(String(c.venda_total_arroba_lote_categoria)) : 0;

    // Para campos por cabeça, usar a primeira categoria (ou média ponderada se múltiplas).
    const num = (field: string) => c[field] ? parseFloat(String(c[field])) : null;
    if (!d.preco_entrada_reais_cab) d.preco_entrada_reais_cab = num("preco_entrada_reais_cab");
    if (!d.custo_operacional_reais_cab_dia) d.custo_operacional_reais_cab_dia = num("custo_operacional_reais_cab_dia");
    if (!d.margem_lucro_percent) d.margem_lucro_percent = num("margem_lucro_percent");
    if (!d.preco_custo_reais_arroba) d.preco_custo_reais_arroba = num("preco_custo_reais_arroba");
    if (!d.preco_venda_projetado_reais_arroba) d.preco_venda_projetado_reais_arroba = num("preco_venda_projetado_reais_arroba");
    if (!d.agio_percent) d.agio_percent = num("agio_percent");
    if (!d.producao_projetada_arroba_cab) d.producao_projetada_arroba_cab = num("producao_projetada_arroba_cab");
    if (!d.peso_vivo_atual_kg_cab) d.peso_vivo_atual_kg_cab = num("peso_vivo_atual_kg_cab");
    if (!d.peso_vivo_meta_kg_cab) d.peso_vivo_meta_kg_cab = num("peso_vivo_meta_kg_cab");
  }

  // Arredondar valores numéricos.
  const resultado = Object.values(porLote).map(d => {
    const r = d as Record<string, unknown>;
    for (const key of ["custo_total_entrada_reais_lote", "faturamento_projetado_reais", "venda_total_arroba", "preco_entrada_reais_cab", "custo_operacional_reais_cab_dia", "margem_lucro_percent", "preco_custo_reais_arroba", "preco_venda_projetado_reais_arroba", "agio_percent", "producao_projetada_arroba_cab", "peso_vivo_atual_kg_cab", "peso_vivo_meta_kg_cab"]) {
      if (r[key] != null && typeof r[key] === "number") {
        r[key] = Number((r[key] as number).toFixed(2));
      }
    }
    return r;
  });

  return { count: resultado.length, lotes: resultado };
}

// ---------------------------------------------------------------------------
// Tool 11: get_individuos_fazenda
// Inventário de indivíduos com distribuição por raça, sexo, categoria, status.
// ---------------------------------------------------------------------------
async function getIndividuosFazenda(): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "sexo,categoria,raca,status,peso_atual_kg,idade_atual_meses,deleted_at" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  const url = `${supabaseUrl}/rest/v1/individuos?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-4999" } });
  if (!res.ok) return { erro: "Falha ao consultar individuos", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { count: 0, mensagem: "Nenhum indivíduo registrado na fazenda." };
  }

  // Agregar distribuições.
  const porRaca: Record<string, number> = {};
  const porSexo: Record<string, number> = {};
  const porCategoria: Record<string, number> = {};
  const porStatus: Record<string, number> = {};
  let pesoSum = 0, pesoCount = 0;
  let idadeSum = 0, idadeCount = 0;

  for (const r of rows) {
    const raca = (r.raca as string) || "Não informada";
    const sexo = (r.sexo as string) || "Não informado";
    const categoria = (r.categoria as string) || "Não informada";
    const status = (r.status as string) || "Ativo";
    porRaca[raca] = (porRaca[raca] || 0) + 1;
    porSexo[sexo] = (porSexo[sexo] || 0) + 1;
    porCategoria[categoria] = (porCategoria[categoria] || 0) + 1;
    porStatus[status] = (porStatus[status] || 0) + 1;
    if (r.peso_atual_kg) { pesoSum += parseFloat(String(r.peso_atual_kg)); pesoCount++; }
    if (r.idade_atual_meses) { idadeSum += parseInt(String(r.idade_atual_meses)); idadeCount++; }
  }

  const toSortedArray = (obj: Record<string, number>) => Object.entries(obj)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: rows.length,
    peso_medio_kg: pesoCount > 0 ? Number((pesoSum / pesoCount).toFixed(1)) : null,
    idade_media_meses: idadeCount > 0 ? Math.round(idadeSum / idadeCount) : null,
    por_raca: toSortedArray(porRaca),
    por_sexo: toSortedArray(porSexo),
    por_categoria: toSortedArray(porCategoria),
    por_status: toSortedArray(porStatus),
  };
}

// ---------------------------------------------------------------------------
// Tool 12: get_abastecimento_periodo
// Consumo de combustível por máquina/veículo e por tipo.
// ---------------------------------------------------------------------------
async function getAbastecimentoPeriodo(args: { data_inicio?: string; data_fim?: string }): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(30);
  const dataFim = args.data_fim || todayISO();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "data,maquina_veiculo,combustivel,total_abastecido,operador_motorista,tipo_operacao" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  params.append("order", "data.desc");
  const url = `${supabaseUrl}/rest/v1/registros_abastecimento?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  if (!res.ok) return { erro: "Falha ao consultar registros_abastecimento", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { count: 0, periodo: { inicio: dataInicio, fim: dataFim }, mensagem: "Não há registros de abastecimento no período." };
  }

  // Agregar por máquina e por combustível.
  const porMaquina: Record<string, { total_litros: number; count: number }> = {};
  const porCombustivel: Record<string, number> = {};
  let totalGeral = 0;

  for (const r of rows) {
    const maquina = (r.maquina_veiculo as string) || "Não informada";
    const combustivel = (r.combustivel as string) || "Não informado";
    const litros = r.total_abastecido ? parseFloat(String(r.total_abastecido)) : 0;
    totalGeral += litros;
    if (!porMaquina[maquina]) porMaquina[maquina] = { total_litros: 0, count: 0 };
    porMaquina[maquina].total_litros += litros;
    porMaquina[maquina].count++;
    porCombustivel[combustivel] = (porCombustivel[combustivel] || 0) + litros;
  }

  const maquinaResumo = Object.entries(porMaquina).map(([maquina, d]) => ({
    maquina,
    total_litros: Number(d.total_litros.toFixed(1)),
    abastecimentos: d.count,
  })).sort((a, b) => b.total_litros - a.total_litros);

  const combustivelResumo = Object.entries(porCombustivel).map(([comb, total]) => ({
    combustivel: comb,
    total_litros: Number(total.toFixed(1)),
  })).sort((a, b) => b.total_litros - a.total_litros);

  return {
    total_abastecimentos: rows.length,
    total_litros: Number(totalGeral.toFixed(1)),
    periodo: { inicio: dataInicio, fim: dataFim },
    por_maquina: maquinaResumo,
    por_combustivel: combustivelResumo,
  };
}

// ---------------------------------------------------------------------------
// Tool 13: get_maternidade_periodo
// Nascimentos registrados no período.
// ---------------------------------------------------------------------------
async function getMaternidadePeriodo(args: { data_inicio?: string; data_fim?: string }): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(90);
  const dataFim = args.data_fim || todayISO();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "data,sexo,raca,peso_cria_kg,tipo_parto,categoria_mae,lote,escore_matriz,observacao_parto" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  params.append("order", "data.desc");
  const url = `${supabaseUrl}/rest/v1/registros_maternidade?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  if (!res.ok) return { erro: "Falha ao consultar registros_maternidade", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { count: 0, periodo: { inicio: dataInicio, fim: dataFim }, mensagem: "Não há registros de nascimento no período." };
  }

  const porSexo: Record<string, number> = {};
  const porRaca: Record<string, number> = {};
  const porTipoParto: Record<string, number> = {};
  let pesoSum = 0, pesoCount = 0;

  for (const r of rows) {
    const sexo = (r.sexo as string) || "Não informado";
    const raca = (r.raca as string) || "Não informada";
    porSexo[sexo] = (porSexo[sexo] || 0) + 1;
    porRaca[raca] = (porRaca[raca] || 0) + 1;
    if (r.peso_cria_kg) { pesoSum += parseFloat(String(r.peso_cria_kg)); pesoCount++; }
    // tipo_parto é JSONB, pode ser string ou objeto.
    const tp = r.tipo_parto;
    if (tp) {
      const tpStr = typeof tp === "string" ? tp : JSON.stringify(tp);
      porTipoParto[tpStr] = (porTipoParto[tpStr] || 0) + 1;
    }
  }

  const toSorted = (obj: Record<string, number>) => Object.entries(obj)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total_nascimentos: rows.length,
    periodo: { inicio: dataInicio, fim: dataFim },
    peso_medio_cria_kg: pesoCount > 0 ? Number((pesoSum / pesoCount).toFixed(1)) : null,
    por_sexo: toSorted(porSexo),
    por_raca: toSorted(porRaca),
    por_tipo_parto: toSorted(porTipoParto),
  };
}

// ---------------------------------------------------------------------------
// Tool 14: get_bebedouros_status
// Status dos bebedouros com cálculo de necessidade de limpeza.
// ---------------------------------------------------------------------------
async function getBebedourosStatus(args: { apenas_precisa_limpeza?: boolean }): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "id,nome,capacidade,data_ultima_limpeza,meta_intervalo_limpeza,ativo" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("ativo", "eq.true");
  params.append("order", "nome.asc");
  const url = `${supabaseUrl}/rest/v1/bebedouros?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-999" } });
  if (!res.ok) return { erro: "Falha ao consultar bebedouros", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { count: 0, mensagem: "Nenhum bebedouro ativo na fazenda." };
  }

  const hoje = new Date();
  let bebedouros = rows.map(r => {
    const dataLimpeza = r.data_ultima_limpeza as string | null;
    const metaDias = r.meta_intervalo_limpeza as number | null;
    let diasDesdeLimpeza: number | null = null;
    let precisaLimpeza = false;
    if (dataLimpeza) {
      const limpeza = new Date(dataLimpeza);
      diasDesdeLimpeza = Math.floor((hoje.getTime() - limpeza.getTime()) / (1000 * 60 * 60 * 24));
      if (metaDias && diasDesdeLimpeza > metaDias) {
        precisaLimpeza = true;
      }
    } else {
      // Sem registro de limpeza: precisa.
      precisaLimpeza = true;
    }
    return {
      nome: r.nome as string,
      capacidade: r.capacidade ? parseFloat(String(r.capacidade)) : null,
      data_ultima_limpeza: dataLimpeza,
      dias_desde_limpeza: diasDesdeLimpeza,
      meta_intervalo_dias: metaDias || null,
      precisa_limpeza: precisaLimpeza,
    };
  });

  if (args.apenas_precisa_limpeza) {
    bebedouros = bebedouros.filter(b => b.precisa_limpeza);
  }

  const precisaLimpezaCount = bebedouros.filter(b => b.precisa_limpeza).length;
  return {
    total: bebedouros.length,
    precisam_limpeza: precisaLimpezaCount,
    bebedouros,
  };
}

// ---------------------------------------------------------------------------
// Tool 15: get_funcionarios_fazenda
// Quadro de funcionários ativos.
// ---------------------------------------------------------------------------
async function getFuncionariosFazenda(): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "nome,cargo,telefone,acessa_app,cadernetas_permitidas,ativo" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("ativo", "eq.true");
  params.append("order", "nome.asc");
  const url = `${supabaseUrl}/rest/v1/funcionarios?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-499" } });
  if (!res.ok) return { erro: "Falha ao consultar funcionarios", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { count: 0, mensagem: "Nenhum funcionário ativo na fazenda." };
  }

  const porCargo: Record<string, number> = {};
  let acessamApp = 0;

  const funcionarios = rows.map(r => {
    const cargo = (r.cargo as string) || "Não informado";
    porCargo[cargo] = (porCargo[cargo] || 0) + 1;
    const acessa = r.acessa_app === true;
    if (acessa) acessamApp++;
    // cadernetas_permitidas é JSONB, pode ser array ou null.
    const cadernetas = r.cadernetas_permitidas;
    let numCadernetas = 0;
    if (Array.isArray(cadernetas)) {
      numCadernetas = cadernetas.length;
    }
    return {
      nome: r.nome as string,
      cargo,
      telefone: (r.telefone as string) || null,
      acessa_app: acessa,
      cadernetas_permitidas: numCadernetas,
    };
  });

  const cargoResumo = Object.entries(porCargo).map(([cargo, count]) => ({ cargo, count })).sort((a, b) => b.count - a.count);

  return {
    total: funcionarios.length,
    acessam_app: acessamApp,
    por_cargo: cargoResumo,
    funcionarios,
  };
}

// ---------------------------------------------------------------------------
// Tool 16: get_rodeio_periodo
// Registros de rodeio (manejo) com contagem por categoria e diagnósticos.
// ---------------------------------------------------------------------------
async function getRodeioPeriodo(args: { data_inicio?: string; data_fim?: string }): Promise<unknown> {
  const dataInicio = args.data_inicio || daysAgoISO(90);
  const dataFim = args.data_fim || todayISO();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const params = new URLSearchParams({ select: "data,lote,pasto,vaca,touro,bezerro,boi,garrote,novilha,total_cabecas,escore_gado,escore_fezes,diagnosticos,gado_contado" });
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);
  params.append("deleted_at", "is.null");
  params.append("data", `gte.${dataInicio}T00:00:00Z`);
  params.append("data", `lte.${dataFim}T23:59:59Z`);
  params.append("order", "data.desc");
  const url = `${supabaseUrl}/rest/v1/registros_rodeio?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Range: "0-1999" } });
  if (!res.ok) return { erro: "Falha ao consultar registros_rodeio", status: res.status };
  const rows = await res.json() as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { count: 0, periodo: { inicio: dataInicio, fim: dataFim }, mensagem: "Não há registros de rodeio no período." };
  }

  // Agregar contagens por categoria.
  let totalVaca = 0, totalTouro = 0, totalBezerro = 0, totalBoi = 0, totalGarrote = 0, totalNovilha = 0;
  let totalCabecas = 0;
  let escoreGadoSum = 0, escoreGadoCount = 0;
  let escoreFezesSum = 0, escoreFezesCount = 0;
  const diagCount: Record<string, number> = {};

  for (const r of rows) {
    totalVaca += (r.vaca as number) || 0;
    totalTouro += (r.touro as number) || 0;
    totalBezerro += (r.bezerro as number) || 0;
    totalBoi += (r.boi as number) || 0;
    totalGarrote += (r.garrote as number) || 0;
    totalNovilha += (r.novilha as number) || 0;
    totalCabecas += (r.total_cabecas as number) || 0;
    if (r.escore_gado) { escoreGadoSum += parseFloat(String(r.escore_gado)); escoreGadoCount++; }
    if (r.escore_fezes) { escoreFezesSum += parseInt(String(r.escore_fezes)); escoreFezesCount++; }
    // diagnosticos é JSONB.
    const diags = r.diagnosticos as Record<string, { valor: string }> | null;
    if (diags && typeof diags === "object") {
      for (const [chave, val] of Object.entries(diags)) {
        if (val && val.valor === "S") {
          diagCount[chave] = (diagCount[chave] || 0) + 1;
        }
      }
    }
  }

  const diagResumo = Object.entries(diagCount)
    .map(([diag, count]) => ({ diagnostico: diag, ocorrencias: count }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias)
    .slice(0, 10);

  return {
    total_rodeios: rows.length,
    periodo: { inicio: dataInicio, fim: dataFim },
    contagem_total: {
      vaca: totalVaca,
      touro: totalTouro,
      bezerro: totalBezerro,
      boi: totalBoi,
      garrote: totalGarrote,
      novilha: totalNovilha,
      total_cabecas: totalCabecas,
    },
    escore_gado_medio: escoreGadoCount > 0 ? Number((escoreGadoSum / escoreGadoCount).toFixed(1)) : null,
    escore_fezes_medio: escoreFezesCount > 0 ? Number((escoreFezesSum / escoreFezesCount).toFixed(1)) : null,
    diagnosticos_frequentes: diagResumo,
  };
}

// ---------------------------------------------------------------------------
// Tool 17: query_dados_fazenda
// Query genérica read-only com 7 camadas de segurança:
//   1. Método HTTP GET (PostgREST só faz SELECT em GET, por construção)
//   2. Whitelist de tabelas (QUERY_WHITELIST)
//   3. Whitelist de colunas excluídas (ex: pin_hash, cpf em funcionarios)
//   4. Injeção automática de fazenda_id (não-overridable pela IA)
//   5. Validação de nomes de coluna por regex (previne injection)
//   6. Limite máximo de 500 linhas
//   7. Timeout de 10s no fetch
// ---------------------------------------------------------------------------
async function queryDadosFazenda(args: {
  tabela: string;
  select?: string;
  filtros?: Record<string, string>;
  order?: string;
  limit?: number;
}): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Camada 2: validar tabela contra whitelist.
  const tableConfig = QUERY_WHITELIST[args.tabela];
  if (!tableConfig) {
    return {
      erro: `Tabela "${args.tabela}" não está disponível para consulta.`,
      tabelas_disponiveis: Object.keys(QUERY_WHITELIST),
    };
  }

  // Camada 5: validar e sanitizar colunas do select.
  const selectRaw = args.select || "*";
  let validatedSelect: string;
  if (selectRaw === "*") {
    validatedSelect = "*";
  } else {
    const cols = selectRaw.split(",").map(c => c.trim()).filter(Boolean);
    for (const col of cols) {
      if (!VALID_COLUMN_NAME.test(col)) {
        return { erro: `Coluna inválida no select: "${col}". Apenas letras, números e underscore são permitidos.` };
      }
      // Camada 3: bloquear colunas excluídas.
      if (tableConfig.excludedColumns.includes(col)) {
        return { erro: `Coluna "${col}" não está disponível para consulta na tabela "${args.tabela}".` };
      }
    }
    validatedSelect = cols.join(",");
  }

  // Construir parâmetros da URL.
  const params = new URLSearchParams({ select: validatedSelect });

  // Camada 4: injetar fazenda_id automaticamente. A IA não pode sobrescrever.
  params.append("fazenda_id", `eq.${FAZENDA_TESTE_ID}`);

  // Processar filtros da IA.
  if (args.filtros && typeof args.filtros === "object") {
    for (const [key, value] of Object.entries(args.filtros)) {
      // Nunca permitir que a IA sobrescreva fazenda_id.
      if (key === "fazenda_id") continue;
      // Camada 5: validar nome da coluna do filtro.
      if (!VALID_COLUMN_NAME.test(key)) {
        return { erro: `Coluna inválida no filtro: "${key}".` };
      }
      // Camada 3: bloquear colunas excluídas em filtros.
      if (tableConfig.excludedColumns.includes(key)) {
        return { erro: `Coluna "${key}" não está disponível para consulta.` };
      }
      params.append(key, value);
    }
  }

  // Validar e adicionar order.
  if (args.order) {
    const orderParts = args.order.split(".");
    if (orderParts.length !== 2 || !["asc", "desc"].includes(orderParts[1])) {
      return { erro: "order deve estar no formato 'coluna.asc' ou 'coluna.desc'." };
    }
    if (!VALID_COLUMN_NAME.test(orderParts[0])) {
      return { erro: `Coluna inválida em order: "${orderParts[0]}".` };
    }
    if (tableConfig.excludedColumns.includes(orderParts[0])) {
      return { erro: `Coluna "${orderParts[0]}" não está disponível.` };
    }
    params.append("order", args.order);
  }

  // Camada 6: limite máximo de 500 linhas.
  const limit = Math.min(Math.max(args.limit || 100, 1), 500);

  // Montar URL e executar GET.
  const url = `${supabaseUrl}/rest/v1/${args.tabela}?${params.toString()}`;

  // Camada 1 + 7: GET request com timeout de 10s.
  // GET em PostgREST é semanticamente SELECT. Não há caminho para INSERT/UPDATE/DELETE via GET.
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Range: `0-${limit - 1}`,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    return { erro: "Timeout ou falha de rede ao consultar o banco.", tabela: args.tabela };
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[chat-fazenda] query_dados_fazenda error ${res.status}:`, errText);
    return { erro: `Falha ao consultar ${args.tabela}`, status: res.status };
  }

  let rows = await res.json() as Array<Record<string, unknown>>;

  // Camada 3 (complementar): se select=*, remover colunas excluídas da resposta.
  if (selectRaw === "*" && tableConfig.excludedColumns.length > 0 && Array.isArray(rows)) {
    rows = rows.map(r => {
      const stripped = { ...r };
      for (const col of tableConfig.excludedColumns) {
        delete stripped[col];
      }
      return stripped;
    });
  }

  return {
    tabela: args.tabela,
    count: Array.isArray(rows) ? rows.length : 0,
    rows: Array.isArray(rows) ? rows.slice(0, limit) : rows,
  };
}

// ---------------------------------------------------------------------------
// Despachante de funções.
// ---------------------------------------------------------------------------
async function executeFunction(call: ToolCall): Promise<FunctionResult> {
  switch (call.name) {
    case "get_media_trato_periodo":
      return { name: call.name, result: await getMediaTratoPeriodo(call.args as any) };
    case "get_peso_medio_lote":
      return { name: call.name, result: await getPesoMedioLote(call.args as any) };
    case "get_mortalidade_periodo":
      return { name: call.name, result: await getMortalidadePeriodo(call.args as any) };
    case "get_movimentacoes_lote":
      return { name: call.name, result: await getMovimentacoesLote(call.args as any) };
    case "get_plano_nutricional_lote":
      return { name: call.name, result: await getPlanoNutricionalLote(call.args as any) };
    case "get_pastos_fazenda":
      return { name: call.name, result: await getPastosFazenda(call.args as any) };
    case "get_clima_periodo":
      return { name: call.name, result: await getClimaPeriodo(call.args as any) };
    case "get_estoque_insumos":
      return { name: call.name, result: await getEstoqueInsumos(call.args as any) };
    case "get_tratamentos_periodo":
      return { name: call.name, result: await getTratamentosPeriodo(call.args as any) };
    case "get_financeiro_lote":
      return { name: call.name, result: await getFinanceiroLote(call.args as any) };
    case "get_individuos_fazenda":
      return { name: call.name, result: await getIndividuosFazenda() };
    case "get_abastecimento_periodo":
      return { name: call.name, result: await getAbastecimentoPeriodo(call.args as any) };
    case "get_maternidade_periodo":
      return { name: call.name, result: await getMaternidadePeriodo(call.args as any) };
    case "get_bebedouros_status":
      return { name: call.name, result: await getBebedourosStatus(call.args as any) };
    case "get_funcionarios_fazenda":
      return { name: call.name, result: await getFuncionariosFazenda() };
    case "get_rodeio_periodo":
      return { name: call.name, result: await getRodeioPeriodo(call.args as any) };
    case "query_dados_fazenda":
      return { name: call.name, result: await queryDadosFazenda(call.args as any) };
    default:
      return { name: call.name, result: { erro: `Função "${call.name}" não implementada.` } };
  }
}

// ---------------------------------------------------------------------------
// Interação com Gemini.
// ---------------------------------------------------------------------------
function buildSystemContext(): string {
  return [
    "Você é um assistente de análise de dados para uma fazenda de gado (pecuária).",
    "Responda sempre em português do Brasil, de forma direta e objetiva.",
    "Use as funções disponíveis para buscar dados reais. NUNCA invente números.",
    "Se uma função retornar count=0 ou mensagem de 'não há dados', diga claramente que não há dados para o período/lote informado.",
    "Ao citar números, indique o período e o lote consultado.",
    "Se o usuário perguntar algo que nenhuma função disponível pode responder, diga que ainda não consegue responder esse tipo de pergunta.",
    "Arredonde valores numéricos para no máximo 2 casas decimais.",
    "Quando houver múltiplas categorias em um lote, some as cabeças e faça média ponderada do peso.",
    "Você tem acesso a 17 funções: 16 funções específicas (suplementação, peso, mortalidade, movimentações, " +
      "planos nutricionais, pastos, clima, estoque, tratamentos, financeiro, indivíduos, abastecimento, " +
      "maternidade, bebedouros, funcionários, rodeio) e 1 função genérica de query (query_dados_fazenda).",
    "SEMPRE prefira as funções específicas quando a pergunta se encaixar em um dos domínios cobertos. " +
      "Use query_dados_fazenda apenas como último recurso, para tabelas não cobertas pelas funções específicas " +
      "(ex: registros_pastagens, maquinas_veiculos, fornecedores, frigorificos, currais, etc.).",
    "Para perguntas sobre plano nutricional, performance ou GMD, use get_plano_nutricional_lote.",
    "Para perguntas sobre pastos, ocupação ou taxa de lotação, use get_pastos_fazenda.",
    "Para perguntas sobre chuva, precipitação ou temperatura, use get_clima_periodo.",
    "Para perguntas sobre estoque de sal, ração ou insumos, use get_estoque_insumos.",
    "Para perguntas sobre tratamentos, enfermaria ou medicamentos aplicados, use get_tratamentos_periodo.",
    "Para perguntas sobre custo de produção, margem, faturamento ou arrobas, use get_financeiro_lote.",
    "Para perguntas sobre o rebanho, raças ou distribuição de animais, use get_individuos_fazenda.",
    "Para perguntas sobre combustível, abastecimento de máquinas ou veículos, use get_abastecimento_periodo.",
    "Para perguntas sobre nascimentos, parição ou maternidade, use get_maternidade_periodo.",
    "Para perguntas sobre bebedouros, limpeza ou água, use get_bebedouros_status.",
    "Para perguntas sobre funcionários, quadro de pessoal ou peões, use get_funcionarios_fazenda.",
    "Para perguntas sobre rodeio, manejo ou contagem de gado, use get_rodeio_periodo.",
    "Para qualquer outra pergunta sobre dados da fazenda, use query_dados_fazenda especificando a tabela, " +
      "colunas (select), filtros (PostgREST: eq, gt, gte, lt, lte, like, in, is.null, isnot.null), order e limit. " +
      "Inclua \"deleted_at\": \"is.null\" nos filtros quando quiser apenas registros ativos.",
    "Você pode chamar múltiplas funções em paralelo quando a pergunta envolver mais de um domínio.",
  ].join(" ");
}

async function callGemini(
  apiKey: string,
  systemContext: string,
  contents: Array<Record<string, unknown>>,
): Promise<{ text?: string; toolCalls?: ToolCall[]; modelContent?: Record<string, unknown>; usage?: { promptTokens: number; candidatesTokens: number; cachedTokens: number } }> {
  // Incluir systemInstruction separadamente (formato Gemini 3.x).
  const body = {
    systemInstruction: { parts: [{ text: systemContext }] },
    contents,
    tools: TOOLS_DECLARATION,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 2048 },
    },
  };

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const modelContent = candidate?.content;
  const parts = modelContent?.parts || [];
  const usage = data?.usageMetadata;
  const toolCalls: ToolCall[] = [];
  let text = "";

  for (const part of parts) {
    if (part.text) {
      text += part.text;
    }
    if (part.functionCall) {
      toolCalls.push({ name: part.functionCall.name, args: part.functionCall.args || {}, id: part.functionCall.id });
    }
  }

  return {
    text: text || undefined,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    modelContent: modelContent,
    usage: usage
      ? {
          promptTokens: usage.promptTokenCount || 0,
          candidatesTokens: usage.candidatesTokenCount || 0,
          cachedTokens: usage.cachedContentTokenCount || 0,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Log em chat_ia_logs.
// ---------------------------------------------------------------------------
async function insertLog(
  supabaseUrl: string,
  serviceRoleKey: string,
  log: {
    fazenda_id: string;
    usuario_id: string;
    pergunta: string;
    resposta: string | null;
    funcoes_chamadas: unknown;
    modelo: string;
    tokens_input: number;
    tokens_output: number;
    tokens_cached: number;
    erro?: string;
  },
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/chat_ia_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        fazenda_id: log.fazenda_id,
        usuario_id: log.usuario_id,
        pergunta: log.pergunta,
        resposta: log.resposta,
        funcoes_chamadas: JSON.stringify(log.funcoes_chamadas),
        modelo: log.modelo,
        tokens_input: log.tokens_input,
        tokens_output: log.tokens_output,
        tokens_cached: log.tokens_cached,
        erro: log.erro || null,
      }),
    });
  } catch (e) {
    console.error("Falha ao inserir log de chat:", e);
  }
}

// ---------------------------------------------------------------------------
// Handler principal.
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erro: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    return new Response(JSON.stringify({ erro: "Configuração incompleta no servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { pergunta?: string };
    const pergunta = body?.pergunta?.trim();
    if (!pergunta) {
      return new Response(JSON.stringify({ erro: "Campo 'pergunta' é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validar usuário via JWT.
    const authHeader = req.headers.get("Authorization");
    const user = await getAuthUser(authHeader, supabaseUrl);
    if (!user) {
      return new Response(JSON.stringify({ erro: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolver fazenda do usuário.
    const fazendaId = await getFazendaIdForUser(user.id, supabaseUrl, serviceRoleKey);
    if (!fazendaId) {
      return new Response(JSON.stringify({ erro: "Usuário sem fazenda vinculada." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. BLOQUEIO HARD-CODED: só a fazenda de testes.
    if (fazendaId !== FAZENDA_TESTE_ID) {
      return new Response(JSON.stringify({
        erro: "Assistente de IA em fase de protótipo. Ainda não disponível para esta fazenda.",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Buscar nome da fazenda para contexto.
    const fazendaRes = await fetch(`${supabaseUrl}/rest/v1/fazendas?select=nome&id=eq.${fazendaId}`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    const fazendaRows = await fazendaRes.json() as { nome: string }[];
    const fazendaNome = fazendaRows?.[0]?.nome || "Fazenda";

    // 5. Interação com Gemini (até 5 rodadas de function calling).
    // System context é idêntico para todas as fazendas, maximizando implicit caching.
    // O nome da fazenda vai na primeira mensagem do usuário.
    const systemContext = buildSystemContext();
    const funcoesChamadas: Array<{ name: string; args: unknown; result?: unknown }> = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCachedTokens = 0;
    let respostaFinal = "";
    let erroMsg: string | undefined;

    // Gemini 3.x: manter histórico completo de contents.
    // O nome da fazenda vai na primeira mensagem do usuário (não no systemInstruction)
    // para que o systemInstruction + tools sejam idênticos entre fazendas,
    // maximizando a taxa de implicit cache hit.
    const contents: Array<Record<string, unknown>> = [
      { role: "user", parts: [{ text: `[Contexto: fazenda "${fazendaNome}"]\n\n${pergunta}` }] },
    ];

    for (let round = 0; round < 5; round++) {
      const geminiResult = await callGemini(geminiApiKey, systemContext, contents);
      totalInputTokens += geminiResult.usage?.promptTokens || 0;
      totalOutputTokens += geminiResult.usage?.candidatesTokens || 0;
      totalCachedTokens += geminiResult.usage?.cachedTokens || 0;
      console.log(`[chat-fazenda] round ${round}: text=${geminiResult.text ? "yes" : "no"}, toolCalls=${geminiResult.toolCalls?.length || 0}, in=${geminiResult.usage?.promptTokens || 0}, out=${geminiResult.usage?.candidatesTokens || 0}, cached=${geminiResult.usage?.cachedTokens || 0}`);

      if (geminiResult.toolCalls && geminiResult.toolCalls.length > 0) {
        // Adicionar resposta do modelo ao histórico (preserva thought signatures).
        if (geminiResult.modelContent) {
          contents.push(geminiResult.modelContent);
        }

        // Executar funções chamadas e coletar resultados.
        const functionResponseParts: Array<Record<string, unknown>> = [];
        for (const tc of geminiResult.toolCalls) {
          const fr = await executeFunction(tc);
          funcoesChamadas.push({ name: tc.name, args: tc.args, result: fr.result });
          functionResponseParts.push({
            functionResponse: {
              name: tc.name,
              id: tc.id,
              response: { result: fr.result },
            },
          });
        }

        // Adicionar respostas das funções como role "user" (Gemini 3.x não usa "function").
        contents.push({ role: "user", parts: functionResponseParts });
        continue;
      }

      if (geminiResult.text) {
        respostaFinal = geminiResult.text;
      } else {
        respostaFinal = "Não consegui gerar uma resposta. Tente reformular a pergunta.";
      }
      break;
    }

    if (!respostaFinal) {
      respostaFinal = "A análise exigiu muitas chamadas. Tente uma pergunta mais específica.";
    }

    // 6. Registrar log.
    await insertLog(supabaseUrl, serviceRoleKey, {
      fazenda_id: fazendaId,
      usuario_id: user.id,
      pergunta,
      resposta: respostaFinal,
      funcoes_chamadas: funcoesChamadas,
      modelo: GEMINI_MODEL,
      tokens_input: totalInputTokens,
      tokens_output: totalOutputTokens,
      tokens_cached: totalCachedTokens,
      erro: erroMsg,
    });

    // 7. Responder.
    return new Response(JSON.stringify({
      resposta: respostaFinal,
      funcoes_chamadas: funcoesChamadas.map(f => f.name),
      tokens: { input: totalInputTokens, output: totalOutputTokens, cached: totalCachedTokens },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro na edge function chat-fazenda:", err);
    return new Response(JSON.stringify({
      erro: "Erro interno ao processar a pergunta.",
      detalhe: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
