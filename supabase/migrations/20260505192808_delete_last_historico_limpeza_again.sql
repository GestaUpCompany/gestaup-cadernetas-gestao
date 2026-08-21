DELETE FROM public.historico_limpezas_bebedouros
WHERE bebedouro_id = 'd193e00a-bd66-4d93-842f-3360e18d2d2d'
AND data_limpeza = (SELECT data_limpeza FROM public.historico_limpezas_bebedouros WHERE bebedouro_id = 'd193e00a-bd66-4d93-842f-3360e18d2d2d' ORDER BY data_limpeza DESC LIMIT 1);;
