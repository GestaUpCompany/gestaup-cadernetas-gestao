CREATE OR REPLACE FUNCTION public.seed_faixas_categorias_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.faixas_categorias (fazenda_id, nome, sexo, peso_min, peso_max, ordem, cor)
  VALUES
    (NEW.id, 'Bezerro ao P\u00e9', 'M', 0, 120, 1, '#fde68a'),
    (NEW.id, 'Bezerro ao P\u00e9', 'F', 0, 120, 1, '#fde68a'),
    (NEW.id, 'Bezerro', 'M', 120, 210, 2, '#fcd34d'),
    (NEW.id, 'Bezerra', 'F', 120, 210, 2, '#fcd34d'),
    (NEW.id, 'Garrote', 'M', 210, 360, 3, '#f59e0b'),
    (NEW.id, 'Novilha', 'F', 210, 330, 3, '#f59e0b'),
    (NEW.id, 'Boi Magro', 'M', 360, 450, 4, '#3b82f6'),
    (NEW.id, 'Boi Gordo', 'M', 450, 520, 5, '#1d4ed8'),
    (NEW.id, 'Touro', 'M', 450, 700, 6, '#7c3aed'),
    (NEW.id, 'Vaca', 'F', 330, 600, 4, '#7c3aed')
  ON CONFLICT (fazenda_id, nome, sexo) DO NOTHING;
  RETURN NEW;
END;
$function$;

UPDATE public.faixas_categorias SET ordem = 6 WHERE nome = 'Touro' AND sexo = 'M' AND ordem = 4;;
