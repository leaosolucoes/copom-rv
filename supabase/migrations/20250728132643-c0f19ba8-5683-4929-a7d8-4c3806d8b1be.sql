-- Corrigir política RLS para permitir que atendentes atualizem denúncias
DROP POLICY IF EXISTS "Attendants can update complaints" ON public.complaints;

CREATE POLICY "Attendants can update complaints" 
ON public.complaints 
FOR UPDATE 
USING (
  -- Super admin pode atualizar qualquer denúncia
  is_current_user_super_admin_custom() OR
  -- Admin pode atualizar qualquer denúncia
  is_current_user_admin_custom() OR
  -- Atendente pode atualizar denúncias que estão atribuídas a ele ou sem atribuição
  (
    is_current_user_atendente() AND 
    (
      attendant_id = COALESCE(auth.uid(), (current_setting('app.current_user_id', true))::uuid) OR 
      attendant_id IS NULL
    )
  )
) 
WITH CHECK (
  -- Super admin pode atualizar qualquer denúncia
  is_current_user_super_admin_custom() OR
  -- Admin pode atualizar qualquer denúncia  
  is_current_user_admin_custom() OR
  -- Atendente pode atualizar denúncias
  is_current_user_atendente()
);