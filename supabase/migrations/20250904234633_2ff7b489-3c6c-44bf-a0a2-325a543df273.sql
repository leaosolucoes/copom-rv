-- Adicionar novo role 'transporte' ao enum user_role
ALTER TYPE user_role ADD VALUE 'transporte';

-- Criar função para verificar se o usuário atual é transporte
CREATE OR REPLACE FUNCTION public.is_current_user_transporte()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'transporte' 
    AND is_active = true
  );
END;
$function$;

-- Atualizar políticas RLS para incluir o role transporte onde necessário

-- Escalas: transporte pode ver todas as escalas (como admin)
CREATE POLICY "Transporte can view all escalas" 
ON public.escalas_viaturas 
FOR SELECT 
USING (is_current_user_transporte());

-- Escalas: transporte pode inserir escalas
CREATE POLICY "Transporte can insert escalas" 
ON public.escalas_viaturas 
FOR INSERT 
WITH CHECK (is_current_user_transporte());

-- Escalas: transporte pode atualizar escalas
CREATE POLICY "Transporte can update escalas" 
ON public.escalas_viaturas 
FOR UPDATE 
USING (is_current_user_transporte());

-- Imprevistos: transporte pode ver todos os imprevistos
CREATE POLICY "Transporte can view all imprevistos" 
ON public.escala_imprevistos 
FOR SELECT 
USING (is_current_user_transporte());

-- Imprevistos: transporte pode gerenciar todos os imprevistos
CREATE POLICY "Transporte can manage all imprevistos" 
ON public.escala_imprevistos 
FOR ALL 
USING (is_current_user_transporte())
WITH CHECK (is_current_user_transporte());