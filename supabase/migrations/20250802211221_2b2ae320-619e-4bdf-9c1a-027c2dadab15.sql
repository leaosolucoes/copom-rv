-- Corrigir o search_path da função update_verified_at para segurança
DROP FUNCTION IF EXISTS public.update_verified_at();

CREATE OR REPLACE FUNCTION public.update_verified_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Se o status mudou para 'verificado', registrar o timestamp
  IF NEW.status = 'verificado' AND OLD.status = 'a_verificar' THEN
    NEW.verified_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;