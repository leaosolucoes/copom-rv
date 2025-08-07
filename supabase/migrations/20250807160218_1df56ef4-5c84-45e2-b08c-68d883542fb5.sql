-- Criar tabela de viaturas
CREATE TABLE public.viaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefixo TEXT NOT NULL UNIQUE,
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  km_atual INTEGER NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de checklist de viaturas
CREATE TABLE public.checklist_viaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viatura_id UUID NOT NULL REFERENCES public.viaturas(id) ON DELETE CASCADE,
  fiscal_id UUID NOT NULL,
  data_checklist DATE NOT NULL,
  horario_checklist TIME NOT NULL,
  nome_guerra TEXT NOT NULL,
  km_inicial INTEGER NOT NULL,
  combustivel_nivel TEXT NOT NULL CHECK (combustivel_nivel IN ('reserva', '1/4', '1/2', '3/4', 'cheio')),
  oleo_nivel TEXT NOT NULL CHECK (oleo_nivel IN ('completo', 'regular', 'insuficiente')),
  data_proxima_troca_oleo DATE,
  km_proxima_troca_oleo INTEGER,
  limpeza_ok BOOLEAN NOT NULL DEFAULT false,
  observacoes_alteracoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de checklist de pneus
CREATE TABLE public.checklist_pneus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklist_viaturas(id) ON DELETE CASCADE,
  dianteiro_direito TEXT NOT NULL CHECK (dianteiro_direito IN ('ruim', 'bom', 'otimo')),
  dianteiro_esquerdo TEXT NOT NULL CHECK (dianteiro_esquerdo IN ('ruim', 'bom', 'otimo')),
  traseiro_direito TEXT NOT NULL CHECK (traseiro_direito IN ('ruim', 'bom', 'otimo')),
  traseiro_esquerdo TEXT NOT NULL CHECK (traseiro_esquerdo IN ('ruim', 'bom', 'otimo')),
  estepe TEXT NOT NULL CHECK (estepe IN ('ruim', 'bom', 'otimo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de checklist de equipamentos
CREATE TABLE public.checklist_equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklist_viaturas(id) ON DELETE CASCADE,
  equipamento_nome TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'defeituoso', 'nao_tem')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_pneus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_equipamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para viaturas
CREATE POLICY "Super admin pode gerenciar viaturas" 
ON public.viaturas 
FOR ALL 
USING (is_current_user_super_admin_custom());

CREATE POLICY "Fiscais podem ver viaturas ativas" 
ON public.viaturas 
FOR SELECT 
USING (ativa = true AND is_current_user_fiscal());

-- Políticas RLS para checklist_viaturas
CREATE POLICY "Super admin pode ver todos os checklists" 
ON public.checklist_viaturas 
FOR SELECT 
USING (is_current_user_super_admin_custom());

CREATE POLICY "Fiscais podem criar próprios checklists" 
ON public.checklist_viaturas 
FOR INSERT 
WITH CHECK (fiscal_id = auth.uid() AND is_current_user_fiscal());

CREATE POLICY "Fiscais podem ver próprios checklists" 
ON public.checklist_viaturas 
FOR SELECT 
USING (fiscal_id = auth.uid() AND is_current_user_fiscal());

-- Políticas RLS para checklist_pneus
CREATE POLICY "Super admin pode ver todos os pneus" 
ON public.checklist_pneus 
FOR SELECT 
USING (is_current_user_super_admin_custom());

CREATE POLICY "Fiscais podem gerenciar pneus de seus checklists" 
ON public.checklist_pneus 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_viaturas cv 
    WHERE cv.id = checklist_id AND cv.fiscal_id = auth.uid()
  ) AND is_current_user_fiscal()
);

-- Políticas RLS para checklist_equipamentos
CREATE POLICY "Super admin pode ver todos os equipamentos" 
ON public.checklist_equipamentos 
FOR SELECT 
USING (is_current_user_super_admin_custom());

CREATE POLICY "Fiscais podem gerenciar equipamentos de seus checklists" 
ON public.checklist_equipamentos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_viaturas cv 
    WHERE cv.id = checklist_id AND cv.fiscal_id = auth.uid()
  ) AND is_current_user_fiscal()
);

-- Trigger para atualizar updated_at nas viaturas
CREATE TRIGGER update_viaturas_updated_at
BEFORE UPDATE ON public.viaturas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at nos checklists
CREATE TRIGGER update_checklist_viaturas_updated_at
BEFORE UPDATE ON public.checklist_viaturas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();