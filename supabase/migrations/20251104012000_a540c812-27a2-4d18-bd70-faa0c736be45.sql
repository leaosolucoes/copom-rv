-- =====================================================
-- FASE 1: FUNÇÕES RPC CRÍTICAS PARA APIS
-- =====================================================

-- 1. Função para validar tokens de API
CREATE OR REPLACE FUNCTION public.validate_api_token(token_string TEXT)
RETURNS TABLE(
  token_id UUID,
  is_valid BOOLEAN,
  scopes JSONB,
  rate_limit INTEGER,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Buscar token (assumindo que o token está armazenado em hash)
  SELECT 
    id,
    active,
    permissions,
    rate_limit,
    NULL::UUID as user_id -- API tokens não têm user_id associado diretamente
  INTO v_token_record
  FROM api_tokens
  WHERE token = token_string;
  
  -- Se token não encontrado
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      FALSE,
      '[]'::JSONB,
      0,
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Retornar dados do token
  RETURN QUERY SELECT 
    v_token_record.id,
    v_token_record.active,
    v_token_record.permissions,
    v_token_record.rate_limit,
    v_token_record.user_id;
END;
$$;

-- 2. Função para criar usuário seguro via API
CREATE OR REPLACE FUNCTION public.create_user_secure(
  p_email TEXT,
  p_full_name TEXT,
  p_password TEXT,
  p_role TEXT DEFAULT 'atendente'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    true
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
$$;

-- 3. Função para atualizar usuário seguro via API
CREATE OR REPLACE FUNCTION public.update_user_secure(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se usuário existe
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN json_build_object('error', 'Usuário não encontrado');
  END IF;
  
  -- Atualizar usuário (apenas campos não nulos)
  UPDATE users SET
    email = COALESCE(p_email, email),
    full_name = COALESCE(p_full_name, full_name),
    password_hash = CASE 
      WHEN p_password IS NOT NULL THEN public.hash_password(p_password)
      ELSE password_hash
    END,
    role = CASE 
      WHEN p_role IS NOT NULL THEN p_role::user_role
      ELSE role
    END,
    active = COALESCE(p_is_active, active),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Usuário atualizado com sucesso');
END;
$$;

-- =====================================================
-- FASE 2: COLUNAS FALTANTES NA TABELA COMPLAINTS
-- =====================================================

-- Endereço do denunciante (complementos)
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_block TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_lot TEXT;

-- Campos da ocorrência
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS occurrence_block TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS occurrence_lot TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS occurrence_time TIME;

-- Mídias (fotos e vídeos)
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS photos JSONB;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS videos JSONB;

-- Dados técnicos do usuário
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS user_location JSONB;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS user_device_type TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS user_browser TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS user_ip TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Controle de processamento
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;