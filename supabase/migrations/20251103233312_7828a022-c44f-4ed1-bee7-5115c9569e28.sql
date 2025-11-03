-- =====================================================
-- COPOM-RV: Migração Completa da Estrutura do Banco
-- =====================================================

-- 0. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- 1. CRIAR ENUMS
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'atendente', 'fiscal', 'motorista', 'transporte');
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'atendente', 'user');
CREATE TYPE public.complaint_status AS ENUM ('nova', 'cadastrada', 'finalizada');
CREATE TYPE public.escala_status AS ENUM ('ativa', 'encerrada', 'cancelada');

-- 2. CRIAR TABELAS BASE

-- Tabela users (autenticação própria)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'atendente',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela user_roles (segurança - roles separadas)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Tabela system_settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela audit_logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. FUNÇÕES DE SEGURANÇA

-- Função para hash de senha (usando extensions.crypt)
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN extensions.crypt(password, extensions.gen_salt('bf'));
END;
$$;

-- Função para verificar senha
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN password_hash = extensions.crypt(password, password_hash);
END;
$$;

-- Função para verificar role (security definer - evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Funções auxiliares para verificar roles
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin_custom()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin_custom()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_fiscal()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'fiscal'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_motorista()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'motorista'
  )
$$;

-- 4. SISTEMA DE DENÚNCIAS

-- Tabela complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_number TEXT,
  
  -- Dados do reclamante
  complainant_name TEXT NOT NULL,
  complainant_phone TEXT NOT NULL,
  complainant_type TEXT,
  complainant_address TEXT,
  complainant_number TEXT,
  complainant_complement TEXT,
  complainant_neighborhood TEXT,
  complainant_city TEXT,
  complainant_state TEXT,
  complainant_zip TEXT,
  
  -- Dados da ocorrência
  occurrence_type TEXT NOT NULL,
  occurrence_address TEXT NOT NULL,
  occurrence_number TEXT,
  occurrence_complement TEXT,
  occurrence_neighborhood TEXT NOT NULL,
  occurrence_city TEXT,
  occurrence_state TEXT,
  occurrence_zip TEXT,
  occurrence_reference TEXT,
  occurrence_date TIMESTAMP WITH TIME ZONE,
  
  -- Narrativa e classificação
  description TEXT NOT NULL,
  classification TEXT,
  
  -- Status e controle
  status complaint_status DEFAULT 'nova',
  attendant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  system_identifier TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Arquivamento
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabelas de API
CREATE TABLE public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.api_tokens(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  request_body JSONB,
  response_body JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.api_tokens(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (token_id, endpoint)
);

CREATE TABLE public.api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT UNIQUE NOT NULL,
  method TEXT NOT NULL,
  description TEXT,
  rate_limit INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. SISTEMA DE VIATURAS

-- Tabela viaturas
CREATE TABLE public.viaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefixo TEXT UNIQUE NOT NULL,
  placa TEXT UNIQUE NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER,
  km_atual INTEGER DEFAULT 0,
  ultima_troca_oleo INTEGER,
  data_ultima_troca_oleo DATE,
  km_proxima_troca INTEGER,
  ativa BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela checklist_viaturas
CREATE TABLE public.checklist_viaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id UUID REFERENCES public.viaturas(id) ON DELETE CASCADE NOT NULL,
  fiscal_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  
  -- Dados do checklist
  km_atual INTEGER NOT NULL,
  nivel_combustivel TEXT,
  nivel_oleo TEXT,
  observacoes TEXT,
  
  -- Validação de equipamentos (JSONB para flexibilidade)
  equipamentos_config JSONB,
  equipamentos_validados JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela checklist_pneus
CREATE TABLE public.checklist_pneus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.checklist_viaturas(id) ON DELETE CASCADE NOT NULL,
  posicao TEXT NOT NULL,
  estado TEXT NOT NULL,
  foto_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela checklist_equipamentos
CREATE TABLE public.checklist_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.checklist_viaturas(id) ON DELETE CASCADE NOT NULL,
  equipamento TEXT NOT NULL,
  presente BOOLEAN NOT NULL,
  foto_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela historico_km_viaturas
CREATE TABLE public.historico_km_viaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id UUID REFERENCES public.viaturas(id) ON DELETE CASCADE NOT NULL,
  km_registrado INTEGER NOT NULL,
  usuario_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tipo_registro TEXT,
  referencia_id UUID,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. SISTEMA DE ESCALAS

-- Tabela escalas_viaturas
CREATE TABLE public.escalas_viaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id UUID REFERENCES public.viaturas(id) ON DELETE CASCADE NOT NULL,
  motorista_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  fiscal_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Dados da escala
  data_servico DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_saida TIME,
  km_inicial INTEGER NOT NULL,
  km_final INTEGER,
  celular_funcional TEXT,
  
  -- Status e controle
  status escala_status DEFAULT 'ativa',
  observacoes TEXT,
  encerrada_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
  encerrada_em TIMESTAMP WITH TIME ZONE,
  motivo_encerramento TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela escala_imprevistos
CREATE TABLE public.escala_imprevistos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID REFERENCES public.escalas_viaturas(id) ON DELETE CASCADE NOT NULL,
  motorista_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Dados do imprevisto
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  local TEXT,
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fotos JSONB,
  
  -- Controle administrativo
  admin_ciente BOOLEAN DEFAULT false,
  admin_ciente_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_ciente_em TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger para validar conflitos de escala
CREATE OR REPLACE FUNCTION public.validate_escala_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.escalas_viaturas
    WHERE viatura_id = NEW.viatura_id
      AND data_servico = NEW.data_servico
      AND status = 'ativa'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Já existe uma escala ativa para esta viatura nesta data';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_escala_conflict_trigger
BEFORE INSERT OR UPDATE ON public.escalas_viaturas
FOR EACH ROW
EXECUTE FUNCTION public.validate_escala_conflict();

-- 7. SISTEMA DE AUDIÊNCIAS

-- Tabela audiencias
CREATE TABLE public.audiencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo TEXT NOT NULL,
  vara TEXT NOT NULL,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  presencial BOOLEAN DEFAULT true,
  link_videoconferencia TEXT,
  usuario_responsavel_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  criado_por UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  
  -- Arquivo do ofício
  arquivo_oficio_url TEXT,
  oficio_concluido BOOLEAN DEFAULT false,
  
  -- Assinatura digital
  hash_assinatura TEXT,
  salt_assinatura TEXT,
  data_assinatura TIMESTAMP WITH TIME ZONE,
  assinado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
  dados_validacao JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela configuracao_audiencias
CREATE TABLE public.configuracao_audiencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. CRIAR STORAGE BUCKETS

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('complaint-media', 'complaint-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('oficios-audiencias', 'oficios-audiencias', true, 10485760, ARRAY['application/pdf']),
  ('checklist-fotos', 'checklist-fotos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- 9. HABILITAR RLS

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_pneus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_km_viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas_viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_imprevistos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_audiencias ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS RLS

-- Users
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Super admin can manage all users" ON public.users FOR ALL USING (public.is_current_user_super_admin_custom());

-- System Settings
CREATE POLICY "Anyone can read public settings" ON public.system_settings FOR SELECT USING (key LIKE 'public_%');
CREATE POLICY "Admin can manage settings" ON public.system_settings FOR ALL USING (public.is_current_user_admin_custom());

-- Complaints
CREATE POLICY "Public can insert complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view complaints" ON public.complaints FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Attendants can update assigned complaints" ON public.complaints FOR UPDATE USING (attendant_id = auth.uid() OR public.is_current_user_admin_custom());
CREATE POLICY "Admin can manage all complaints" ON public.complaints FOR ALL USING (public.is_current_user_admin_custom());

-- API Tokens
CREATE POLICY "Admin can manage api tokens" ON public.api_tokens FOR ALL USING (public.is_current_user_admin_custom());

-- Viaturas
CREATE POLICY "Super admin can manage viaturas" ON public.viaturas FOR ALL USING (public.is_current_user_super_admin_custom());
CREATE POLICY "Fiscais can view active viaturas" ON public.viaturas FOR SELECT USING (ativa = true AND (public.is_current_user_fiscal() OR public.is_current_user_motorista() OR public.is_current_user_admin_custom()));

-- Checklists
CREATE POLICY "Fiscais can create checklists" ON public.checklist_viaturas FOR INSERT WITH CHECK (fiscal_id = auth.uid() AND (public.is_current_user_fiscal() OR public.is_current_user_motorista()));
CREATE POLICY "Fiscais can view own checklists" ON public.checklist_viaturas FOR SELECT USING (fiscal_id = auth.uid() OR public.is_current_user_admin_custom());
CREATE POLICY "Admin can view all checklists" ON public.checklist_viaturas FOR SELECT USING (public.is_current_user_admin_custom());

-- Pneus e equipamentos
CREATE POLICY "Users can manage checklist details" ON public.checklist_pneus FOR ALL USING (
  EXISTS (SELECT 1 FROM public.checklist_viaturas WHERE id = checklist_id AND (fiscal_id = auth.uid() OR public.is_current_user_admin_custom()))
);
CREATE POLICY "Users can manage checklist equipments" ON public.checklist_equipamentos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.checklist_viaturas WHERE id = checklist_id AND (fiscal_id = auth.uid() OR public.is_current_user_admin_custom()))
);

-- Escalas
CREATE POLICY "Super admin full access escalas" ON public.escalas_viaturas FOR ALL USING (public.is_current_user_super_admin_custom());
CREATE POLICY "Admin can view all escalas" ON public.escalas_viaturas FOR SELECT USING (public.is_current_user_admin_custom());
CREATE POLICY "Fiscal can view assigned escalas" ON public.escalas_viaturas FOR SELECT USING (fiscal_id = auth.uid());
CREATE POLICY "Motorista can view own escalas" ON public.escalas_viaturas FOR SELECT USING (motorista_id = auth.uid());
CREATE POLICY "Motorista can update own escalas" ON public.escalas_viaturas FOR UPDATE USING (motorista_id = auth.uid());

-- Imprevistos
CREATE POLICY "Motorista can create imprevistos" ON public.escala_imprevistos FOR INSERT WITH CHECK (motorista_id = auth.uid());
CREATE POLICY "Motorista can view own imprevistos" ON public.escala_imprevistos FOR SELECT USING (motorista_id = auth.uid() OR public.is_current_user_admin_custom());
CREATE POLICY "Admin can manage imprevistos" ON public.escala_imprevistos FOR ALL USING (public.is_current_user_admin_custom());

-- Audiências
CREATE POLICY "Super admin full access audiencias" ON public.audiencias FOR ALL USING (public.is_current_user_super_admin_custom());
CREATE POLICY "Users can manage own audiencias" ON public.audiencias FOR ALL USING (usuario_responsavel_id = auth.uid() OR criado_por = auth.uid());
CREATE POLICY "Admin can manage audiencias config" ON public.configuracao_audiencias FOR ALL USING (public.is_current_user_admin_custom());

-- Storage Policies
CREATE POLICY "Authenticated can upload complaint media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'complaint-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Public can view complaint media" ON storage.objects FOR SELECT USING (bucket_id = 'complaint-media');

CREATE POLICY "Authenticated can upload oficios" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'oficios-audiencias' AND auth.uid() IS NOT NULL);
CREATE POLICY "Public can view oficios" ON storage.objects FOR SELECT USING (bucket_id = 'oficios-audiencias');

CREATE POLICY "Authenticated can upload checklist photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'checklist-fotos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can view checklist photos" ON storage.objects FOR SELECT USING (bucket_id = 'checklist-fotos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Owner can delete own files" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- 11. TRIGGERS E FUNÇÕES

-- Função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_viaturas_updated_at BEFORE UPDATE ON public.viaturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_escalas_updated_at BEFORE UPDATE ON public.escalas_viaturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audiencias_updated_at BEFORE UPDATE ON public.audiencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. ÍNDICES PARA PERFORMANCE

CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at DESC);
CREATE INDEX idx_complaints_attendant_id ON public.complaints(attendant_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_viaturas_prefixo ON public.viaturas(prefixo);
CREATE INDEX idx_viaturas_placa ON public.viaturas(placa);
CREATE INDEX idx_viaturas_ativa ON public.viaturas(ativa);
CREATE INDEX idx_escalas_viatura_id ON public.escalas_viaturas(viatura_id);
CREATE INDEX idx_escalas_motorista_id ON public.escalas_viaturas(motorista_id);
CREATE INDEX idx_escalas_status ON public.escalas_viaturas(status);
CREATE INDEX idx_escalas_data_servico ON public.escalas_viaturas(data_servico);

-- 13. HABILITAR REALTIME

ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER TABLE public.audiencias REPLICA IDENTITY FULL;
ALTER TABLE public.escalas_viaturas REPLICA IDENTITY FULL;
ALTER TABLE public.viaturas REPLICA IDENTITY FULL;
ALTER TABLE public.checklist_viaturas REPLICA IDENTITY FULL;

-- 14. INSERIR DADOS INICIAIS

-- Super Admin padrão
INSERT INTO public.users (email, password_hash, full_name, role, active)
VALUES (
  'superadmin@rioverde',
  public.hash_password('19Cpt412014@'),
  'Super Administrator',
  'super_admin',
  true
);

-- Inserir role do super admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM public.users
WHERE email = 'superadmin@rioverde';

-- Configurações iniciais do sistema
INSERT INTO public.system_settings (key, value, description) VALUES
('whatsapp_api_url', '""', 'URL da Evolution API do WhatsApp'),
('whatsapp_api_key', '""', 'Chave de API do WhatsApp'),
('whatsapp_instance', '""', 'Nome da instância do WhatsApp'),
('posturas_api_url', '""', 'URL da API do sistema de posturas'),
('posturas_api_key', '""', 'Chave de API do sistema de posturas'),
('public_logo_url', '""', 'URL do logo do sistema (público)'),
('form_bairros', '[]'::jsonb, 'Lista de bairros para o formulário'),
('form_tipos_reclamante', '[]'::jsonb, 'Tipos de reclamante'),
('form_tipos_ocorrencia', '[]'::jsonb, 'Tipos de ocorrência'),
('form_classificacoes', '[]'::jsonb, 'Classificações de denúncias');