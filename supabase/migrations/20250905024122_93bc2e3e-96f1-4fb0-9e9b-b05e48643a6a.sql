-- Primeiro, remover a política que depende de fiscal_id
DROP POLICY IF EXISTS "Fiscal can view escalas where they are assigned" ON public.escalas_viaturas;

-- Adicionar coluna fiscal_ids como array de UUIDs
ALTER TABLE public.escalas_viaturas 
ADD COLUMN fiscal_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Migrar dados existentes do fiscal_id para fiscal_ids
UPDATE public.escalas_viaturas 
SET fiscal_ids = CASE 
  WHEN fiscal_id IS NOT NULL THEN ARRAY[fiscal_id]
  ELSE ARRAY[]::UUID[]
END;

-- Remover a coluna antiga
ALTER TABLE public.escalas_viaturas 
DROP COLUMN fiscal_id;

-- Recriar a política para funcionar com o novo campo de array
CREATE POLICY "Fiscal can view escalas where they are assigned" 
ON public.escalas_viaturas 
FOR SELECT 
USING (is_current_user_fiscal() AND auth.uid() = ANY(fiscal_ids));