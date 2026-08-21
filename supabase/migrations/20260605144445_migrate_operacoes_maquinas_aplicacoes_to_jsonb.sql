UPDATE registros_operacoes_maquinas 
SET aplicacoes = CASE 
  WHEN insumo_aplicado IS NOT NULL OR quantidade_total_aplicada IS NOT NULL OR area_trabalhada IS NOT NULL OR dose_aplicada IS NOT NULL
  THEN jsonb_build_array(jsonb_build_object(
    'insumo_aplicado', COALESCE(insumo_aplicado, ''),
    'quantidade_total_aplicada', COALESCE(quantidade_total_aplicada, ''),
    'area_trabalhada', COALESCE(area_trabalhada, ''),
    'dose_aplicada', COALESCE(dose_aplicada, '')
  ))
  ELSE NULL
END
WHERE aplicacoes IS NULL;;
