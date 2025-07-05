-- Atualizar tipos de ocorrência e classificações para Rio Verde, GO
INSERT INTO public.system_settings (key, value, description)
VALUES 
(
  'public_occurrence_types',
  '[
    "Som Alto",
    "Música Alta",
    "Festa/Evento",
    "Construção Civil",
    "Estabelecimento Comercial",
    "Bar/Lanchonete",
    "Oficina Mecânica",
    "Residência",
    "Via Pública",
    "Veículo com Som Alto",
    "Carro de Som",
    "Trio Elétrico",
    "Igreja/Templo Religioso",
    "Escola/Instituição",
    "Indústria/Fábrica",
    "Comércio Ambulante",
    "Propaganda Sonora",
    "Animais (Latidos)",
    "Outros"
  ]'::jsonb,
  'Tipos de ocorrência para formulários públicos de Rio Verde, GO'
),
(
  'public_complaint_types',
  '[
    "Pessoa Física",
    "Pessoa Jurídica",
    "Anônimo"
  ]'::jsonb,
  'Tipos de denunciante para formulários públicos'
),
(
  'public_classifications',
  '[
    "Urgente",
    "Alta Prioridade", 
    "Prioridade Normal",
    "Baixa Prioridade",
    "Para Análise"
  ]'::jsonb,
  'Classificações de prioridade para denúncias'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();