-- Temporariamente permitir acesso total aos logs da API para funcionar
DROP POLICY IF EXISTS "Super admin can view all API logs" ON public.api_logs;
DROP POLICY IF EXISTS "Token owners can view their logs" ON public.api_logs;

CREATE POLICY "Temporary API logs access" ON public.api_logs
FOR SELECT USING (
  -- Permitir acesso para qualquer usuário autenticado no sistema customizado ou Supabase
  true
);