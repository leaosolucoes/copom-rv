-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Permitir upload de assets por admins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de assets por admins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir remoção de assets por admins" ON storage.objects;

-- Criar políticas menos restritivas para system-assets
CREATE POLICY "Permitir upload de assets por usuários autenticados" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'system-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Permitir atualização de assets por usuários autenticados" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'system-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Permitir remoção de assets por usuários autenticados" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'system-assets' AND auth.uid() IS NOT NULL);