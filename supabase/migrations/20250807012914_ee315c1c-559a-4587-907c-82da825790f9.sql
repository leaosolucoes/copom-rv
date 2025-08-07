-- Remove a política atual restritiva
DROP POLICY IF EXISTS "Authenticated users can upload oficios" ON storage.objects;

-- Criar política mais permissiva para upload de ofícios
CREATE POLICY "Allow upload of oficios by authenticated users" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'oficios-audiencias' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir que usuários vejam seus próprios arquivos e admins vejam todos
CREATE POLICY "Users can view oficios" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'oficios-audiencias' 
  AND (
    auth.uid() IS NOT NULL 
    OR 
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin') 
      AND is_active = true
    )
  )
);

-- Política para permitir que usuários atualizem seus próprios arquivos
CREATE POLICY "Users can update own oficios" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'oficios-audiencias' 
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin') 
      AND is_active = true
    )
  )
);