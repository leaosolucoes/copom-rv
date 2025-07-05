-- Drop existing functions and recreate with correct schema reference
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);

-- Recreate functions with correct schema reference for gen_salt and crypt
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN extensions.crypt(password, extensions.gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN hash = extensions.crypt(password, hash);
END;
$$;