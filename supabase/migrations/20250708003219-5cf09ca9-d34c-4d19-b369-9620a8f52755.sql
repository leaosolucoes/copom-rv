-- Adicionar novo status "a_verificar" ao enum
ALTER TYPE complaint_status ADD VALUE 'a_verificar';

-- Atualizar as políticas RLS para esconder denúncias "a_verificar" dos atendentes
DROP POLICY IF EXISTS "Flexible complaints access" ON public.complaints;

-- Nova política que esconde denúncias "a_verificar" dos atendentes
CREATE POLICY "Complaints access by role" ON public.complaints
FOR SELECT USING (
  CASE 
    -- Super admin e admin podem ver tudo
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin') 
      AND is_active = true
    ) THEN true
    -- Atendentes não podem ver denúncias com status "a_verificar"
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'atendente' 
      AND is_active = true
    ) THEN status != 'a_verificar'
    -- Acesso público para outras situações
    ELSE true
  END
);

-- Adicionar configuração para controle de som
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'sound_notifications_enabled', 
  'true'::jsonb, 
  'Controla se notificações sonoras estão ativadas para novas denúncias'
) ON CONFLICT (key) DO NOTHING;