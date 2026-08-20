UPDATE public.registros_rodeio 
SET diagnosticos = jsonb_build_object(
  'escoreGadoIdeal', jsonb_build_object(
    'valor', CASE WHEN escore_gado_ideal IS TRUE THEN 'S' WHEN escore_gado_ideal IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(escore_gado_ideal_obs, '')
  ),
  'bebedourosCochos', jsonb_build_object(
    'valor', CASE WHEN bebedouros_cochos IS TRUE THEN 'S' WHEN bebedouros_cochos IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(bebedouros_cochos_obs, '')
  ),
  'pastagensTaxaLotacao', jsonb_build_object(
    'valor', CASE WHEN pastagens_taxa_lotacao IS TRUE THEN 'S' WHEN pastagens_taxa_lotacao IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(pastagens_taxa_lotacao_obs, '')
  ),
  'animaisMachucadosDoentesBichados', jsonb_build_object(
    'valor', CASE WHEN animais_machucados_doentes_bichados IS TRUE THEN 'S' WHEN animais_machucados_doentes_bichados IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(animais_machucados_doentes_bichados_obs, '')
  ),
  'cercasCochosPorteiras', jsonb_build_object(
    'valor', CASE WHEN cercas_cochos_porteiras IS TRUE THEN 'S' WHEN cercas_cochos_porteiras IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(cercas_cochos_porteiras_obs, '')
  ),
  'carrapatosMoscas', jsonb_build_object(
    'valor', CASE WHEN carrapatos_moscas IS TRUE THEN 'S' WHEN carrapatos_moscas IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(carrapatos_moscas_obs, '')
  ),
  'animaisEntrevero', jsonb_build_object(
    'valor', CASE WHEN animais_entrevero IS TRUE THEN 'S' WHEN animais_entrevero IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(animais_entrevero_obs, '')
  ),
  'animalMorto', jsonb_build_object(
    'valor', CASE WHEN animal_morto IS TRUE THEN 'S' WHEN animal_morto IS FALSE THEN 'N' ELSE NULL END,
    'observacao', COALESCE(animal_morto_obs, '')
  )
)
WHERE diagnosticos IS NULL;;
