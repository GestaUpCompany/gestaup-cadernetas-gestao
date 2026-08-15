-- Garante que a trigger de notificacao de morte so dispare quando o registro
-- tem latitude E longitude validas. Antes, mortes sem coordenadas geravam
-- notificacao "Ver no Mapa" que levava a um mapa sem ponto para centralizar.
CREATE OR REPLACE FUNCTION public.notify_morte_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_usuario RECORD;
    v_identificacao text;
    v_causa text;
    v_pasto text;
    v_mensagem text;
BEGIN
    -- So dispara para INSERT
    IF TG_OP <> 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- So notifica quando o registro tem coordenadas validas.
    -- Sem coordenadas, a notificacao "Ver no Mapa" nao teria onde centralizar.
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
        RETURN NEW;
    END IF;

    -- Identificacao do animal: brinco > chip > id provisorio
    IF NEW.brinco IS NOT NULL AND NEW.brinco <> '' THEN
        v_identificacao := 'Brinco ' || NEW.brinco;
    ELSIF NEW.chip IS NOT NULL AND NEW.chip <> '' THEN
        v_identificacao := 'Chip ' || NEW.chip;
    ELSE
        v_identificacao := 'Animal ' || (NEW.id)::text;
    END IF;

    -- Causa da morte (pode ser null)
    v_causa := COALESCE(NEW.causa_morte, 'Causa nao informada');

    -- Pasto (pode ser null)
    v_pasto := COALESCE(NEW.pasto, 'Pasto nao informado');

    -- Mensagem da notificacao
    v_mensagem := v_identificacao || ' - ' || v_causa || ' - ' || v_pasto;

    -- Inserir notificacao para cada usuario vinculado a fazenda
    FOR v_usuario IN
        SELECT u.id FROM usuarios u
        INNER JOIN usuario_fazenda uf ON uf.fazenda_id = NEW.fazenda_id
        WHERE uf.usuario_id = u.id
          AND u.ativo = true
          AND u.papel IN ('controller', 'admin', 'super_admin')
    LOOP
        INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
        VALUES (
            v_usuario.id,
            NEW.fazenda_id,
            'error',
            'Morte registrada',
            v_mensagem,
            '/controller/mapa-fazenda?morte=' || (NEW.id)::text,
            'Ver no Mapa',
            jsonb_build_object('morte_id', NEW.id, 'brinco', NEW.brinco, 'causa_morte', NEW.causa_morte, 'pasto', NEW.pasto, 'latitude', NEW.latitude, 'longitude', NEW.longitude)
        );
    END LOOP;

    RETURN NEW;
END;
$function$;

-- Comentario para auditoria
COMMENT ON FUNCTION public.notify_morte_inserted() IS
'Dispara notificacao de morte para controllers/admins da fazenda. So cria notificacao quando o registro tem latitude E longitude nao-nulas, pois a acao "Ver no Mapa" precisa de coordenadas para centralizar. Mortes sem coordenadas sao silenciadas (registro continua salvo normalmente).';
