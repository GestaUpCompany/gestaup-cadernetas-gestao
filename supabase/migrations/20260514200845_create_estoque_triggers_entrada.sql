-- Função para atualizar estoque na entrada
CREATE OR REPLACE FUNCTION atualizar_estoque_entrada()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar movimentação de auditoria
  INSERT INTO movimentacao_estoque (
    tipo_movimentacao, quantidade, custo_total, custo_unitario,
    registro_id, tabela_origem, fazenda_id, fornecedor, nota_fiscal,
    data_movimentacao, criado_por
  ) VALUES (
    'entrada', NEW.quantidade, NEW.valor_total, NEW.valor_unitario,
    NEW.id, 'registros_entrada_insumos', NEW.fazenda_id, NEW.fornecedor, NEW.nota_fiscal,
    NEW.data_entrada, NEW.nome_usuario
  );
  
  -- Atualizar estoque atual (apenas se insumo_id foi informado)
  IF NEW.insumo_id IS NOT NULL THEN
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + NEW.quantidade,
        custo_total_estoque = COALESCE(custo_total_estoque, 0) + NEW.valor_total
    WHERE id = NEW.insumo_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para entrada
CREATE TRIGGER trg_estoque_entrada
AFTER INSERT ON registros_entrada_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_entrada();;
