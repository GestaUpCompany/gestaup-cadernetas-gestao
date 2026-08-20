-- Grants para todas as tabelas novas do modulo de atividades
GRANT SELECT, INSERT, UPDATE, DELETE ON equipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON atividades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON atividade_funcionarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prioridades_atividades TO authenticated;

-- Tambem para anon (caso algum endpoint publico seja usado no futuro)
GRANT SELECT ON equipes TO anon;
GRANT SELECT ON atividades TO anon;
GRANT SELECT ON atividade_funcionarios TO anon;
GRANT SELECT ON prioridades_atividades TO anon;

-- Sequencias (para INSERT com gen_random_uuid nao precisa, mas por precaucao)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Executar a funcao RPC
GRANT EXECUTE ON FUNCTION get_atividades_funcionario(uuid, uuid) TO authenticated;

-- Garantir seed das prioridades para todas as fazendas (idempotente)
INSERT INTO prioridades_atividades (fazenda_id, nivel, nome)
SELECT f.id, n.nivel, n.nome
FROM fazendas f
CROSS JOIN (VALUES 
  (1, 'Urgente'), 
  (2, 'Importante'), 
  (3, 'Planejada')
) AS n(nivel, nome)
WHERE NOT EXISTS (
  SELECT 1 FROM prioridades_atividades pa 
  WHERE pa.fazenda_id = f.id AND pa.nivel = n.nivel
)
ON CONFLICT (fazenda_id, nivel) DO UPDATE SET nome = EXCLUDED.nome;;
