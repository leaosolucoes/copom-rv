-- Criar função authenticate_user para autenticação customizada
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  password_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role::TEXT,
    u.active,
    public.verify_password(p_password, u.password_hash) as password_valid
  FROM public.users u
  WHERE u.email = p_email 
    AND u.active = true;
END;
$$;