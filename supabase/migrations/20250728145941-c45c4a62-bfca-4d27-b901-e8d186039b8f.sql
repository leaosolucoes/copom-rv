-- Corrigir problemas de segurança detectados pelo linter

-- 1. Habilitar RLS em todas as tabelas que precisam
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Verificar e corrigir possíveis problemas de recursão infinita nas policies
-- Recriar policies que podem estar causando recursão

-- Remover policies problemáticas e recriar corretamente
DROP POLICY IF EXISTS "Custom users access" ON public.users;

-- Criar policy segura para usuários
CREATE POLICY "Safe users access" ON public.users
FOR ALL 
USING (
  -- Super admin pode ver todos
  is_current_user_super_admin_custom() OR 
  -- Usuário pode ver a si mesmo
  id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
)
WITH CHECK (
  -- Super admin pode modificar todos
  is_current_user_super_admin_custom() OR 
  -- Usuário pode modificar a si mesmo
  id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
);