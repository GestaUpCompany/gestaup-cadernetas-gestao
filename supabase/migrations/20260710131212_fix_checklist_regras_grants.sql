-- Concede os mesmos grants das tabelas similares (racas, setores, causas_morte)
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
ON public.checklist_regras
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
ON public.checklist_regras
TO anon;;
