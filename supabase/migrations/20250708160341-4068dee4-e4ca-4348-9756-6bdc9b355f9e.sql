-- Criar função de verificação para fiscais
CREATE OR REPLACE FUNCTION public.is_current_user_fiscal()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'fiscal' 
    AND is_active = true
  );
END;
$function$