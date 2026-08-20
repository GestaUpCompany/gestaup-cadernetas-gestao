
-- ============================================================
-- Trigger: ao inserir em lote_pasto_historico, verifica se o pasto
-- pertence a um módulo via rotacao_pastos e cria automaticamente
-- o registro correspondente em lote_modulo_historico
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_sync_lote_modulo_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_modulo_id uuid;
  v_meta_dias integer;
  v_cabecas    integer;
  v_peso       numeric;
BEGIN
  -- Buscar módulo ao qual o pasto pertence (se existir)
  SELECT rp.modulo_id, m.meta_intervalo_ocupacao_dias
  INTO v_modulo_id, v_meta_dias
  FROM public.rotacao_pastos rp
  JOIN public.modulos_pastos m ON m.id = rp.modulo_id
  WHERE rp.pasto_id = NEW.pasto_id
    AND rp.ativo = true
  LIMIT 1;

  IF v_modulo_id IS NULL THEN
    RETURN NEW; -- Pasto não pertence a módulo, nada a fazer
  END IF;

  -- Usar cabecas/peso do próprio registro de entrada se disponíveis,
  -- senão buscar de lote_categorias (mais atual)
  v_cabecas := COALESCE(
    NEW.cabecas_entrada,
    (SELECT SUM(lc.quant_atual) FROM public.lote_categorias lc WHERE lc.lote_id = NEW.lote_id AND lc.quant_atual > 0)
  );

  v_peso := COALESCE(
    NEW.peso_vivo_medio_entrada_kg,
    public.calcular_peso_medio_lote(NEW.lote_id)
  );

  -- Fechar entrada anterior no módulo se existir (lote saiu e entrou de novo)
  UPDATE public.lote_modulo_historico
  SET
    data_hora_saida          = NEW.data_hora_entrada,
    cabecas_saida            = v_cabecas,
    peso_vivo_medio_saida_kg = v_peso,
    taxa_lotacao_ua_ha       = public.calcular_taxa_lotacao_modulo(v_modulo_id)
  WHERE lote_id = NEW.lote_id
    AND modulo_id = v_modulo_id
    AND data_hora_saida IS NULL;

  -- Inserir nova entrada no módulo
  INSERT INTO public.lote_modulo_historico (
    lote_id,
    modulo_id,
    data_hora_entrada,
    cabecas_entrada,
    peso_vivo_medio_entrada_kg,
    meta_intervalo_ocupacao_dias
  ) VALUES (
    NEW.lote_id,
    v_modulo_id,
    NEW.data_hora_entrada,
    v_cabecas,
    v_peso,
    COALESCE(NEW.meta_intervalo_ocupacao_dias, v_meta_dias)
  );

  RETURN NEW;
END;
$$;

-- Criar trigger AFTER INSERT em lote_pasto_historico
DROP TRIGGER IF EXISTS trg_sync_lote_modulo ON public.lote_pasto_historico;
CREATE TRIGGER trg_sync_lote_modulo
  AFTER INSERT ON public.lote_pasto_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_lote_modulo_historico();
;
