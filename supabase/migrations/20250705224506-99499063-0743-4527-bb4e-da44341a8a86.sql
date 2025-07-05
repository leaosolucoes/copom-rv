-- Ajustar políticas para funcionar com sistema de autenticação customizado
-- Remover políticas restritivas anteriores
DROP POLICY IF EXISTS "Super admin pode fazer upload de assets" ON storage.objects;
DROP POLICY IF EXISTS "Super admin pode atualizar assets" ON storage.objects;
DROP POLICY IF EXISTS "Super admin pode deletar assets" ON storage.objects;

-- Criar políticas mais permissivas para uploads de sistema durante transição
CREATE POLICY "Permite upload de assets do sistema" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'system-assets');

CREATE POLICY "Permite atualização de assets do sistema" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'system-assets');

CREATE POLICY "Permite remoção de assets do sistema" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'system-assets');