-- Adicionar campos para informações do usuário na tabela complaints
ALTER TABLE public.complaints 
ADD COLUMN user_location JSONB,
ADD COLUMN user_device_type TEXT,
ADD COLUMN user_browser TEXT,
ADD COLUMN user_ip INET,
ADD COLUMN user_agent TEXT;