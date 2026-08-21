
ALTER TABLE public.modulos_pastos
ADD COLUMN setor_id uuid NULL REFERENCES public.setores(id),
ADD COLUMN sistema_producao text NULL,
ADD COLUMN responsavel text NULL;
;
