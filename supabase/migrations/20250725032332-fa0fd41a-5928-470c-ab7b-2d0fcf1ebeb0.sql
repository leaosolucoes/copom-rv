UPDATE system_settings 
SET value = jsonb_set(
  value::jsonb,
  '{9,label}', '"Nome da Rua da Ocorrência"'  -- Campo occurrence_address (índice 9)
)
WHERE key = 'form_fields_config';