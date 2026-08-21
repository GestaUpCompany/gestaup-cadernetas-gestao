-- Grant SELECT and INSERT to anon role
GRANT SELECT ON public.registros_clima TO anon;
GRANT INSERT ON public.registros_clima TO anon;
GRANT UPDATE ON public.registros_clima TO anon;
GRANT DELETE ON public.registros_clima TO anon;

-- Also grant to authenticated role
GRANT SELECT ON public.registros_clima TO authenticated;
GRANT INSERT ON public.registros_clima TO authenticated;
GRANT UPDATE ON public.registros_clima TO authenticated;
GRANT DELETE ON public.registros_clima TO authenticated;;
