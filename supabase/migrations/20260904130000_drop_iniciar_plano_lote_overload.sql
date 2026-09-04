-- ============================================================================
-- MIGRAÇÃO — Remove ambiguidade de overload de iniciar_plano_lote
-- ============================================================================
-- Problema: existiam duas funções sobrecarregadas:
--   iniciar_plano_lote(uuid, uuid DEFAULT NULL)
--   iniciar_plano_lote(uuid, uuid DEFAULT NULL, boolean DEFAULT false)
--
-- Chamadas com 2 argumentos ficavam ambíguas, pois ambas aceitavam 2 args.
--
-- Solução: dropar a versão antiga de 2 parâmetros. A versão de 3 parâmetros
-- possui defaults, então pode ser chamada com 2 args (p_retroativo = false).
-- ============================================================================

DROP FUNCTION IF EXISTS public.iniciar_plano_lote(uuid, uuid);
