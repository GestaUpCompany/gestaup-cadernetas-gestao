-- Tabela de relatorrios publicos com links compartilhaveis
CREATE TABLE IF NOT EXISTS public.relatorios_publicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz,
  ativo boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_relatorios_publicos_fazenda ON public.relatorios_publicos(fazenda_id);
CREATE INDEX idx_relatorios_publicos_ativo ON public.relatorios_publicos(ativo) WHERE ativo = true;

-- RLS: qualquer pessoa com o token (id) pode ler; so o dono pode criar/desativar
ALTER TABLE public.relatorios_publicos ENABLE ROW LEVEL SECURITY;

-- SELECT: publico, mas so se ativo e nao expirado
DROP POLICY IF EXISTS "Public read active reports" ON public.relatorios_publicos;
CREATE POLICY "Public read active reports" ON public.relatorios_publicos
  FOR SELECT
  USING (ativo = true AND (expira_em IS NULL OR expira_em > now()));

-- INSERT/UPDATE/DELETE: so usuarios autenticados da fazenda
DROP POLICY IF EXISTS "Manage own reports" ON public.relatorios_publicos;
CREATE POLICY "Manage own reports" ON public.relatorios_publicos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuario_fazenda uf
      JOIN usuarios u ON uf.usuario_id = u.id
      WHERE u.auth_id = auth.uid()
        AND uf.fazenda_id = relatorios_publicos.fazenda_id
        AND uf.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_fazenda uf
      JOIN usuarios u ON uf.usuario_id = u.id
      WHERE u.auth_id = auth.uid()
        AND uf.fazenda_id = relatorios_publicos.fazenda_id
        AND uf.ativo = true
    )
  );

-- RPC: get_dados_relatorio_abastecimento
-- Retorna dados agregados de abastecimento filtrados por token + intervalo de data
CREATE OR REPLACE FUNCTION public.get_dados_relatorio_abastecimento(
  p_token uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fazenda_id uuid;
  v_ativo boolean;
  v_expira timestamptz;
  v_query text;
BEGIN
  -- Validar token
  SELECT fazenda_id, ativo, expira_em INTO v_fazenda_id, v_ativo, v_expira
  FROM relatorios_publicos
  WHERE id = p_token AND tipo = 'abastecimento';

  IF NOT FOUND OR v_ativo = false OR (v_expira IS NOT NULL AND v_expira < now()) THEN
    RAISE EXCEPTION 'Token invalido ou expirado';
  END IF;

  -- Construir query com filtros opcionais de data
  v_query := format(
    'SELECT
      jsonb_build_object(
        ''por_maquina'', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            ''label'', maquina_veiculo,
            ''valor'', SUM(total_abastecido)
          )) FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL
            AND ($2::date IS NULL OR data::date >= $2)
            AND ($3::date IS NULL OR data::date <= $3)
          GROUP BY maquina_veiculo ORDER BY SUM(total_abastecido) DESC
        ), ''[]''::jsonb),
        ''por_combustivel'', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            ''label'', combustivel,
            ''valor'', SUM(total_abastecido)
          )) FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL
            AND ($2::date IS NULL OR data::date >= $2)
            AND ($3::date IS NULL OR data::date <= $3)
          GROUP BY combustivel ORDER BY SUM(total_abastecido) DESC
        ), ''[]''::jsonb),
        ''por_operacao'', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            ''label'', COALESCE(NULLIF(tipo_operacao, ''''), tipo_operacao_outros, ''Nao informado''),
            ''valor'', SUM(total_abastecido)
          )) FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL
            AND ($2::date IS NULL OR data::date >= $2)
            AND ($3::date IS NULL OR data::date <= $3)
          GROUP BY COALESCE(NULLIF(tipo_operacao, ''''), tipo_operacao_outros, ''Nao informado'')
          ORDER BY SUM(total_abastecido) DESC
        ), ''[]''::jsonb),
        ''maquinas_disponiveis'', COALESCE((
          SELECT jsonb_agg(DISTINCT maquina_veiculo) FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL AND maquina_veiculo IS NOT NULL AND maquina_veiculo <> ''''
        ), ''[]''::jsonb),
        ''combustiveis_disponiveis'', COALESCE((
          SELECT jsonb_agg(DISTINCT combustivel) FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL AND combustivel IS NOT NULL AND combustivel <> ''''
        ), ''[]''::jsonb),
        ''operacoes_disponiveis'', COALESCE((
          SELECT jsonb_agg(DISTINCT COALESCE(NULLIF(tipo_operacao, ''''), tipo_operacao_outros, ''Nao informado''))
          FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL
        ), ''[]''::jsonb),
        ''total_litros'', COALESCE((
          SELECT SUM(total_abastecido) FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL
            AND ($2::date IS NULL OR data::date >= $2)
            AND ($3::date IS NULL OR data::date <= $3)
        ), 0),
        ''total_registros'', COALESCE((
          SELECT COUNT(*) FROM registros_abastecimento
          WHERE fazenda_id = $1 AND deleted_at IS NULL
            AND ($2::date IS NULL OR data::date >= $2)
            AND ($3::date IS NULL OR data::date <= $3)
        ), 0)
      )'
  );

  RETURN jsonb_build_object(
    'fazenda_id', v_fazenda_id,
    'dados', execute_query(v_query, v_fazenda_id, p_data_inicio, p_data_fim)
  );
END;
$$;;
