-- Create missing motorista check function
CREATE OR REPLACE FUNCTION public.is_current_user_motorista()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'motorista' 
    AND is_active = true
  );
END;
$function$;

-- Create escala_status enum
CREATE TYPE escala_status AS ENUM ('ativa', 'encerrada', 'cancelada');

-- Create escalas_viaturas table
CREATE TABLE public.escalas_viaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viatura_id UUID NOT NULL,
  motorista_id UUID NOT NULL,
  fiscal_id UUID,
  data_servico DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_saida TIME NOT NULL,
  km_inicial INTEGER NOT NULL,
  km_final INTEGER,
  celular_funcional TEXT,
  status escala_status NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  encerrado_em TIMESTAMP WITH TIME ZONE,
  encerrado_por UUID,
  observacoes TEXT
);

-- Create escala_imprevistos table
CREATE TABLE public.escala_imprevistos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escala_id UUID NOT NULL,
  motorista_id UUID NOT NULL,
  descricao_imprevisto TEXT NOT NULL,
  fotos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS to escalas_viaturas
ALTER TABLE public.escalas_viaturas ENABLE ROW LEVEL SECURITY;

-- Add RLS to escala_imprevistos
ALTER TABLE public.escala_imprevistos ENABLE ROW LEVEL SECURITY;

-- Function to validate viatura availability
CREATE OR REPLACE FUNCTION public.validate_escala_viatura()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_escala_viatura_trigger
  BEFORE INSERT OR UPDATE ON public.escalas_viaturas
  FOR EACH ROW EXECUTE FUNCTION public.validate_escala_viatura();

-- Function to restrict motorista updates
CREATE OR REPLACE FUNCTION public.restrict_motorista_update_escalas()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for motorista restrictions
CREATE TRIGGER restrict_motorista_update_escalas_trigger
  BEFORE UPDATE ON public.escalas_viaturas
  FOR EACH ROW EXECUTE FUNCTION public.restrict_motorista_update_escalas();

-- Create updated_at trigger for escalas_viaturas
CREATE TRIGGER update_escalas_viaturas_updated_at
  BEFORE UPDATE ON public.escalas_viaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for escalas_viaturas
CREATE POLICY "Super admin can manage all escalas" ON public.escalas_viaturas
  FOR ALL USING (is_current_user_super_admin_custom());

CREATE POLICY "Admin can view all escalas" ON public.escalas_viaturas
  FOR SELECT USING (is_current_user_admin_custom());

CREATE POLICY "Fiscal can view escalas where they are assigned" ON public.escalas_viaturas
  FOR SELECT USING (is_current_user_fiscal() AND fiscal_id = auth.uid());

CREATE POLICY "Motorista can view own escalas" ON public.escalas_viaturas
  FOR SELECT USING (is_current_user_motorista() AND motorista_id = auth.uid());

CREATE POLICY "Motorista can insert own escalas" ON public.escalas_viaturas
  FOR INSERT WITH CHECK (is_current_user_motorista() AND motorista_id = auth.uid());

CREATE POLICY "Motorista can update own escalas" ON public.escalas_viaturas
  FOR UPDATE USING (is_current_user_motorista() AND motorista_id = auth.uid());

-- RLS Policies for escala_imprevistos
CREATE POLICY "Super admin can manage all imprevistos" ON public.escala_imprevistos
  FOR ALL USING (is_current_user_super_admin_custom());

CREATE POLICY "Admin can view all imprevistos" ON public.escala_imprevistos
  FOR SELECT USING (is_current_user_admin_custom());

CREATE POLICY "Motorista can manage own imprevistos" ON public.escala_imprevistos
  FOR ALL USING (is_current_user_motorista() AND motorista_id = auth.uid()) 
  WITH CHECK (is_current_user_motorista() AND motorista_id = auth.uid());