-- Trigger para UPDATE em entrada (correções)
CREATE OR REPLACE FUNCTION atualizar_estoque_entrada_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se insumo_id mudou ou quantidade mudou
  IF (OLD.insumo_id IS DISTINCT FROM NEW.insumo_id) OR (OLD.quantidade IS DISTINCT FROM NEW.quantidade) OR (OLD.valor_total IS DISTINCT FROM NEW.valor_total) THEN
    -- Estornar movimento antigo
    IF OLD.insumo_id IS NOT NULL AND OLD.quantidade IS NOT NULL THEN
      UPDATE insumos 
      SET estoque_atual = COALESCE(estoque_atual, 0) - OLD.quantidade,
          custo_total_estoque = COALESCE(custo_total_estoque, 0) - OLD.valor_total
      WHERE id = OLD.insumo_id;
      
      -- Criar movimentação de estorno
      INSERT INTO movimentacao_estoque (
        tipo_movimentacao, quantidade, custo_total, registro_id, tabela_origem, 
        fazenda_id, data_movimentacao, criado_por, motivo
      ) VALUES (
        'saida', OLD.quantidade, OLD.valor_total, NEW.id, 'registros_entrada_insumos',
        NEW.fazenda_id, NEW.data_entrada, NEW.nome_usuario, 'Correção de entrada'
      );
    END IF;
    
    -- Aplicar novo movimento
    IF NEW.insumo_id IS NOT NULL AND NEW.quantidade IS NOT NULL THEN
      UPDATE insumos 
      SET estoque_atual = COALESCE(estoque_atual, 0) + NEW.quantidade,
          custo_total_estoque = COALESCE(custo_total_estoque, 0) + NEW.valor_total
      WHERE id = NEW.insumo_id;
      
      -- Criar movimentação de correção
      INSERT INTO movimentacao_estoque (
        tipo_movimentacao, quantidade, custo_total, custo_unitario,
        registro_id, tabela_origem, fazenda_id, fornecedor, nota_fiscal,
        data_movimentacao, criado_por, motivo
      ) VALUES (
        'entrada', NEW.quantidade, NEW.valor_total, NEW.valor_unitario,
        NEW.id, 'registros_entrada_insumos', NEW.fazenda_id, NEW.fornecedor, NEW.nota_fiscal,
        NEW.data_entrada, NEW.nome_usuario, 'Correção de entrada'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estoque_entrada_update
AFTER UPDATE ON registros_entrada_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_entrada_update();

-- Trigger para DELETE em entrada (estorno)
CREATE OR REPLACE FUNCTION atualizar_estoque_entrada_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Estornar movimento
  IF OLD.insumo_id IS NOT NULL AND OLD.quantidade IS NOT NULL THEN
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) - OLD.quantidade,
        custo_total_estoque = COALESCE(custo_total_estoque, 0) - OLD.valor_total
    WHERE id = OLD.insumo_id;
    
    -- Criar movimentação de estorno
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, custo_total, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'saida', OLD.quantidade, OLD.valor_total, OLD.id, 'registros_entrada_insumos',
      OLD.fazenda_id, OLD.data_entrada, OLD.nome_usuario, 'Exclusão de entrada'
    );
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estoque_entrada_delete
AFTER DELETE ON registros_entrada_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_entrada_delete();;
