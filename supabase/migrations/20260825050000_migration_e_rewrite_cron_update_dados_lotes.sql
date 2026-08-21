-- ============================================================================
-- MIGRATION E — Rewrite do cron update_dados_lotes (GMD de lote_categorias.gmd)
-- ============================================================================
-- Objetivo: o cron passa a ler o GMD de lote_categorias.gmd (materializado
-- pela Migration D) em vez de COALESCE(pn.gmd_planejado, f.gmd).
--
-- Mudanças chave:
-- 1. GMD vem de lc.gmd, não de COALESCE(pn.gmd_planejado, f.gmd)
-- 2. JOIN com formulacoes removido do cursor (não precisa mais ler f.gmd)
-- 3. JOIN com planos_nutricionais vira LEFT JOIN (categoria pode evoluir
--    sem plano, caso dos bezerros ao pé)
-- 4. Categorias sem GMD (lc.gmd IS NULL) são puladas (para de evoluir peso,
--    caso de recategorização para categoria não contemplada pela formulação)
-- 5. Quando não há plano (bezerros ao pé), usa data_pesagem ou created_at
--    como data de início, e peso_entrada_kg_cab como base
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  calc_peso_entrada_arrobas NUMERIC;
  calc_quant_atual INTEGER;
  gmd_value NUMERIC;
  peso_base NUMERIC;
  v_tem_proximo BOOLEAN;
  v_plano_id uuid;
  v_lote_categoria_id uuid;
  v_data_inicio date;
BEGIN
  FOR categoria_record IN
    SELECT lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
           NULLIF(lc.gmd, '')::numeric AS gmd_efetivo,
           lc.data_meta_projetada, lc.rc_inicial,
           lc.data_ajuste_peso,
           lc.peso_vivo_atual_kg_cab,
           lc.data_pesagem,
           lc.created_at,
           pn.id AS plano_id,
           pn.data_inicio,
           pn.peso_inicio_kg_cab,
           pn.peso_meta_kg,
           pn.condicao_migracao,
           pn.migracao_automatica,
           pn.ordem
    FROM lote_categorias lc
    LEFT JOIN planos_nutricionais pn
      ON pn.lote_categoria_id = lc.id AND pn.ativo = true
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.ativo = true
      AND lc.data_fim IS NULL
      AND NULLIF(lc.gmd, '')::numeric IS NOT NULL
  LOOP
    gmd_value := categoria_record.gmd_efetivo;
    IF gmd_value IS NULL THEN
      CONTINUE;
    END IF;

    -- Determinar data de início para projeção:
    -- - Se há plano ativo, usar pn.data_inicio
    -- - Se não há plano (bezerros ao pé), usar data_pesagem ou created_at::date
    v_data_inicio := COALESCE(
      categoria_record.data_inicio,
      categoria_record.data_pesagem,
      categoria_record.created_at::date
    );

    IF categoria_record.data_ajuste_peso IS NOT NULL THEN
      days_diff := (CURRENT_DATE - categoria_record.data_ajuste_peso)::INTEGER;
      IF days_diff > 0 THEN
        new_peso_vivo := categoria_record.peso_vivo_atual_kg_cab + gmd_value;
      ELSE
        CONTINUE;
      END IF;
    ELSE
      -- Base de peso: priorizar peso_inicio do plano, depois peso_entrada
      peso_base := COALESCE(
        categoria_record.peso_inicio_kg_cab,
        categoria_record.peso_entrada_kg_cab
      );
      days_diff := (CURRENT_DATE - v_data_inicio)::INTEGER;
      IF days_diff < 0 THEN
        days_diff := 0;
      END IF;
      new_peso_vivo := peso_base + (gmd_value * days_diff);
    END IF;

    IF categoria_record.data_meta_projetada IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta_projetada - CURRENT_DATE)::INTEGER;
      dias_restantes := dias_para_meta;
      IF dias_restantes < 0 THEN
        dias_restantes := 0;
      END IF;
    ELSE
      dias_restantes := NULL;
    END IF;

    IF categoria_record.rc_inicial IS NOT NULL THEN
      calc_peso_entrada_arrobas := (categoria_record.peso_entrada_kg_cab * (categoria_record.rc_inicial / 100)) / 15;
    ELSE
      calc_peso_entrada_arrobas := NULL;
    END IF;

    calc_quant_atual := calculate_quant_atual(categoria_record.lote_id, categoria_record.categoria);

    IF categoria_record.data_ajuste_peso IS NOT NULL THEN
      days_diff := (CURRENT_DATE - categoria_record.data_ajuste_peso)::INTEGER;
      IF days_diff < 0 THEN days_diff := 0; END IF;
    END IF;

    UPDATE lote_categorias
    SET periodo = days_diff,
        dias_restantes_meta = dias_restantes,
        peso_entrada_arrobas = calc_peso_entrada_arrobas,
        quant_atual = calc_quant_atual,
        peso_vivo_atual_kg_cab = new_peso_vivo,
        gmd = gmd_value::text
    WHERE id = categoria_record.id
      AND data_fim IS NULL;

    -- Migração automada de plano: só se há plano ativo
    IF categoria_record.plano_id IS NOT NULL
       AND categoria_record.migracao_automatica = true
       AND categoria_record.condicao_migracao IN ('peso', 'ambos')
       AND categoria_record.peso_meta_kg IS NOT NULL
       AND new_peso_vivo >= categoria_record.peso_meta_kg
    THEN
      SELECT EXISTS(
        SELECT 1 FROM planos_nutricionais
        WHERE lote_categoria_id = categoria_record.id
          AND data_fim IS NULL
          AND ordem > categoria_record.ordem
      ) INTO v_tem_proximo;

      v_plano_id := categoria_record.plano_id;
      v_lote_categoria_id := categoria_record.id;

      IF v_tem_proximo THEN
        PERFORM migrar_plano_nutricional(v_lote_categoria_id, NULL, 'meta_peso');
      ELSE
        PERFORM encerrar_plano_nutricional(v_lote_categoria_id);
      END IF;
    END IF;
  END LOOP;
END;
$function$;
