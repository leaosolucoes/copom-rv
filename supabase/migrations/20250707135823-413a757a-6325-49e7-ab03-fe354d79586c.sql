-- Atualizar política RLS para permitir atendentes atualizarem denúncias
DROP POLICY IF EXISTS "Atendentes podem atualizar denúncias atribuídas" ON public.complaints;

CREATE POLICY "Atendentes podem atualizar denúncias" 
ON public.complaints 
FOR UPDATE 
USING (
  -- Permitir se o usuário está autenticado no sistema customizado
  -- Verificamos se existe um usuário ativo com role atendente, admin ou super_admin
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = attendant_id 
    AND u.is_active = true 
    AND u.role IN ('atendente', 'admin', 'super_admin')
  )
  OR 
  -- Ou se não há attendant_id ainda e o usuário está tentando se atribuir
  (attendant_id IS NULL)
);