UPDATE system_settings 
SET value = jsonb_set(
  jsonb_set(
    value::jsonb,
    '{2,label}', '"Tipo de Local da Denúncia"'
  ),
  '{2,options}', '["Zona Urbana", "Zona Rural"]'
)
WHERE key = 'form_fields_config';