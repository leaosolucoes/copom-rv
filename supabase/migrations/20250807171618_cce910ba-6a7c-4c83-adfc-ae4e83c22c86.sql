-- Verificar e corrigir o campo status_aprovacao na tabela checklist_viaturas
-- Primeiro, vamos remover o valor padrão para evitar conflitos
ALTER TABLE checklist_viaturas 
ALTER COLUMN status_aprovacao DROP DEFAULT;

-- Atualizar registros existentes com status pendente para NULL (para permitir definição manual)
UPDATE checklist_viaturas 
SET status_aprovacao = NULL 
WHERE status_aprovacao = 'pendente';

-- Definir novamente o padrão como NULL (sem valor padrão inicial)
ALTER TABLE checklist_viaturas 
ALTER COLUMN status_aprovacao SET DEFAULT NULL;