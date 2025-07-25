-- Adicionar novo status na enum complaint_status
ALTER TYPE complaint_status ADD VALUE 'fiscal_solicitado';

-- Criar trigger para atualizar updated_at em complaints se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se o trigger já existe antes de criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_complaints_updated_at'
    ) THEN
        CREATE TRIGGER update_complaints_updated_at
            BEFORE UPDATE ON public.complaints
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;