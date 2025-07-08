-- Habilitar realtime para a tabela complaints
ALTER TABLE public.complaints REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;