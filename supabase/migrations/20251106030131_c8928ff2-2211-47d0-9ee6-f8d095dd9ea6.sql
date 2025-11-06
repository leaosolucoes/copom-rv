-- Atualizar a função create_user_secure para incluir o parâmetro p_is_active
CREATE OR REPLACE FUNCTION public.create_user_secure(
  p_email text, 
  p_full_name text, 
  p_password text, 
  p_role text DEFAULT 'atendente'::text,
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN json_build_object('error', 'Email já cadastrado');
  END IF;
  
  -- Inserir usuário
  INSERT INTO users (email, full_name, password_hash, role, active)
  VALUES (
    p_email,
    p_full_name,
    public.hash_password(p_password),
    p_role::user_role,
    p_is_active
  )
  RETURNING id INTO v_user_id;
  
  -- Retornar dados do usuário
  SELECT json_build_object(
    'success', true,
    'user', json_build_object(
      'id', id,
      'email', email,
      'full_name', full_name,
      'role', role::TEXT,
      'active', active
    )
  ) INTO v_result
  FROM users
  WHERE id = v_user_id;
  
  RETURN v_result;
END;
$function$;