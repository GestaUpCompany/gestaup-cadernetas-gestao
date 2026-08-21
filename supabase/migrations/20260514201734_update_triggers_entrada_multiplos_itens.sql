-- Recriar função para entrada com suporte a múltiplos itens
CREATE OR REPLACE FUNCTION atualizar_estoque_entrada()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
  v_valor_total NUMERIC;
  v_valor_unitario NUMERIC;
BEGIN
  -- Para cada item da entrada
  FOR v_insumo_id, v_quantidade, v_valor_unitario, v_valor_total IN 
    SELECT insumo_id, quantidade, valor_unitario, valor_total 
    FROM entrada_insumos_itens 
    WHERE entrada_id = NEW.id
  LOOP
    -- Criar movimentação de auditoria
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, custo_total, custo_unitario,
      registro_id, tabela_origem, fazenda_id, fornecedor, nota_fiscal,
      data_movimentacao, criado_por
    ) VALUES (
      'entrada', v_quantidade, v_valor_total, v_valor_unitario,
      NEW.id, 'registros_entrada_insumos', NEW.fazenda_id, NEW.fornecedor, NEW.nota_fiscal,
      NEW.data_entrada, NEW.nome_usuario
    );
    
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_quantidade,
        custo_total_estoque = COALESCE(custo_total_estoque, 0) + COALESCE(v_valor_total, 0)
    WHERE id = v_insumo_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para entrada (já existe, recriado com nova função)
DROP TRIGGER IF EXISTS trg_estoque_entrada ON registros_entrada_insumos;
CREATE TRIGGER trg_estoque_entrada
AFTER INSERT ON registros_entrada_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_entrada();

-- Trigger UPDATE para entrada (correções)
CREATE OR REPLACE FUNCTION atualizar_estoque_entrada_update()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
  v_valor_total NUMERIC;
  v_valor_unitario NUMERIC;
BEGIN
  -- Se data_entrada ou outros campos principais mudaram
  IF (OLD.data_entrada IS DISTINCT FROM NEW.data_entrada) OR
     (OLD.fornecedor IS DISTINCT FROM NEW.fornecedor) OR
     (OLD.nota_fiscal IS DISTINCT FROM NEW.nota_fiscal) OR
     (OLD.nome_usuario IS DISTINCT FROM NEW.nome_usuario) THEN
    
    -- Atualizar movimentações existentes com novos dados do cabeçalho
    UPDATE movimentacao_estoque 
    SET fornecedor = NEW.fornecedor,
        nota_fiscal = NEW.nota_fiscal,
        data_movimentacao = NEW.data_entrada,
        criado_por = NEW.nome_usuario
    WHERE registro_id = NEW.id 
      AND tabela_origem = 'registros_entrada_insumos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estoque_entrada_update ON registros_entrada_insumos;
CREATE TRIGGER trg_estoque_entrada_update
AFTER UPDATE ON registros_entrada_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_entrada_update();

-- Trigger DELETE para entrada (estorno)
CREATE OR REPLACE FUNCTION atualizar_estoque_entrada_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
  v_valor_total NUMERIC;
BEGIN
  -- Estornar todos os itens da entrada
  FOR v_insumo_id, v_quantidade, v_valor_total IN 
    SELECT insumo_id, quantidade, valor_total 
    FROM entrada_insumos_itens 
    WHERE entrada_id = OLD.id
  LOOP
    -- Atualizar estoque atual (subtrair)
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) - v_quantidade,
        custo_total_estoque = COALESCE(custo_total_estoque, 0) - COALESCE(v_valor_total, 0)
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de estorno
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, custo_total, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'saida', v_quantidade, v_valor_total, OLD.id, 'registros_entrada_insumos',
      OLD.fazenda_id, OLD.data_entrada, OLD.nome_usuario, 'Exclusão de entrada'
    );
  END LOOP;
  
  -- Excluir itens da entrada (ON DELETE CASCADE cuida disso, mas garantimos aqui)
  DELETE FROM entrada_insumos_itens WHERE entrada_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estoque_entrada_delete ON registros_entrada_insumos;
CREATE TRIGGER trg_estoque_entrada_delete
AFTER DELETE ON registros_entrada_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_entrada_delete();;
