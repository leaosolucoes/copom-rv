-- Verificar política atual e recriar com mais especificidade
DROP POLICY IF EXISTS "Complaints access by role" ON public.complaints;

-- Recrear política com verificação mais específica
CREATE POLICY "Complaints access by role" ON public.complaints
FOR SELECT USING (
  CASE
    -- Super admin e admin podem ver todas as denúncias
    WHEN (EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'admin') 
      AND users.is_active = true
    )) THEN true
    
    -- Atendentes NÃO podem ver denúncias com status 'a_verificar' ou 'finalizada'
    WHEN (EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'atendente' 
      AND users.is_active = true
    )) THEN (status NOT IN ('a_verificar'::complaint_status, 'finalizada'::complaint_status))
    
    -- Acesso público padrão
    ELSE true
  END
);

-- Force refresh do cache do PostgREST
NOTIFY pgrst, 'reload schema';