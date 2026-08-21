
-- ============================================================================
-- FASE 2 - Backend: Notificações e Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Notificação de lembrete para indivíduos incompletos antigos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_individuos_incompletos_antigos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_identificacao TEXT;
  v_titulo TEXT := 'Indivíduo incompleto há mais de 7 dias';
  v_mensagem TEXT;
  v_acao_url TEXT;
  v_usuario_id UUID;
  v_notificacao_existente_id UUID;
BEGIN
  FOR r IN
    SELECT
      i.id,
      i.fazenda_id,
      i.id_brinco,
      i.id_chip,
      i.id_manejo,
      i.id_provisorio_cria,
      i.sync_status,
      i.created_at
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND i.sync_status IN ('automatico_incompleto', 'manual_incompleto')
      AND i.created_at < (now() - INTERVAL '7 days')
  LOOP
    v_identificacao := COALESCE(
      NULLIF(TRIM(r.id_brinco), ''),
      NULLIF(TRIM(r.id_chip), ''),
      NULLIF(TRIM(r.id_manejo), ''),
      NULLIF(TRIM(r.id_provisorio_cria), ''),
      'sem identificação'
    );

    v_mensagem := format(
      'O indivíduo %s está incompleto há mais de 7 dias. Revise e complete o cadastro.',
      v_identificacao
    );
    v_acao_url := '/controller/individuos/' || r.id;

    FOR v_usuario_id IN
      SELECT uf.usuario_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE uf.fazenda_id = r.fazenda_id
        AND uf.ativo = true
        AND u.ativo = true
    LOOP
      SELECT id INTO v_notificacao_existente_id
      FROM public.notificacoes
      WHERE usuario_id = v_usuario_id
        AND fazenda_id = r.fazenda_id
        AND tipo = 'warning'
        AND mensagem = v_mensagem
        AND lida = false
        AND deleted_at IS NULL
      LIMIT 1;

      IF v_notificacao_existente_id IS NULL THEN
        INSERT INTO public.notificacoes (
          usuario_id, fazenda_id, tipo, titulo, mensagem,
          acao_url, acao_label, lida, created_at, updated_at
        ) VALUES (
          v_usuario_id, r.fazenda_id, 'warning', v_titulo, v_mensagem,
          v_acao_url, 'Completar cadastro', false, now(), now()
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Notificação de proximidade de desmama
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_proximidade_desmama()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_peso_estimado NUMERIC;
  v_identificacao TEXT;
  v_titulo TEXT := 'Proximidade de desmama';
  v_mensagem TEXT;
  v_acao_url TEXT;
  v_usuario_id UUID;
  v_notificacao_existente_id UUID;
BEGIN
  FOR r IN
    SELECT
      i.id,
      i.fazenda_id,
      i.id_brinco,
      i.id_chip,
      i.id_manejo,
      i.id_provisorio_cria,
      i.categoria,
      i.idade_atual_meses,
      i.peso_atual_kg,
      i.peso_nascimento_kg,
      i.gmd_kg_cab_dia,
      i.data_desmama
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND i.status = 'Vivo'
      AND i.categoria IN ('Bezerro ao Pé', 'Bezerra ao Pé')
      AND i.idade_atual_meses BETWEEN 6 AND 8
      AND i.data_desmama IS NULL
  LOOP
    -- Estimar peso atual
    IF r.peso_atual_kg IS NOT NULL THEN
      v_peso_estimado := r.peso_atual_kg;
    ELSIF r.peso_nascimento_kg IS NOT NULL AND r.gmd_kg_cab_dia IS NOT NULL AND r.idade_atual_meses IS NOT NULL THEN
      v_peso_estimado := r.peso_nascimento_kg + (r.gmd_kg_cab_dia * (r.idade_atual_meses * 30));
    ELSE
      CONTINUE;
    END IF;

    -- Só notifica se o peso estimado estiver entre 180kg e 210kg
    IF v_peso_estimado < 180 OR v_peso_estimado > 210 THEN
      CONTINUE;
    END IF;

    v_identificacao := COALESCE(
      NULLIF(TRIM(r.id_brinco), ''),
      NULLIF(TRIM(r.id_chip), ''),
      NULLIF(TRIM(r.id_manejo), ''),
      NULLIF(TRIM(r.id_provisorio_cria), ''),
      'sem identificação'
    );

    v_mensagem := format(
      'O indivíduo %s (%s) está com aproximadamente %s kg e %s meses de idade. Avalie a desmama.',
      v_identificacao,
      r.categoria,
      ROUND(v_peso_estimado, 1),
      r.idade_atual_meses
    );
    v_acao_url := '/controller/individuos/' || r.id;

    FOR v_usuario_id IN
      SELECT uf.usuario_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE uf.fazenda_id = r.fazenda_id
        AND uf.ativo = true
        AND u.ativo = true
    LOOP
      SELECT id INTO v_notificacao_existente_id
      FROM public.notificacoes
      WHERE usuario_id = v_usuario_id
        AND fazenda_id = r.fazenda_id
        AND tipo = 'warning'
        AND mensagem = v_mensagem
        AND lida = false
        AND deleted_at IS NULL
      LIMIT 1;

      IF v_notificacao_existente_id IS NULL THEN
        INSERT INTO public.notificacoes (
          usuario_id, fazenda_id, tipo, titulo, mensagem,
          acao_url, acao_label, lida, created_at, updated_at
        ) VALUES (
          v_usuario_id, r.fazenda_id, 'warning', v_titulo, v_mensagem,
          v_acao_url, 'Avaliar desmama', false, now(), now()
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Agendamento via pg_cron
-- ----------------------------------------------------------------------------
SELECT cron.schedule('notificar_individuos_incompletos_antigos', '0 8 * * 1', 'SELECT public.notificar_individuos_incompletos_antigos();');
SELECT cron.schedule('notificar_proximidade_desmama', '0 8 1 * *', 'SELECT public.notificar_proximidade_desmama();');
;
