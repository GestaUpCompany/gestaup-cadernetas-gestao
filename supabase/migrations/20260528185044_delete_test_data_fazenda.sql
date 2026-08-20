DELETE FROM registros_maternidade WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3';
DELETE FROM registros_morte WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3';
DELETE FROM registros_movimentacao WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3';
UPDATE lote_categorias SET quant_atual = 100 WHERE lote_id IN (SELECT id FROM lotes WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3');;
