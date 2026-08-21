-- Adicionar coluna checklist do tipo jsonb
ALTER TABLE registros_manutencao_maquinas ADD COLUMN checklist jsonb;

-- Migrar dados existentes das colunas separadas para o jsonb
UPDATE registros_manutencao_maquinas 
SET checklist = jsonb_build_object(
  'abastecimento_realizado', jsonb_build_object(
    'valor', CASE WHEN abastecimento_realizado THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(abastecimento_realizado_obs, '')
  ),
  'lavagem_realizada', jsonb_build_object(
    'valor', CASE WHEN lavagem_realizada THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(lavagem_realizada_obs, '')
  ),
  'vidros_perfeitos', jsonb_build_object(
    'valor', CASE WHEN vidros_perfeitos THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(vidros_perfeitos_obs, '')
  ),
  'freios_bons', jsonb_build_object(
    'valor', CASE WHEN freios_bons THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(freios_bons_obs, '')
  ),
  'bateria_boa', jsonb_build_object(
    'valor', CASE WHEN bateria_boa THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(bateria_boa_obs, '')
  ),
  'conferiu_eletrica', jsonb_build_object(
    'valor', CASE WHEN conferiu_eletrica THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(conferiu_eletrica_obs, '')
  ),
  'maquina_engraxada', jsonb_build_object(
    'valor', CASE WHEN maquina_engraxada THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(maquina_engraxada_obs, '')
  ),
  'nivel_agua_ideal', jsonb_build_object(
    'valor', CASE WHEN nivel_agua_ideal THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(nivel_agua_ideal_obs, '')
  ),
  'conferiu_nivel_oleo', jsonb_build_object(
    'valor', CASE WHEN conferiu_nivel_oleo THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(conferiu_nivel_oleo_obs, '')
  ),
  'calibrou_pneus', jsonb_build_object(
    'valor', CASE WHEN calibrou_pneus THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(calibrou_pneus_obs, '')
  ),
  'limpou_radiador', jsonb_build_object(
    'valor', CASE WHEN limpou_radiador THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(limpou_radiador_obs, '')
  ),
  'tapetes_bons', jsonb_build_object(
    'valor', CASE WHEN tapetes_bons THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(tapetes_bons_obs, '')
  ),
  'assento_bom', jsonb_build_object(
    'valor', CASE WHEN assento_bom THEN 'S' ELSE 'N' END,
    'observacao', COALESCE(assento_bom_obs, '')
  )
);

-- Remover colunas separadas antigas
ALTER TABLE registros_manutencao_maquinas DROP COLUMN abastecimento_realizado;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN abastecimento_realizado_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN lavagem_realizada;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN lavagem_realizada_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN vidros_perfeitos;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN vidros_perfeitos_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN freios_bons;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN freios_bons_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN bateria_boa;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN bateria_boa_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN conferiu_eletrica;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN conferiu_eletrica_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN maquina_engraxada;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN maquina_engraxada_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN nivel_agua_ideal;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN nivel_agua_ideal_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN conferiu_nivel_oleo;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN conferiu_nivel_oleo_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN calibrou_pneus;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN calibrou_pneus_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN limpou_radiador;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN limpou_radiador_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN tapetes_bons;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN tapetes_bons_obs;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN assento_bom;
ALTER TABLE registros_manutencao_maquinas DROP COLUMN assento_bom_obs;;
