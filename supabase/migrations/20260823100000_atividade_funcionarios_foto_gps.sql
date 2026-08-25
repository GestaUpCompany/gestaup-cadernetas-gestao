-- Adiciona campos de foto e geolocalizacao na conclusao de atividades
-- foto_url: URL publica da foto no Storage (bucket fotos-atividades)
-- latitude, longitude, gps_accuracy: coordenadas capturadas no momento da conclusao

ALTER TABLE atividade_funcionarios
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS gps_accuracy double precision;

-- Bucket para fotos de conclusao de atividades
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-atividades', 'fotos-atividades', true) ON CONFLICT (id) DO NOTHING;

-- RLS: usuarios autenticados podem fazer upload/update/delete
-- Leitura publica para o relatorio publico de atividades poder exibir as fotos
CREATE POLICY "fotos-atividades-read-public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'fotos-atividades');

CREATE POLICY "fotos-atividades-upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-atividades');

CREATE POLICY "fotos-atividades-update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-atividades')
  WITH CHECK (bucket_id = 'fotos-atividades');

CREATE POLICY "fotos-atividades-delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-atividades');

-- Atualiza RPC get_atividades_funcionario para retornar foto_url, latitude, longitude, gps_accuracy
DROP FUNCTION IF EXISTS public.get_atividades_funcionario(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_atividades_funcionario(p_fazenda_id uuid, p_funcionario_id uuid)
RETURNS TABLE(
  id uuid,
  atividade_id uuid,
  status_individual text,
  inicio_at timestamp with time zone,
  fim_at timestamp with time zone,
  detalhamento text,
  tempo_gasto_segundos integer,
  titulo text,
  descricao text,
  local text,
  data_inicio date,
  data_fim date,
  prioridade integer,
  status text,
  nao_prevista boolean,
  setor_nome text,
  foto_url text,
  latitude double precision,
  longitude double precision,
  gps_accuracy double precision
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT
    af.id, af.atividade_id, af.status_individual, af.inicio_at, af.fim_at,
    af.detalhamento, af.tempo_gasto_segundos,
    a.titulo, a.descricao, a.local, a.data_inicio, a.data_fim,
    a.prioridade, a.status, a.nao_prevista,
    s.nome AS setor_nome,
    af.foto_url, af.latitude, af.longitude, af.gps_accuracy
  FROM atividade_funcionarios af
  JOIN atividades a ON a.id = af.atividade_id
  LEFT JOIN setores s ON s.id = a.setor_id
  WHERE a.fazenda_id = p_fazenda_id
    AND af.funcionario_id = p_funcionario_id
    AND a.deleted_at IS NULL
  ORDER BY a.data_inicio DESC, a.prioridade ASC;
$function$;
