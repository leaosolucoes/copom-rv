-- Inserir apenas alguns endpoints essenciais se não existirem
INSERT INTO public.api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) 
SELECT * FROM (VALUES
  ('/api-users', 'GET', 'Listar usuários do sistema', ARRAY['users:read'], 1000, true),
  ('/api-users', 'POST', 'Criar novo usuário', ARRAY['users:write'], 100, true),
  ('/api-complaints', 'GET', 'Listar denúncias', ARRAY['complaints:read'], 1000, true),
  ('/api-complaints', 'POST', 'Criar nova denúncia', ARRAY['complaints:write'], 200, true),
  ('/api-cnpj/{cnpj}', 'GET', 'Consultar dados do CNPJ', ARRAY['cnpj:read'], 500, true),
  ('/api-settings', 'GET', 'Obter configurações do sistema', ARRAY['settings:read'], 1000, true),
  ('/api-upload', 'POST', 'Upload de arquivos', ARRAY['files:write'], 200, true),
  ('/api-auth/generate-token', 'POST', 'Gerar token de API', ARRAY['token:create'], 10, true)
) AS new_endpoints(path, method, description, required_scopes, rate_limit_per_hour, is_enabled)
WHERE NOT EXISTS (
  SELECT 1 FROM public.api_endpoints WHERE api_endpoints.path = new_endpoints.path AND api_endpoints.method = new_endpoints.method
);