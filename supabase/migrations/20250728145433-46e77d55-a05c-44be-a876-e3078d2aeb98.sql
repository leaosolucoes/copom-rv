-- Restaurar configuração básica dos campos do formulário
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'form_fields_config',
  '[
    { 
      "id": "1", 
      "name": "complainant_name", 
      "label": "Nome do Denunciante", 
      "type": "text", 
      "required": true, 
      "visible": true, 
      "order_index": 1, 
      "section": "complainant" 
    },
    { 
      "id": "2", 
      "name": "complainant_phone", 
      "label": "Telefone", 
      "type": "tel", 
      "required": true, 
      "visible": true, 
      "order_index": 2, 
      "section": "complainant" 
    },
    { 
      "id": "3", 
      "name": "complainant_type", 
      "label": "Tipo do Denunciante", 
      "type": "select", 
      "options": ["Pessoa Física", "Pessoa Jurídica"], 
      "required": true, 
      "visible": true, 
      "order_index": 3, 
      "section": "complainant" 
    },
    { 
      "id": "4", 
      "name": "complainant_address", 
      "label": "Nome da sua Rua", 
      "type": "text", 
      "required": true, 
      "visible": true, 
      "order_index": 4, 
      "section": "complainant"
    },
    { 
      "id": "5", 
      "name": "complainant_neighborhood", 
      "label": "Nome do seu Bairro", 
      "type": "text", 
      "required": true, 
      "visible": true, 
      "order_index": 5, 
      "section": "complainant" 
    },
    { 
      "id": "6", 
      "name": "occurrence_type", 
      "label": "Tipo de Ocorrência", 
      "type": "select", 
      "options": ["Som Alto", "Música Alta", "Festa", "Construção Civil", "Comércio Irregular", "Estacionamento Irregular", "Lixo em Local Inadequado", "Poluição Sonora", "Outros"], 
      "required": true, 
      "visible": true, 
      "order_index": 1, 
      "section": "occurrence" 
    },
    { 
      "id": "7", 
      "name": "occurrence_address", 
      "label": "Nome da Rua da Ocorrência", 
      "type": "text", 
      "required": true, 
      "visible": true, 
      "order_index": 2, 
      "section": "occurrence"
    },
    { 
      "id": "8", 
      "name": "occurrence_neighborhood", 
      "label": "Bairro da Ocorrência", 
      "type": "text", 
      "required": true, 
      "visible": true, 
      "order_index": 3, 
      "section": "occurrence" 
    },
    { 
      "id": "9", 
      "name": "narrative", 
      "label": "Narrativa da Denúncia", 
      "type": "textarea", 
      "required": true, 
      "visible": true, 
      "order_index": 1, 
      "section": "complaint" 
    }
  ]'::jsonb,
  'Configuração dos campos do formulário público'
) 
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();