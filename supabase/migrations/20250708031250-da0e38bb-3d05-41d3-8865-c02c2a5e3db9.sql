-- Update RLS policy to exclude 'finalizada' status for attendants
DROP POLICY IF EXISTS "Complaints access by role" ON public.complaints;

CREATE POLICY "Complaints access by role" ON public.complaints
FOR SELECT USING (
  CASE
    -- Super admin and admin can see all complaints
    WHEN (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'admin') 
      AND users.is_active = true
    )) THEN true
    
    -- Attendants cannot see 'a_verificar' or 'finalizada' status
    WHEN (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'atendente' 
      AND users.is_active = true
    )) THEN (status NOT IN ('a_verificar', 'finalizada'))
    
    -- Default case (public access)
    ELSE true
  END
);