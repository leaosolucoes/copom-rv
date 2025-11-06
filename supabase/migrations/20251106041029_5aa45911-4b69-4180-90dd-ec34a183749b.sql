-- Adicionar campo verified_at na tabela complaints
-- Este campo registra quando um admin verificou/validou a denúncia antes de atribuir ao atendente
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

COMMENT ON COLUMN complaints.verified_at IS 
'Data/hora em que o admin verificou/validou a denúncia antes de atribuir ao atendente. Usado para calcular o tempo efetivo de atendimento.';