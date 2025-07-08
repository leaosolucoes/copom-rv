-- Corrigir função de hash usando extensions.digest
CREATE OR REPLACE FUNCTION public.generate_api_token_hash(token_string text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN encode(extensions.digest(token_string, 'sha256'), 'hex');
END;
$function$;