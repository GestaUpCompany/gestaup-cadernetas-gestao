
-- Atualiza função para garantir notificação a todos os usuários ativos vinculados à fazenda
CREATE OR REPLACE FUNCTION public.gerar_notificacao_ocupacao(
  p_fazenda_id uuid,
  p_lote_id uuid,
  p_lote_nome text,
  p_pasto_id uuid,
  p_pasto_nome text,
  p_modulo_id uuid,
  p_modulo_nome text,
  p_tipo text,
  p_dias_ocupacao numeric,
  p_meta_dias integer,
  p_desvio_percentual numeric,
  p_acao_url text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usuario_id uuid;
  v_titulo text;
  v_mensagem text;
  v_acao_label text;
  v_acao_url text;
  v_notificacao_existente_id uuid;
BEGIN
  IF p_meta_dias IS NULL OR p_dias_ocupacao <= p_meta_dias THEN
    RETURN;
  END IF;

  IF p_tipo = 'pasto' THEN
    v_titulo := 'Meta de ocupação excedida no pasto';
    v_mensagem := format(
      'O lote %s está no pasto %s há %s dias, excedendo a meta de %s dias (desvio: %s%%).',
      COALESCE(p_lote_nome, ''), COALESCE(p_pasto_nome, ''),
      ROUND(p_dias_ocupacao, 1), p_meta_dias,
      COALESCE(ROUND(p_desvio_percentual, 1)::text, 'N/A')
    );
    v_acao_label := 'Ver pasto';
    v_acao_url := COALESCE(
      p_acao_url,
      CASE WHEN p_pasto_id IS NOT NULL
        THEN '/controller/pastos?pasto=' || p_pasto_id::text
        ELSE '/controller/pastos'
      END
    );
  ELSIF p_tipo = 'modulo' THEN
    v_titulo := 'Meta de ocupação excedida no módulo';
    v_mensagem := format(
      'O lote %s está no módulo %s há %s dias, excedendo a meta de %s dias (desvio: %s%%).',
      COALESCE(p_lote_nome, ''), COALESCE(p_modulo_nome, ''),
      ROUND(p_dias_ocupacao, 1), p_meta_dias,
      COALESCE(ROUND(p_desvio_percentual, 1)::text, 'N/A')
    );
    v_acao_label := 'Ver módulo';
    v_acao_url := COALESCE(
      p_acao_url,
      CASE WHEN p_modulo_id IS NOT NULL
        THEN '/controller/modulos-pastos?modulo=' || p_modulo_id::text
        ELSE '/controller/modulos-pastos'
      END
    );
  ELSE
    RETURN;
  END IF;

  FOR v_usuario_id IN
    SELECT uf.usuario_id
    FROM public.usuario_fazenda uf
    JOIN public.usuarios u ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = p_fazenda_id
      AND uf.ativo = true
      AND u.ativo = true
  LOOP
    SELECT id INTO v_notificacao_existente_id
    FROM public.notificacoes
    WHERE usuario_id = v_usuario_id
      AND fazenda_id = p_fazenda_id
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
        v_usuario_id, p_fazenda_id, 'warning', v_titulo, v_mensagem,
        v_acao_url, v_acao_label, false, now(), now()
      );
    END IF;
  END LOOP;
END;
$$;
;
