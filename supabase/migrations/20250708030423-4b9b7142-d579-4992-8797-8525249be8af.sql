-- Inserir classificações padrão no sistema
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'classifications', 
  '["Urgente", "Alta Prioridade", "Prioridade Normal", "Baixa Prioridade", "Para Análise"]'::jsonb, 
  'Lista de classificações disponíveis para denúncias'
) ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();