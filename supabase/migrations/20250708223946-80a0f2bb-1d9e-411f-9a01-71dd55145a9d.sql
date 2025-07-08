-- Corrigir função validate_api_token
CREATE OR REPLACE FUNCTION public.validate_api_token(token_string text)
 RETURNS TABLE(token_id uuid, user_id uuid, token_type text, scopes text[], is_valid boolean, rate_limit_per_hour integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  token_hash_value TEXT;
BEGIN
  -- Gerar hash do token
  token_hash_value := public.generate_api_token_hash(token_string);
  
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.token_type,
    t.scopes,
    (t.is_active AND (t.expires_at IS NULL OR t.expires_at > now())) as is_valid,
    t.rate_limit_per_hour
  FROM public.api_tokens t
  WHERE t.token_hash = token_hash_value;
  
  -- Atualizar last_used_at e usage_count
  UPDATE public.api_tokens 
  SET 
    last_used_at = now(),
    usage_count = usage_count + 1
  WHERE token_hash = token_hash_value
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now());
END;
$function$;