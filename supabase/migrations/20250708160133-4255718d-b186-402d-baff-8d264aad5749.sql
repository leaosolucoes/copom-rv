-- Adicionar o novo role 'fiscal' aos enums existentes
ALTER TYPE public.user_role ADD VALUE 'fiscal';
ALTER TYPE public.app_role ADD VALUE 'fiscal';

-- Atualizar as funções de verificação de permissão para incluir fiscais
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

-- Atualizar a função de verificação de permissões para incluir fiscais nas operações de consulta
CREATE OR REPLACE FUNCTION public.is_current_user_authorized()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('fiscal', 'atendente', 'admin', 'super_admin') 
    AND is_active = true
  );
END;
$function$