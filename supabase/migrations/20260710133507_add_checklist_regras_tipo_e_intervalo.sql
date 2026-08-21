-- Adiciona colunas para tipos de regra e intervalo aleatório
ALTER TABLE public.checklist_regras
ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'periodo',
ADD COLUMN IF NOT EXISTS intervalo_maximo integer;

-- Adiciona comentários descritivos
COMMENT ON COLUMN public.checklist_regras.tipo IS 'periodo, intervalo_aleatorio ou excecao';
COMMENT ON COLUMN public.checklist_regras.intervalo_maximo IS 'Máximo de dias de espera entre checklists para regras de intervalo aleatório';

-- Adiciona constraint de valores permitidos
ALTER TABLE public.checklist_regras
DROP CONSTRAINT IF EXISTS checklist_regras_tipo_check;
ALTER TABLE public.checklist_regras
ADD CONSTRAINT checklist_regras_tipo_check
CHECK (tipo = ANY (ARRAY['periodo', 'intervalo_aleatorio', 'excecao']));

-- Validação: intervalo_maximo obrigatório apenas para intervalo_aleatorio
ALTER TABLE public.checklist_regras
DROP CONSTRAINT IF EXISTS checklist_regras_intervalo_check;
ALTER TABLE public.checklist_regras
ADD CONSTRAINT checklist_regras_intervalo_check
CHECK (
  (tipo = 'intervalo_aleatorio' AND intervalo_maximo IS NOT NULL AND intervalo_maximo > 0)
  OR (tipo != 'intervalo_aleatorio' AND intervalo_maximo IS NULL)
);;
