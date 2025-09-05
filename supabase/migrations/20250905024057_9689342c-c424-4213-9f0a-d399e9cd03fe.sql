-- Modificar tabela escalas_viaturas para suportar múltiplos fiscais
ALTER TABLE public.escalas_viaturas 
ADD COLUMN fiscal_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Migrar dados existentes do fiscal_id para fiscal_ids
UPDATE public.escalas_viaturas 
SET fiscal_ids = ARRAY[fiscal_id]
WHERE fiscal_id IS NOT NULL;

-- Remover a coluna antiga após a migração
ALTER TABLE public.escalas_viaturas 
DROP COLUMN fiscal_id;