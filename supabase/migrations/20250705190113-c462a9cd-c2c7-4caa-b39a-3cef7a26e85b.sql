-- Create a robust user management function that bypasses RLS completely
CREATE OR REPLACE FUNCTION public.create_user_secure(
  p_email text,
  p_full_name text,
  p_password text,
  p_role text DEFAULT 'atendente',
  p_is_active boolean DEFAULT true,
  p_requester_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  hashed_password text;
  result json;
BEGIN
  -- Check if requester is super admin (direct check without RLS)
  IF p_requester_id != '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid THEN
    RETURN json_build_object('error', 'Access denied: Only super admin can create users');
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RETURN json_build_object('error', 'Email already exists');
  END IF;

  -- Hash the password
  SELECT public.hash_password(p_password) INTO hashed_password;
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Insert the new user (bypassing RLS due to SECURITY DEFINER)
  INSERT INTO public.users (
    id,
    email,
    full_name,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    p_full_name,
    hashed_password,
    p_role::user_role,
    p_is_active,
    now(),
    now()
  );
  
  -- Return success with user data
  result := json_build_object(
    'success', true,
    'user', json_build_object(
      'id', new_user_id,
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role,
      'is_active', p_is_active
    )
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Create function for updating users
CREATE OR REPLACE FUNCTION public.update_user_secure(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_password text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_requester_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_password text;
  result json;
BEGIN
  -- Check if requester is super admin
  IF p_requester_id != '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid THEN
    RETURN json_build_object('error', 'Access denied: Only super admin can update users');
  END IF;

  -- Hash password if provided
  IF p_password IS NOT NULL AND p_password != '' THEN
    SELECT public.hash_password(p_password) INTO hashed_password;
  END IF;
  
  -- Update the user
  UPDATE public.users SET
    email = p_email,
    full_name = p_full_name,
    password_hash = COALESCE(hashed_password, password_hash),
    role = COALESCE(p_role::user_role, role),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Create function for getting all users
CREATE OR REPLACE FUNCTION public.get_users_secure(
  p_requester_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if requester is super admin
  IF p_requester_id != '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'email', email,
      'full_name', full_name,
      'role', role,
      'is_active', is_active,
      'created_at', created_at,
      'last_login', last_login
    ) ORDER BY created_at DESC
  ) INTO result
  FROM public.users;
  
  RETURN json_build_object('success', true, 'users', COALESCE(result, '[]'::json));
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;