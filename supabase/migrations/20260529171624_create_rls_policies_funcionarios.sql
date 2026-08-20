-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read for all authenticated users" ON public.funcionarios;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.funcionarios;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.funcionarios;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON public.funcionarios;

-- Create policy for SELECT (read access)
CREATE POLICY "Funcionários podem ser lidos por usuários autenticados"
ON public.funcionarios
FOR SELECT
TO authenticated
USING (true);

-- Create policy for INSERT
CREATE POLICY "Funcionários podem ser inseridos por usuários autenticados"
ON public.funcionarios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for UPDATE
CREATE POLICY "Funcionários podem ser atualizados por usuários autenticados"
ON public.funcionarios
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for DELETE
CREATE POLICY "Funcionários podem ser deletados por usuários autenticados"
ON public.funcionarios
FOR DELETE
TO authenticated
USING (true);;
