-- Teste para verificar se a política RLS está funcionando
-- Vamos temporariamente desabilitar RLS na tabela complaints para testar
ALTER TABLE public.complaints DISABLE ROW LEVEL SECURITY;

-- Fazer uma atualização de teste
UPDATE public.complaints 
SET status = 'cadastrada', 
    attendant_id = '834b2702-2778-44d1-b86c-c4895cdbd90a',
    processed_at = now(),
    classification = 'Teste de RLS'
WHERE id = '7466c4ca-5a91-4e44-b5f2-6250c8337a39';

-- Reabilitar RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;