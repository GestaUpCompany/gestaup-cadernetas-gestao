CREATE OR REPLACE FUNCTION public.get_relatorio_consumo(
  p_token uuid DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_fazenda_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET timezone TO 'America/Cuiaba'
AS $function$
DECLARE
  v_fazenda_id uuid;
  v_ativo boolean;
  v_expira timestamptz;
  v_fazenda_nome text;
  v_fazenda_logo_url text;
  v_lotes jsonb;
  v_lotes_disponiveis jsonb;
  v_user_id uuid;
BEGIN
  -- Determine fazenda_id
  IF p_token IS NOT NULL THEN
    SELECT fazenda_id, ativo, expira_em INTO v_fazenda_id, v_ativo, v_expira
    FROM relatorios_publicos
    WHERE id = p_token AND tipo = 'consumo';

    IF NOT FOUND OR v_ativo = false OR (v_expira IS NOT NULL AND v_expira < now()) THEN
      RAISE EXCEPTION 'Token inválido ou expirado';
    END IF;
  ELSE
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    IF p_fazenda_id_param IS NOT NULL THEN
      -- Se p_fazenda_id_param é fornecido, use-o (para admins/super_admins)
      -- Verificar se o usuário tem permissão para esta fazenda
      IF EXISTS (SELECT 1 FROM fazenda_users WHERE user_id = v_user_id AND fazenda_id = p_fazenda_id_param)
         OR EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id AND is_admin = TRUE) THEN
        v_fazenda_id := p_fazenda_id_param;
      ELSE
        RAISE EXCEPTION 'Usuário não tem permissão para acessar esta fazenda.';
      END IF;
    ELSE
      -- Caso contrário, buscar a fazenda padrão do usuário
      SELECT fazenda_id INTO v_fazenda_id FROM user_fazendas WHERE user_id = v_user_id AND is_default = TRUE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhuma fazenda padrão encontrada para o usuário.';
      END IF;
    END IF;
  END IF;

  -- Buscar nome e logo da fazenda
  SELECT nome, logo_url INTO v_fazenda_nome, v_fazenda_logo_url
  FROM fazendas
  WHERE id = v_fazenda_id;

  -- Lotes disponíveis (todos com registros, sem filtro de data, para o slicer)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('lote_id', l.id, 'lote_nome', l.nome) ORDER BY l.nome), '[]'::jsonb)
  INTO v_lotes_disponiveis
  FROM (SELECT DISTINCT lote_id FROM registros_suplementacao WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL AND lote_id IS NOT NULL) AS regs
  JOIN lotes l ON l.id = regs.lote_id;

  -- Dados calculados por lote
  WITH registros_windowed AS (
    SELECT
      r.lote_id,
      r.data,
      to_char(r.data AT TIME ZONE 'America/Cuiaba', 'DD/MM') AS data_label,
      LAG(r.kg_cocho) OVER w AS lag_kg_cocho,
      LAG(r.n_cabecas) OVER w AS lag_n_cabecas,
      LAG(r.qtd_bezerros) OVER w AS lag_qtd_bezerros,
      LAG(r.consumo_medio_geral_percent_pv) OVER w AS lag_consumo_percent_pv,
      LAG(r.leitura) OVER w AS lag_leitura,
      LAG(r.custo_medio_reais_cab_dia) OVER w AS lag_custo,
      LAG(r.data) OVER w AS lag_data
    FROM registros_suplementacao r
    WHERE r.fazenda_id = v_fazenda_id
      AND r.deleted_at IS NULL
      AND r.lote_id IS NOT NULL
      AND (p_data_inicio IS NULL OR (r.data AT TIME ZONE 'America/Cuiaba')::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR (r.data AT TIME ZONE 'America/Cuiaba')::date <= p_data_fim)
    WINDOW w AS (PARTITION BY r.lote_id ORDER BY r.data, r.created_at)
  ),
  dados_por_lote AS (
    SELECT
      lote_id,
      jsonb_agg(jsonb_build_object(
        'data', to_char(data AT TIME ZONE 'America/Cuiaba', 'YYYY-MM-DD'),
        'data_label', data_label,
        'trato_kg_cab_dia',
          CASE WHEN lag_kg_cocho IS NOT NULL AND lag_data IS NOT NULL THEN
            lag_kg_cocho / GREATEST(1, ((data AT TIME ZONE 'America/Cuiaba')::date - (lag_data AT TIME ZONE 'America/Cuiaba')::date)) / GREATEST(1, COALESCE(lag_n_cabecas, 0) - COALESCE(lag_qtd_bezerros, 0))
          ELSE NULL END,
        'consumo_percent_pv', COALESCE(lag_consumo_percent_pv, 0),
        'leitura_cocho', CASE WHEN lag_leitura IS NOT NULL AND lag_leitura ~ '^[0-9]+\\.?[0-9]*$' THEN lag_leitura::numeric ELSE NULL END,
        'custo_reais_cab_dia', lag_custo
      ) ORDER BY data) AS dados
    FROM registros_windowed
    WHERE lag_data IS NOT NULL
    GROUP BY lote_id
  ),
  lotes_com_registros AS (
    SELECT DISTINCT lote_id
    FROM registros_suplementacao
    WHERE fazenda_id = v_fazenda_id
      AND deleted_at IS NULL
      AND lote_id IS NOT NULL
      AND (p_data_inicio IS NULL OR (data AT TIME ZONE 'America/Cuiaba')::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR (data AT TIME ZONE 'America/Cuiaba')::date <= p_data_fim)
  ),
  info_lotes AS (
    SELECT
      lcr.lote_id,
      l.nome AS lote_nome,
      lc.peso_entrada_kg_cab,
      lc.peso_vivo_atual_kg_cab,
      to_char(lc.data_meta_projetada, 'YYYY-MM-DD') AS data_prevista_final,
      lc.quant_atual AS n_cabecas_atual,
      lc.raca,
      lc.categoria,
      f.nome AS dieta,
      to_char(pn.data_inicio, 'YYYY-MM-DD') AS data_inicio_plano,
      CASE WHEN pn.data_inicio IS NOT NULL THEN GREATEST(0, ((now() AT TIME ZONE 'America/Cuiaba')::date - pn.data_inicio::date)) ELSE NULL END AS dias
    FROM lotes_com_registros lcr
    JOIN lotes l ON l.id = lcr.lote_id
    LEFT JOIN LATERAL (
      SELECT lc.* FROM lote_categorias lc
      WHERE lc.lote_id = lcr.lote_id AND lc.ativo = true
      ORDER BY lc.created_at DESC
      LIMIT 1
    ) lc ON true
    LEFT JOIN formulacoes f ON f.id = COALESCE(lc.formulacao_id, (
      SELECT pn2.formulacao_id FROM planos_nutricionais pn2
      WHERE pn2.lote_categoria_id = lc.id AND pn2.ativo = true AND pn2.fazenda_id = v_fazenda_id
      LIMIT 1
    ))
    LEFT JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true AND pn.fazenda_id = v_fazenda_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'lote_id', il.lote_id,
    'lote_nome', il.lote_nome,
    'info', jsonb_build_object(
      'lote_id', il.lote_id,
      'lote_nome', il.lote_nome,
      'peso_entrada_kg', il.peso_entrada_kg_cab,
      'peso_atual_kg', il.peso_vivo_atual_kg_cab,
      'data_prevista_final', il.data_prevista_final,
      'n_cabecas_atual', il.n_cabecas_atual,
      'raca', il.raca,
      'categoria', il.categoria,
      'dieta', il.dieta,
      'data_inicio_plano', il.data_inicio_plano,
      'dias', il.dias
    ),
    'dados', COALESCE(dp.dados, '[]'::jsonb)
  ) ORDER BY il.lote_nome), '[]'::jsonb)
  INTO v_lotes
  FROM info_lotes il
  LEFT JOIN dados_por_lote dp ON dp.lote_id = il.lote_id;

  RETURN jsonb_build_object(
    'fazenda_id', v_fazenda_id,
    'dados', jsonb_build_object(
      'fazenda_nome', v_fazenda_nome,
      'fazenda_logo_url', v_fazenda_logo_url,
      'lotes', v_lotes,
      'lotes_disponiveis', v_lotes_disponiveis
    )
  );
END;
$function$;;
