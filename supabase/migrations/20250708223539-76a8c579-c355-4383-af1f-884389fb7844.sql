-- Corrigir função de hash para usar extensão correta
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recriar função de hash usando pgcrypto
CREATE OR REPLACE FUNCTION public.generate_api_token_hash(token_string text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN encode(digest(token_string, 'sha256'), 'hex');
END;
$function$;