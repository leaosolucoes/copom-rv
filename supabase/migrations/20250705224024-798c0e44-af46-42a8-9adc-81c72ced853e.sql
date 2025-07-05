-- Corrigir configuração do formulário para mostrar campos obrigatórios
UPDATE public.system_settings 
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(
      value,
      '{15,visible}', 
      'true'::jsonb
    ),
    '{16,visible}', 
    'true'::jsonb
  ),
  '{17,visible}', 
  'true'::jsonb
)
WHERE key = 'form_fields_config';

-- Também corrigir os índices dos campos que estavam incorretos
UPDATE public.system_settings 
SET value = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'name' = 'classification' THEN elem || '{"visible": true}'::jsonb
      WHEN elem->>'name' = 'occurrence_date' THEN elem || '{"visible": true}'::jsonb  
      WHEN elem->>'name' = 'occurrence_time' THEN elem || '{"visible": true}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(value) AS elem
)
WHERE key = 'form_fields_config';