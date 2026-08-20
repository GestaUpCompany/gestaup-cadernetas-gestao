-- Trigger: proibir lote em pasto e curral simultaneamente
-- Dispara em UPDATE de currais (quando lote_id muda) e em UPDATE de lotes (quando pasto_id muda)

-- Funcao 1: ao atribuir lote a um curral, verificar se o lote tem pasto_id
CREATE OR REPLACE FUNCTION public.check_lote_nao_em_pasto_ao_vincular_curral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pasto_id uuid;
BEGIN
  IF NEW.lote_id IS NOT NULL AND (OLD.lote_id IS NULL OR NEW.lote_id != OLD.lote_id) THEN
    SELECT pasto_id INTO v_pasto_id
    FROM public.lotes
    WHERE id = NEW.lote_id AND ativo = true AND deleted_at IS NULL;
    
    IF v_pasto_id IS NOT NULL THEN
      RAISE EXCEPTION 'O lote selecionado está alocado em um pasto e não pode ser vinculado a um curral simultaneamente. Remova-o do pasto primeiro.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_curral_lote_pasto_exclusivo ON public.currais;
CREATE TRIGGER trg_curral_lote_pasto_exclusivo
  BEFORE INSERT OR UPDATE OF lote_id ON public.currais
  FOR EACH ROW EXECUTE FUNCTION public.check_lote_nao_em_pasto_ao_vincular_curral();

-- Funcao 2: ao atribuir pasto a um lote, verificar se o lote esta em algum curral
CREATE OR REPLACE FUNCTION public.check_lote_nao_em_curral_ao_vincular_pasto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_curral_id uuid;
  v_curral_nome text;
BEGIN
  IF NEW.pasto_id IS NOT NULL AND (OLD.pasto_id IS NULL OR NEW.pasto_id != OLD.pasto_id) THEN
    SELECT c.id, c.nome INTO v_curral_id, v_curral_nome
    FROM public.currais c
    WHERE c.lote_id = NEW.id AND c.ativo = true AND c.deleted_at IS NULL
    LIMIT 1;
    
    IF v_curral_id IS NOT NULL THEN
      RAISE EXCEPTION 'O lote está vinculado ao curral % e não pode ser alocado em um pasto simultaneamente. Remova-o do curral primeiro.', v_curral_nome;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_lote_pasto_curral_exclusivo ON public.lotes;
CREATE TRIGGER trg_lote_pasto_curral_exclusivo
  BEFORE UPDATE OF pasto_id ON public.lotes
  FOR EACH ROW EXECUTE FUNCTION public.check_lote_nao_em_curral_ao_vincular_pasto();

SELECT 'Triggers de exclusividade pasto/curral criados' AS status;;
