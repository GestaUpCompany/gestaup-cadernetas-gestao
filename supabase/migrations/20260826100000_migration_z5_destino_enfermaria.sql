-- ============================================================================
-- MIGRATION Z5 — Adiciona 'enfermaria' como destino possível do lote
-- ============================================================================
-- Lotes de enfermaria aceitam todas as categorias (machos e fêmeas),
-- servindo como recuperação temporária de animais de qualquer origem.
-- ============================================================================

ALTER TABLE public.lotes DROP CONSTRAINT IF EXISTS lotes_destino_check;

ALTER TABLE public.lotes
  ADD CONSTRAINT lotes_destino_check
  CHECK (destino = ANY (ARRAY['corte'::text, 'reprodução'::text, 'reproducao'::text, 'enfermaria'::text]));
