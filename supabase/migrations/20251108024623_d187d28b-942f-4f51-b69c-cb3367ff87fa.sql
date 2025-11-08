-- Criar tabela para registro de tentativas de login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  email_attempted TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failed_reason TEXT,
  captcha_required BOOLEAN NOT NULL DEFAULT FALSE,
  captcha_completed BOOLEAN NOT NULL DEFAULT FALSE,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  block_duration_seconds INTEGER,
  user_id UUID,
  geolocation JSONB,
  device_info JSONB
);

-- Criar índices para melhor performance
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at DESC);
CREATE INDEX idx_login_attempts_ip_address ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email_attempted);
CREATE INDEX idx_login_attempts_success ON public.login_attempts(success);
CREATE INDEX idx_login_attempts_blocked ON public.login_attempts(blocked);

-- Habilitar RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy para super_admin visualizar todos os logs
CREATE POLICY "Super admin can view all login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (is_current_user_super_admin_custom());

-- Policy para inserção pública (necessário para registrar tentativas)
CREATE POLICY "Anyone can insert login attempts"
  ON public.login_attempts
  FOR INSERT
  WITH CHECK (true);

-- Comentários na tabela
COMMENT ON TABLE public.login_attempts IS 'Registro de todas as tentativas de login no sistema para monitoramento de segurança';
COMMENT ON COLUMN public.login_attempts.captcha_required IS 'Se CAPTCHA foi exigido nesta tentativa';
COMMENT ON COLUMN public.login_attempts.captcha_completed IS 'Se CAPTCHA foi completado com sucesso';
COMMENT ON COLUMN public.login_attempts.blocked IS 'Se a tentativa foi bloqueada por rate limiting';
COMMENT ON COLUMN public.login_attempts.block_duration_seconds IS 'Duração do bloqueio em segundos';