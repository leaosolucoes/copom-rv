-- Remover política que pode estar causando conflito
DROP POLICY IF EXISTS "Users can update own oficios" ON storage.objects;

-- Verificar se já existe uma política funcional para upload
-- Se não funcionar, vamos usar a política mais simples possível
DROP POLICY IF EXISTS "Allow upload of oficios by authenticated users" ON storage.objects;

-- Política super simples para upload de ofícios
CREATE POLICY "Simple oficios upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'oficios-audiencias');