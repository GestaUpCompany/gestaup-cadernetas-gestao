UPDATE registros_bebedouros 
SET checklist = jsonb_build_object(
  'agua_suficiente', jsonb_build_object('valor', COALESCE(agua_suficiente, false), 'observacao', COALESCE(agua_suficiente_obs, '')),
  'vazao_bebedouro_ideal', jsonb_build_object('valor', COALESCE(vazao_bebedouro_ideal, false), 'observacao', COALESCE(vazao_bebedouro_ideal_obs, '')),
  'aterro_acesso_bebedouro_ideal', jsonb_build_object('valor', COALESCE(aterro_acesso_bebedouro_ideal, false), 'observacao', COALESCE(aterro_acesso_bebedouro_ideal_obs, '')),
  'espacamento_bebedouro_ideal', jsonb_build_object('valor', COALESCE(espacamento_bebedouro_ideal, false), 'observacao', COALESCE(espacamento_bebedouro_ideal_obs, '')),
  'boia_protecao_boas_condicoes', jsonb_build_object('valor', COALESCE(boia_protecao_boas_condicoes, false), 'observacao', COALESCE(boia_protecao_boas_condicoes_obs, ''))
)
WHERE checklist IS NULL;;
