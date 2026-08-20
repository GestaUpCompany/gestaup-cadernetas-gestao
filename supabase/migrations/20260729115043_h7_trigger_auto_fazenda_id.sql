-- H7 Passo 3: Trigger para auto-popular fazenda_id em novos inserts
-- Como lote_historico sempre tem lote_id, e lote_id sempre tem fazenda_id,
-- derivamos fazenda_id automaticamente quando não for fornecido pelo app.

CREATE OR REPLACE FUNCTION public.fn_lote_historico_set_fazenda_id()
RETURNS trigger AS $$
DECLARE
  v_fazenda_id uuid;
BEGIN
  -- Se fazenda_id já foi fornecido, manter
  IF NEW.fazenda_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se não tem lote_id, não dá para derivar
  IF NEW.lote_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Derivar fazenda_id do lote
  SELECT fazenda_id INTO v_fazenda_id 
  FROM public.lotes 
  WHERE id = NEW.lote_id;
  
  IF v_fazenda_id IS NOT NULL THEN
    NEW.fazenda_id := v_fazenda_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trg_lote_historico_set_fazenda_id ON public.lote_historico;
CREATE TRIGGER trg_lote_historico_set_fazenda_id
BEFORE INSERT ON public.lote_historico
FOR EACH ROW
EXECUTE FUNCTION public.fn_lote_historico_set_fazenda_id();

SELECT 'Trigger trg_lote_historico_set_fazenda_id criado' AS status;;
