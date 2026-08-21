
-- ============================================================================
-- Tabela: planos_nutricionais
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.planos_nutricionais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_categoria_id uuid NOT NULL REFERENCES public.lote_categorias(id) ON DELETE CASCADE,
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id),
  nome text NOT NULL,
  formulacao_id uuid NOT NULL REFERENCES public.formulacoes(id),
  periodo_dias integer NOT NULL,
  peso_meta_kg numeric(10,2) NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean DEFAULT false,
  data_inicio date,
  data_fim date,
  condicao_migracao text DEFAULT 'periodo' CHECK (condicao_migracao IN ('periodo', 'peso', 'ambos')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_nutricionais_lote_categoria_ativo
  ON public.planos_nutricionais(lote_categoria_id, ativo);

CREATE INDEX IF NOT EXISTS idx_planos_nutricionais_fazenda
  ON public.planos_nutricionais(fazenda_id);

-- ============================================================================
-- Tabela: planos_nutricionais_snapshots (auditoria)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.planos_nutricionais_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_nutricional_id uuid NOT NULL REFERENCES public.planos_nutricionais(id) ON DELETE CASCADE,
  lote_categoria_id uuid NOT NULL REFERENCES public.lote_categorias(id),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id),
  snapshot jsonb NOT NULL,
  metricas_derivadas jsonb,
  duracao_dias integer,
  ganho_peso_total_kg_cab numeric(10,2),
  gmd_realizado numeric(10,3),
  gmd_planejado numeric(10,3),
  producao_arroba_lote numeric(12,2),
  mortalidade_percent numeric(5,2),
  motivo_migracao text,
  plano_anterior_id uuid REFERENCES public.planos_nutricionais(id),
  plano_posterior_id uuid REFERENCES public.planos_nutricionais(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_snapshots_lote_categoria
  ON public.planos_nutricionais_snapshots(lote_categoria_id);

CREATE INDEX IF NOT EXISTS idx_planos_snapshots_fazenda
  ON public.planos_nutricionais_snapshots(fazenda_id);

-- ============================================================================
-- Trigger updated_at para planos_nutricionais
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at_planos_nutricionais()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_nutricionais_updated_at ON public.planos_nutricionais;
CREATE TRIGGER trg_planos_nutricionais_updated_at
BEFORE UPDATE ON public.planos_nutricionais
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_planos_nutricionais();
;
