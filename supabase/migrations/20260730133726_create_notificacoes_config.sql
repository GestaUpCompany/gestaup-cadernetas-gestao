-- F1.1: Criar tabela notificacoes_config
CREATE TABLE IF NOT EXISTS public.notificacoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  threshold_recategorizacao numeric NOT NULL DEFAULT 95.0 CHECK (threshold_recategorizacao >= 50 AND threshold_recategorizacao <= 99),
  recategorizacao_ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (fazenda_id)
);

-- Backfill: uma linha por fazenda existente
INSERT INTO public.notificacoes_config (fazenda_id)
SELECT id FROM public.fazendas
WHERE id NOT IN (SELECT fazenda_id FROM public.notificacoes_config)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.notificacoes_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios podem ver config de suas fazendas" ON public.notificacoes_config
  FOR SELECT USING (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid() AND ativo = true)
  );
CREATE POLICY "Usuarios podem editar config de suas fazendas" ON public.notificacoes_config
  FOR UPDATE USING (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid() AND ativo = true)
  );

-- Trigger para novas fazendas: cria linha de config automaticamente
CREATE OR REPLACE FUNCTION public.seed_notificacoes_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notificacoes_config (fazenda_id)
  VALUES (NEW.id)
  ON CONFLICT (fazenda_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_seed_notificacoes_config ON public.fazendas;
CREATE TRIGGER trg_seed_notificacoes_config
  AFTER INSERT ON public.fazendas
  FOR EACH ROW EXECUTE FUNCTION public.seed_notificacoes_config();

SELECT count(*) AS fazendas_com_config FROM public.notificacoes_config;;
