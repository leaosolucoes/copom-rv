-- Criar bucket para assets do sistema (logos, imagens, etc.)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('system-assets', 'system-assets', true);

-- Criar políticas para permitir uploads e visualização
CREATE POLICY "Qualquer um pode visualizar assets do sistema" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'system-assets');

CREATE POLICY "Super admin pode fazer upload de assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'system-assets' AND
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
);

CREATE POLICY "Super admin pode atualizar assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'system-assets' AND
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
);

CREATE POLICY "Super admin pode deletar assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'system-assets' AND
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
);