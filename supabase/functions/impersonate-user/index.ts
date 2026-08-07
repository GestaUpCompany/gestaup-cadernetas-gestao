// Edge Function: impersonate-user
// Permite que um super_admin gere um token de sessão para outro usuário,
// para fins de suporte e debug. Registra a sessão de impersonação no banco.
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLIC_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Missing env vars:", { hasUrl: !!supabaseUrl, hasServiceKey: !!serviceRoleKey, hasAnonKey: !!anonKey });
    return new Response(JSON.stringify({ erro: "Configuração de servidor incompleta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Validar token do caller (deve ser super_admin)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ erro: "Token de autenticação necessário" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerToken = authHeader.replace("Bearer ", "");

    // Buscar dados do caller usando o token dele
    const callerResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${callerToken}`,
        apikey: anonKey,
      },
    });

    if (!callerResponse.ok) {
      const errBody = await callerResponse.text();
      console.error("Caller auth failed:", callerResponse.status, errBody);
      return new Response(JSON.stringify({ erro: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerAuthUser = await callerResponse.json();

    // Buscar dados do caller na tabela usuarios
    const callerDbResponse = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?auth_id=eq.${callerAuthUser.id}&select=id,email,nome,papel`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const callerDbData = await callerDbResponse.json();
    if (!callerDbData || callerDbData.length === 0) {
      console.error("Caller not found in usuarios table, auth_id:", callerAuthUser.id);
      return new Response(JSON.stringify({ erro: "Usuário caller não encontrado no banco" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = callerDbData[0];
    if (caller.papel !== "super_admin") {
      return new Response(JSON.stringify({ erro: "Apenas super_admin pode impersonar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse do body
    const body = await req.json();
    const { targetUserId, reason } = body;

    if (!targetUserId) {
      return new Response(JSON.stringify({ erro: "targetUserId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Buscar dados do usuário alvo
    const targetDbResponse = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?id=eq.${targetUserId}&select=id,email,nome,papel,auth_id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const targetDbData = await targetDbResponse.json();
    if (!targetDbData || targetDbData.length === 0) {
      return new Response(JSON.stringify({ erro: "Usuário alvo não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = targetDbData[0];
    if (!target.auth_id) {
      return new Response(JSON.stringify({ erro: "Usuário alvo não tem auth_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Buscar fazenda do usuário alvo (primeira fazenda ativa)
    let targetFazendaId = null;
    let targetFazendaNome = null;
    const fazendaResponse = await fetch(
      `${supabaseUrl}/rest/v1/usuario_fazenda?usuario_id=eq.${targetUserId}&ativo=eq.true&select=fazenda_id,fazendas(id,nome,ativo)`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const fazendaData = await fazendaResponse.json();
    if (fazendaData && fazendaData.length > 0) {
      const fazendaAtiva = fazendaData.find((f: any) => f.fazendas?.ativo === true);
      if (fazendaAtiva) {
        targetFazendaId = fazendaAtiva.fazenda_id;
        targetFazendaNome = fazendaAtiva.fazendas?.nome;
      }
    }

    // 5. Gerar magic link para o usuário alvo usando a Admin API
    // O generate_link retorna um action_link que contém o token RAW na URL
    const magicLinkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        type: "magiclink",
        email: target.email,
      }),
    });

    if (!magicLinkResponse.ok) {
      const errBody = await magicLinkResponse.text();
      console.error("generate_link failed:", magicLinkResponse.status, errBody);
      return new Response(JSON.stringify({ erro: "Falha ao gerar token de impersonação", detalhe: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const magicLinkData = await magicLinkResponse.json();
    // A resposta do generate_link é flat (não tem wrapper "properties")
    const hashedToken = magicLinkData.hashed_token || magicLinkData.properties?.hashed_token;

    if (!hashedToken) {
      console.error("No hashed_token in generate_link response:", JSON.stringify(magicLinkData));
      return new Response(JSON.stringify({ erro: "Hashed token não encontrado na resposta do magic link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Fazer o exchange do token_hash por uma sessão real
    // POST /verify com token_hash exige APENAS type e token_hash (sem email, phone, redirect_to)
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({
        type: "magiclink",
        token_hash: hashedToken,
      }),
    });

    if (!verifyResponse.ok) {
      const errBody = await verifyResponse.text();
      console.error("verify failed:", verifyResponse.status, errBody);
      return new Response(JSON.stringify({ erro: "Falha ao verificar token de impersonação", detalhe: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionData = await verifyResponse.json();

    if (!sessionData.access_token || !sessionData.refresh_token) {
      console.error("No tokens in verify response:", JSON.stringify(sessionData));
      return new Response(JSON.stringify({ erro: "Sessão não retornou tokens válidos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Registrar sessão de impersonação no banco
    const sessionId = crypto.randomUUID();
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/impersonation_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: sessionId,
        super_admin_id: caller.id,
        super_admin_email: caller.email,
        target_user_id: target.id,
        target_user_email: target.email,
        target_user_nome: target.nome,
        target_fazenda_id: targetFazendaId,
        target_fazenda_nome: targetFazendaNome,
        reason: reason || null,
        is_active: true,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });

    if (!insertResponse.ok) {
      const errBody = await insertResponse.text();
      console.error("Failed to insert impersonation session:", insertResponse.status, errBody);
      // Não falha a operação só porque não conseguiu registrar no banco
      // A impersonação ainda funciona, só não fica auditada
    }

    // 8. Retornar a sessão para o frontend usar
    return new Response(
      JSON.stringify({
        session: {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          expires_at: sessionData.expires_at,
          user: sessionData.user,
        },
        impersonation: {
          sessionId,
          superAdminId: caller.id,
          superAdminEmail: caller.email,
          targetUserId: target.id,
          targetUserEmail: target.email,
          targetUserNome: target.nome,
          targetFazendaId,
          targetFazendaNome,
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in impersonate-user:", error);
    return new Response(
      JSON.stringify({ erro: "Erro interno do servidor", detalhe: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
