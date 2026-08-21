
ALTER TABLE public.bebedouros
ADD COLUMN setor_id uuid NULL REFERENCES public.setores(id);
;
