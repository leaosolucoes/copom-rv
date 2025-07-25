UPDATE system_settings 
SET value = jsonb_set(
  jsonb_set(
    value::jsonb,
    '{3,label}', '"Nome da sua Rua"'
  ),
  '{9,label}', '"Nome da Rua da Ocorrência"'
)
WHERE key = 'form_fields_config';