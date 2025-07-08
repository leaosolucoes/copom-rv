-- Criar bucket para mídias das denúncias
INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-media', 'complaint-media', true);

-- Adicionar campos para mídias na tabela complaints
ALTER TABLE public.complaints 
ADD COLUMN photos TEXT[], 
ADD COLUMN videos TEXT[];

-- Criar políticas para o bucket complaint-media
CREATE POLICY "Qualquer um pode fazer upload de mídias" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'complaint-media');

CREATE POLICY "Mídias são públicas para visualização" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'complaint-media');

CREATE POLICY "Admin pode deletar mídias" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'complaint-media' AND (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin') 
    AND is_active = true
  )
));