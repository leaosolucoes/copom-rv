-- Habilitar real-time updates para a tabela audiencias
ALTER TABLE public.audiencias REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação do real-time do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.audiencias;