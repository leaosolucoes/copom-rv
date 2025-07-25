UPDATE system_settings 
SET value = jsonb_set(
  jsonb_set(
    value::jsonb,
    '{9,label}', '"Nome da Rua da Ocorrência"'  -- Corrigir campo occurrence_address
  ),
  '{16,label}', '"Data da Ocorrência"'  -- Corrigir campo occurrence_date
)
WHERE key = 'form_fields_config';