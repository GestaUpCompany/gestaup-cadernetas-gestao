UPDATE registros_operacoes_maquinas 
SET checklist = jsonb_build_object(
  'meta_diaria_batida', jsonb_build_object(
    'valor', COALESCE(meta_diaria_batida, 'N'),
    'observacao', COALESCE(meta_diaria_batida_obs, '')
  ),
  'algum_imprevisto', jsonb_build_object(
    'valor', COALESCE(algum_imprevisto, 'N'),
    'observacao', COALESCE(algum_imprevisto_obs, '')
  )
)
WHERE checklist IS NULL;;
