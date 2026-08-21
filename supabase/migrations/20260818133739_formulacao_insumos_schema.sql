CREATE TABLE IF NOT EXISTS public.formulacao_insumos (
  formulacao_id uuid NOT NULL REFERENCES public.formulacoes(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  formula_teor_ms numeric(10,2) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  PRIMARY KEY (formulacao_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_formulacao_insumos_insumo
  ON public.formulacao_insumos(insumo_id);

ALTER TABLE public.formulacao_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formulacao_insumos_select_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_select_fazenda"
  ON public.formulacao_insumos FOR SELECT
  USING (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS "formulacao_insumos_insert_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_insert_fazenda"
  ON public.formulacao_insumos FOR INSERT
  WITH CHECK (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS "formulacao_insumos_update_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_update_fazenda"
  ON public.formulacao_insumos FOR UPDATE
  USING (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS "formulacao_insumos_delete_fazenda" ON public.formulacao_insumos;
CREATE POLICY "formulacao_insumos_delete_fazenda"
  ON public.formulacao_insumos FOR DELETE
  USING (
    formulacao_id IN (
      SELECT f.id FROM public.formulacoes f
      WHERE f.fazenda_id IN (
        SELECT fazenda_id FROM public.usuario_fazenda
        WHERE usuario_id = auth.uid() AND ativo = true
      )
    )
  );

INSERT INTO public.formulacao_insumos (formulacao_id, insumo_id, formula_teor_ms, ordem)
SELECT
  f.id,
  (elem.value->>'insumo_id')::uuid,
  COALESCE(
    (elem.value->>'formula_teor_ms')::numeric,
    (elem.value->>'formula_ms_percent')::numeric,
    0
  ),
  elem.ordem::integer
FROM public.formulacoes f
CROSS JOIN LATERAL jsonb_array_elements(f.insumos) WITH ORDINALITY AS elem(value, ordem)
WHERE f.insumos IS NOT NULL
  AND jsonb_typeof(f.insumos) = 'array'
  AND (elem.value->>'insumo_id') IS NOT NULL
ON CONFLICT (formulacao_id, insumo_id) DO NOTHING;

COMMENT ON TABLE public.formulacao_insumos IS
  'Tabela de juncao normalizada substituindo o JSONB formulacoes.insumos.';
COMMENT ON COLUMN public.formulacao_insumos.formula_teor_ms IS
  'Participacao do insumo na formulacao em materia seca (%).';
COMMENT ON COLUMN public.formulacao_insumos.ordem IS
  'Ordem de exibicao do insumo na formulacao.';;
