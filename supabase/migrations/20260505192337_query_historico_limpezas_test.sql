SELECT id, fazenda_id, bebedouro_id, data_limpeza, responsavel, observacao, created_at
FROM public.historico_limpezas_bebedouros
WHERE bebedouro_id = 'd193e00a-bd66-4d93-842f-3360e18d2d2d'
ORDER BY data_limpeza ASC;;
