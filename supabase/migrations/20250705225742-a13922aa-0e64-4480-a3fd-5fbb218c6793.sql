-- Tornar visíveis os campos obrigatórios que estão ocultos
UPDATE public.system_settings 
SET value = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'name' IN ('occurrence_date', 'occurrence_time') THEN 
        elem || '{"visible": true, "required": true}'::jsonb
      WHEN elem->>'name' = 'classification' THEN 
        elem || '{"visible": true, "required": true}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(value) AS elem
)
WHERE key = 'form_fields_config';