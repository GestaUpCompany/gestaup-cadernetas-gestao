UPDATE public.registros_morte 
SET diagnosticos = jsonb_build_object(
  'secrecaoOrificios', jsonb_build_object('valor', CASE WHEN secrecao_orificios THEN 'S' ELSE 'N' END, 'observacao', COALESCE(secrecao_orificios_obs, '')),
  'sintomasPneumonia', jsonb_build_object('valor', CASE WHEN sintomas_pneumonia THEN 'S' ELSE 'N' END, 'observacao', COALESCE(sintomas_pneumonia_obs, '')),
  'inchaco', jsonb_build_object('valor', CASE WHEN inchaco THEN 'S' ELSE 'N' END, 'observacao', COALESCE(inchaco_obs, '')),
  'incoordenacaoTremores', jsonb_build_object('valor', CASE WHEN incoordenacao_tremores THEN 'S' ELSE 'N' END, 'observacao', COALESCE(incoordenacao_tremores_obs, '')),
  'apatiaFraqueza', jsonb_build_object('valor', CASE WHEN apatia_fraqueza THEN 'S' ELSE 'N' END, 'observacao', COALESCE(apatia_fraqueza_obs, '')),
  'presencaSangue', jsonb_build_object('valor', CASE WHEN presenca_sangue THEN 'S' ELSE 'N' END, 'observacao', COALESCE(presenca_sangue_obs, '')),
  'desordensDigestivas', jsonb_build_object('valor', CASE WHEN desordens_digestivas THEN 'S' ELSE 'N' END, 'observacao', COALESCE(desordens_digestivas_obs, ''))
)
WHERE diagnosticos = '{}' OR diagnosticos IS NULL;;
