ALTER TABLE public.fazendas
ADD COLUMN IF NOT EXISTS tolerancia_rotina_minutos INTEGER DEFAULT 30;

CREATE TABLE IF NOT EXISTS public.execucoes_rotina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  rotina_id UUID REFERENCES public.rotinas(id) ON DELETE SET NULL,
  caderneta_id TEXT NOT NULL,
  data DATE NOT NULL,
  horario_programado TIME,
  primeiro_acesso TIMESTAMPTZ,
  primeiro_registro TIMESTAMPTZ,
  status TEXT CHECK (status IN ('no_horario', 'atrasado', 'antecipado', 'nao_executado', 'dispensado')),
  observacao TEXT,
  concluido BOOLEAN DEFAULT false,
  dispositivo_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.execucoes_rotina ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Controllers veem execucoes da fazenda" ON public.execucoes_rotina;
CREATE POLICY "Controllers veem execucoes da fazenda"
  ON public.execucoes_rotina
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = execucoes_rotina.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Controllers inserem execucoes da fazenda" ON public.execucoes_rotina;
CREATE POLICY "Controllers inserem execucoes da fazenda"
  ON public.execucoes_rotina
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = execucoes_rotina.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
        AND uf.papel = 'controller'
    )
  );

DROP POLICY IF EXISTS "Controllers atualizam execucoes da fazenda" ON public.execucoes_rotina;
CREATE POLICY "Controllers atualizam execucoes da fazenda"
  ON public.execucoes_rotina
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = execucoes_rotina.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
        AND uf.papel = 'controller'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = execucoes_rotina.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
        AND uf.papel = 'controller'
    )
  );

CREATE TABLE IF NOT EXISTS public.execucoes_rotina_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_rotina_id UUID NOT NULL REFERENCES public.execucoes_rotina(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('justificativa', 'dispensa')),
  motivo TEXT NOT NULL,
  dados_anteriores JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.execucoes_rotina_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios da fazenda veem historico" ON public.execucoes_rotina_historico;
CREATE POLICY "Usuarios da fazenda veem historico"
  ON public.execucoes_rotina_historico
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.execucoes_rotina er
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = er.fazenda_id
      WHERE er.id = execucoes_rotina_historico.execucao_rotina_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Controllers inserem historico" ON public.execucoes_rotina_historico;
CREATE POLICY "Controllers inserem historico"
  ON public.execucoes_rotina_historico
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.execucoes_rotina er
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = er.fazenda_id
      WHERE er.id = execucoes_rotina_historico.execucao_rotina_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
        AND uf.papel = 'controller'
    )
  );;
