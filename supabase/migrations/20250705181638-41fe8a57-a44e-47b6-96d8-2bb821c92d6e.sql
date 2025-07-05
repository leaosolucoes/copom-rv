-- Criação completa do banco de dados para Sistema Posturas Rio Verde

-- 1. Enum para tipos de perfil de usuário
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'atendente');

-- 2. Enum para status das denúncias
CREATE TYPE public.complaint_status AS ENUM ('nova', 'cadastrada', 'finalizada');

-- 3. Tabela de usuários do sistema
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'atendente',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 4. Tabela de denúncias
CREATE TABLE public.complaints (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Dados do reclamante
    complainant_name TEXT NOT NULL,
    complainant_phone TEXT NOT NULL,
    complainant_type TEXT NOT NULL,
    complainant_address TEXT NOT NULL,
    complainant_number TEXT,
    complainant_block TEXT,
    complainant_lot TEXT,
    complainant_neighborhood TEXT NOT NULL,
    
    -- Endereço da ocorrência
    occurrence_type TEXT NOT NULL,
    occurrence_address TEXT NOT NULL,
    occurrence_number TEXT,
    occurrence_block TEXT,
    occurrence_lot TEXT,
    occurrence_neighborhood TEXT NOT NULL,
    occurrence_reference TEXT,
    
    -- Dados da reclamação
    narrative TEXT NOT NULL,
    occurrence_date DATE NOT NULL,
    occurrence_time TIME NOT NULL,
    classification TEXT NOT NULL,
    assigned_to TEXT,
    
    -- Controle interno
    status complaint_status NOT NULL DEFAULT 'nova',
    attendant_id UUID REFERENCES public.users(id),
    system_identifier TEXT, -- identificador do sistema próprio
    processed_at TIMESTAMP WITH TIME ZONE,
    whatsapp_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela de configurações do sistema
CREATE TABLE public.system_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela de logs/auditoria
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Habilitação do RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS para usuários
CREATE POLICY "Usuários podem ver próprio perfil" 
ON public.users 
FOR SELECT 
USING (auth.uid()::text = id::text);

CREATE POLICY "Super Admin pode gerenciar todos usuários" 
ON public.users 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND role = 'super_admin'
    )
);

CREATE POLICY "Admin pode ver usuários atendentes" 
ON public.users 
FOR SELECT 
USING (
    role = 'atendente' 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'super_admin')
    )
);

-- 9. Políticas RLS para denúncias
CREATE POLICY "Denúncias públicas podem ser inseridas" 
ON public.complaints 
FOR INSERT 
WITH CHECK (true); -- Permitir inserção pública

CREATE POLICY "Usuários autenticados podem ver denúncias" 
ON public.complaints 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND is_active = true
    )
);

CREATE POLICY "Atendentes podem atualizar denúncias atribuídas" 
ON public.complaints 
FOR UPDATE 
USING (
    attendant_id::text = auth.uid()::text 
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'super_admin')
    )
);

-- 10. Políticas RLS para configurações
CREATE POLICY "Super Admin pode gerenciar configurações" 
ON public.system_settings 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND role = 'super_admin'
    )
);

CREATE POLICY "Usuários autenticados podem ver configurações públicas" 
ON public.system_settings 
FOR SELECT 
USING (
    key LIKE 'public_%' 
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'super_admin')
    )
);

-- 11. Políticas RLS para logs
CREATE POLICY "Super Admin pode ver todos os logs" 
ON public.audit_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND role = 'super_admin'
    )
);

CREATE POLICY "Usuários podem ver próprios logs" 
ON public.audit_logs 
FOR SELECT 
USING (user_id::text = auth.uid()::text);

-- 12. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON public.complaints
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Função para hash de senha
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Função para verificar senha
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Criação do usuário Super Admin padrão
INSERT INTO public.users (
    email, 
    password_hash, 
    full_name, 
    role
) VALUES (
    'superadmin@rioverde',
    public.hash_password('19Cpt412014@'),
    'Super Administrator',
    'super_admin'
);

-- 17. Configurações iniciais do sistema
INSERT INTO public.system_settings (key, value, description) VALUES
('whatsapp_api_key', '""', 'Chave da API Evolution'),
('whatsapp_api_url', '""', 'URL da Evolution API'),
('whatsapp_number', '""', 'Número WhatsApp para notificações'),
('whatsapp_message_template', '"Nova denúncia recebida no sistema Posturas Rio Verde."', 'Template da mensagem WhatsApp'),
('whatsapp_send_full_complaint', 'false', 'Enviar denúncia completa ou apenas aviso'),
('system_logo_url', '""', 'URL da logo do sistema'),
('public_form_fields', '{}', 'Configuração dos campos do formulário público'),
('public_neighborhoods', '["Centro", "Setor Sul", "Setor Norte", "Vila Brasília"]', 'Lista de bairros disponíveis'),
('public_complaint_types', '["Pessoa Física", "Pessoa Jurídica"]', 'Tipos de reclamante'),
('public_occurrence_types', '["Residencial", "Comercial", "Industrial"]', 'Tipos de ocorrência'),
('public_classifications', '["Perturbação do Sossego", "Som Alto", "Música Alta", "Outros"]', 'Classificações disponíveis');

-- 18. Índices para performance
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at);
CREATE INDEX idx_complaints_attendant ON public.complaints(attendant_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);