-- Corrigir a política RLS para atendentes
DROP POLICY IF EXISTS "Attendants can update complaints" ON public.complaints;

CREATE POLICY "Attendants can update complaints" 
ON public.complaints 
FOR UPDATE 
USING (
  -- Super admin pode atualizar qualquer denúncia
  is_current_user_super_admin_custom() OR
  -- Admin pode atualizar qualquer denúncia
  is_current_user_admin_custom() OR
  -- Atendente autenticado pode atualizar denúncias
  (auth.uid() IS NOT NULL AND is_current_user_atendente())
) 
WITH CHECK (
  -- Super admin pode atualizar qualquer denúncia
  is_current_user_super_admin_custom() OR
  -- Admin pode atualizar qualquer denúncia  
  is_current_user_admin_custom() OR
  -- Atendente autenticado pode atualizar denúncias
  (auth.uid() IS NOT NULL AND is_current_user_atendente())
);