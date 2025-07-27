-- FASE 1: PREPARAÇÃO - Funções auxiliares para sistema de autenticação customizado

-- Função para verificar se um usuário está autenticado via sistema customizado
-- Esta função será usada nas políticas RLS para compatibilidade com localStorage auth
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Para consultas públicas (CPF/CNPJ/CEP), permitir acesso sem autenticação
  -- Para outras operações, verificar se há contexto de usuário válido
  RETURN true; -- Temporariamente permissivo durante migração
END;
$$;

-- Função para verificar se usuário atual é super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin_custom()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se o usuário atual é o super admin conhecido
  -- Esta função será atualizada quando implementarmos contexto de sessão
  RETURN auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid OR
         current_setting('app.current_user_id', true) = '7c67cbf3-b43a-40ca-9adf-d78484ce3549';
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Função para verificar se usuário atual tem permissão de admin/super_admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin_custom()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  current_user_id uuid;
BEGIN
  -- Tentar obter ID do usuário do contexto atual
  BEGIN
    current_user_id := coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid);
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  -- Verificar se é o super admin conhecido
  IF current_user_id = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid THEN
    RETURN true;
  END IF;

  -- Verificar role na tabela users
  SELECT role::text INTO user_role
  FROM public.users 
  WHERE id = current_user_id 
    AND is_active = true;

  RETURN user_role IN ('admin', 'super_admin');
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- FASE 2: ATUALIZAÇÃO DAS POLÍTICAS RLS EXISTENTES

-- Remover políticas conflitantes e recriar com compatibilidade customizada

-- Política para tabela users
DROP POLICY IF EXISTS "Hybrid users access" ON public.users;
CREATE POLICY "Custom users access" ON public.users
  FOR ALL
  USING (
    -- Super admin pode ver tudo
    is_current_user_super_admin_custom() OR
    -- Usuários podem ver próprios dados
    id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) OR
    -- Permitir acesso público para autenticação
    true
  )
  WITH CHECK (
    -- Super admin pode modificar tudo
    is_current_user_super_admin_custom() OR
    -- Usuários podem modificar próprios dados
    id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) OR
    -- Permitir criação durante autenticação
    true
  );

-- Política para tabela complaints - manter acesso público para inserção
DROP POLICY IF EXISTS "Public read access for complaints" ON public.complaints;
DROP POLICY IF EXISTS "Denúncias públicas podem ser inseridas" ON public.complaints;
DROP POLICY IF EXISTS "Atendentes podem atualizar denúncias" ON public.complaints;

CREATE POLICY "Public complaints access" ON public.complaints
  FOR SELECT
  USING (true); -- Manter acesso público para leitura

CREATE POLICY "Public complaints insert" ON public.complaints
  FOR INSERT
  WITH CHECK (true); -- Manter acesso público para inserção

CREATE POLICY "Attendants can update complaints" ON public.complaints
  FOR UPDATE
  USING (
    is_current_user_admin_custom() OR
    attendant_id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) OR
    attendant_id IS NULL
  );

-- Política para system_settings
DROP POLICY IF EXISTS "Hybrid settings access" ON public.system_settings;
CREATE POLICY "Custom settings access" ON public.system_settings
  FOR ALL
  USING (
    -- Super admin pode ver tudo
    is_current_user_super_admin_custom() OR
    -- Configurações públicas podem ser vistas por todos
    key ~ '^public_' OR
    key = 'form_fields_config' OR
    -- Usuários autenticados podem ver algumas configurações
    is_authenticated_user()
  )
  WITH CHECK (
    -- Apenas super admin pode modificar
    is_current_user_super_admin_custom() OR
    -- Permitir inserção de configurações de formulário
    key = 'form_fields_config'
  );

-- Política para consultation_audit_logs
DROP POLICY IF EXISTS "Super admin can view all consultation logs" ON public.consultation_audit_logs;
DROP POLICY IF EXISTS "Users can view own consultation logs" ON public.consultation_audit_logs;
DROP POLICY IF EXISTS "System can insert consultation logs" ON public.consultation_audit_logs;

CREATE POLICY "Custom consultation logs access" ON public.consultation_audit_logs
  FOR SELECT
  USING (
    is_current_user_super_admin_custom() OR
    user_id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
  );

CREATE POLICY "System consultation logs insert" ON public.consultation_audit_logs
  FOR INSERT
  WITH CHECK (true); -- Permitir inserção para auditoria

-- FASE 3: HABILITAR RLS GRADUALMENTE

-- Começar com tabelas menos críticas
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabelas críticas - habilitar com cuidado
ALTER TABLE public.consultation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Por último, as mais críticas para funcionalidade
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Manter desabilitado temporariamente para monitoramento
-- ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- FASE 4: LOGGING E MONITORAMENTO

-- Função para log de problemas RLS
CREATE OR REPLACE FUNCTION public.log_rls_issue(
  table_name text,
  operation text,
  error_message text,
  user_context jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    user_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    'RLS_ISSUE',
    table_name,
    null,
    coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid),
    jsonb_build_object('operation', operation, 'error', error_message),
    user_context,
    '127.0.0.1'::inet,
    'RLS_MONITOR'
  );
EXCEPTION WHEN OTHERS THEN
  -- Não falhar se não conseguir logar
  NULL;
END;
$$;

-- Documentação das políticas implementadas
COMMENT ON FUNCTION public.is_current_user_super_admin_custom() IS 'Verifica se usuário atual é super admin - compatível com auth customizado';
COMMENT ON FUNCTION public.is_current_user_admin_custom() IS 'Verifica se usuário atual é admin/super_admin - compatível com auth customizado';
COMMENT ON FUNCTION public.is_authenticated_user() IS 'Verifica se há usuário autenticado - temporariamente permissivo';
COMMENT ON FUNCTION public.log_rls_issue(text, text, text, jsonb) IS 'Registra problemas RLS para monitoramento';