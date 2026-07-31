-- Padronizar faixas_categorias com novo schema (destino) e valores atualizados
-- Categorias de machos bifurcam por destino (corte vs reprodução)
-- Categorias de fêmeas são compartilhadas (destino = NULL)

-- 1. Adicionar coluna destino
ALTER TABLE public.faixas_categorias
  ADD COLUMN IF NOT EXISTS destino text;

-- Comentário explicativo
COMMENT ON COLUMN public.faixas_categorias.destino IS 'NULL = aplica a ambos destinos; ''corte'' = só abate; ''reprodução'' = só reprodução';

-- 2. Deletar todas as faixas existentes e reinserir com valores padronizados
--    Isso garante consistência total, eliminando variações históricas entre fazendas
DELETE FROM public.faixas_categorias;

-- 3. Inserir faixas padronizadas para todas as fazendas existentes
INSERT INTO public.faixas_categorias (fazenda_id, nome, sexo, peso_min, peso_max, ordem, cor, destino)
SELECT f.id, v.nome, v.sexo, v.peso_min, v.peso_max, v.ordem, v.cor, v.destino
FROM public.fazendas f
CROSS JOIN (VALUES
  -- Machos compartilhados (destino = NULL)
  ('Bezerro ao Pé', 'M', 30, 180, 1, '#fde68a', NULL),
  ('Bezerro',       'M', 181, 300, 2, '#fcd34d', NULL),
  ('Garrote',       'M', 301, 420, 3, '#f59e0b', NULL),
  -- Machos corte (destino = 'corte')
  ('Boi Magro',     'M', 421, 500, 4, '#3b82f6', 'corte'),
  ('Boi Gordo',     'M', 501, 9999, 5, '#1d4ed8', 'corte'),
  -- Machos reprodução (destino = 'reprodução')
  ('Tourinho',      'M', 421, 500, 4, '#a78bfa', 'reprodução'),
  ('Touro',         'M', 501, 9999, 5, '#7c3aed', 'reprodução'),
  -- Fêmeas compartilhadas (destino = NULL)
  ('Bezerra ao Pé', 'F', 30, 170, 1, '#fbcfe8', NULL),
  ('Bezerra',       'F', 171, 280, 2, '#f9a8d4', NULL),
  ('Novilha',       'F', 281, 420, 3, '#ec4899', NULL),
  ('Vaca',          'F', 421, 9999, 4, '#be185d', NULL)
) AS v(nome, sexo, peso_min, peso_max, ordem, cor, destino);

-- 4. Atualizar função seed para novas fazendas
CREATE OR REPLACE FUNCTION public.seed_faixas_categorias_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.faixas_categorias (fazenda_id, nome, sexo, peso_min, peso_max, ordem, cor, destino)
  VALUES
    -- Machos compartilhados
    (NEW.id, 'Bezerro ao Pé', 'M', 30, 180, 1, '#fde68a', NULL),
    (NEW.id, 'Bezerro',       'M', 181, 300, 2, '#fcd34d', NULL),
    (NEW.id, 'Garrote',       'M', 301, 420, 3, '#f59e0b', NULL),
    -- Machos corte
    (NEW.id, 'Boi Magro',     'M', 421, 500, 4, '#3b82f6', 'corte'),
    (NEW.id, 'Boi Gordo',     'M', 501, 9999, 5, '#1d4ed8', 'corte'),
    -- Machos reprodução
    (NEW.id, 'Tourinho',      'M', 421, 500, 4, '#a78bfa', 'reprodução'),
    (NEW.id, 'Touro',         'M', 501, 9999, 5, '#7c3aed', 'reprodução'),
    -- Fêmeas compartilhadas
    (NEW.id, 'Bezerra ao Pé', 'F', 30, 170, 1, '#fbcfe8', NULL),
    (NEW.id, 'Bezerra',       'F', 171, 280, 2, '#f9a8d4', NULL),
    (NEW.id, 'Novilha',       'F', 281, 420, 3, '#ec4899', NULL),
    (NEW.id, 'Vaca',          'F', 421, 9999, 4, '#be185d', NULL)
  ON CONFLICT (fazenda_id, nome, sexo) DO NOTHING;
  RETURN NEW;
END;
$function$;
