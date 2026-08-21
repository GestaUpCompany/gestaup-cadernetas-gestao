-- Trigger para UPDATE em saída (correções)
CREATE OR REPLACE FUNCTION atualizar_estoque_saida_update()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
BEGIN
  -- Se data ou outros campos mudaram, precisamos recalcular
  -- Para simplificar, estornamos todos os itens antigos e aplicamos os novos
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = OLD.id
  LOOP
    -- Estornar movimento antigo
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_quantidade
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de estorno
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'entrada', v_quantidade, OLD.id, 'registros_saida_insumos',
      OLD.fazenda_id, OLD.data_producao, OLD.nome_usuario, 'Correção de saída'
    );
  END LOOP;
  
  -- Aplicar novos movimentos
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = NEW.id
  LOOP
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) - v_quantidade
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de correção
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'saida', v_quantidade, NEW.id, 'registros_saida_insumos',
      NEW.fazenda_id, NEW.data_producao, NEW.nome_usuario, 'Correção de saída'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estoque_saida_update
AFTER UPDATE ON registros_saida_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_saida_update();

-- Trigger para DELETE em saída (estorno)
CREATE OR REPLACE FUNCTION atualizar_estoque_saida_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
BEGIN
  -- Estornar todos os movimentos
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = OLD.id
  LOOP
    -- Atualizar estoque atual (devolver ao estoque)
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_quantidade
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de estorno
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'entrada', v_quantidade, OLD.id, 'registros_saida_insumos',
      OLD.fazenda_id, OLD.data_producao, OLD.nome_usuario, 'Exclusão de saída'
    );
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estoque_saida_delete
AFTER DELETE ON registros_saida_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_saida_delete();;
