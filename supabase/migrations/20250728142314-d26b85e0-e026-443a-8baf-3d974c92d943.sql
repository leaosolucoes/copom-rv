-- Criar o bucket system-assets se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Permitir acesso público aos assets do sistema" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de assets por admins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de assets por admins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir remoção de assets por admins" ON storage.objects;

-- Criar políticas para permitir upload e acesso aos arquivos
CREATE POLICY "Permitir acesso público aos assets do sistema" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'system-assets');

CREATE POLICY "Permitir upload de assets por admins" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'system-assets' AND public.is_admin_or_super_admin());

CREATE POLICY "Permitir atualização de assets por admins" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'system-assets' AND public.is_admin_or_super_admin());

CREATE POLICY "Permitir remoção de assets por admins" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'system-assets' AND public.is_admin_or_super_admin());