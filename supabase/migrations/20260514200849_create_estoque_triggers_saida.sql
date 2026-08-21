-- Função para atualizar estoque na saída
CREATE OR REPLACE FUNCTION atualizar_estoque_saida()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
BEGIN
  -- Para cada item da saída
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = NEW.id
  LOOP
    -- Criar movimentação de auditoria
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por
    ) VALUES (
      'saida', v_quantidade, NEW.id, 'registros_saida_insumos',
      NEW.fazenda_id, NEW.data_producao, NEW.nome_usuario
    );
    
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) - v_quantidade
    WHERE id = v_insumo_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para saída
CREATE TRIGGER trg_estoque_saida
AFTER INSERT ON registros_saida_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_saida();;
