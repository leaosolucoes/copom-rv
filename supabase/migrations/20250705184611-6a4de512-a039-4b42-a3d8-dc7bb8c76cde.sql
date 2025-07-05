-- Create a login function that bypasses RLS policies
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_email text,
  p_password text
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role text,
  is_active boolean,
  password_valid boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role::text,
    u.is_active,
    public.verify_password(p_password, u.password_hash) as password_valid
  FROM public.users u
  WHERE u.email = p_email 
    AND u.is_active = true;
END;
$$;