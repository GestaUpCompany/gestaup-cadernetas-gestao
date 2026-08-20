CREATE OR REPLACE FUNCTION public.get_dados_relatorio_abastecimento(
  p_token uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fazenda_id uuid;
  v_ativo boolean;
  v_expira timestamptz;
  v_por_maquina jsonb;
  v_por_combustivel jsonb;
  v_por_operacao jsonb;
  v_maquinas jsonb;
  v_combustiveis jsonb;
  v_operacoes jsonb;
  v_total_litros numeric;
  v_total_registros bigint;
BEGIN
  SELECT fazenda_id, ativo, expira_em INTO v_fazenda_id, v_ativo, v_expira
  FROM relatorios_publicos
  WHERE id = p_token AND tipo = 'abastecimento';

  IF NOT FOUND OR v_ativo = false OR (v_expira IS NOT NULL AND v_expira < now()) THEN
    RAISE EXCEPTION 'Token invalido ou expirado';
  END IF;

  -- Por maquina/veiculo
  SELECT COALESCE(jsonb_agg(jsonb_build_object('label', maquina_veiculo, 'valor', total_litros)), '[]'::jsonb)
  INTO v_por_maquina
  FROM (
    SELECT maquina_veiculo, SUM(total_abastecido) AS total_litros
    FROM registros_abastecimento
    WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL
      AND (p_data_inicio IS NULL OR data::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR data::date <= p_data_fim)
    GROUP BY maquina_veiculo
    ORDER BY SUM(total_abastecido) DESC
  ) sub;

  -- Por combustivel
  SELECT COALESCE(jsonb_agg(jsonb_build_object('label', combustivel, 'valor', total_litros)), '[]'::jsonb)
  INTO v_por_combustivel
  FROM (
    SELECT combustivel, SUM(total_abastecido) AS total_litros
    FROM registros_abastecimento
    WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL
      AND (p_data_inicio IS NULL OR data::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR data::date <= p_data_fim)
    GROUP BY combustivel
    ORDER BY SUM(total_abastecido) DESC
  ) sub;

  -- Por operacao
  SELECT COALESCE(jsonb_agg(jsonb_build_object('label', operacao, 'valor', total_litros)), '[]'::jsonb)
  INTO v_por_operacao
  FROM (
    SELECT COALESCE(NULLIF(tipo_operacao, ''), tipo_operacao_outros, 'Nao informado') AS operacao, SUM(total_abastecido) AS total_litros
    FROM registros_abastecimento
    WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL
      AND (p_data_inicio IS NULL OR data::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR data::date <= p_data_fim)
    GROUP BY COALESCE(NULLIF(tipo_operacao, ''), tipo_operacao_outros, 'Nao informado')
    ORDER BY SUM(total_abastecido) DESC
  ) sub;

  -- Filtros disponiveis
  SELECT COALESCE(jsonb_agg(DISTINCT maquina_veiculo), '[]'::jsonb)
  INTO v_maquinas
  FROM registros_abastecimento
  WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL AND maquina_veiculo IS NOT NULL AND maquina_veiculo <> '';

  SELECT COALESCE(jsonb_agg(DISTINCT combustivel), '[]'::jsonb)
  INTO v_combustiveis
  FROM registros_abastecimento
  WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL AND combustivel IS NOT NULL AND combustivel <> '';

  SELECT COALESCE(jsonb_agg(DISTINCT COALESCE(NULLIF(tipo_operacao, ''), tipo_operacao_outros, 'Nao informado')), '[]'::jsonb)
  INTO v_operacoes
  FROM registros_abastecimento
  WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL;

  -- Totais
  SELECT COALESCE(SUM(total_abastecido), 0) INTO v_total_litros
  FROM registros_abastecimento
  WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL
    AND (p_data_inicio IS NULL OR data::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR data::date <= p_data_fim);

  SELECT COUNT(*) INTO v_total_registros
  FROM registros_abastecimento
  WHERE fazenda_id = v_fazenda_id AND deleted_at IS NULL
    AND (p_data_inicio IS NULL OR data::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR data::date <= p_data_fim);

  RETURN jsonb_build_object(
    'fazenda_id', v_fazenda_id,
    'dados', jsonb_build_object(
      'por_maquina', v_por_maquina,
      'por_combustivel', v_por_combustivel,
      'por_operacao', v_por_operacao,
      'maquinas_disponiveis', v_maquinas,
      'combustiveis_disponiveis', v_combustiveis,
      'operacoes_disponiveis', v_operacoes,
      'total_litros', v_total_litros,
      'total_registros', v_total_registros
    )
  );
END;
$$;;
