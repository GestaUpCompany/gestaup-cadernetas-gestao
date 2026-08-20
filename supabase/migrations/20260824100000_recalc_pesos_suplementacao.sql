-- Funcao para recalcular peso_vivo_kg de registros_suplementacao usando o plano
-- nutricional que cobria a data do registro (nao o plano atual).
--
-- Motivo: o syncService do PWA recalculava peso_vivo_kg contra o plano ativo atual
-- na hora da sincronizacao. Quando havia migracao de plano, registros retroativos
-- eram projetados contra o novo plano, produzindo pesos incorretos (travados em
-- peso_inicio do novo plano por causa de clamp de dias negativos).
--
-- Esta funcao busca o plano historico cujo [data_inicio, data_fim] cobre a data
-- do registro e recalcula o peso com a mesma formula do cron update_dados_lotes.

CREATE OR REPLACE FUNCTION public.recalcular_pesos_suplementacao_historico(
  p_fazenda_id uuid DEFAULT NULL,
  p_lote_id uuid DEFAULT NULL
)
RETURNS TABLE (
  registro_id uuid,
  lote_id uuid,
  data_registro timestamptz,
  peso_anterior numeric,
  peso_novo numeric,
  plano_usado uuid,
  formulacao_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_plano RECORD;
  v_peso_novo numeric;
  v_dias integer;
  v_data_reg date;
  v_data_ajuste date;
  v_data_inicio date;
  v_gmd numeric;
  v_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT rs.id, rs.data, rs.lote_id, rs.peso_vivo_kg, lc.id AS lote_cat_id
    FROM registros_suplementacao rs
    JOIN lotes l ON l.id = rs.lote_id
    LEFT JOIN lote_categorias lc ON lc.lote_id = rs.lote_id AND lc.ativo = true AND lc.data_fim IS NULL
    WHERE rs.deleted_at IS NULL
      AND rs.lote_id IS NOT NULL
      AND (p_fazenda_id IS NULL OR l.fazenda_id = p_fazenda_id)
      AND (p_lote_id IS NULL OR rs.lote_id = p_lote_id)
  LOOP
    -- Buscar plano nutricional que cobria a data do registro
    SELECT pn.id, pn.peso_inicio_kg_cab, pn.data_inicio, pn.gmd_planejado,
           pn.formulacao_id, lc.data_ajuste_peso, lc.peso_vivo_atual_kg_cab,
           f.gmd AS formulacao_gmd, f.nome AS formulacao_nome
    INTO v_plano
    FROM planos_nutricionais pn
    JOIN lote_categorias lc ON lc.id = pn.lote_categoria_id
    LEFT JOIN formulacoes f ON f.id = pn.formulacao_id
    WHERE pn.lote_categoria_id = v_rec.lote_cat_id
      AND pn.data_inicio IS NOT NULL
      AND pn.data_inicio <= v_rec.data::date
      AND (pn.data_fim IS NULL OR pn.data_fim >= v_rec.data::date)
    ORDER BY pn.data_inicio DESC
    LIMIT 1;

    IF v_plano.id IS NULL THEN
      CONTINUE;
    END IF;

    v_data_reg := v_rec.data::date;
    v_peso_novo := NULL;

    v_gmd := COALESCE(v_plano.gmd_planejado, v_plano.formulacao_gmd);
    IF v_gmd IS NULL THEN
      CONTINUE;
    END IF;

    -- Mesma logica do cron update_dados_lotes:
    -- Se houver data_ajuste_peso e for anterior ou igual a data do registro:
    --   peso = peso_vivo_atual_kg_cab + gmd * (data_registro - data_ajuste_peso)
    -- Senao:
    --   peso = peso_inicio_kg_cab + gmd * (data_registro - data_inicio)
    IF v_plano.data_ajuste_peso IS NOT NULL AND v_plano.peso_vivo_atual_kg_cab IS NOT NULL THEN
      v_data_ajuste := v_plano.data_ajuste_peso::date;
      IF v_data_reg >= v_data_ajuste THEN
        v_dias := (v_data_reg - v_data_ajuste)::integer;
        v_peso_novo := v_plano.peso_vivo_atual_kg_cab + v_gmd * v_dias;
      END IF;
    END IF;

    IF v_peso_novo IS NULL AND v_plano.peso_inicio_kg_cab IS NOT NULL AND v_plano.data_inicio IS NOT NULL THEN
      v_data_inicio := v_plano.data_inicio::date;
      v_dias := GREATEST(0, (v_data_reg - v_data_inicio)::integer);
      v_peso_novo := v_plano.peso_inicio_kg_cab + v_gmd * v_dias;
    END IF;

    IF v_peso_novo IS NOT NULL THEN
      v_peso_novo := ROUND(v_peso_novo, 2);

      -- So atualizar se o peso mudou
      IF v_rec.peso_vivo_kg IS NULL OR v_rec.peso_vivo_kg != v_peso_novo THEN
        UPDATE registros_suplementacao
        SET peso_vivo_kg = v_peso_novo, updated_at = now()
        WHERE id = v_rec.id;

        v_count := v_count + 1;

        registro_id := v_rec.id;
        lote_id := v_rec.lote_id;
        data_registro := v_rec.data;
        peso_anterior := v_rec.peso_vivo_kg;
        peso_novo := v_peso_novo;
        plano_usado := v_plano.id;
        formulacao_nome := v_plano.formulacao_nome;

        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Recalculados % registros de suplementacao', v_count;
END;
$function$;
