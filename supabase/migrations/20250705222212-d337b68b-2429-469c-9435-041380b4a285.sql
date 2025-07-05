-- CORREÇÃO CRÍTICA: Criar usuário super admin na tabela auth.users do Supabase
-- para funcionar com o novo sistema de autenticação

-- Inserir usuário super admin na tabela auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'superadmin@rioverde',
  crypt('19Cpt412014@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Administrator","role":"super_admin"}',
  true,
  'authenticated'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = now(),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Inserir identidade para o usuário
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
) VALUES (
  '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid,
  '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid,
  jsonb_build_object(
    'sub', '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::text,
    'email', 'superadmin@rioverde'
  ),
  'email',
  now(),
  now()
) ON CONFLICT (provider, id) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = now();

-- Atualizar a tabela public.users para sincronizar com auth.users
UPDATE public.users 
SET 
  email = 'superadmin@rioverde',
  updated_at = now()
WHERE id = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid;