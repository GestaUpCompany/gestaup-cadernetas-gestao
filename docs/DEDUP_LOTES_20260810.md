# Dedup de lotes duplicados - 2026-08-10

## Contexto

Bug em `abrirPlanosComAutoSave` (Lotes.tsx) criava lotes duplicados: ao clicar "Criar/Gerenciar Planos" num lote novo, o insert acontecia mas `editingLote` nao era atualizado, fazendo com que um `handleSubmit` posterior criasse um segundo lote com o mesmo nome. Bug corrigido em 2026-08-10 (commit: setEditingLote apos insert em abrirPlanosComAutoSave).

## Acao tomada

Soft delete (`deleted_at = NOW()`) de 13 lotes duplicados em 5 fazendas, selecionados por criterio de desempate:

1. **Lote com menos dados** (0 categorias, 0 planos, sem pasto/destino) excluido em favor do lote completo.
2. **Lote inativo** excluido em favor do ativo (par 13, Grupo Correa JH34).
3. Nos pares causados pelo bug (intervalo < 2min), o segundo lote criado era a duplicata.

## Lotes excluidos (soft delete) - podem ser restaurados com `UPDATE lotes SET deleted_at = NULL WHERE id = '...'`

| # | Fazenda | Lote | ID excluido | Criado em | Motivo | ID mantido |
|---|---|---|---|---|---|---|
| 1 | Fazenda Chibata | LOTE 16 | `3aada96a-a572-48ea-95f3-7c8fa7397afe` | 05/08 14:55 | 0 cats, 0 planos, sem pasto | `632d82ed-7282-48b4-9de8-f17f36bd2e42` |
| 2 | Fazenda Chibata | LOTE 17 | `13f31d98-be08-4208-96e2-3dcf5e2c422e` | 05/08 14:59 | 0 cats, 0 planos | `5f36873e-77fe-4a41-9856-82693493d9d1` |
| 3 | Fazenda Marcon | Lote 116 | `cb4ea05c-07df-43d9-9a7e-4b2ca337217d` | 16/06 13:37 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `bdf0bb1e-f0e7-4545-a525-07ce33d98478` |
| 4 | Fazenda Marcon | Lote 132 | `cc699a73-bffa-4365-a54d-05f59b8c3d91` | 16/06 14:28 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `ce2c892f-3e15-40cf-aa3a-8958d2df66ab` |
| 5 | Fazenda Marcon | Lote 142 | `aedb5db0-b0e2-40d5-bac5-83dd6f3eec83` | 16/06 14:21 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `1afb89fb-dd8d-4996-b322-b01308e04141` |
| 6 | Fazenda Marcon | Lote 143 | `525df4ca-baf1-4cc7-982c-bd334fcd0ca4` | 16/06 14:17 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `fcc88ac8-5270-480e-a092-1db3ec4fb553` |
| 7 | Fazenda Marcon | Lote 146 | `cd49b582-989c-4fc3-b3a1-8576ba57641d` | 16/06 14:39 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `756e47cf-861e-46b0-b8a3-173ce6c60c21` |
| 8 | Fazenda Marcon | Lote 160 | `b649e232-e0d3-4f95-98c2-9babaffc4712` | 16/06 14:19 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `5597afff-b506-4b22-ac41-f1b2a1b76643` |
| 9 | Fazenda Marcon | Lote 161 | `1367daf4-4874-4c2d-97af-35e6954e4f67` | 16/06 14:27 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `50df2e2d-786d-4a58-bbeb-405b4644bda2` |
| 10 | Fazenda Marcon | Lote 162 | `2de030d7-da8e-40e4-a119-82b95e0eb4ab` | 16/06 14:26 | 1 cat s/ peso/form, 0 planos, s/ pasto, s/ destino | `dac37b59-04c7-47db-976c-aaf0ba343465` |
| 11 | Fazenda Transcal | Lote 04 | `05b9c5f4-3e25-4751-adcc-b32c36fef625` | 08/07 17:06 | 0 cats, 0 planos, sem pasto (duplicata do bug) | `259dcba7-b2c6-4be3-ac03-8db8ca5ae398` |
| 12 | GBJ Mirandopolis | Lote 01P | `0a5dc7bc-ca19-48b0-a75e-acf04bbdf9b9` | 28/07 15:59 | 0 cats, 0 planos, sem pasto, sem destino | `cc0c7d2f-0577-451f-bde1-451acb763344` |
| 13 | Grupo Correa | JH34 | `e2a1e53e-34f7-4b0b-bb10-662cff2a84b8` | 07/07 09:19 | Inativo (ativo=false), peso menos evoluído (257.85 vs 261.45) | `e509aa30-a420-46bb-b3b6-762cabbbbf26` |

## Lotes ja excluidos anteriormente (hard delete, nao restauraveis)

| Fazenda | Lote | ID | Quando |
|---|---|---|---|
| Fazenda Brilhante | Lote 1 (Matriz) | `8564fff1-d0b5-4e0c-8c56-63664b2a6f63` | 2026-08-10 (hard delete) |
| Fazenda Brilhante | Lote 1 (Matriz) | `e7beb851-04c4-4fd0-8076-a10f4bf4201b` | 2026-08-10 (hard delete) |

## Proximos passos

- [ ] Confirmar com cada fazenda que o lote mantido esta correto
- [ ] Apos confirmacao, converter soft delete em hard delete: `DELETE FROM lotes WHERE id IN (...) AND deleted_at IS NOT NULL`
- [ ] Para restaurar um lote especifico: `UPDATE lotes SET deleted_at = NULL WHERE id = '...'`
