-- ============================================================================
-- MIGRATION C — formulacoes.versao + formulacoes_historico + trigger BEFORE UPDATE
-- ============================================================================
-- Objetivo: versionar formulações. Qualquer update em formulacoes dispara uma
-- trigger que salva um snapshot da versão anterior em formulacoes_historico.
-- Se o update for bem-sucedido (commit), a versão principal é incrementada.
--
-- Semântica: o BEFORE UPDATE faz snapshot + incremento na mesma transação.
-- Se a transação falhar, ambos caem juntos (rollback atômico), satisfazendo
-- "só incrementa se bem-sucedido".
--
-- A trigger exclui updated_at e versao da detecção de mudança para evitar
-- snapshots inúteis em touches.
-- ============================================================================

-- 1. Adicionar coluna versao
ALTER TABLE public.formulacoes
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1;

-- 2. Criar tabela de histórico
CREATE TABLE IF NOT EXISTS public.formulacoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulacao_id uuid NOT NULL,
  versao_snapshot integer NOT NULL,
  snapshot_jsonb jsonb NOT NULL,
  alterado_em timestamptz NOT NULL DEFAULT now(),
  alterado_por uuid
);

CREATE INDEX IF NOT EXISTS idx_formulacoes_historico_form
  ON public.formulacoes_historico(formulacao_id, versao_snapshot DESC);

-- 3. RLS: peão só vê histórico de formulações da sua fazenda
ALTER TABLE public.formulacoes_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS formulacoes_historico_select_fazenda ON public.formulacoes_historico;
CREATE POLICY formulacoes_historico_select_fazenda
  ON public.formulacoes_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.formulacoes f
      WHERE f.id = formulacao_id
        AND f.fazenda_id = (
          SELECT uf.fazenda_id FROM public.usuario_fazenda uf
          WHERE uf.usuario_id = auth.uid() LIMIT 1
        )
    )
  );

-- 4. Função da trigger
CREATE OR REPLACE FUNCTION public.fn_snapshot_formulacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só snapshot+incrementa quando campos relevantes mudam
  -- (exclui updated_at e versao da comparação)
  IF row_to_json(NEW)::jsonb - 'updated_at' - 'versao'
     IS DISTINCT FROM
     row_to_json(OLD)::jsonb - 'updated_at' - 'versao'
  THEN
    INSERT INTO public.formulacoes_historico (
      formulacao_id, versao_snapshot, snapshot_jsonb, alterado_por
    )
    VALUES (
      OLD.id, OLD.versao, to_jsonb(OLD), NULL
    );
    NEW.versao := OLD.versao + 1;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS trg_snapshot_formulacao ON public.formulacoes;
CREATE TRIGGER trg_snapshot_formulacao
  BEFORE UPDATE ON public.formulacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_snapshot_formulacao();
