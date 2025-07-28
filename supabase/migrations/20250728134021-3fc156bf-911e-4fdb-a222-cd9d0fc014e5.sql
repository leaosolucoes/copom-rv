-- Reverter o teste anterior
UPDATE public.complaints 
SET status = 'nova', 
    attendant_id = NULL,
    processed_at = NULL,
    classification = 'Recebida Via Agente de Inteligência Artificial'
WHERE id = '7466c4ca-5a91-4e44-b5f2-6250c8337a39';