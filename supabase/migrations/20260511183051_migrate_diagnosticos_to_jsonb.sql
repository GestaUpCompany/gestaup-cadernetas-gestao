UPDATE public.registros_enfermaria 
SET diagnosticos = jsonb_build_object(
  'pododermiteCascos', jsonb_build_object(
    'valor', pododermite_cascos,
    'observacao', pododermite_cascos_obs
  ),
  'sintomasPneumonia', jsonb_build_object(
    'valor', sintomas_pneumonia,
    'observacao', sintomas_pneumonia_obs
  ),
  'picadoCobra', jsonb_build_object(
    'valor', picado_cobra,
    'observacao', picado_cobra_obs
  ),
  'incoordenacaoTremores', jsonb_build_object(
    'valor', incoordenacao_tremores,
    'observacao', incoordenacao_tremores_obs
  ),
  'febreAlta', jsonb_build_object(
    'valor', febre_alta,
    'observacao', febre_alta_obs
  ),
  'presencaSangue', jsonb_build_object(
    'valor', presenca_sangue,
    'observacao', presenca_sangue_obs
  ),
  'fraturas', jsonb_build_object(
    'valor', fraturas,
    'observacao', fraturas_obs
  ),
  'desordensDigestivas', jsonb_build_object(
    'valor', desordens_digestivas,
    'observacao', desordens_digestivas_obs
  ),
  'cegueira', jsonb_build_object(
    'valor', cegueira,
    'observacao', cegueira_obs
  ),
  'andarCambaleante', jsonb_build_object(
    'valor', andar_cambaleante,
    'observacao', andar_cambaleante_obs
  ),
  'bicheira', jsonb_build_object(
    'valor', bicheira,
    'observacao', bicheira_obs
  )
)
WHERE diagnosticos = '{}'::jsonb OR diagnosticos IS NULL;;
