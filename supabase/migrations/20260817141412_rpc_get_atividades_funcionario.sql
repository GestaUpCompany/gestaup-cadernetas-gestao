CREATE OR REPLACE FUNCTION get_atividades_funcionario(
  p_fazenda_id uuid,
  p_funcionario_id uuid
)
RETURNS TABLE (
  id uuid,
  atividade_id uuid,
  status_individual text,
  inicio_at timestamptz,
  fim_at timestamptz,
  detalhamento text,
  tempo_gasto_segundos int,
  titulo text,
  descricao text,
  data_inicio date,
  data_fim date,
  prioridade int,
  status text,
  setor_nome text,
  equipe_nome text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    af.id,
    af.atividade_id,
    af.status_individual,
    af.inicio_at,
    af.fim_at,
    af.detalhamento,
    af.tempo_gasto_segundos,
    a.titulo,
    a.descricao,
    a.data_inicio,
    a.data_fim,
    a.prioridade,
    a.status,
    s.nome AS setor_nome,
    e.nome AS equipe_nome
  FROM atividade_funcionarios af
  JOIN atividades a ON a.id = af.atividade_id
  LEFT JOIN setores s ON s.id = a.setor_id
  LEFT JOIN equipes e ON e.id = a.equipe_id
  WHERE a.fazenda_id = p_fazenda_id
    AND af.funcionario_id = p_funcionario_id
    AND a.deleted_at IS NULL
  ORDER BY a.data_inicio DESC, a.prioridade ASC;
$$;;
