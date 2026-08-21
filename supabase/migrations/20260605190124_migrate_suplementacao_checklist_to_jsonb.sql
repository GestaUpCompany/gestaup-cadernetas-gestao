UPDATE registros_suplementacao 
SET checklist = jsonb_build_object(
  'limpeza_cocho', jsonb_build_object('valor', limpeza_cocho, 'observacao', COALESCE(limpeza_cocho_obs, '')),
  'cochos_condicoes', jsonb_build_object('valor', cochos_condicoes, 'observacao', COALESCE(cochos_condicoes_obs, '')),
  'aterro_acesso_ideal', jsonb_build_object('valor', aterro_acesso_ideal, 'observacao', COALESCE(aterro_acesso_ideal_obs, '')),
  'espacamento_cocho_ideal', jsonb_build_object('valor', espacamento_cocho_ideal, 'observacao', COALESCE(espacamento_cocho_ideal_obs, '')),
  'deposito_condicoes', jsonb_build_object('valor', deposito_condicoes, 'observacao', COALESCE(deposito_condicoes_obs, '')),
  'estoque_deposito', jsonb_build_object('valor', estoque_deposito, 'observacao', COALESCE(estoque_deposito_obs, ''))
) WHERE checklist IS NULL;;
