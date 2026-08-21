
-- 1. Criar tabela linhas_confinamento
CREATE TABLE IF NOT EXISTS public.linhas_confinamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id),
  nome text NOT NULL,
  largura_m numeric,
  comprimento_m numeric,
  metros_cocho_m numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Adicionar linha_id em currais
ALTER TABLE public.currais
ADD COLUMN IF NOT EXISTS linha_id uuid REFERENCES public.linhas_confinamento(id) ON DELETE SET NULL;

-- 3. Habilitar RLS
ALTER TABLE public.linhas_confinamento ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS (seguindo padrão do projeto)
DROP POLICY IF EXISTS "Authenticated select linhas_confinamento" ON public.linhas_confinamento;
DROP POLICY IF EXISTS "Authenticated insert linhas_confinamento" ON public.linhas_confinamento;
DROP POLICY IF EXISTS "Authenticated update linhas_confinamento" ON public.linhas_confinamento;
DROP POLICY IF EXISTS "Authenticated delete linhas_confinamento" ON public.linhas_confinamento;

CREATE POLICY "Authenticated select linhas_confinamento"
  ON public.linhas_confinamento FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated insert linhas_confinamento"
  ON public.linhas_confinamento FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update linhas_confinamento"
  ON public.linhas_confinamento FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Authenticated delete linhas_confinamento"
  ON public.linhas_confinamento FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

-- 5. Índice por fazenda
CREATE INDEX IF NOT EXISTS idx_linhas_confinamento_fazenda_id
  ON public.linhas_confinamento(fazenda_id);

CREATE INDEX IF NOT EXISTS idx_currais_linha_id
  ON public.currais(linha_id);
;
