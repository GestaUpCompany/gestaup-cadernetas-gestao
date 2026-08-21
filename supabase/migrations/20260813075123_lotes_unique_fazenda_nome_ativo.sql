CREATE UNIQUE INDEX lotes_unique_fazenda_nome_ativo ON lotes (fazenda_id, nome) WHERE ativo = true;;
