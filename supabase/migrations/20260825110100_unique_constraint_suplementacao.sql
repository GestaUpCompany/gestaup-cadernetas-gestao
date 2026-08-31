-- Unique constraint parcial para prevenir duplicatas em registros_suplementacao
-- Causas das duplicatas identificadas:
-- 1. Duplo clique no botao SALVAR (gap sub-segundo, ja mitigado por useSalvarRegistro guard)
-- 2. Dupla entrada: controller pelo painel web + peao pelo PWA (gap 30-40s)
-- 3. Dois dispositivos PWA salvando os mesmos dados (gap 26-39s)
--
-- A constraint opera no nivel de banco, independente da origem (web/PWA) ou
-- numero de dispositivos. Rejeita o segundo INSERT com a mesma combinacao
-- operacional (fazenda_id, lote_id, formulacao, data) quando deleted_at IS NULL.
--
-- lote_id NULL: COALESCE transforma em UUID sentinel para que NULL != NULL
-- seja tratado como igual (permitindo deteccao de duplicatas sem lote).
--
-- Index parcial (WHERE deleted_at IS NULL): registros soft-deletados nao
-- ocupam espaco na constraint e nao bloqueiam novos INSERTs legitimos.
--
-- Duplicatas existentes foram soft-deletadas antes da criacao do index.

CREATE UNIQUE INDEX IF NOT EXISTS uq_suplementacao_fazenda_lote_formulacao_data
ON registros_suplementacao (
  fazenda_id,
  COALESCE(lote_id, '00000000-0000-0000-0000-000000000000'),
  formulacao,
  data
)
WHERE deleted_at IS NULL;
