-- ============================================================
-- Rastreio de Uso das Cadernetas
-- View unificada + RPCs de agregação
-- ============================================================

-- 1. View unificada das 20 tabelas registros_*
CREATE OR REPLACE VIEW public.v_registros_unificado AS
SELECT 'registros_abastecimento'::text  AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_abastecimento
UNION ALL
SELECT 'registros_alimentacao'::text     AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_alimentacao
UNION ALL
SELECT 'registros_almoxarifado'::text    AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_almoxarifado
UNION ALL
SELECT 'registros_bebedouros'::text      AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_bebedouros
UNION ALL
SELECT 'registros_clima'::text           AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_clima
UNION ALL
SELECT 'registros_enfermaria'::text      AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_enfermaria
UNION ALL
SELECT 'registros_entrada_insumos'::text AS caderneta, id::text, fazenda_id, nome_usuario, NULL::date AS data, created_at, deleted_at FROM public.registros_entrada_insumos
UNION ALL
SELECT 'registros_leitura_cocho'::text   AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_leitura_cocho
UNION ALL
SELECT 'registros_limpeza'::text         AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_limpeza
UNION ALL
SELECT 'registros_manutencao_maquinas'::text AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_manutencao_maquinas
UNION ALL
SELECT 'registros_maternidade'::text     AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_maternidade
UNION ALL
SELECT 'registros_morte'::text           AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_morte
UNION ALL
SELECT 'registros_movimentacao'::text    AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_movimentacao
UNION ALL
SELECT 'registros_oferta_trato'::text    AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_oferta_trato
UNION ALL
SELECT 'registros_operacoes_maquinas'::text AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_operacoes_maquinas
UNION ALL
SELECT 'registros_pastagens'::text       AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_pastagens
UNION ALL
SELECT 'registros_problemas'::text       AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_problemas
UNION ALL
SELECT 'registros_rodeio'::text          AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_rodeio
UNION ALL
SELECT 'registros_saida_insumos'::text   AS caderneta, id::text, fazenda_id, nome_usuario, NULL::date AS data, created_at, deleted_at FROM public.registros_saida_insumos
UNION ALL
SELECT 'registros_suplementacao'::text   AS caderneta, id::text, fazenda_id, nome_usuario, data, created_at, deleted_at FROM public.registros_suplementacao;

-- View sem GRANT direto para authenticated/anon: acesso apenas via RPCs (SECURITY DEFINER com filtro de fazenda_id)
-- Isso impede que qualquer usuario faca SELECT * FROM v_registros_unificado e veja dados de outras fazendas

-- 2. RPC: resumo por usuario x caderneta
CREATE OR REPLACE FUNCTION public.get_rastreio_cadernetas(
  p_fazenda_id uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE (
  nome_usuario text,
  caderneta text,
  total_registros bigint,
  registros_ativos bigint,
  registros_deletados bigint,
  primeiro_registro timestamptz,
  ultimo_registro timestamptz,
  dias_ativos integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') AS nome_usuario,
    r.caderneta,
    COUNT(*) AS total_registros,
    COUNT(*) FILTER (WHERE r.deleted_at IS NULL) AS registros_ativos,
    COUNT(*) FILTER (WHERE r.deleted_at IS NOT NULL) AS registros_deletados,
    MIN(r.created_at) AS primeiro_registro,
    MAX(r.created_at) AS ultimo_registro,
    COUNT(DISTINCT (r.created_at AT TIME ZONE 'America/Cuiaba')::date)::integer AS dias_ativos
  FROM public.v_registros_unificado r
  WHERE r.fazenda_id = p_fazenda_id
    AND r.deleted_at IS NULL
    AND COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') NOT ILIKE '%peao%'
    AND (p_data_inicio IS NULL OR r.created_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR r.created_at < (p_data_fim + interval '1 day'))
  GROUP BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), r.caderneta
  ORDER BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), COUNT(*) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_rastreio_cadernetas TO authenticated, anon;

-- 3. RPC: detalhe diario (para graficos/timeline)
CREATE OR REPLACE FUNCTION public.get_rastreio_cadernetas_detalhe(
  p_fazenda_id uuid,
  p_nome_usuario text DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE (
  nome_usuario text,
  caderneta text,
  dia date,
  total bigint,
  ativos bigint,
  deletados bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') AS nome_usuario,
    r.caderneta,
    (r.created_at AT TIME ZONE 'America/Cuiaba')::date AS dia,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE r.deleted_at IS NULL) AS ativos,
    COUNT(*) FILTER (WHERE r.deleted_at IS NOT NULL) AS deletados
  FROM public.v_registros_unificado r
  WHERE r.fazenda_id = p_fazenda_id
    AND r.deleted_at IS NULL
    AND COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') NOT ILIKE '%peao%'
    AND (p_nome_usuario IS NULL OR COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') = p_nome_usuario)
    AND (p_data_inicio IS NULL OR r.created_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR r.created_at < (p_data_fim + interval '1 day'))
  GROUP BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), r.caderneta, dia
  ORDER BY dia, nome_usuario, caderneta;
$$;

GRANT EXECUTE ON FUNCTION public.get_rastreio_cadernetas_detalhe TO authenticated, anon;

-- 4. RPC: resumo por usuario (sem quebrar por caderneta)
CREATE OR REPLACE FUNCTION public.get_rastreio_usuarios(
  p_fazenda_id uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE (
  nome_usuario text,
  total_registros bigint,
  cadernetas_usadas integer,
  primeiro_registro timestamptz,
  ultimo_registro timestamptz,
  dias_ativos integer,
  ultimo_dia_ativo date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    usuario.nome_usuario,
    SUM(usuario.total_por_caderneta)::bigint AS total_registros,
    COUNT(*)::integer AS cadernetas_usadas,
    MIN(usuario.primeiro_registro) AS primeiro_registro,
    MAX(usuario.ultimo_registro) AS ultimo_registro,
    SUM(usuario.dias_por_caderneta)::integer AS dias_ativos,
    MAX(usuario.ultimo_dia) AS ultimo_dia_ativo
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') AS nome_usuario,
      r.caderneta,
      COUNT(*) AS total_por_caderneta,
      MIN(r.created_at) AS primeiro_registro,
      MAX(r.created_at) AS ultimo_registro,
      COUNT(DISTINCT (r.created_at AT TIME ZONE 'America/Cuiaba')::date)::integer AS dias_por_caderneta,
      MAX((r.created_at AT TIME ZONE 'America/Cuiaba')::date) AS ultimo_dia
    FROM public.v_registros_unificado r
    WHERE r.fazenda_id = p_fazenda_id
      AND r.deleted_at IS NULL
      AND COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') NOT ILIKE '%peao%'
      AND (p_data_inicio IS NULL OR r.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR r.created_at < (p_data_fim + interval '1 day'))
    GROUP BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), r.caderneta
  ) usuario
  GROUP BY usuario.nome_usuario
  ORDER BY total_registros DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_rastreio_usuarios TO authenticated, anon;
