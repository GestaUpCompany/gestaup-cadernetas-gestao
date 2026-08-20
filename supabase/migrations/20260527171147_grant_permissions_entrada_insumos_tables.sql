-- Grant permissions on entrada_insumos_itens table (uses UUID, no sequence)
GRANT ALL ON TABLE public.entrada_insumos_itens TO authenticated;

-- Grant permissions on registros_entrada_insumos table (uses UUID, no sequence)
GRANT ALL ON TABLE public.registros_entrada_insumos TO authenticated;;
