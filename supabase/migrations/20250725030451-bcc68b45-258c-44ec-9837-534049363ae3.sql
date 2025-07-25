UPDATE system_settings 
SET value = jsonb_set(
  jsonb_set(
    value::jsonb,
    '{9,label}', '"Nome da Rua da Ocorrência"'  -- id:10 é o índice 9 no array
  ),
  '{18,label}', '"Classificação"'  -- id:19 é o índice 18 no array, revertendo de volta
)
WHERE key = 'form_fields_config';