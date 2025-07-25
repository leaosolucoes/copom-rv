-- Atualizar corretamente o campo "Endereço da Ocorrência" para "Nome da Rua da Ocorrência"
UPDATE system_settings 
SET value = jsonb_set(
  value,
  '{9,label}',  -- index 9 corresponde ao campo com id:10
  '"Nome da Rua da Ocorrência"'
)
WHERE key = 'form_fields_config';