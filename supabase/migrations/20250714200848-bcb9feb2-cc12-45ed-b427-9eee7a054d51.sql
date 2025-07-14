-- Habilitar realtime para a tabela complaints
ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;