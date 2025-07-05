-- Deletar usuário existente se houver
DELETE FROM public.users WHERE email = 'admin@sistema.com';

-- Criar usuário super admin com senha conhecida
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
  '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid,
  'admin@sistema.com',
  'Administrador do Sistema',
  public.hash_password('admin123'),
  'super_admin',
  true,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  updated_at = now();