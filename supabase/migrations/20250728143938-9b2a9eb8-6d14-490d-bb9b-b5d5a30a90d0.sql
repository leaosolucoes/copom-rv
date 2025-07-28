-- Remover política atual muito restritiva
DROP POLICY IF EXISTS "Usuários autenticados podem acessar configurações" ON public.system_settings;

-- Criar política muito mais permissiva
CREATE POLICY "Acesso total para usuários autenticados" 
ON public.system_settings 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);