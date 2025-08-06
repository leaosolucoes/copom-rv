-- Corrigir políticas RLS para configuracao_audiencias
DROP POLICY IF EXISTS "Admins can manage audiencias config" ON public.configuracao_audiencias;

-- Criar política mais específica para super admins
CREATE POLICY "Super admins can manage audiencias config" 
ON public.configuracao_audiencias FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Corrigir também a política da tabela audiencias para ser mais específica
DROP POLICY IF EXISTS "Users can manage own audiencias" ON public.audiencias;

CREATE POLICY "Super admins can manage all audiencias" 
ON public.audiencias FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
);

CREATE POLICY "Users can manage own audiencias" 
ON public.audiencias FOR ALL 
USING (
  user_id = auth.uid() OR 
  criado_por = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  )
)
WITH CHECK (
  user_id = auth.uid() OR 
  criado_por = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  )
);