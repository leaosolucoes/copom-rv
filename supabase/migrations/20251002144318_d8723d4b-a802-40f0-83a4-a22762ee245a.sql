-- Função e trigger para atualizar km_atual quando checklist é criado
CREATE OR REPLACE FUNCTION public.update_viatura_km_on_checklist()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.viaturas 
  SET km_atual = NEW.km_inicial,
      updated_at = now()
  WHERE id = NEW.viatura_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_viatura_km_checklist
AFTER INSERT ON public.checklist_viaturas
FOR EACH ROW
EXECUTE FUNCTION public.update_viatura_km_on_checklist();

-- Função e trigger para atualizar km_atual quando escala é encerrada
CREATE OR REPLACE FUNCTION public.update_viatura_km_on_escala_encerrada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'encerrada' AND NEW.km_final IS NOT NULL AND 
     (OLD.status IS NULL OR OLD.status != 'encerrada') THEN
    UPDATE public.viaturas 
    SET km_atual = NEW.km_final,
        updated_at = now()
    WHERE id = NEW.viatura_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_viatura_km_escala
AFTER UPDATE ON public.escalas_viaturas
FOR EACH ROW
EXECUTE FUNCTION public.update_viatura_km_on_escala_encerrada();

-- Corrigir KM atual das viaturas existentes com base no último checklist
UPDATE public.viaturas v
SET km_atual = COALESCE(
  (SELECT km_inicial 
   FROM public.checklist_viaturas 
   WHERE viatura_id = v.id 
   ORDER BY created_at DESC 
   LIMIT 1),
  0
),
updated_at = now();