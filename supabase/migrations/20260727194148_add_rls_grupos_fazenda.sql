
-- Enable RLS on grupos_fazenda
ALTER TABLE public.grupos_fazenda ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with grupos_fazenda
CREATE POLICY "Admins can manage grupos_fazenda" ON public.grupos_fazenda
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.papel = 'admin'
    )
  );

-- Controllers can read grupos_fazenda (for farm switcher)
CREATE POLICY "Controllers can read grupos_fazenda" ON public.grupos_fazenda
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.papel IN ('admin', 'controller')
    )
  );
;
