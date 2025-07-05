-- Corrigir políticas RLS para permitir que usuários sejam listados corretamente
-- Dropar políticas conflitantes
DROP POLICY IF EXISTS "Flexible users access" ON public.users;
DROP POLICY IF EXISTS "Super admin can select all users" ON public.users;
DROP POLICY IF EXISTS "Super admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Super admin can update users" ON public.users;
DROP POLICY IF EXISTS "Super admin can delete users" ON public.users;

-- Criar políticas mais simples e funcionais
CREATE POLICY "Super admin can view all users" 
ON public.users 
FOR SELECT 
USING (
  -- Super admin pode ver todos os usuários
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
    AND u.is_active = true
  ) OR
  -- Ou é o próprio usuário
  id = auth.uid()
);

CREATE POLICY "Super admin can insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
    AND u.is_active = true
  )
);

CREATE POLICY "Super admin can update users" 
ON public.users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
    AND u.is_active = true
  )
);

CREATE POLICY "Super admin can delete users" 
ON public.users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
    AND u.is_active = true
  )
);