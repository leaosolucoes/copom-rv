-- Adicionar campo para status de aprovação na tabela checklist_viaturas
ALTER TABLE checklist_viaturas 
ADD COLUMN status_aprovacao text DEFAULT 'pendente';

-- Adicionar comentário explicativo
COMMENT ON COLUMN checklist_viaturas.status_aprovacao IS 'Status do checklist: pendente, aprovado, reprovado';