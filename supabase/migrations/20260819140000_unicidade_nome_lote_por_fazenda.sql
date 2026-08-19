-- Unicidade de nome de lote por fazenda (case-insensitive, sem acento)
--
-- Problema:
--   O painel web permitia criar lotes com nomes duplicados na mesma fazenda,
--   inclusive lotes novos ativos com mesmo nome de lotes antigos inativos.
--   Caso confirmado: Fazenda Marcon com 11 grupos de nomes duplicados, alguns
--   com 4 cópias do mesmo nome (Lote 147).
--
-- Decisao:
--   Comparacao case-insensitive e sem acento (lower(unaccent(nome))).
--   Considera ativos E inativos (exclui apenas soft-deleted).
--   Justificativa para incluir inativos: se o usuario reativar um lote
--   arquivado, nao pode haver 2+ lotes ativos com mesmo nome.
--
-- Implementacao:
--   Trigger (nao unique index) porque ja existem duplicatas historicas
--   que serao limpas manualmente. O trigger bloqueia apenas novas
--   duplicatas (INSERT e UPDATE de nome/fazenda_id), permitindo que os
--   existentes permanecam ate a limpeza.

-- 1. Instalar extensao unaccent (idempotente)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Funcao de validacao
CREATE OR REPLACE FUNCTION public.check_lote_nome_unico_fazenda()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_conflito uuid;
  v_nome_norm text;
BEGIN
  -- Normalizar nome: lowercase + remover acentos
  v_nome_norm := lower(unaccent(NEW.nome));

  -- Verificar se existe outro lote (nao deletado) com mesmo nome normalizado na mesma fazenda
  SELECT id INTO v_conflito
  FROM lotes
  WHERE fazenda_id = NEW.fazenda_id
    AND lower(unaccent(nome)) = v_nome_norm
    AND deleted_at IS NULL
    AND id <> NEW.id
  LIMIT 1;

  IF v_conflito IS NOT NULL THEN
    RAISE EXCEPTION 'Ja existe um lote com o nome "%" nesta fazenda (id: %). Nomes sao comparados ignorando maiusculas e acentos.',
      NEW.nome, v_conflito
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Trigger antes de INSERT e UPDATE (quando nome ou fazenda_id muda)
DROP TRIGGER IF EXISTS trg_lote_nome_unico_fazenda ON public.lotes;

CREATE TRIGGER trg_lote_nome_unico_fazenda
  BEFORE INSERT OR UPDATE OF nome, fazenda_id ON public.lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lote_nome_unico_fazenda();

COMMENT ON FUNCTION public.check_lote_nome_unico_fazenda() IS
  'Valida que nao existe outro lote (nao soft-deleted) com o mesmo nome normalizado (lower + unaccent) na mesma fazenda. Bloqueia INSERT e UPDATE de nome/fazenda_id. Duplicatas historicas pre-existentes nao sao retroativamente bloqueadas.';
