CREATE OR REPLACE FUNCTION public.get_registros_atividades(periodo text DEFAULT 'day'::text)
 RETURNS TABLE(caderneta text, fazenda_id uuid, fazenda_nome text, periodo_inicio date, quantidade bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_start_date DATE;
  v_trunc TEXT;
BEGIN
  IF periodo NOT IN ('day', 'week', 'month') THEN
    periodo := 'day';
  END IF;

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
    SELECT 'Abastecimento' AS caderneta, public.registros_abastecimento.fazenda_id, public.registros_abastecimento.created_at FROM public.registros_abastecimento
    UNION ALL
    SELECT 'Almoxarifado', public.registros_almoxarifado.fazenda_id, public.registros_almoxarifado.created_at FROM public.registros_almoxarifado
    UNION ALL
    SELECT 'Bebedouros', public.registros_bebedouros.fazenda_id, public.registros_bebedouros.created_at FROM public.registros_bebedouros
    UNION ALL
    SELECT 'Cantina', public.registros_alimentacao.fazenda_id, public.registros_alimentacao.created_at FROM public.registros_alimentacao
    UNION ALL
    SELECT 'Clima', public.registros_clima.fazenda_id, public.registros_clima.created_at FROM public.registros_clima
    UNION ALL
    SELECT 'Enfermaria', public.registros_enfermaria.fazenda_id, public.registros_enfermaria.created_at FROM public.registros_enfermaria
    UNION ALL
    SELECT 'Entrada Insumos', public.registros_entrada_insumos.fazenda_id, public.registros_entrada_insumos.created_at FROM public.registros_entrada_insumos
    UNION ALL
    SELECT 'Leitura Cocho', public.registros_leitura_cocho.fazenda_id, public.registros_leitura_cocho.created_at FROM public.registros_leitura_cocho
    UNION ALL
    SELECT 'Limpeza', public.registros_limpeza.fazenda_id, public.registros_limpeza.created_at FROM public.registros_limpeza
    UNION ALL
    SELECT 'Manutenção Máquinas', public.registros_manutencao_maquinas.fazenda_id, public.registros_manutencao_maquinas.created_at FROM public.registros_manutencao_maquinas
    UNION ALL
    SELECT 'Maternidade', public.registros_maternidade.fazenda_id, public.registros_maternidade.created_at FROM public.registros_maternidade
    UNION ALL
    SELECT 'Morte', public.registros_morte.fazenda_id, public.registros_morte.created_at FROM public.registros_morte
    UNION ALL
    SELECT 'Movimentação', public.registros_movimentacao.fazenda_id, public.registros_movimentacao.created_at FROM public.registros_movimentacao
    UNION ALL
    SELECT 'Operações Máquinas', public.registros_operacoes_maquinas.fazenda_id, public.registros_operacoes_maquinas.created_at FROM public.registros_operacoes_maquinas
    UNION ALL
    SELECT 'Pastagens', public.registros_pastagens.fazenda_id, public.registros_pastagens.created_at FROM public.registros_pastagens
    UNION ALL
    SELECT 'Problemas', public.registros_problemas.fazenda_id, public.registros_problemas.created_at FROM public.registros_problemas
    UNION ALL
    SELECT 'Rodeio', public.registros_rodeio.fazenda_id, public.registros_rodeio.created_at FROM public.registros_rodeio
    UNION ALL
    SELECT 'Saída Insumos', public.registros_saida_insumos.fazenda_id, public.registros_saida_insumos.created_at FROM public.registros_saida_insumos
    UNION ALL
    SELECT 'Suplementação', public.registros_suplementacao.fazenda_id, public.registros_suplementacao.created_at FROM public.registros_suplementacao
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_registros_atividades(text) TO anon, authenticated;;
