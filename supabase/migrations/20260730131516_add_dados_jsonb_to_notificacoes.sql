-- F1.1: Adicionar dados_jsonb a notificacoes
ALTER TABLE public.notificacoes 
ADD COLUMN IF NOT EXISTS dados_jsonb jsonb;

CREATE INDEX IF NOT EXISTS idx_notificacoes_dados_jsonb_lote_cat
ON public.notificacoes ((dados_jsonb->>'lote_categoria_id'))
WHERE dados_jsonb IS NOT NULL;

SELECT 'dados_jsonb adicionado a notificacoes' AS status;;
