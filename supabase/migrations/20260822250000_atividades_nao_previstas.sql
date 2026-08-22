-- Adiciona flag para atividades nao previstas (registradas pelo peao no PWA)
-- Atividades nao previstas sao criadas e iniciadas pelo peao, sem planejamento previo no painel
ALTER TABLE atividades ADD COLUMN IF NOT EXISTS nao_prevista boolean NOT NULL DEFAULT false;

-- Atualiza RPC get_atividades_funcionario para retornar nao_prevista
DROP FUNCTION IF EXISTS get_atividades_funcionario(uuid, uuid);
CREATE FUNCTION get_atividades_funcionario(p_fazenda_id uuid, p_funcionario_id uuid)
RETURNS TABLE(
  id uuid, atividade_id uuid, status_individual text,
  inicio_at timestamp with time zone, fim_at timestamp with time zone,
  detalhamento text, tempo_gasto_segundos integer,
  titulo text, descricao text, local text,
  data_inicio date, data_fim date, prioridade integer,
  status text, nao_prevista boolean, setor_nome text
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT af.id, af.atividade_id, af.status_individual, af.inicio_at, af.fim_at,
         af.detalhamento, af.tempo_gasto_segundos,
         a.titulo, a.descricao, a.local, a.data_inicio, a.data_fim, a.prioridade,
         a.status, a.nao_prevista, s.nome AS setor_nome
  FROM atividade_funcionarios af
  JOIN atividades a ON a.id = af.atividade_id
  LEFT JOIN setores s ON s.id = a.setor_id
  WHERE a.fazenda_id = p_fazenda_id
    AND af.funcionario_id = p_funcionario_id
    AND a.deleted_at IS NULL
  ORDER BY a.data_inicio DESC, a.prioridade ASC;
$$;
