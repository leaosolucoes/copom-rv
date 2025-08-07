-- Remover política atual que ainda pode estar restritiva
DROP POLICY IF EXISTS "Allow authenticated users to manage audiencias" ON public.audiencias;

-- Política super permissiva temporária - permite todos os acessos
CREATE POLICY "Temporary permissive policy for audiencias" 
ON public.audiencias 
FOR ALL 
USING (true)
WITH CHECK (true);