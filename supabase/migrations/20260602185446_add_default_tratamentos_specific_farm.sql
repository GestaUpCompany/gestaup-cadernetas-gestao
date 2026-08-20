-- Insert default treatment names for specific farm
INSERT INTO public.tratamentos (fazenda_id, nome, ativo)
SELECT 
  'd649c65e-16ab-4b77-a84b-df937aa41cc3'::uuid,
  unnest(ARRAY['Colostro', 'Cura Umbigo', 'Tatuagem', 'Furo Orelhas', 'Unguento', 'Repelente', 'Vermífugo', 'Antibiótico', 'Probiótico', 'Soro', 'Pesagem']),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tratamentos t 
  WHERE t.fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'::uuid 
  AND t.nome = ANY(ARRAY['Colostro', 'Cura Umbigo', 'Tatuagem', 'Furo Orelhas', 'Unguento', 'Repelente', 'Vermífugo', 'Antibiótico', 'Probiótico', 'Soro', 'Pesagem'])
);;
