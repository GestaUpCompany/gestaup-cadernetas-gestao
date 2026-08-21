-- Tabela de configuracao de notas de leitura de cocho
-- As notas (-1, 0, 1, 2, 3) sao fixas/imutaveis.
-- As porcentagens sao editaveis por fazenda.
-- -1 = +5%, 0 = +0%, 1 = -5%, 2 = -10%, 3 = -15% (defaults)

CREATE TABLE IF NOT EXISTS public.notas_leitura_cocho_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nota integer NOT NULL,
  percentual_ajuste numeric NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (fazenda_id, nota),
  CHECK (nota IN (-1, 0, 1, 2, 3))
);

-- RLS
ALTER TABLE public.notas_leitura_cocho_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios podem ver config de leitura de cocho" ON public.notas_leitura_cocho_config
  FOR SELECT USING (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid() AND ativo = true)
  );
CREATE POLICY "Usuarios podem editar config de leitura de cocho" ON public.notas_leitura_cocho_config
  FOR UPDATE USING (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid() AND ativo = true)
  );
CREATE POLICY "Usuarios podem inserir config de leitura de cocho" ON public.notas_leitura_cocho_config
  FOR INSERT WITH CHECK (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid() AND ativo = true)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_leitura_cocho_config TO authenticated;

-- Seed: 5 notas por fazenda existente
INSERT INTO public.notas_leitura_cocho_config (fazenda_id, nota, percentual_ajuste, descricao)
SELECT f.id, n.nota, n.percentual, n.descricao
FROM public.fazendas f
CROSS JOIN (VALUES 
  (-1, 5.0, 'Sobrou comida: aumentar oferta'),
  (0, 0.0, 'Consumo ideal: manter oferta'),
  (1, -5.0, 'Consumo alto: reduzir 5%'),
  (2, -10.0, 'Consumo muito alto: reduzir 10%'),
  (3, -15.0, 'Cocho vazio: reduzir 15%')
) AS n(nota, percentual, descricao)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notas_leitura_cocho_config c 
  WHERE c.fazenda_id = f.id AND c.nota = n.nota
)
ON CONFLICT DO NOTHING;

-- Trigger para novas fazendas: cria as 5 notas automaticamente
CREATE OR REPLACE FUNCTION public.seed_notas_leitura_cocho_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notas_leitura_cocho_config (fazenda_id, nota, percentual_ajuste, descricao)
  VALUES 
    (NEW.id, -1, 5.0, 'Sobrou comida: aumentar oferta'),
    (NEW.id, 0, 0.0, 'Consumo ideal: manter oferta'),
    (NEW.id, 1, -5.0, 'Consumo alto: reduzir 5%'),
    (NEW.id, 2, -10.0, 'Consumo muito alto: reduzir 10%'),
    (NEW.id, 3, -15.0, 'Cocho vazio: reduzir 15%')
  ON CONFLICT (fazenda_id, nota) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_seed_notas_leitura_cocho_config ON public.fazendas;
CREATE TRIGGER trg_seed_notas_leitura_cocho_config
  AFTER INSERT ON public.fazendas
  FOR EACH ROW EXECUTE FUNCTION public.seed_notas_leitura_cocho_config();

SELECT count(*) AS notas_cadastradas FROM public.notas_leitura_cocho_config;;
