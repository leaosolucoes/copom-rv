-- Adicionar uma coluna específica para armazenar o nome do assinador
ALTER TABLE public.audiencias 
ADD COLUMN IF NOT EXISTS assinador_nome TEXT;

-- Comentário: Esta coluna armazenará diretamente o nome completo de quem assinou o documento