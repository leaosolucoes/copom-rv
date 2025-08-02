-- Adicionar campo para registrar quando uma denúncia volta do admin verificado
ALTER TABLE public.complaints 
ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;

-- Comentário explicativo
COMMENT ON COLUMN public.complaints.verified_at IS 'Timestamp de quando a denúncia foi marcada como verificada pelo admin e retornou para o atendente';

-- Criar função para atualizar o campo verified_at quando status mudar para 'verificado'
CREATE OR REPLACE FUNCTION public.update_verified_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'verificado', registrar o timestamp
  IF NEW.status = 'verificado' AND OLD.status = 'a_verificar' THEN
    NEW.verified_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar verified_at automaticamente
CREATE TRIGGER update_verified_at_trigger
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_verified_at();