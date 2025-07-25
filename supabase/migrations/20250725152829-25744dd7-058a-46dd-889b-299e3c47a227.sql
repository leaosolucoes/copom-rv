-- Atualizar a denúncia existente com status fiscal_solicitado para ter os dados corretos
UPDATE complaints 
SET 
  attendant_id = 'ee407fce-c7d0-41b0-a173-4ff5ba5b34d6',
  processed_at = NOW()
WHERE status = 'fiscal_solicitado' AND attendant_id IS NULL;