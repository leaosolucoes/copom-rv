-- Verificar e corrigir o problema da tabela configuracao_audiencias
-- Primeiro, vamos dropar as políticas existentes e recriar de forma mais simples

DROP POLICY IF EXISTS "Super admins can manage audiencias config" ON public.configuracao_audiencias;

-- Criar política simples que permite acesso total para super admins
CREATE POLICY "Super admin full access to config" 
ON public.configuracao_audiencias FOR ALL 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Vamos também verificar se há algum registro existente que pode estar causando conflito
-- e inserir um registro inicial se não existir
INSERT INTO public.configuracao_audiencias (ativo, configurado_por)
SELECT false, auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.configuracao_audiencias)
AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin');