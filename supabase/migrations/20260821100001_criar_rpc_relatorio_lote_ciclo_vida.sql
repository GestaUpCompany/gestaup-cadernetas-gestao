-- RPC para relatório de ciclo de vida de lotes (interno autenticado).
-- Segue o padrão da get_dashboard_stats / get_gado_stats:
-- SECURITY DEFINER, valida fazenda_id + lote_id, filtra deleted_at, grant só authenticated.
--
-- Retorna JSONB com até 10 seções (lazy-load via p_secoes):
--   cadastro, estado_atual, cronologia_categorias, historico_nutricional,
--   linha_tempo_ocupacao, movimentacoes, mortalidade, reproducao,
--   consumo_suplementacao, individuos, indicadores_consolidados
--
-- Cada seção é preenchida por subquery correlacionada independente
-- (não JOIN em cascata) para evitar produto cartesiano.

CREATE OR REPLACE FUNCTION public.get_relatorio_lote_ciclo_vida(
  p_fazenda_id uuid,
  p_lote_id    uuid,
  p_secoes     text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_lote record;
  v_cadastro jsonb;
  v_estado_atual jsonb;
  v_cronologia jsonb;
  v_nutricional jsonb;
  v_ocupacao jsonb;
  v_movimentacoes jsonb;
  v_mortalidade jsonb;
  v_reproducao jsonb;
  v_consumo jsonb;
  v_individuos jsonb;
  v_indicadores jsonb;
  v_result jsonb;
  v_tem_reproducao boolean;
BEGIN
  -- Validar posse: lote deve pertencer à fazenda e não estar soft-deletado
  SELECT * INTO v_lote
  FROM lotes
  WHERE id = p_lote_id
    AND fazenda_id = p_fazenda_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote nao encontrado ou nao pertence a fazenda informada');
  END IF;

  -- Helper: verifica se uma seção deve ser calculada
  -- p_secoes NULL => todas; caso contrário, só as listadas

  -- 1. cadastro
  IF p_secoes IS NULL OR array_position(p_secoes, 'cadastro') IS NOT NULL THEN
    SELECT to_jsonb(v_lote) - 'fazenda_id' - 'deleted_at' - 'updated_at' - 'n_cabecas' - 'numero_cabecas'
      || jsonb_build_object(
        'pasto_nome', p.nome,
        'pasto_area_ha', p.area_util_ha,
        'modulo_id', v_lote.modulo_id,
        'curral_nome', c.nome
      )
    INTO v_cadastro
    FROM pastos p
    LEFT JOIN currais c ON c.lote_id = v_lote.id AND c.ativo = true
    WHERE p.id = v_lote.pasto_id;
  END IF;

  -- 2. estado_atual
  IF p_secoes IS NULL OR array_position(p_secoes, 'estado_atual') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'cabecas_totais', COALESCE((
        SELECT SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0))
        FROM lote_categorias lc
        WHERE lc.lote_id = v_lote.id AND lc.ativo = true
      ), 0),
      'categorias_ativas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'categoria', lc.categoria,
          'quant_atual', lc.quant_atual,
          'peso_vivo_atual_kg', lc.peso_vivo_atual_kg_cab,
          'peso_entrada_kg', lc.peso_entrada_kg_cab,
          'gmd', lc.gmd,
          'morte', lc.morte,
          'abate', lc.abate,
          'transf_entrada', lc.transf_entrada,
          'transf_saida', lc.transf_saida,
          'data_meta_projetada', to_char(lc.data_meta_projetada, 'YYYY-MM-DD'),
          'dias_restantes_meta', lc.dias_restantes_meta
        ) ORDER BY lc.categoria)
        FROM lote_categorias lc
        WHERE lc.lote_id = v_lote.id AND lc.ativo = true
      ), '[]'::jsonb),
      'peso_medio_ponderado', (
        SELECT CASE WHEN SUM(COALESCE(lc2.quant_atual, lc2.quant_inicial, 0)) > 0
          THEN SUM(COALESCE(lc2.quant_atual, lc2.quant_inicial, 0) * COALESCE(lc2.peso_vivo_atual_kg_cab, lc2.peso_entrada_kg_cab, 0))
             / SUM(COALESCE(lc2.quant_atual, lc2.quant_inicial, 0))
          ELSE NULL END
        FROM lote_categorias lc2
        WHERE lc2.lote_id = v_lote.id AND lc2.ativo = true
      )
    )
    INTO v_estado_atual;
  END IF;

  -- 3. cronologia_categorias (transições + categorias encerradas)
  IF p_secoes IS NULL OR array_position(p_secoes, 'cronologia_categorias') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'transicoes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', t.id,
          'data_transicao', to_char(t.data_transicao, 'YYYY-MM-DD'),
          'categoria_origem', t.categoria_origem,
          'categoria_destino', t.categoria_destino,
          'peso_na_transicao_kg', t.peso_na_transicao_kg,
          'motivo', t.motivo,
          'usuario_id', t.usuario_id,
          'snapshot_resumido', jsonb_build_object(
            'peso_vivo_atual', t.snapshot_jsonb -> 'lote_categoria_origem' -> 'peso_vivo_atual_kg_cab',
            'quant_atual', t.snapshot_jsonb -> 'lote_categoria_origem' -> 'quant_atual',
            'formulacao_id', t.snapshot_jsonb -> 'lote_categoria_origem' -> 'formulacao_id'
          )
        ) ORDER BY t.data_transicao)
        FROM lote_categorias_transicoes t
        WHERE t.lote_id = v_lote.id
      ), '[]'::jsonb),
      'categorias_encerradas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', lc.id,
          'categoria', lc.categoria,
          'quant_inicial', lc.quant_inicial,
          'quant_atual', lc.quant_atual,
          'peso_entrada_kg', lc.peso_entrada_kg_cab,
          'peso_vivo_atual_kg', lc.peso_vivo_atual_kg_cab,
          'data_inicio', to_char(lc.created_at, 'YYYY-MM-DD'),
          'data_fim', to_char(lc.data_fim, 'YYYY-MM-DD'),
          'categoria_origem_id', lc.categoria_origem_id
        ) ORDER BY lc.data_fim)
        FROM lote_categorias lc
        WHERE lc.lote_id = v_lote.id
          AND lc.ativo = false
          AND lc.data_fim IS NOT NULL
      ), '[]'::jsonb)
    )
    INTO v_cronologia;
  END IF;

  -- 4. historico_nutricional
  IF p_secoes IS NULL OR array_position(p_secoes, 'historico_nutricional') IS NOT NULL THEN
    SELECT COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'plano_id', pn.id,
        'nome', pn.nome,
        'formulacao_id', pn.formulacao_id,
        'formulacao_nome', f.nome,
        'periodo_dias', pn.periodo_dias,
        'peso_meta_kg', pn.peso_meta_kg,
        'data_inicio', to_char(pn.data_inicio, 'YYYY-MM-DD'),
        'data_fim', to_char(pn.data_fim, 'YYYY-MM-DD'),
        'ativo', pn.ativo,
        'snapshots', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'duracao_dias', s.duracao_dias,
            'ganho_peso_total_kg_cab', s.ganho_peso_total_kg_cab,
            'gmd_realizado', s.gmd_realizado,
            'gmd_planejado', s.gmd_planejado,
            'producao_arroba_lote', s.producao_arroba_lote,
            'mortalidade_percent', s.mortalidade_percent,
            'motivo_migracao', s.motivo_migracao
          ) ORDER BY s.created_at)
          FROM planos_nutricionais_snapshots s
          WHERE s.plano_nutricional_id = pn.id
        ), '[]'::jsonb)
      ) ORDER BY pn.data_inicio)
      FROM planos_nutricionais pn
      LEFT JOIN formulacoes f ON f.id = pn.formulacao_id
      WHERE pn.lote_categoria_id IN (SELECT id FROM lote_categorias WHERE lote_id = v_lote.id)
    ), '[]'::jsonb)
    INTO v_nutricional;
  END IF;

  -- 5. linha_tempo_ocupacao (apenas pastos)
  IF p_secoes IS NULL OR array_position(p_secoes, 'linha_tempo_ocupacao') IS NOT NULL THEN
    SELECT COALESCE((
      SELECT jsonb_agg(row_to_json(x) ORDER BY data_entrada)
      FROM (
        SELECT
          'pasto' AS tipo,
          ph.pasto_id,
          p.nome AS pasto_nome,
          p.area_util_ha,
          to_char(ph.data_hora_entrada, 'YYYY-MM-DD HH24:MI') AS data_entrada,
          to_char(ph.data_hora_saida, 'YYYY-MM-DD HH24:MI') AS data_saida,
          ph.cabecas_entrada,
          ph.cabecas_saida,
          ph.peso_vivo_medio_entrada_kg,
          ph.peso_vivo_medio_saida_kg,
          ph.taxa_lotacao_ua_ha,
          ph.meta_intervalo_ocupacao_dias,
          ph.desvio_tempo_ocupacao_percent
        FROM lote_pasto_historico ph
        LEFT JOIN pastos p ON p.id = ph.pasto_id
        WHERE ph.lote_id = v_lote.id
      ) x
    ), '[]'::jsonb)
    INTO v_ocupacao;
  END IF;

  -- 6. movimentacoes (origem OU destino)
  IF p_secoes IS NULL OR array_position(p_secoes, 'movimentacoes') IS NOT NULL THEN
    SELECT COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'data', to_char(r.data, 'YYYY-MM-DD'),
        'tipo', CASE WHEN r.lote_origem_id = v_lote.id THEN 'saida' ELSE 'entrada' END,
        'lote_origem_id', r.lote_origem_id,
        'lote_origem_nome', lo.nome,
        'lote_destino_id', r.lote_destino_id,
        'lote_destino_nome', ld.nome,
        'numero_cabecas', r.numero_cabecas,
        'categoria', r.categoria,
        'motivo_movimentacao', r.motivo_movimentacao::text,
        'subtipo', r.subtipo::text,
        'causa_observacao', r.causa_observacao,
        'responsavel', r.responsavel,
        'fazenda_destino_id', r.fazenda_destino_id,
        'fazenda_destino_nome', fd.nome
      ) ORDER BY r.data DESC)
      FROM registros_movimentacao r
      LEFT JOIN lotes lo ON lo.id = r.lote_origem_id
      LEFT JOIN lotes ld ON ld.id = r.lote_destino_id
      LEFT JOIN fazendas fd ON fd.id = r.fazenda_destino_id
      WHERE r.fazenda_id = p_fazenda_id
        AND r.deleted_at IS NULL
        AND (r.lote_origem_id = v_lote.id OR r.lote_destino_id = v_lote.id)
    ), '[]'::jsonb)
    INTO v_movimentacoes;
  END IF;

  -- 7. mortalidade
  IF p_secoes IS NULL OR array_position(p_secoes, 'mortalidade') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'total', (
        SELECT count(*) FROM registros_morte
        WHERE fazenda_id = p_fazenda_id AND lote_id = v_lote.id AND deleted_at IS NULL
      ),
      'linhas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', r.id,
          'data', to_char(r.data, 'YYYY-MM-DD'),
          'causa_morte', r.causa_morte,
          'categoria', r.categoria,
          'sexo', r.sexo,
          'raca', r.raca,
          'peso_vivo', r.peso_vivo,
          'brinco', r.brinco,
          'chip', r.chip,
          'nutricao_atual', r.nutricao_atual,
          'nutricao_anterior', r.nutricao_anterior,
          'nome_usuario', r.nome_usuario
        ) ORDER BY r.data DESC)
        FROM registros_morte r
        WHERE r.fazenda_id = p_fazenda_id AND r.lote_id = v_lote.id AND r.deleted_at IS NULL
      ), '[]'::jsonb)
    )
    INTO v_mortalidade;
  END IF;

  -- 8. reproducao (condicional: só se sistema_producao em Cria/Recria OU existem registros)
  IF p_secoes IS NULL OR array_position(p_secoes, 'reproducao') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM registros_maternidade
      WHERE fazenda_id = p_fazenda_id AND lote_id = v_lote.id AND deleted_at IS NULL
    ) INTO v_tem_reproducao;

    IF v_lote.sistema_producao IN ('Cria', 'Recria') OR v_tem_reproducao THEN
      SELECT jsonb_build_object(
        'total_partos', (
          SELECT count(*) FROM registros_maternidade
          WHERE fazenda_id = p_fazenda_id AND lote_id = v_lote.id AND deleted_at IS NULL
        ),
        'linhas', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', r.id,
            'data', to_char(r.data, 'YYYY-MM-DD'),
            'tipo_parto', r.tipo_parto,
            'sexo_cria', r.sexo,
            'raca', r.raca,
            'peso_cria_kg', r.peso_cria_kg,
            'id_brinco_cria', r.id_brinco_cria,
            'id_brinco_mae', r.id_brinco_mae,
            'escore_matriz', r.escore_matriz,
            'docilidade_matriz', r.docilidade_matriz,
            'observacao_parto', r.observacao_parto,
            'nome_usuario', r.nome_usuario
          ) ORDER BY r.data DESC)
          FROM registros_maternidade r
          WHERE r.fazenda_id = p_fazenda_id AND r.lote_id = v_lote.id AND r.deleted_at IS NULL
        ), '[]'::jsonb)
      )
      INTO v_reproducao;
    ELSE
      v_reproducao := NULL;
    END IF;
  END IF;

  -- 9. consumo_suplementacao
  IF p_secoes IS NULL OR array_position(p_secoes, 'consumo_suplementacao') IS NOT NULL THEN
    SELECT COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'data', to_char(r.data, 'YYYY-MM-DD'),
        'formulacao', r.formulacao,
        'leitura', r.leitura,
        'kg_cocho', r.kg_cocho,
        'n_cabecas', r.n_cabecas,
        'peso_vivo_kg', r.peso_vivo_kg,
        'consumo_medio_geral_percent_pv', r.consumo_medio_geral_percent_pv,
        'consumo_medio_geral_kg_ms', r.consumo_medio_geral_kg_ms,
        'custo_medio_reais_cab_dia', r.custo_medio_reais_cab_dia,
        'escore_fezes', r.escore_fezes,
        'tratador', r.tratador
      ) ORDER BY r.data DESC)
      FROM registros_suplementacao r
      WHERE r.fazenda_id = p_fazenda_id AND r.lote_id = v_lote.id AND r.deleted_at IS NULL
    ), '[]'::jsonb)
    INTO v_consumo;
  END IF;

  -- 10. individuos
  IF p_secoes IS NULL OR array_position(p_secoes, 'individuos') IS NOT NULL THEN
    SELECT COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'id_manejo', i.id_manejo,
        'id_brinco', i.id_brinco,
        'id_chip', i.id_chip,
        'sexo', i.sexo,
        'categoria', i.categoria,
        'raca', i.raca,
        'data_nascimento', to_char(i.data_nascimento, 'YYYY-MM-DD'),
        'peso_atual_kg', i.peso_atual_kg,
        'peso_meta_kg', i.peso_meta_kg,
        'data_entrada_fazenda', to_char(i.data_entrada_fazenda, 'YYYY-MM-DD'),
        'pv_entrada_kg', i.pv_entrada_kg,
        'data_desmama', to_char(i.data_desmama, 'YYYY-MM-DD'),
        'peso_desmama_kg', i.peso_desmama_kg,
        'status', i.status,
        'numero_partos', i.numero_partos
      ) ORDER BY i.id_brinco)
      FROM individuos i
      WHERE i.fazenda_id = p_fazenda_id
        AND i.lote_atual = v_lote.id
        AND i.deleted_at IS NULL
    ), '[]'::jsonb)
    INTO v_individuos;
  END IF;

  -- 11. indicadores_consolidados (sempre calculado, depende das agregações)
  IF p_secoes IS NULL OR array_position(p_secoes, 'indicadores_consolidados') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'idade_lote_dias',
        CASE WHEN (SELECT min(data_hora_entrada) FROM lote_pasto_historico WHERE lote_id = v_lote.id) IS NOT NULL
          THEN GREATEST(0, (now()::date - (SELECT min(data_hora_entrada)::date FROM lote_pasto_historico WHERE lote_id = v_lote.id)))
          ELSE GREATEST(0, (now()::date - v_lote.created_at::date))
        END,
      'cabecas_atual', (
        SELECT COALESCE(SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0)), 0)
        FROM lote_categorias lc WHERE lc.lote_id = v_lote.id AND lc.ativo = true
      ),
      'peso_medio_atual_kg', (
        SELECT CASE WHEN SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0)) > 0
          THEN SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0) * COALESCE(lc.peso_vivo_atual_kg_cab, lc.peso_entrada_kg_cab, 0))
             / SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0))
          ELSE NULL END
        FROM lote_categorias lc WHERE lc.lote_id = v_lote.id AND lc.ativo = true
      ),
      'peso_entrada_medio_kg', v_lote.peso_entrada_kg_cab,
      'ganho_peso_total_kg_cab', (
        SELECT CASE WHEN SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0)) > 0
               AND v_lote.peso_entrada_kg_cab IS NOT NULL
          THEN round((
            SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0) * COALESCE(lc.peso_vivo_atual_kg_cab, lc.peso_entrada_kg_cab, 0))
            / SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0))
          ) - v_lote.peso_entrada_kg_cab, 2)
          ELSE NULL END
        FROM lote_categorias lc WHERE lc.lote_id = v_lote.id AND lc.ativo = true
      ),
      'total_mortes', (
        SELECT count(*) FROM registros_morte
        WHERE fazenda_id = p_fazenda_id AND lote_id = v_lote.id AND deleted_at IS NULL
      ),
      'total_saidas', (
        SELECT count(*) FROM registros_movimentacao
        WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND lote_origem_id = v_lote.id
      ),
      'total_entradas', (
        SELECT count(*) FROM registros_movimentacao
        WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND lote_destino_id = v_lote.id
      ),
      'total_partos', (
        SELECT count(*) FROM registros_maternidade
        WHERE fazenda_id = p_fazenda_id AND lote_id = v_lote.id AND deleted_at IS NULL
      ),
      'total_consumo_registros', (
        SELECT count(*) FROM registros_suplementacao
        WHERE fazenda_id = p_fazenda_id AND lote_id = v_lote.id AND deleted_at IS NULL
      ),
      'total_pastos_ocupados', (
        SELECT count(DISTINCT pasto_id) FROM lote_pasto_historico
        WHERE lote_id = v_lote.id AND pasto_id IS NOT NULL
      ),
      'total_transicoes_categoria', (
        SELECT count(*) FROM lote_categorias_transicoes WHERE lote_id = v_lote.id
      ),
      'ativo', v_lote.ativo
    )
    INTO v_indicadores;
  END IF;

  -- Montar resultado final incluindo apenas seções calculadas
  v_result := jsonb_build_object(
    'fazenda_id', p_fazenda_id,
    'lote_id', p_lote_id,
    'success', true
  );

  IF v_cadastro IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('cadastro', v_cadastro);
  END IF;
  IF v_estado_atual IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('estado_atual', v_estado_atual);
  END IF;
  IF v_cronologia IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('cronologia_categorias', v_cronologia);
  END IF;
  IF v_nutricional IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('historico_nutricional', v_nutricional);
  END IF;
  IF v_ocupacao IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('linha_tempo_ocupacao', v_ocupacao);
  END IF;
  IF v_movimentacoes IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('movimentacoes', v_movimentacoes);
  END IF;
  IF v_mortalidade IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('mortalidade', v_mortalidade);
  END IF;
  IF v_reproducao IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('reproducao', v_reproducao);
  END IF;
  IF v_consumo IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('consumo_suplementacao', v_consumo);
  END IF;
  IF v_individuos IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('individuos', v_individuos);
  END IF;
  IF v_indicadores IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('indicadores_consolidados', v_indicadores);
  END IF;

  RETURN v_result;
END;
$function$;

-- Permissão apenas para authenticated (relatório interno, não público)
GRANT EXECUTE ON FUNCTION public.get_relatorio_lote_ciclo_vida(uuid, uuid, text[]) TO authenticated;


-- RPC auxiliar: lista lotes da fazenda para o seletor do relatório
-- Retorna [{lote_id, nome, ativo, n_cabecas, categorias, pasto_nome,
--           data_criacao, tem_movimentacao, tem_morte, tem_consumo}]

CREATE OR REPLACE FUNCTION public.get_lotes_para_relatorio(
  p_fazenda_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'lote_id', l.id,
      'nome', l.nome,
      'ativo', l.ativo,
      'n_cabecas', COALESCE((
        SELECT SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0))
        FROM lote_categorias lc
        WHERE lc.lote_id = l.id AND lc.ativo = true
      ), 0),
      'categorias', COALESCE((
        SELECT string_agg(DISTINCT lc.categoria, ', ')
        FROM lote_categorias lc
        WHERE lc.lote_id = l.id AND lc.ativo = true
      ), null),
      'pasto_nome', p.nome,
      'data_criacao', to_char(l.created_at, 'YYYY-MM-DD'),
      'tem_movimentacao', EXISTS (
        SELECT 1 FROM registros_movimentacao r
        WHERE r.fazenda_id = p_fazenda_id AND r.deleted_at IS NULL
          AND (r.lote_origem_id = l.id OR r.lote_destino_id = l.id)
      ),
      'tem_morte', EXISTS (
        SELECT 1 FROM registros_morte r
        WHERE r.fazenda_id = p_fazenda_id AND r.lote_id = l.id AND r.deleted_at IS NULL
      ),
      'tem_consumo', EXISTS (
        SELECT 1 FROM registros_suplementacao r
        WHERE r.fazenda_id = p_fazenda_id AND r.lote_id = l.id AND r.deleted_at IS NULL
      )
    ) ORDER BY l.ativo DESC, l.nome ASC)
    FROM lotes l
    LEFT JOIN pastos p ON p.id = l.pasto_id
    WHERE l.fazenda_id = p_fazenda_id
      AND l.deleted_at IS NULL
  ), '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_lotes_para_relatorio(uuid) TO authenticated;
