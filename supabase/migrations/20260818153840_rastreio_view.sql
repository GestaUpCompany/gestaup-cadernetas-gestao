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

GRANT SELECT ON public.v_registros_unificado TO authenticated, anon;;
