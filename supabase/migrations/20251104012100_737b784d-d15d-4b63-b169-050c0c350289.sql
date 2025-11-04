-- =====================================================
-- FASE 2: CONFIGURAÇÕES DO SISTEMA
-- =====================================================

-- 1. Tipos de Ocorrência (13 tipos)
INSERT INTO system_settings (key, value, description)
VALUES (
  'public_occurrence_types',
  '[
    {"name": "Som Alto", "visible": true},
    {"name": "Música Alta", "visible": true},
    {"name": "Festa", "visible": true},
    {"name": "Construção Civil", "visible": true},
    {"name": "Comércio Irregular", "visible": true},
    {"name": "Estacionamento Irregular", "visible": true},
    {"name": "Lixo em Local Inadequado", "visible": true},
    {"name": "Poluição Sonora", "visible": true},
    {"name": "Poluição Ambiental", "visible": true},
    {"name": "Ocupação de Via Pública", "visible": true},
    {"name": "Animal Abandonado", "visible": true},
    {"name": "Trânsito Irregular", "visible": true},
    {"name": "Outros", "visible": true}
  ]'::jsonb,
  'Tipos de ocorrências disponíveis no formulário público'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- 2. Classificações (3 tipos)
INSERT INTO system_settings (key, value, description)
VALUES (
  'classifications',
  '["Urgente", "Normal", "Baixa Prioridade"]'::jsonb,
  'Classificações de prioridade das denúncias'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- 3. Tipos de Denunciante (4 tipos)
INSERT INTO system_settings (key, value, description)
VALUES (
  'public_complaint_types',
  '["Pessoa Física", "Pessoa Jurídica", "Anônimo", "Zona Rural"]'::jsonb,
  'Tipos de denunciante disponíveis no formulário público'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- 4. Bairros (exemplos - deve ser customizado por cidade)
INSERT INTO system_settings (key, value, description)
VALUES (
  'neighborhoods',
  '["Centro", "Setor Norte", "Setor Sul", "Setor Leste", "Setor Oeste", "Vila Aurora", "Jardim América", "Zona Rural"]'::jsonb,
  'Lista de bairros da cidade'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- 5. Configuração completa dos 19 campos do formulário
INSERT INTO system_settings (key, value, description)
VALUES (
  'form_fields_config',
  '[
    {
      "name": "complainant_name",
      "label": "Nome do Denunciante",
      "type": "text",
      "required": true,
      "visible": true,
      "order": 1,
      "section": "denunciante"
    },
    {
      "name": "complainant_phone",
      "label": "Telefone",
      "type": "tel",
      "required": true,
      "visible": true,
      "order": 2,
      "section": "denunciante"
    },
    {
      "name": "complainant_type",
      "label": "Tipo do Denunciante",
      "type": "select",
      "required": true,
      "visible": true,
      "order": 3,
      "section": "denunciante"
    },
    {
      "name": "complainant_address",
      "label": "Nome da sua Rua",
      "type": "text",
      "required": true,
      "visible": true,
      "order": 4,
      "section": "denunciante"
    },
    {
      "name": "complainant_neighborhood",
      "label": "Nome do seu Bairro",
      "type": "text",
      "required": true,
      "visible": true,
      "order": 5,
      "section": "denunciante"
    },
    {
      "name": "complainant_number",
      "label": "Número da residência",
      "type": "text",
      "required": false,
      "visible": true,
      "order": 6,
      "section": "denunciante"
    },
    {
      "name": "complainant_block",
      "label": "Quadra",
      "type": "text",
      "required": false,
      "visible": false,
      "order": 7,
      "section": "denunciante"
    },
    {
      "name": "complainant_lot",
      "label": "Lote",
      "type": "text",
      "required": false,
      "visible": false,
      "order": 8,
      "section": "denunciante"
    },
    {
      "name": "occurrence_type",
      "label": "Tipo de Ocorrência",
      "type": "select",
      "required": true,
      "visible": true,
      "order": 9,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_address",
      "label": "Nome da Rua da Ocorrência",
      "type": "text",
      "required": true,
      "visible": true,
      "order": 10,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_neighborhood",
      "label": "Bairro da Ocorrência",
      "type": "text",
      "required": true,
      "visible": true,
      "order": 11,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_number",
      "label": "Número do local",
      "type": "text",
      "required": false,
      "visible": true,
      "order": 12,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_block",
      "label": "Quadra",
      "type": "text",
      "required": false,
      "visible": false,
      "order": 13,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_lot",
      "label": "Lote",
      "type": "text",
      "required": false,
      "visible": false,
      "order": 14,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_reference",
      "label": "Ponto de Referência",
      "type": "text",
      "required": false,
      "visible": true,
      "order": 15,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_date",
      "label": "Data da Ocorrência",
      "type": "date",
      "required": true,
      "visible": true,
      "order": 16,
      "section": "ocorrencia"
    },
    {
      "name": "occurrence_time",
      "label": "Horário da Ocorrência",
      "type": "time",
      "required": true,
      "visible": true,
      "order": 17,
      "section": "ocorrencia"
    },
    {
      "name": "description",
      "label": "Narrativa da Denúncia",
      "type": "textarea",
      "required": true,
      "visible": true,
      "order": 18,
      "section": "denuncia"
    },
    {
      "name": "classification",
      "label": "Classificação",
      "type": "select",
      "required": true,
      "visible": true,
      "order": 19,
      "section": "denuncia"
    }
  ]'::jsonb,
  'Configuração completa dos 19 campos do formulário de denúncias'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();