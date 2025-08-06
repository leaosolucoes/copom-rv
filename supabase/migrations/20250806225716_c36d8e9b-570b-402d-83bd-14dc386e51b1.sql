-- ================================
-- MÓDULO DE AUDIÊNCIAS - MIGRAÇÃO COMPLETA
-- ================================

-- 1. Criar tabela principal de audiências
CREATE TABLE public.audiencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dados do processo
  numero_processo TEXT NOT NULL,
  vara TEXT NOT NULL,
  data_audiencia DATE NOT NULL,
  horario_audiencia TIME WITHOUT TIME ZONE NOT NULL,
  eh_presencial BOOLEAN DEFAULT false,
  link_videoconferencia TEXT,
  
  -- Relacionamentos (adaptado ao sistema atual)
  user_id UUID NOT NULL REFERENCES public.users(id),
  criado_por UUID NOT NULL REFERENCES public.users(id),
  
  -- Arquivo
  arquivo_oficio_url TEXT NOT NULL,
  
  -- Status e assinatura
  status TEXT NOT NULL DEFAULT 'pendente',
  data_assinatura TIMESTAMP WITH TIME ZONE,
  hash_assinatura TEXT,
  salt_assinatura TEXT,
  dados_assinatura JSONB,
  dados_validacao JSONB,
  
  -- Controle de conclusão
  oficio_concluido BOOLEAN DEFAULT false,
  data_conclusao_oficio TIMESTAMP WITH TIME ZONE,
  concluido_por UUID REFERENCES public.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Criar tabela de configuração do módulo
CREATE TABLE public.configuracao_audiencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT true,
  configurado_por UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_audiencias ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
CREATE POLICY "Users can manage own audiencias" 
ON public.audiencias FOR ALL 
USING (
  user_id = auth.uid() OR 
  criado_por = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage audiencias config" 
ON public.configuracao_audiencias FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- 5. Criar triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_audiencias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audiencias_updated_at
    BEFORE UPDATE ON public.audiencias
    FOR EACH ROW
    EXECUTE FUNCTION public.update_audiencias_updated_at();

CREATE OR REPLACE FUNCTION public.update_configuracao_audiencias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_configuracao_audiencias_updated_at
    BEFORE UPDATE ON public.configuracao_audiencias
    FOR EACH ROW
    EXECUTE FUNCTION public.update_configuracao_audiencias_updated_at();

-- 6. Habilitar realtime
ALTER TABLE public.audiencias REPLICA IDENTITY FULL;
ALTER TABLE public.configuracao_audiencias REPLICA IDENTITY FULL;

-- 7. Criar bucket para ofícios de audiências
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'oficios-audiencias',
  'oficios-audiencias', 
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']::text[]
);

-- 8. Criar políticas para o bucket
CREATE POLICY "Authenticated users can upload oficios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'oficios-audiencias');

CREATE POLICY "Public can view oficios"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'oficios-audiencias');

CREATE POLICY "Users can delete own oficios"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'oficios-audiencias' AND auth.uid()::text = (storage.foldername(name))[1]);