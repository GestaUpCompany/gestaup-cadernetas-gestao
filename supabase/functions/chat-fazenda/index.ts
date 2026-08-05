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
