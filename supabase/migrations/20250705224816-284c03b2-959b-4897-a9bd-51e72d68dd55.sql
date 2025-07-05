-- Corrigir campos obrigatórios que estão invisíveis
UPDATE public.system_settings 
SET value = (
  SELECT jsonb_agg(
    CASE 
      -- Se o campo é obrigatório, deve ser visível
      WHEN (elem->>'required')::boolean = true AND (elem->>'visible')::boolean = false THEN 
        elem || '{"visible": true}'::jsonb
      -- Campos específicos que devem ser visíveis por padrão
      WHEN elem->>'name' IN ('complainant_number', 'occurrence_number') THEN 
        elem || '{"visible": true}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(value) AS elem
)
WHERE key = 'form_fields_config';