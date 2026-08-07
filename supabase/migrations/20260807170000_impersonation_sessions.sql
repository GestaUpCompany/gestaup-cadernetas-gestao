-- ============================================================
-- Migration: Impersonação de usuários
-- Tabela para registrar sessões de impersonação + RPC de encerramento
-- ============================================================

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL,
  super_admin_email text NOT NULL,
  target_user_id uuid NOT NULL,
  target_user_email text NOT NULL,
  target_user_nome text NOT NULL,
  target_fazenda_id uuid,
  target_fazenda_nome text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  reason text,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_impersonation_select ON public.impersonation_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY rls_impersonation_insert ON public.impersonation_sessions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY rls_impersonation_update ON public.impersonation_sessions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_impersonation_sessions_super_admin ON public.impersonation_sessions (super_admin_id);
CREATE INDEX idx_impersonation_sessions_active ON public.impersonation_sessions (is_active) WHERE is_active = true;
CREATE INDEX idx_impersonation_sessions_started_at ON public.impersonation_sessions (started_at DESC);

-- RPC para encerrar impersonação
CREATE OR REPLACE FUNCTION public.end_impersonation_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.impersonation_sessions
  SET is_active = false, ended_at = now()
  WHERE id = p_session_id AND is_active = true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.end_impersonation_session(uuid) TO authenticated;
