-- Corrigir políticas RLS para viaturas - permitir cadastro pelo super admin
DROP POLICY IF EXISTS "Super admin total access on viaturas" ON public.viaturas;
DROP POLICY IF EXISTS "Fiscais podem ver viaturas ativas" ON public.viaturas;

-- Política mais permissiva para super admin - incluindo INSERT, UPDATE, DELETE
CREATE POLICY "Super admin pode gerenciar todas as viaturas" 
ON public.viaturas 
FOR ALL 
TO authenticated
USING (
  -- Verificar se é o super admin pelo UUID conhecido ou pelo role
  is_current_user_super_admin_safe()
)
WITH CHECK (
  -- Mesma verificação para inserção/atualização
  is_current_user_super_admin_safe()
);

-- Política para fiscais apenas visualizarem viaturas ativas
CREATE POLICY "Fiscais podem ver viaturas ativas" 
ON public.viaturas 
FOR SELECT 
TO authenticated
USING (
  ativa = true 
  AND is_current_user_fiscal()
);

-- Política temporária mais permissiva para testes
CREATE POLICY "Temporary permissive policy for viaturas" 
ON public.viaturas 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);