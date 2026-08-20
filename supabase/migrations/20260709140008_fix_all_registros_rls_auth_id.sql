DO $$
DECLARE
  tabela text;
BEGIN
  FOR tabela IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'registros_%'
      AND tablename NOT IN ('registros_maternidade')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Users can view farm %I records" ON public.%I;',
      tabela, tabela
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "Users can manage farm %I records" ON public.%I;',
      tabela, tabela
    );

    EXECUTE format(
      $sql$
      CREATE POLICY "Users can view farm %I records"
        ON public.%I
        FOR SELECT
        TO authenticated
        USING (
          fazenda_id IN (
            SELECT uf.fazenda_id
            FROM public.usuario_fazenda uf
            JOIN public.usuarios u ON u.id = uf.usuario_id
            WHERE u.auth_id = auth.uid() AND uf.ativo = true
          )
        );
      $sql$,
      tabela, tabela
    );

    EXECUTE format(
      $sql$
      CREATE POLICY "Users can manage farm %I records"
        ON public.%I
        FOR ALL
        TO authenticated
        USING (
          fazenda_id IN (
            SELECT uf.fazenda_id
            FROM public.usuario_fazenda uf
            JOIN public.usuarios u ON u.id = uf.usuario_id
            WHERE u.auth_id = auth.uid() AND uf.ativo = true
          )
        )
        WITH CHECK (
          fazenda_id IN (
            SELECT uf.fazenda_id
            FROM public.usuario_fazenda uf
            JOIN public.usuarios u ON u.id = uf.usuario_id
            WHERE u.auth_id = auth.uid() AND uf.ativo = true
          )
        );
      $sql$,
      tabela, tabela
    );
  END LOOP;
END $$;;
