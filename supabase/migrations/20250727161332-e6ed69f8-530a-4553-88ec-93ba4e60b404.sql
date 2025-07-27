-- Permitir user_id NULL na tabela consultation_audit_logs para resolver foreign key constraint
ALTER TABLE public.consultation_audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- Remover a foreign key constraint que está causando o problema
ALTER TABLE public.consultation_audit_logs 
DROP CONSTRAINT IF EXISTS consultation_audit_logs_user_id_fkey;