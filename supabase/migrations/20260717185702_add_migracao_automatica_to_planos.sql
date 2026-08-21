ALTER TABLE public.planos_nutricionais
ADD COLUMN IF NOT EXISTS migracao_automatica boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.planos_nutricionais.migracao_automatica IS 'Se true, o plano migra automaticamente ao atingir a condição. Se false, apenas migração manual é permitida.';

-- Planos existentes: default true (comportamento atual)
UPDATE public.planos_nutricionais SET migracao_automatica = true WHERE migracao_automatica IS NULL;;
