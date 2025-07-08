-- Inserir endpoints básicos da API
INSERT INTO public.api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-users', 'GET', 'Listar usuários do sistema', ARRAY['users:read'], 1000, true),
('/api-users', 'POST', 'Criar novo usuário', ARRAY['users:write'], 100, true),
('/api-users/{id}', 'PUT', 'Atualizar usuário existente', ARRAY['users:write'], 100, true),
('/api-users/{id}', 'DELETE', 'Excluir usuário', ARRAY['users:delete'], 50, true),

('/api-complaints', 'GET', 'Listar denúncias', ARRAY['complaints:read'], 1000, true),
('/api-complaints', 'POST', 'Criar nova denúncia', ARRAY['complaints:write'], 200, true),
('/api-complaints/{id}', 'PUT', 'Atualizar denúncia', ARRAY['complaints:write'], 100, true),
('/api-complaints/{id}', 'DELETE', 'Excluir denúncia', ARRAY['complaints:delete'], 50, true),

('/api-cnpj/{cnpj}', 'GET', 'Consultar dados do CNPJ', ARRAY['cnpj:read'], 500, true),

('/api-settings', 'GET', 'Obter configurações do sistema', ARRAY['settings:read'], 1000, true),
('/api-settings', 'POST', 'Criar configuração', ARRAY['settings:write'], 100, true),
('/api-settings/{key}', 'PUT', 'Atualizar configuração', ARRAY['settings:write'], 100, true),

('/api-upload', 'POST', 'Upload de arquivos', ARRAY['files:write'], 200, true),
('/api-upload/{filename}', 'DELETE', 'Excluir arquivo', ARRAY['files:delete'], 50, true),

('/api-auth/generate-token', 'POST', 'Gerar token de API', ARRAY['token:create'], 10, true),
('/api-auth/validate-token', 'POST', 'Validar token de API', ARRAY['token:validate'], 1000, true),
('/api-auth/refresh-token', 'POST', 'Renovar token de API', ARRAY['token:refresh'], 100, true);