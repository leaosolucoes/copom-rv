-- Atualizar a configuração dos campos do formulário com nomenclatura em inglês (igual ao projeto original)
UPDATE system_settings 
SET value = '[
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
    "options": ["Pessoa Física", "Pessoa Jurídica", "Anônimo"],
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
    "name": "complainant_number",
    "label": "Número da residência",
    "type": "text",
    "required": false,
    "visible": true,
    "order_index": 6,
    "section": "complainant"
  },
  {
    "id": "7",
    "name": "complainant_block",
    "label": "Quadra",
    "type": "text",
    "required": false,
    "visible": false,
    "order_index": 7,
    "section": "complainant"
  },
  {
    "id": "8",
    "name": "complainant_lot",
    "label": "Lote",
    "type": "text",
    "required": false,
    "visible": false,
    "order_index": 8,
    "section": "complainant"
  },
  {
    "id": "9",
    "name": "occurrence_type",
    "label": "Tipo de Ocorrência",
    "type": "select",
    "options": ["Som Alto", "Música Alta", "Festa", "Construção Civil", "Comércio Irregular", "Estacionamento Irregular", "Lixo em Local Inadequado", "Poluição Sonora", "Poluição Ambiental", "Ocupação de Via Pública", "Animal Abandonado", "Trânsito Irregular", "Outros"],
    "required": true,
    "visible": true,
    "order_index": 1,
    "section": "occurrence"
  },
  {
    "id": "10",
    "name": "occurrence_address",
    "label": "Nome da Rua da Ocorrência",
    "type": "text",
    "required": true,
    "visible": true,
    "order_index": 2,
    "section": "occurrence"
  },
  {
    "id": "11",
    "name": "occurrence_neighborhood",
    "label": "Bairro da Ocorrência",
    "type": "text",
    "required": true,
    "visible": true,
    "order_index": 3,
    "section": "occurrence"
  },
  {
    "id": "12",
    "name": "occurrence_number",
    "label": "Número do local",
    "type": "text",
    "required": false,
    "visible": true,
    "order_index": 4,
    "section": "occurrence"
  },
  {
    "id": "13",
    "name": "occurrence_block",
    "label": "Quadra",
    "type": "text",
    "required": false,
    "visible": false,
    "order_index": 5,
    "section": "occurrence"
  },
  {
    "id": "14",
    "name": "occurrence_lot",
    "label": "Lote",
    "type": "text",
    "required": false,
    "visible": false,
    "order_index": 6,
    "section": "occurrence"
  },
  {
    "id": "15",
    "name": "occurrence_reference",
    "label": "Ponto de Referência",
    "type": "text",
    "required": false,
    "visible": true,
    "order_index": 7,
    "section": "occurrence"
  },
  {
    "id": "16",
    "name": "occurrence_date",
    "label": "Data da Ocorrência",
    "type": "date",
    "required": true,
    "visible": true,
    "order_index": 8,
    "section": "occurrence"
  },
  {
    "id": "17",
    "name": "occurrence_time",
    "label": "Horário da Ocorrência",
    "type": "time",
    "required": true,
    "visible": true,
    "order_index": 9,
    "section": "occurrence"
  },
  {
    "id": "18",
    "name": "narrative",
    "label": "Narrativa da Denúncia",
    "type": "textarea",
    "required": true,
    "visible": true,
    "order_index": 1,
    "section": "complaint"
  },
  {
    "id": "19",
    "name": "classification",
    "label": "Classificação",
    "type": "select",
    "options": ["Urgente", "Normal", "Baixa Prioridade"],
    "required": true,
    "visible": true,
    "order_index": 2,
    "section": "complaint"
  }
]'::jsonb
WHERE key = 'form_fields_config';