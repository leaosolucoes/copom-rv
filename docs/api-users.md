# API Endpoint: Gerenciamento de Usuários

## Descrição
API para gerenciar usuários no sistema de ouvidoria/fiscalização.

## Configuração
- **URL Base:** `https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-users`
- **Autenticação:** Token de API obrigatório
- **Scopes requeridos:** `users:read`, `users:write`, `users:delete`
- **Rate Limit:** 1000 requisições/hora

## Headers Obrigatórios
```
Content-Type: application/json
x-api-token: {seu_token_aqui}
```

## Endpoints Disponíveis

### 📋 Listar Usuários
```bash
curl -H "x-api-token: seu_token_aqui" \
     -H "Content-Type: application/json" \
     https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-users
```

**Parâmetros opcionais:**
- `page`: Página (padrão: 1)
- `limit`: Itens por página (máx: 100, padrão: 50)
- `search`: Busca por nome ou email
- `role`: Filtrar por função (`super_admin`, `admin`, `atendente`, `fiscal`)
- `is_active`: Filtrar por status (`true`/`false`)

### 👤 Obter Usuário Específico
```bash
curl -H "x-api-token: seu_token_aqui" \
     -H "Content-Type: application/json" \
     https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-users/{user_id}
```

### ➕ Criar Usuário
```bash
curl -X POST \
     -H "x-api-token: seu_token_aqui" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "usuario@exemplo.com",
       "full_name": "Nome Completo",
       "password": "senha123",
       "role": "atendente",
       "is_active": true
     }' \
     https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-users
```

### ✏️ Atualizar Usuário
```bash
curl -X PUT \
     -H "x-api-token: seu_token_aqui" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "usuario@exemplo.com",
       "full_name": "Nome Atualizado",
       "role": "admin",
       "is_active": true
     }' \
     https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-users/{user_id}
```

### 🗑️ Desativar Usuário
```bash
curl -X DELETE \
     -H "x-api-token: seu_token_aqui" \
     -H "Content-Type: application/json" \
     https://smytdnkylauxocqrkchn.supabase.co/functions/v1/api-users/{user_id}
```

## Respostas da API

### ✅ Sucesso - Listar Usuários (200)
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "usuario@exemplo.com",
      "full_name": "Nome Completo",
      "role": "atendente",
      "is_active": true,
      "created_at": "2025-01-08T15:30:00.000Z",
      "last_login": "2025-01-08T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

### ✅ Sucesso - Criar Usuário (201)
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "full_name": "Nome Completo",
    "role": "atendente",
    "is_active": true
  }
}
```

### ❌ Erro de Validação (400)
```json
{
  "error": "Email, nome completo e senha são obrigatórios"
}
```

### ❌ Erro de Autenticação (401)
```json
{
  "error": "Token da API inválido ou expirado"
}
```

### ❌ Erro de Permissão (403)
```json
{
  "error": "Token não possui permissões necessárias para usuários"
}
```

## Funções de Usuário Disponíveis
- `super_admin`: Acesso total ao sistema
- `admin`: Gerenciamento de usuários e configurações
- `atendente`: Atendimento de denúncias
- `fiscal`: Fiscalização e verificação

## Validações
- Email deve ser único no sistema
- Senha mínima de 6 caracteres (apenas na criação)
- Nome completo obrigatório
- Função deve ser uma das disponíveis