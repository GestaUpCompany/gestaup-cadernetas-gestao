-- Corrigir categoria das movimentacoes de venda: Garrote -> bezerro
-- Fazenda 075f62cd-7a10-421d-ba0e-3c5f4155a806
-- JH28 (venda 119) e JH39 (venda 90) tinham categoria='Garrote' mas o lote_categorias era 'bezerro'

UPDATE public.registros_movimentacao
SET categoria = 'bezerro', updated_at = now()
WHERE id IN (
  '25c2c38c-5f7e-4c39-a59c-cc2e0af8ec40',
  '559a6923-25ff-4d5b-b193-535ffd72db8e'
);

-- Recalcular quant_atual para JH39 (bezerro): quant_inicial=200, venda=90, esperado=110
UPDATE public.lote_categorias
SET quant_atual = public.calculate_quant_atual('18776df2-0986-4505-b8f5-1dd5938f6bfc', 'bezerro'),
    updated_at = now()
WHERE lote_id = '18776df2-0986-4505-b8f5-1dd5938f6bfc' 
  AND LOWER(categoria) = 'bezerro' 
  AND ativo = true;

-- Recalcular quant_atual para JH28 (bezerro): quant_inicial=null(0), venda=119, esperado=0
UPDATE public.lote_categorias
SET quant_atual = public.calculate_quant_atual('025eb5fb-186e-4331-9627-921c5a754773', 'bezerro'),
    updated_at = now()
WHERE lote_id = '025eb5fb-186e-4331-9627-921c5a754773' 
  AND LOWER(categoria) = 'bezerro' 
  AND ativo = true;

SELECT 'Correcao aplicada' AS status;;
