-- Atualiza faixas padrão de Bezerro ao Pé (30-170) e Bezerro (171-300) para machos
-- Antes: Bezerro ao Pé 30-180, Bezerro 181-300
-- Agora: Bezerro ao Pé 30-170, Bezerro 171-300

-- 1. Atualizar faixas existentes em todas as fazendas
UPDATE faixas_categorias
SET peso_min = 30, peso_max = 170
WHERE nome ILIKE 'bezerro ao pé' AND sexo = 'M';

UPDATE faixas_categorias
SET peso_min = 171, peso_max = 300
WHERE nome ILIKE 'bezerro' AND sexo = 'M'
  AND nome NOT ILIKE 'bezerro ao pé';

-- 2. Atualizar seed function para novas fazendas
CREATE OR REPLACE FUNCTION public.seed_faixas_categorias_default()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.faixas_categorias (fazenda_id, nome, sexo, peso_min, peso_max, ordem, cor, destino)
  VALUES
    (NEW.id, 'Bezerro ao Pé', 'M', 30, 170, 1, '#fde68a', NULL),
    (NEW.id, 'Bezerro',       'M', 171, 300, 2, '#fcd34d', NULL),
    (NEW.id, 'Garrote',       'M', 301, 420, 3, '#f59e0b', NULL),
    (NEW.id, 'Boi Magro',     'M', 421, 500, 4, '#3b82f6', 'corte'),
    (NEW.id, 'Boi Gordo',     'M', 501, 9999, 5, '#1d4ed8', 'corte'),
    (NEW.id, 'Tourinho',      'M', 421, 500, 4, '#a78bfa', 'reprodução'),
    (NEW.id, 'Touro',         'M', 501, 9999, 5, '#7c3aed', 'reprodução'),
    (NEW.id, 'Bezerra ao Pé', 'F', 30, 170, 1, '#fbcfe8', NULL),
    (NEW.id, 'Bezerra',       'F', 171, 280, 2, '#f9a8d4', NULL),
    (NEW.id, 'Novilha',       'F', 281, 420, 3, '#ec4899', NULL),
    (NEW.id, 'Vaca',          'F', 421, 9999, 4, '#be185d', NULL)
  ON CONFLICT (fazenda_id, nome, sexo) DO NOTHING;
  RETURN NEW;
END;
$function$;
