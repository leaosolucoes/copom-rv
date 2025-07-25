-- Apenas garantir que o REPLICA IDENTITY esteja configurado para realtime
ALTER TABLE public.complaints REPLICA IDENTITY FULL;