
-- ============================================================
-- Trigger BEFORE UPDATE em lote_modulo_historico:
-- ao preencher data_hora_saida, calcular e persistir
-- taxa_lotacao_ua_ha, cabecas_saida e peso_vivo_medio_saida_kg
-- se não foram fornecidos explicitamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_lote_modulo_historico_fechar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só age quando data_hora_saida está sendo preenchida pela primeira vez
  IF OLD.data_hora_saida IS NULL AND NEW.data_hora_saida IS NOT NULL THEN

    -- Preencher cabecas_saida se não fornecido
    IF NEW.cabecas_saida IS NULL THEN
      SELECT COALESCE(SUM(lc.quant_atual), OLD.cabecas_entrada)
      INTO NEW.cabecas_saida
      FROM public.lote_categorias lc
      WHERE lc.lote_id = NEW.lote_id AND lc.quant_atual > 0;
    END IF;

    -- Preencher peso_vivo_medio_saida_kg se não fornecido
    IF NEW.peso_vivo_medio_saida_kg IS NULL THEN
      NEW.peso_vivo_medio_saida_kg := COALESCE(
        public.calcular_peso_medio_lote(NEW.lote_id),
        OLD.peso_vivo_medio_entrada_kg
      );
    END IF;

    -- Calcular desvio de tempo se não fornecido
    IF NEW.desvio_tempo_ocupacao_percent IS NULL AND OLD.meta_intervalo_ocupacao_dias IS NOT NULL AND OLD.meta_intervalo_ocupacao_dias > 0 THEN
      NEW.desvio_tempo_ocupacao_percent := round(
        (EXTRACT(epoch FROM NEW.data_hora_saida - OLD.data_hora_entrada) / 86400.0 - OLD.meta_intervalo_ocupacao_dias::numeric)
        / OLD.meta_intervalo_ocupacao_dias::numeric * 100.0
      , 2);
    END IF;

    -- Calcular e persistir taxa de lotação do módulo inteiro no momento da saída
    NEW.taxa_lotacao_ua_ha := public.calcular_taxa_lotacao_modulo(NEW.modulo_id);

  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Criar o trigger (BEFORE UPDATE para poder modificar NEW)
DROP TRIGGER IF EXISTS trg_fechar_lote_modulo_historico ON public.lote_modulo_historico;
CREATE TRIGGER trg_fechar_lote_modulo_historico
  BEFORE UPDATE ON public.lote_modulo_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lote_modulo_historico_fechar();


-- ============================================================
-- Mesmo padrão para lote_pasto_historico:
-- ao fechar via UPDATE direto (não pelo trigger do registro_pastagem),
-- preencher taxa_lotacao_ua_ha automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_lote_pasto_historico_fechar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.data_hora_saida IS NULL AND NEW.data_hora_saida IS NOT NULL THEN

    IF NEW.cabecas_saida IS NULL THEN
      SELECT COALESCE(SUM(lc.quant_atual), OLD.cabecas_entrada)
      INTO NEW.cabecas_saida
      FROM public.lote_categorias lc
      WHERE lc.lote_id = NEW.lote_id AND lc.quant_atual > 0;
    END IF;

    IF NEW.peso_vivo_medio_saida_kg IS NULL THEN
      NEW.peso_vivo_medio_saida_kg := COALESCE(
        public.calcular_peso_medio_lote(NEW.lote_id),
        OLD.peso_vivo_medio_entrada_kg
      );
    END IF;

    IF NEW.desvio_tempo_ocupacao_percent IS NULL AND OLD.meta_intervalo_ocupacao_dias IS NOT NULL AND OLD.meta_intervalo_ocupacao_dias > 0 THEN
      NEW.desvio_tempo_ocupacao_percent := round(
        (EXTRACT(epoch FROM NEW.data_hora_saida - OLD.data_hora_entrada) / 86400.0 - OLD.meta_intervalo_ocupacao_dias::numeric)
        / OLD.meta_intervalo_ocupacao_dias::numeric * 100.0
      , 2);
    END IF;

    -- Taxa de lotação do pasto no momento da saída
    IF NEW.taxa_lotacao_ua_ha IS NULL THEN
      NEW.taxa_lotacao_ua_ha := public.calcular_taxa_lotacao_pasto(NEW.lote_id, NEW.pasto_id);
    END IF;

  END IF;

  -- Quando o trigger trg_registros_pastagens_mover_lote preenche data_final
  -- mas não data_hora_saida, também capturar o fechamento via data_final
  IF OLD.data_final IS NULL AND NEW.data_final IS NOT NULL AND NEW.data_hora_saida IS NULL THEN
    NEW.data_hora_saida  := (NEW.data_final::timestamp AT TIME ZONE 'UTC');
    NEW.taxa_lotacao_ua_ha := public.calcular_taxa_lotacao_pasto(NEW.lote_id, NEW.pasto_id);

    SELECT COALESCE(SUM(lc.quant_atual), OLD.cabecas_entrada)
    INTO NEW.cabecas_saida
    FROM public.lote_categorias lc
    WHERE lc.lote_id = NEW.lote_id AND lc.quant_atual > 0;

    NEW.peso_vivo_medio_saida_kg := COALESCE(
      public.calcular_peso_medio_lote(NEW.lote_id),
      OLD.peso_vivo_medio_entrada_kg
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fechar_lote_pasto_historico ON public.lote_pasto_historico;
CREATE TRIGGER trg_fechar_lote_pasto_historico
  BEFORE UPDATE ON public.lote_pasto_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lote_pasto_historico_fechar();
;
