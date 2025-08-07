-- Remove políticas temporárias conflitantes se existirem
DROP POLICY IF EXISTS "Temporary permissive policy for viaturas" ON public.viaturas;

-- Garante que as políticas corretas estão em vigor
DROP POLICY IF EXISTS "Super admin pode gerenciar todas as viaturas" ON public.viaturas;
DROP POLICY IF EXISTS "Fiscais podem ver viaturas ativas" ON public.viaturas;

-- Recria as políticas com nomes únicos e claros
CREATE POLICY "super_admin_viaturas_management" ON public.viaturas
FOR ALL TO authenticated
USING (is_current_user_super_admin_safe())
WITH CHECK (is_current_user_super_admin_safe());

CREATE POLICY "fiscais_view_active_viaturas" ON public.viaturas
FOR SELECT TO authenticated
USING (ativa = true AND is_current_user_fiscal());

-- Garante que RLS está habilitado
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;