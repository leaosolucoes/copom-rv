-- Remover políticas existentes problemáticas
DROP POLICY IF EXISTS "Super admins can manage all audiencias" ON public.audiencias;
DROP POLICY IF EXISTS "Users can manage own audiencias" ON public.audiencias;

-- Política temporária mais permissiva para permitir inserção
CREATE POLICY "Allow authenticated users to manage audiencias" 
ON public.audiencias 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);