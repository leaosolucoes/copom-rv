-- Adicionar campo para registrar quem arquivou a denúncia
ALTER TABLE public.complaints ADD COLUMN archived_by uuid REFERENCES public.users(id);

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.complaints.archived_by IS 'ID do usuário que arquivou a denúncia (finalizou)';