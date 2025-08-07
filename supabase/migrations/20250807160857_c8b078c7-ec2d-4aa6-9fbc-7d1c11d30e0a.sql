-- Remover políticas existentes para viaturas
DROP POLICY IF EXISTS "Super admin pode gerenciar viaturas" ON public.viaturas;
DROP POLICY IF EXISTS "Fiscais podem ver viaturas ativas" ON public.viaturas;

-- Criar políticas mais permissivas para viaturas
CREATE POLICY "Super admin total access on viaturas" 
ON public.viaturas 
FOR ALL 
USING (
  -- Verificação mais robusta para super admin
  coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
  OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'super_admin' 
    AND is_active = true
  )
)
WITH CHECK (
  -- Mesma verificação para WITH CHECK
  coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
  OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Política para fiscais verem viaturas ativas
CREATE POLICY "Fiscais podem ver viaturas ativas" 
ON public.viaturas 
FOR SELECT 
USING (
  ativa = true 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'fiscal' 
    AND is_active = true
  )
);

-- Ajustar também as políticas de checklist para ser mais robustas
DROP POLICY IF EXISTS "Super admin pode ver todos os checklists" ON public.checklist_viaturas;
DROP POLICY IF EXISTS "Fiscais podem criar próprios checklists" ON public.checklist_viaturas;
DROP POLICY IF EXISTS "Fiscais podem ver próprios checklists" ON public.checklist_viaturas;

-- Políticas melhoradas para checklist_viaturas
CREATE POLICY "Super admin pode ver todos os checklists" 
ON public.checklist_viaturas 
FOR SELECT 
USING (
  coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
  OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Fiscais podem criar próprios checklists" 
ON public.checklist_viaturas 
FOR INSERT 
WITH CHECK (
  fiscal_id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'fiscal' 
    AND is_active = true
  )
);

CREATE POLICY "Fiscais podem ver próprios checklists" 
ON public.checklist_viaturas 
FOR SELECT 
USING (
  fiscal_id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'fiscal' 
    AND is_active = true
  )
);