-- Desabilitar RLS na tabela consultation_audit_logs para permitir inserções sem restrições
ALTER TABLE public.consultation_audit_logs DISABLE ROW LEVEL SECURITY;