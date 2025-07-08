-- Habilitar REPLICA IDENTITY FULL para capturar todos os dados nas mudanças
ALTER TABLE public.complaints REPLICA IDENTITY FULL;