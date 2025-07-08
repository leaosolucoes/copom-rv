# API Endpoint: POST /api-complaints

## Descrição
Criar nova denúncia no sistema de ouvidoria/fiscalização.

## Configuração
- **Método:** `POST`
- **URL:** `https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-complaints`
- **Autenticação:** Token de API obrigatório
- **Scope requerido:** `complaints:write`
- **Rate Limit:** 200 requisições/hora

## Headers Obrigatórios
```
Content-Type: application/json
x-api-token: {seu_token_aqui}
```

## Corpo da Requisição (JSON)

### Campos Obrigatórios

#### 📝 Dados do Denunciante
```json
{
  "complainant_name": "string",           // Nome completo do denunciante
  "complainant_phone": "string",          // Telefone com DDD (somente números)
  "complainant_type": "string",           // Tipo: "pessoa_fisica" | "pessoa_juridica" | "anonimo"
  "complainant_address": "string",        // Endereço completo do denunciante
  "complainant_neighborhood": "string"    // Bairro do denunciante
}
```

#### 🏢 Dados da Ocorrência
```json
{
  "occurrence_type": "string",            // Tipo de ocorrência (ex: "poluicao_sonora", "construcao_irregular")
  "occurrence_address": "string",         // Endereço onde ocorreu o fato
  "occurrence_neighborhood": "string",    // Bairro da ocorrência
  "narrative": "string",                  // Relato detalhado da ocorrência (máx 5000 caracteres)
  "classification": "string"              // Classificação da denúncia (urgente, normal, baixa)
}
```

### Campos Opcionais

#### 📍 Detalhes de Endereço
```json
{
  // Denunciante
  "complainant_number": "string",         // Número da residência/estabelecimento
  "complainant_block": "string",          // Quadra (para endereços rurais/loteamentos)
  "complainant_lot": "string",            // Lote (para endereços rurais/loteamentos)
  
  // Ocorrência
  "occurrence_number": "string",          // Número do local da ocorrência
  "occurrence_block": "string",           // Quadra do local da ocorrência
  "occurrence_lot": "string",             // Lote do local da ocorrência
  "occurrence_reference": "string"        // Ponto de referência próximo
}
```

#### ⏰ Data e Hora
```json
{
  "occurrence_date": "YYYY-MM-DD",        // Data da ocorrência (formato ISO)
  "occurrence_time": "HH:MM:SS"           // Hora da ocorrência (24h)
}
```

#### 📱 Mídia e Anexos
```json
{
  "photos": ["string"],                   // Array de URLs de fotos enviadas
  "videos": ["string"]                    // Array de URLs de vídeos enviados
}
```

#### 🌐 Dados Técnicos (preenchidos automaticamente)
```json
{
  "user_location": {                      // Geolocalização (se disponível)
    "latitude": "number",
    "longitude": "number",
    "accuracy": "number"
  },
  "user_device_type": "string",           // desktop | mobile | tablet
  "user_browser": "string",               // Nome do navegador
  "user_agent": "string"                  // User agent completo
}
```

## Exemplo de Requisição Completa

```bash
curl -X POST \
  https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-complaints \
  -H "Content-Type: application/json" \
  -H "x-api-token: sat_production_abc123..." \
  -d '{
    "complainant_name": "João Silva Santos",
    "complainant_phone": "11999887766",
    "complainant_type": "pessoa_fisica",
    "complainant_address": "Rua das Flores, 123",
    "complainant_number": "123",
    "complainant_neighborhood": "Centro",
    "occurrence_type": "poluicao_sonora",
    "occurrence_address": "Rua do Barulho, 456",
    "occurrence_number": "456",
    "occurrence_neighborhood": "Vila Nova",
    "occurrence_reference": "Próximo ao supermercado",
    "occurrence_date": "2025-01-08",
    "occurrence_time": "22:30:00",
    "narrative": "Estabelecimento comercial com som muito alto durante a madrugada, perturbando o sossego dos moradores da região. O problema acontece principalmente aos finais de semana.",
    "classification": "urgente",
    "photos": [
      "https://storage.supabase.co/object/public/complaint-media/photo1.jpg",
      "https://storage.supabase.co/object/public/complaint-media/photo2.jpg"
    ],
    "user_location": {
      "latitude": -23.5505,
      "longitude": -46.6333,
      "accuracy": 10
    }
  }'
```

## Respostas da API

### ✅ Sucesso (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "system_identifier": "DEN-2025-001234",
    "status": "nova",
    "created_at": "2025-01-08T15:30:00.000Z",
    "message": "Denúncia criada com sucesso"
  }
}
```

### ❌ Erro de Validação (400 Bad Request)
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "complainant_name": "Campo obrigatório",
    "narrative": "Narrativa muito longa (máximo 5000 caracteres)"
  }
}
```

### ❌ Erro de Autenticação (401 Unauthorized)
```json
{
  "success": false,
  "error": "Invalid or missing API token"
}
```

### ❌ Erro de Permissão (403 Forbidden)
```json
{
  "success": false,
  "error": "Insufficient permissions. Required scope: complaints:write"
}
```

### ❌ Rate Limit (429 Too Many Requests)
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": {
    "limit": 200,
    "window": "1 hour",
    "retry_after": 3600
  }
}
```

## Tipos de Ocorrência Disponíveis

```
- "poluicao_sonora"          // Poluição sonora/perturbação do sossego
- "construcao_irregular"     // Construção sem alvará/irregular
- "poluicao_ambiental"       // Poluição do ar, água, solo
- "ocupacao_via_publica"     // Ocupação irregular de calçadas/ruas
- "comercio_irregular"       // Comércio ambulante irregular
- "descarte_irregular"       // Descarte irregular de lixo/entulho
- "animal_abandonado"        // Animais abandonados/maus-tratos
- "transito_irregular"       // Infrações de trânsito
- "outros"                   // Outras ocorrências
```

## Classificações Disponíveis

```
- "urgente"    // Requer ação imediata
- "normal"     // Prazo normal de atendimento
- "baixa"      // Pode ser tratada com menor prioridade
```

## Tipos de Denunciante

```
- "pessoa_fisica"    // Pessoa física identificada
- "pessoa_juridica"  // Pessoa jurídica (empresa, ONG, etc.)
- "anonimo"          // Denúncia anônima
```

## Validações Automáticas

1. **Telefone:** Apenas números, DDD obrigatório
2. **Narrativa:** Máximo 5000 caracteres
3. **Data:** Não pode ser futura
4. **Fotos/Vídeos:** URLs válidas do storage do Supabase
5. **Campos obrigatórios:** Validação de presença
6. **Rate Limit:** 200 requisições por hora por token

## Processamento Automático

Após a criação da denúncia:
1. **ID único** é gerado automaticamente
2. **Identificador do sistema** é criado (ex: DEN-2025-001234)
3. **Status inicial** definido como "nova"
4. **Notificação WhatsApp** enviada (se configurado)
5. **Log de auditoria** registrado
6. **Timestamps** de criação definidos

## Notas Importantes

- O IP do usuário é capturado automaticamente
- Dados de geolocalização são opcionais mas recomendados
- Fotos e vídeos devem ser enviadas primeiro via `/api-upload`
- A denúncia fica com status "nova" até ser processada por um atendente
- Todas as denúncias ficam disponíveis para consulta via GET `/api-complaints`