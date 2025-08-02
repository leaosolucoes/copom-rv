-- Remover o trigger primeiro, depois recriar a função com search_path seguro
DROP TRIGGER IF EXISTS update_verified_at_trigger ON public.complaints;
DROP FUNCTION IF EXISTS public.update_verified_at() CASCADE;

-- Recriar a função com search_path seguro
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

-- Recriar o trigger
CREATE TRIGGER update_verified_at_trigger
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_verified_at();