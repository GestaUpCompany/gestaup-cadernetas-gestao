// Edge Function: cotacao-dolar
// Busca cotação USD->BRL e atualiza ia_config_global.
// Roda server-side para contornar CORS do browser.
//
// Fontes (em ordem):
//   1. Banco Central PTAX (olinda) - cotação oficial, mais confiável
//   2. awesomeapi.com.br - fallback (cotação comercial em tempo real)
//
// @ts-nocheck (Deno runtime)

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

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ erro: "Configuração incompleta." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let cotacao: number | null = null;

    // Fonte 1: Banco Central PTAX (olinda)
    // Formato da data: MM-DD-YYYY
    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const yyyy = now.getFullYear();
      const dataCotacao = `${mm}-${dd}-${yyyy}`;

      const bcbUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dataCotacao}'&$top=1&$format=json`;
      console.log("[cotacao-dolar] tentando BCB:", bcbUrl);
      const apiRes = await fetch(bcbUrl);
      if (apiRes.ok) {
        const json = await apiRes.json();
        const val = parseFloat(json?.value?.[0]?.cotacaoVenda);
        if (!isNaN(val) && val > 0) {
          cotacao = val;
          console.log("[cotacao-dolar] BCB retornou:", val);
        }
      } else {
        console.log("[cotacao-dolar] BCB status:", apiRes.status);
      }
    } catch (e) {
      console.log("[cotacao-dolar] BCB falhou:", e instanceof Error ? e.message : String(e));
    }

    // Fonte 2: awesomeapi (fallback)
    if (cotacao === null) {
      try {
        const apiRes = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
        if (apiRes.ok) {
          const json = await apiRes.json();
          const val = parseFloat(json?.USDBRL?.bid);
          if (!isNaN(val) && val > 0) {
            cotacao = val;
            console.log("[cotacao-dolar] awesomeapi retornou:", val);
          }
        } else {
          console.log("[cotacao-dolar] awesomeapi status:", apiRes.status);
        }
      } catch (e) {
        console.log("[cotacao-dolar] awesomeapi falhou:", e instanceof Error ? e.message : String(e));
      }
    }

    if (cotacao === null) {
      throw new Error("Não foi possível obter a cotação de nenhuma API");
    }

    // Salvar no banco.
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/ia_config_global?id=eq.1`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ cotacao_usd_brl: cotacao }),
    });

    if (!updateRes.ok) {
      throw new Error(`Erro ao salvar cotação: ${updateRes.status}`);
    }

    return new Response(JSON.stringify({
      cotacao_usd_brl: cotacao,
      atualizada_em: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro na edge function cotacao-dolar:", err);
    return new Response(JSON.stringify({
      erro: "Erro ao buscar cotação",
      detalhe: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
