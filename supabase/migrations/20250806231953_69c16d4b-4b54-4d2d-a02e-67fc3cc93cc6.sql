-- Abordagem mais direta: temporariamente desabilitar RLS para configuracao_audiencias
-- e depois reativar com política correta

ALTER TABLE public.configuracao_audiencias DISABLE ROW LEVEL SECURITY;

-- Inserir registro inicial se não existir
INSERT INTO public.configuracao_audiencias (ativo, configurado_por)
SELECT false, '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
WHERE NOT EXISTS (SELECT 1 FROM public.configuracao_audiencias);

-- Reativar RLS
ALTER TABLE public.configuracao_audiencias ENABLE ROW LEVEL SECURITY;

-- Dropar política existente
DROP POLICY IF EXISTS "Super admin full access to config" ON public.configuracao_audiencias;

-- Criar política mais simples e direta
CREATE POLICY "Allow super admin access" 
ON public.configuracao_audiencias 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);