
CREATE OR REPLACE FUNCTION public.get_registros_atividades(periodo TEXT DEFAULT 'day')
RETURNS TABLE (
  caderneta TEXT,
  fazenda_id UUID,
  fazenda_nome TEXT,
  periodo_inicio DATE,
  quantidade BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE;
  v_trunc TEXT;
BEGIN
  -- Validate period
  IF periodo NOT IN ('day', 'week', 'month') THEN
    periodo := 'day';
  END IF;

  -- Set truncation and start date based on period
  CASE periodo
    WHEN 'day' THEN
      v_trunc := 'day';
      v_start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN 'week' THEN
      v_trunc := 'week';
      v_start_date := DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '12 weeks';
    WHEN 'month' THEN
      v_trunc := 'month';
      v_start_date := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months';
  END CASE;

  RETURN QUERY
  WITH all_registros AS (
    SELECT 'Abastecimento' AS caderneta, fazenda_id, created_at FROM public.registros_abastecimento
    UNION ALL
    SELECT 'Almoxarifado', fazenda_id, created_at FROM public.registros_almoxarifado
    UNION ALL
    SELECT 'Bebedouros', fazenda_id, created_at FROM public.registros_bebedouros
    UNION ALL
    SELECT 'Cantina', fazenda_id, created_at FROM public.registros_cantina
    UNION ALL
    SELECT 'Clima', fazenda_id, created_at FROM public.registros_clima
    UNION ALL
    SELECT 'Enfermaria', fazenda_id, created_at FROM public.registros_enfermaria
    UNION ALL
    SELECT 'Entrada Insumos', fazenda_id, created_at FROM public.registros_entrada_insumos
    UNION ALL
    SELECT 'Leitura Cocho', fazenda_id, created_at FROM public.registros_leitura_cocho
    UNION ALL
    SELECT 'Limpeza', fazenda_id, created_at FROM public.registros_limpeza
    UNION ALL
    SELECT 'Manutenção Máquinas', fazenda_id, created_at FROM public.registros_manutencao_maquinas
    UNION ALL
    SELECT 'Maternidade', fazenda_id, created_at FROM public.registros_maternidade
    UNION ALL
    SELECT 'Morte', fazenda_id, created_at FROM public.registros_morte
    UNION ALL
    SELECT 'Movimentação', fazenda_id, created_at FROM public.registros_movimentacao
    UNION ALL
    SELECT 'Operações Máquinas', fazenda_id, created_at FROM public.registros_operacoes_maquinas
    UNION ALL
    SELECT 'Pastagens', fazenda_id, created_at FROM public.registros_pastagens
    UNION ALL
    SELECT 'Problemas', fazenda_id, created_at FROM public.registros_problemas
    UNION ALL
    SELECT 'Rodeio', fazenda_id, created_at FROM public.registros_rodeio
    UNION ALL
    SELECT 'Saída Insumos', fazenda_id, created_at FROM public.registros_saida_insumos
    UNION ALL
    SELECT 'Suplementação', fazenda_id, created_at FROM public.registros_suplementacao
  )
  SELECT 
    ar.caderneta,
    ar.fazenda_id::UUID,
    COALESCE(f.nome, 'Fazenda desconhecida') AS fazenda_nome,
    DATE_TRUNC(v_trunc, ar.created_at)::DATE AS periodo_inicio,
    COUNT(*) AS quantidade
  FROM all_registros ar
  LEFT JOIN public.fazendas f ON f.id = ar.fazenda_id::UUID
  WHERE ar.created_at >= v_start_date
  GROUP BY ar.caderneta, ar.fazenda_id, f.nome, DATE_TRUNC(v_trunc, ar.created_at)
  ORDER BY periodo_inicio DESC, quantidade DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_registros_atividades TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registros_atividades TO anon;
;
