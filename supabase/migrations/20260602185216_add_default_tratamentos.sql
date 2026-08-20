-- Insert default treatment names for all farms
INSERT INTO public.tratamentos (fazenda_id, nome, ativo)
SELECT 
  f.id,
  unnest(ARRAY['Colostro', 'Cura Umbigo', 'Tatuagem', 'Furo Orelhas', 'Unguento', 'Repelente', 'Vermífugo', 'Antibiótico', 'Probiótico', 'Soro', 'Pesagem']),
  true
FROM public.fazendas f
WHERE NOT EXISTS (
  SELECT 1 FROM public.tratamentos t 
  WHERE t.fazenda_id = f.id 
  AND t.nome = ANY(ARRAY['Colostro', 'Cura Umbigo', 'Tatuagem', 'Furo Orelhas', 'Unguento', 'Repelente', 'Vermífugo', 'Antibiótico', 'Probiótico', 'Soro', 'Pesagem'])
);;
