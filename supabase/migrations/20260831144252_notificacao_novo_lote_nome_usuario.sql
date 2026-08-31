-- Substituir "O peão" pelo nome do usuário na notificação de solicitação de novo lote
-- A função notify_solicitacao_novo_lote() usava texto hardcoded "O peão solicitou..."
-- Agora usa o nome real do usuário que vem em dados_movimentacao->>'usuario'

CREATE OR REPLACE FUNCTION public.notify_solicitacao_novo_lote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_controller RECORD;
  v_nome_lote text;
  v_usuario text;
BEGIN
  v_nome_lote := NEW.dados_lote_proposto->>'nome';
  v_usuario := COALESCE(NEW.dados_movimentacao->>'usuario', 'Usuário');

  FOR v_controller IN
    SELECT u.id FROM usuarios u
    JOIN usuario_fazenda uf ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = NEW.fazenda_id
      AND uf.ativo = true
      AND uf.papel IN ('admin', 'controller')
      AND (u.id)::text NOT LIKE '%@gestaup.internal'
      AND u.ativo = true
  LOOP
    INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
    VALUES (
      v_controller.id,
      NEW.fazenda_id,
      'info',
      'Solicitação de Novo Lote: ' || v_nome_lote,
      v_usuario || ' solicitou a criação de um novo lote "' || v_nome_lote || '" a partir do lote "' || NEW.lote_origem_nome || '". Acesse Lotes para revisar e aprovar.',
      '/controller/lotes',
      'Revisar em Lotes',
      jsonb_build_object(
        'tipo_solicitacao', 'novo_lote',
        'solicitacao_id', NEW.id,
        'lote_origem_id', NEW.lote_origem_id,
        'lote_origem_nome', NEW.lote_origem_nome,
        'nome_proposto', v_nome_lote
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
