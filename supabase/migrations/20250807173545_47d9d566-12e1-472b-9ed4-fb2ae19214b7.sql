-- Criar tabela para gerenciar os itens do checklist
CREATE TABLE checklist_config_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'equipamento', 'inspecao_visual', 'documentos', etc
  descricao TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE checklist_config_items ENABLE ROW LEVEL SECURITY;

-- Política para super admin gerenciar
CREATE POLICY "Super admin can manage checklist config"
ON checklist_config_items
FOR ALL
USING (is_current_user_super_admin_safe())
WITH CHECK (is_current_user_super_admin_safe());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_checklist_config_items_updated_at
BEFORE UPDATE ON checklist_config_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Inserir itens padrão do checklist
INSERT INTO checklist_config_items (nome, categoria, descricao, ordem) VALUES
('Extintor', 'equipamento', 'Verificar se o extintor está presente e dentro da validade', 1),
('Triângulo', 'equipamento', 'Verificar presença do triângulo de sinalização', 2),
('Macaco', 'equipamento', 'Verificar presença e funcionamento do macaco', 3),
('Chave de roda', 'equipamento', 'Verificar presença da chave de roda', 4),
('Documentos', 'equipamento', 'Verificar presença dos documentos obrigatórios', 5),
('Kit primeiros socorros', 'equipamento', 'Verificar presença do kit de primeiros socorros', 6),
('Rádio comunicador', 'equipamento', 'Verificar funcionamento do rádio', 7),
('Sirene', 'equipamento', 'Verificar funcionamento da sirene', 8),
('Giroflex', 'equipamento', 'Verificar funcionamento do giroflex', 9),
('GPS', 'equipamento', 'Verificar funcionamento do GPS', 10),
('Combustível reserva', 'equipamento', 'Verificar presença de combustível reserva', 11),
('Ferramentas básicas', 'equipamento', 'Verificar presença das ferramentas básicas', 12);