-- Adiciona coluna tokens_cached em chat_ia_logs para monitorar
-- a taxa de implicit cache hit do Gemini (context caching).
-- Permite acompanhar a economia real de input tokens entre chamadas
-- com systemInstruction + tools idênticos.

ALTER TABLE public.chat_ia_logs
ADD COLUMN IF NOT EXISTS tokens_cached integer DEFAULT 0;

COMMENT ON COLUMN public.chat_ia_logs.tokens_cached IS
  'Total de input tokens servidos via context caching (desconto de 90% no preço de input).';
