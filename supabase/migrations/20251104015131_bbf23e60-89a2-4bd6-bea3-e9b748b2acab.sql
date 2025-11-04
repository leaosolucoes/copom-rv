-- Criar tabela de logs de acesso/login
CREATE TABLE IF NOT EXISTS public.access_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  login_success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  geolocation JSONB,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_access_audit_logs_user_id ON public.access_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_logs_created_at ON public.access_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_audit_logs_login_success ON public.access_audit_logs(login_success);

-- Enable RLS
ALTER TABLE public.access_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para access_audit_logs
CREATE POLICY "Super admin can manage access audit logs"
ON public.access_audit_logs
FOR ALL
TO authenticated
USING (is_current_user_super_admin_custom());

CREATE POLICY "Admin can view access audit logs"
ON public.access_audit_logs
FOR SELECT
TO authenticated
USING (is_current_user_admin_custom());

-- Criar tabela de logs de consultas (CPF, CNPJ, CEP)
CREATE TABLE IF NOT EXISTS public.consultation_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  user_name TEXT,
  consultation_type TEXT NOT NULL CHECK (consultation_type IN ('CPF', 'CNPJ', 'CEP')),
  searched_data TEXT NOT NULL,
  search_result JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_consultation_audit_logs_user_id ON public.consultation_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_audit_logs_created_at ON public.consultation_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_audit_logs_type ON public.consultation_audit_logs(consultation_type);
CREATE INDEX IF NOT EXISTS idx_consultation_audit_logs_success ON public.consultation_audit_logs(success);

-- Enable RLS
ALTER TABLE public.consultation_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para consultation_audit_logs
CREATE POLICY "Super admin can manage consultation audit logs"
ON public.consultation_audit_logs
FOR ALL
TO authenticated
USING (is_current_user_super_admin_custom());

CREATE POLICY "Admin can view consultation audit logs"
ON public.consultation_audit_logs
FOR SELECT
TO authenticated
USING (is_current_user_admin_custom());

CREATE POLICY "Users can view own consultation logs"
ON public.consultation_audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Criar tabela de configuração de itens de checklist
CREATE TABLE IF NOT EXISTS public.checklist_config_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('equipamentos', 'documentacao', 'seguranca', 'limpeza', 'mecanica')),
  descricao TEXT,
  obrigatorio BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_checklist_config_items_ativo ON public.checklist_config_items(ativo);
CREATE INDEX IF NOT EXISTS idx_checklist_config_items_ordem ON public.checklist_config_items(ordem);
CREATE INDEX IF NOT EXISTS idx_checklist_config_items_categoria ON public.checklist_config_items(categoria);

-- Enable RLS
ALTER TABLE public.checklist_config_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para checklist_config_items
CREATE POLICY "Super admin can manage checklist config items"
ON public.checklist_config_items
FOR ALL
TO authenticated
USING (is_current_user_super_admin_custom());

CREATE POLICY "Admin can manage checklist config items"
ON public.checklist_config_items
FOR ALL
TO authenticated
USING (is_current_user_admin_custom());

CREATE POLICY "Fiscais and motoristas can view active items"
ON public.checklist_config_items
FOR SELECT
TO authenticated
USING (ativo = true AND (is_current_user_fiscal() OR is_current_user_motorista()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_checklist_config_items_updated_at
BEFORE UPDATE ON public.checklist_config_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir itens padrão de checklist
INSERT INTO public.checklist_config_items (nome, categoria, descricao, obrigatorio, ordem) VALUES
('Extintor de incêndio', 'equipamentos', 'Verificar validade e condições do extintor', true, 1),
('Triângulo de sinalização', 'equipamentos', 'Verificar presença e condições', true, 2),
('Macaco e chave de roda', 'equipamentos', 'Verificar presença e funcionamento', true, 3),
('Estepe', 'equipamentos', 'Verificar condições e calibragem', true, 4),
('Kit primeiros socorros', 'equipamentos', 'Verificar presença e validade dos itens', true, 5),
('Lanterna', 'equipamentos', 'Verificar funcionamento e pilhas', false, 6),
('Documento do veículo', 'documentacao', 'Verificar presença do CRLV', true, 7),
('Seguro obrigatório', 'documentacao', 'Verificar validade do DPVAT', true, 8),
('Cinto de segurança', 'seguranca', 'Verificar funcionamento de todos os cintos', true, 9),
('Freios', 'seguranca', 'Testar sistema de freios', true, 10),
('Luzes e sinalização', 'seguranca', 'Verificar faróis, lanternas e setas', true, 11),
('Retrovisores', 'seguranca', 'Verificar condições e ajuste', true, 12),
('Limpeza interna', 'limpeza', 'Avaliar limpeza do interior da viatura', false, 13),
('Limpeza externa', 'limpeza', 'Avaliar limpeza externa da viatura', false, 14),
('Nível de óleo', 'mecanica', 'Verificar nível do óleo do motor', true, 15),
('Nível de combustível', 'mecanica', 'Registrar nível atual de combustível', true, 16),
('Pneus', 'mecanica', 'Verificar estado e calibragem de todos os pneus', true, 17),
('Fluido de freio', 'mecanica', 'Verificar nível do fluido de freio', true, 18)
ON CONFLICT DO NOTHING;