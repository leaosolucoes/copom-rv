-- Remover política restritiva que está bloqueando visualização para atendentes
DROP POLICY IF EXISTS "Hybrid complaints access" ON public.complaints;

-- Criar nova política que permite acesso público para leitura de denúncias
CREATE POLICY "Public read access for complaints" 
ON public.complaints 
FOR SELECT 
USING (true);