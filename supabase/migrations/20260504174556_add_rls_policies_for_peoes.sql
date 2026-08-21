-- Pastos
DROP POLICY IF EXISTS "Peões podem ler pastos da sua fazenda" ON pastos;
CREATE POLICY "Peões podem ler pastos da sua fazenda" ON pastos
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Lotes
DROP POLICY IF EXISTS "Peões podem ler lotes da sua fazenda" ON lotes;
CREATE POLICY "Peões podem ler lotes da sua fazenda" ON lotes
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Insumos
DROP POLICY IF EXISTS "Peões podem ler insumos da sua fazenda" ON insumos;
CREATE POLICY "Peões podem ler insumos da sua fazenda" ON insumos
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Mineral
DROP POLICY IF EXISTS "Peões podem ler mineral da sua fazenda" ON mineral;
CREATE POLICY "Peões podem ler mineral da sua fazenda" ON mineral
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Proteinado
DROP POLICY IF EXISTS "Peões podem ler proteinado da sua fazenda" ON proteinado;
CREATE POLICY "Peões podem ler proteinado da sua fazenda" ON proteinado
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Ração
DROP POLICY IF EXISTS "Peões podem ler racao da sua fazenda" ON racao;
CREATE POLICY "Peões podem ler racao da sua fazenda" ON racao
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Dietas
DROP POLICY IF EXISTS "Peões podem ler dietas da sua fazenda" ON dietas;
CREATE POLICY "Peões podem ler dietas da sua fazenda" ON dietas
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Frigorificos
DROP POLICY IF EXISTS "Peões podem ler frigorificos da sua fazenda" ON frigorificos;
CREATE POLICY "Peões podem ler frigorificos da sua fazenda" ON frigorificos
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);;
