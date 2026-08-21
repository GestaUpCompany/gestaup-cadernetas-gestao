-- Fix swapped day/month in all registros_* tables
-- Only swap when month > 6 (July-December) and year > 2024
-- This ensures we don't create invalid dates like month 14

-- registros_suplementacao
UPDATE registros_suplementacao 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_maternidade
UPDATE registros_maternidade 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_pastagens
UPDATE registros_pastagens 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_rodeio
UPDATE registros_rodeio 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_bebedouros
UPDATE registros_bebedouros 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_movimentacao
UPDATE registros_movimentacao 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_enfermaria
UPDATE registros_enfermaria 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_morte
UPDATE registros_morte 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_clima
UPDATE registros_clima 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_abastecimento
UPDATE registros_abastecimento 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_cantina
UPDATE registros_cantina 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_limpeza
UPDATE registros_limpeza 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_operacoes_maquinas
UPDATE registros_operacoes_maquinas 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_problemas
UPDATE registros_problemas 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_manutencao_maquinas
UPDATE registros_manutencao_maquinas 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;

-- registros_almoxarifado
UPDATE registros_almoxarifado 
SET data = make_date(EXTRACT(YEAR FROM data)::int, EXTRACT(DAY FROM data)::int, EXTRACT(MONTH FROM data)::int)
WHERE EXTRACT(MONTH FROM data) > 6 AND EXTRACT(YEAR FROM data) > 2024;;
