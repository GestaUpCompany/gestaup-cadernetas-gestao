-- Tornar fazenda_id e registro_id nullable na audit_log
ALTER TABLE public.audit_log ALTER COLUMN fazenda_id DROP NOT NULL;
ALTER TABLE public.audit_log ALTER COLUMN registro_id DROP NOT NULL;;
