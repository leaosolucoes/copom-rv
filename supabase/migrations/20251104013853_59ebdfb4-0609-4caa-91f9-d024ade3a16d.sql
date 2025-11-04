
-- Remover a constraint única do campo path
ALTER TABLE api_endpoints DROP CONSTRAINT IF EXISTS api_endpoints_path_key;

-- Adicionar constraint única composta (path + method)
ALTER TABLE api_endpoints ADD CONSTRAINT api_endpoints_path_method_unique UNIQUE (path, method);

-- Limpar endpoints existentes
DELETE FROM api_endpoints;

-- Inserir todos os 21 endpoints da API
INSERT INTO api_endpoints (path, method, description, rate_limit, active) VALUES
-- Autenticação/Tokens (3)
('/api-auth/generate-token', 'POST', 'Gera novo token da API com permissões', 60, true),
('/api-auth/list-tokens', 'GET', 'Lista todos os tokens da API ativos', 100, true),
('/api-auth/validate-token', 'POST', 'Valida token da API enviado', 600, true),
-- Denúncias/Complaints (6)
('/api-complaints', 'GET', 'Lista denúncias com filtros e paginação', 600, true),
('/api-complaints', 'POST', 'Cria nova denúncia no sistema', 200, true),
('/api-complaints/{id}', 'GET', 'Obtém detalhes completos de uma denúncia', 600, true),
('/api-complaints/{id}', 'PUT', 'Atualiza denúncia completa', 600, true),
('/api-complaints/{id}/status', 'PUT', 'Atualiza apenas o status de denúncia', 600, true),
('/api-complaints/{id}', 'DELETE', 'Remove denúncia do sistema', 600, true),
-- Usuários (4)
('/api-users', 'GET', 'Lista usuários com filtros e paginação', 600, true),
('/api-users', 'POST', 'Cria novo usuário no sistema', 200, true),
('/api-users/{id}', 'GET', 'Obtém detalhes de um usuário específico', 600, true),
('/api-users/{id}', 'PUT', 'Atualiza dados do usuário', 600, true),
-- CNPJ (2)
('/api-cnpj/{cnpj}', 'GET', 'Consulta dados cadastrais da CNPJ na Receita Federal', 60, true),
('/api-cnpj/{cnpj}/pdf', 'GET', 'Gera PDF com dados de CNPJ consultado', 60, true),
-- Configurações (3)
('/api-settings', 'GET', 'Lista todas as configurações do sistema', 240, true),
('/api-settings/{key}', 'GET', 'Obtém configuração específica por chave', 240, true),
('/api-settings/{key}', 'PUT', 'Atualiza valor de configuração específica', 120, true),
-- Upload (3)
('/api-upload/media', 'POST', 'Faz upload de mídia (fotos e vídeos)', 600, true),
('/api-upload/{id}', 'GET', 'Baixa arquivo específico do bucket', 600, true),
('/api-upload/{id}', 'DELETE', 'Remove arquivo específico do bucket', 600, true);
