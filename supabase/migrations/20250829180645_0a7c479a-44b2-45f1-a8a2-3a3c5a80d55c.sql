-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.validate_escala_viatura()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conflicting_escala RECORD;
  entrada_timestamp TIMESTAMP WITH TIME ZONE;
  saida_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate full timestamps for the new scale
  entrada_timestamp := NEW.data_servico::timestamp + NEW.hora_entrada;
  saida_timestamp := CASE 
    WHEN NEW.hora_saida < NEW.hora_entrada 
    THEN (NEW.data_servico + INTERVAL '1 day')::timestamp + NEW.hora_saida
    ELSE NEW.data_servico::timestamp + NEW.hora_saida
  END;

  -- Check for conflicting scales
  SELECT * INTO conflicting_escala
  FROM public.escalas_viaturas ev
  WHERE ev.viatura_id = NEW.viatura_id
    AND ev.status = 'ativa'
    AND ev.id != COALESCE(NEW.id, gen_random_uuid()) -- Exclude current record on updates
    AND (
      -- New scale starts during existing scale
      (entrada_timestamp >= (ev.data_servico::timestamp + ev.hora_entrada) 
       AND entrada_timestamp < CASE 
         WHEN ev.hora_saida < ev.hora_entrada 
         THEN (ev.data_servico + INTERVAL '1 day')::timestamp + ev.hora_saida
         ELSE ev.data_servico::timestamp + ev.hora_saida
       END)
      OR
      -- New scale ends during existing scale  
      (saida_timestamp > (ev.data_servico::timestamp + ev.hora_entrada)
       AND saida_timestamp <= CASE 
         WHEN ev.hora_saida < ev.hora_entrada 
         THEN (ev.data_servico + INTERVAL '1 day')::timestamp + ev.hora_saida
         ELSE ev.data_servico::timestamp + ev.hora_saida
       END)
      OR
      -- New scale completely encompasses existing scale
      (entrada_timestamp <= (ev.data_servico::timestamp + ev.hora_entrada)
       AND saida_timestamp >= CASE 
         WHEN ev.hora_saida < ev.hora_entrada 
         THEN (ev.data_servico + INTERVAL '1 day')::timestamp + ev.hora_saida
         ELSE ev.data_servico::timestamp + ev.hora_saida
       END)
    );

  IF conflicting_escala.id IS NOT NULL THEN
    RAISE EXCEPTION 'Viatura já está escalada no período solicitado';
  END IF;

  RETURN NEW;
END;
$$;

-- Fix function search path for restrict motorista updates
CREATE OR REPLACE FUNCTION public.restrict_motorista_update_escalas()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Motoristas can only update their own escalas and only specific fields
  IF is_current_user_motorista() AND OLD.motorista_id != auth.uid() THEN
    RAISE EXCEPTION 'Motoristas só podem atualizar suas próprias escalas';
  END IF;
  
  -- Motoristas can only update these fields: km_final, status, observacoes, encerrado_em
  IF is_current_user_motorista() THEN
    NEW.viatura_id := OLD.viatura_id;
    NEW.motorista_id := OLD.motorista_id;
    NEW.fiscal_id := OLD.fiscal_id;
    NEW.data_servico := OLD.data_servico;
    NEW.hora_entrada := OLD.hora_entrada;
    NEW.hora_saida := OLD.hora_saida;
    NEW.km_inicial := OLD.km_inicial;
    NEW.celular_funcional := OLD.celular_funcional;
    NEW.created_at := OLD.created_at;
    NEW.encerrado_por := COALESCE(NEW.encerrado_por, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;