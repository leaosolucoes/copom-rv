-- Corrigir registros que estão com status incorreto
-- Atualizar todos os registros que estão como 'reprovado' para 'aprovado' 
-- já que o fiscal estava clicando em aprovar mas ficava como reprovado
UPDATE checklist_viaturas 
SET status_aprovacao = 'aprovado' 
WHERE status_aprovacao = 'reprovado';