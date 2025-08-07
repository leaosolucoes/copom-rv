-- Corrigir política de SELECT para evitar recursão infinita e permitir acesso público
DROP POLICY IF EXISTS "Users can view oficios" ON storage.objects;

-- Política simplificada para visualização pública de ofícios
CREATE POLICY "Public can view oficios" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'oficios-audiencias');