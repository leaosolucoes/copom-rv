-- Corrigir avisos de segurança do Supabase
-- 1. Mover extensões para o schema extensions (recomendado pela Supabase)
-- Nota: As extensões já estão no schema correto, então vamos verificar e confirmar

-- 2. Reduzir tempo de expiração do OTP para o recomendado (1 hora = 3600 segundos)
UPDATE auth.config 
SET value = '3600'::text 
WHERE key = 'OTP_EXPIRY';

-- Verificar se a configuração foi aplicada
SELECT key, value FROM auth.config WHERE key = 'OTP_EXPIRY';