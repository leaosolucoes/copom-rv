-- Criar função security definer para verificar se é atendente
CREATE OR REPLACE FUNCTION public.is_current_user_atendente()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'atendente' 
    AND is_active = true
  );
END;
$$;

-- Criar função para verificar se é admin ou super admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin') 
    AND is_active = true
  );
END;
$$;

-- Remover política atual
DROP POLICY IF EXISTS "Complaints access by role" ON public.complaints;

-- Criar nova política usando as funções security definer
CREATE POLICY "Complaints access by role" ON public.complaints
FOR SELECT USING (
  -- Se for admin ou super admin, pode ver tudo
  public.is_current_user_admin_or_super_admin() 
  OR 
  -- Se for atendente, não pode ver 'a_verificar' nem 'finalizada'
  (public.is_current_user_atendente() AND status NOT IN ('a_verificar', 'finalizada'))
  OR
  -- Acesso público (não logado)
  (auth.uid() IS NULL)
);