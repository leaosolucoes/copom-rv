-- Habilitar realtime para a tabela complaints
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;

-- Configurar replica identity para capturar dados completos durante updates
ALTER TABLE public.complaints REPLICA IDENTITY FULL;