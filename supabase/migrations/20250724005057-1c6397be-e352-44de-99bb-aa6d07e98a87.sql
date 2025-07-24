-- DESABILITAR RLS EM TODAS AS TABELAS PARA RESOLVER PROBLEMAS DE AUTENTICAÇÃO

-- Desabilitar RLS na tabela users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela system_settings
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela complaints
ALTER TABLE public.complaints DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela api_tokens
ALTER TABLE public.api_tokens DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela api_logs
ALTER TABLE public.api_logs DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela api_rate_limits
ALTER TABLE public.api_rate_limits DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela api_endpoints
ALTER TABLE public.api_endpoints DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela user_roles
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela audit_logs
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela rate_limits
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;