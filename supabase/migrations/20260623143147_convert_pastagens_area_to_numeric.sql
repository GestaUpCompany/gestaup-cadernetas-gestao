ALTER TABLE registros_pastagens 
  ALTER COLUMN pasto_entrada_area_util TYPE numeric USING pasto_entrada_area_util::numeric,
  ALTER COLUMN pasto_saida_area_util TYPE numeric USING pasto_saida_area_util::numeric;;
