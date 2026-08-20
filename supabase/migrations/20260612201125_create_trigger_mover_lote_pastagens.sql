CREATE OR REPLACE FUNCTION trg_registros_pastagens_mover_lote()
RETURNS TRIGGER AS $$
DECLARE
  pasto_entrada_id UUID;
  v_lote_id UUID;
BEGIN
  -- Use lote_id from the record if available
  v_lote_id := NEW.lote_id;

  -- If lote_id not available, find by pasto_saida name
  IF v_lote_id IS NULL THEN
    SELECT l.id INTO v_lote_id
    FROM public.lotes l
    JOIN public.pastos p ON l.pasto_id = p.id
    WHERE p.fazenda_id = NEW.fazenda_id AND p.nome = NEW.pasto_saida
    LIMIT 1;
  END IF;

  -- Find pasto_entrada ID
  SELECT id INTO pasto_entrada_id
  FROM public.pastos
  WHERE fazenda_id = NEW.fazenda_id AND nome = NEW.pasto_entrada
  LIMIT 1;

  IF v_lote_id IS NOT NULL AND pasto_entrada_id IS NOT NULL THEN
    -- Update lote's pasto_id
    UPDATE public.lotes
    SET pasto_id = pasto_entrada_id
    WHERE id = v_lote_id;

    -- Update individuos in that lote
    UPDATE public.individuos
    SET pasto_atual = pasto_entrada_id,
        updated_at = now()
    WHERE fazenda_id = NEW.fazenda_id AND lote_atual = v_lote_id;

    -- Close previous lote_pasto_historico entry
    UPDATE public.lote_pasto_historico
    SET data_final = NEW.data::date
    WHERE lote_id = v_lote_id AND data_final IS NULL;

    -- Insert new lote_pasto_historico entry
    INSERT INTO public.lote_pasto_historico (lote_id, pasto_id, data_inicial)
    VALUES (v_lote_id, pasto_entrada_id, NEW.data::date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registros_pastagens_mover_lote ON public.registros_pastagens;
CREATE TRIGGER trg_registros_pastagens_mover_lote
AFTER INSERT ON public.registros_pastagens
FOR EACH ROW
EXECUTE FUNCTION trg_registros_pastagens_mover_lote();;
