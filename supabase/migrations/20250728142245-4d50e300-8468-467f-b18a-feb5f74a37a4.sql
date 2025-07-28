-- Verificar se o bucket system-assets existe
SELECT * FROM storage.buckets WHERE id = 'system-assets';

-- Se não existir, criar o bucket system-assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para permitir upload e acesso aos arquivos
CREATE POLICY IF NOT EXISTS "Permitir acesso público aos assets do sistema" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'system-assets');

CREATE POLICY IF NOT EXISTS "Permitir upload de assets por admins" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'system-assets' AND public.is_admin_or_super_admin());

CREATE POLICY IF NOT EXISTS "Permitir atualização de assets por admins" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'system-assets' AND public.is_admin_or_super_admin());

CREATE POLICY IF NOT EXISTS "Permitir remoção de assets por admins" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'system-assets' AND public.is_admin_or_super_admin());