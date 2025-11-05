-- Corrigir search_path da função validate_api_token para segurança
CREATE OR REPLACE FUNCTION public.validate_api_token(token_string text)
RETURNS TABLE(token_id uuid, is_valid boolean, scopes jsonb, rate_limit integer, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_token_record RECORD;
  v_token_hash TEXT;
BEGIN
  -- Gerar hash SHA-256 do token recebido (mesmo algoritmo usado no api-auth)
  v_token_hash := encode(digest(token_string, 'sha256'), 'hex');
  
  -- Buscar token pelo hash
  SELECT 
    id,
    active,
    permissions,
    0 as rate_limit,
    NULL::UUID as user_id
  INTO v_token_record
  FROM public.api_tokens
  WHERE token = v_token_hash;
  
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