-- Remover a política antiga que exige autenticação
DROP POLICY IF EXISTS "Authenticated can upload complaint media" ON storage.objects;

-- Criar nova política que permite upload público no bucket complaint-media
CREATE POLICY "Public can upload complaint media"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'complaint-media');

-- Criar política para atualizar arquivos (necessário para alguns uploads)
CREATE POLICY "Public can update complaint media"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'complaint-media')
WITH CHECK (bucket_id = 'complaint-media');

-- Criar política para deletar (caso seja necessário)
CREATE POLICY "Public can delete complaint media"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'complaint-media');