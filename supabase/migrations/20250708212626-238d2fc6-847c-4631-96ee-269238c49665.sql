-- Limpar tabela de endpoints existentes
DELETE FROM api_endpoints;

-- Inserir configuração completa de endpoints da API

-- ENDPOINTS DE AUTENTICAÇÃO E TOKENS
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-auth/generate-token', 'POST', 'Gerar novo token de API para integração', ARRAY['token:create'], 10, true),
('/api-auth/validate-token', 'POST', 'Validar token de API existente', ARRAY['token:validate'], 1000, true),
('/api-auth/refresh-token', 'POST', 'Renovar token de API existente', ARRAY['token:refresh'], 100, true),
('/api-auth/revoke-token', 'DELETE', 'Revogar token de API específico', ARRAY['token:delete'], 50, true),
('/api-auth/list-tokens', 'GET', 'Listar todos os tokens de API do usuário', ARRAY['token:read'], 500, true);

-- ENDPOINTS DE USUÁRIOS
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-users', 'GET', 'Listar todos os usuários do sistema com paginação', ARRAY['users:read'], 1000, true),
('/api-users/{id}', 'GET', 'Obter detalhes de um usuário específico', ARRAY['users:read'], 500, true),
('/api-users', 'POST', 'Criar novo usuário no sistema', ARRAY['users:write'], 100, true),
('/api-users/{id}', 'PUT', 'Atualizar dados de usuário existente', ARRAY['users:write'], 200, true),
('/api-users/{id}', 'DELETE', 'Excluir usuário do sistema permanentemente', ARRAY['users:delete'], 50, true),
('/api-users/{id}/activate', 'PATCH', 'Ativar conta de usuário', ARRAY['users:write'], 100, true),
('/api-users/{id}/deactivate', 'PATCH', 'Desativar conta de usuário', ARRAY['users:write'], 100, true),
('/api-users/search', 'GET', 'Buscar usuários por filtros específicos', ARRAY['users:read'], 200, true);

-- ENDPOINTS DE DENÚNCIAS
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-complaints', 'GET', 'Listar denúncias com filtros e paginação', ARRAY['complaints:read'], 1000, true),
('/api-complaints/{id}', 'GET', 'Obter detalhes completos de uma denúncia', ARRAY['complaints:read'], 500, true),
('/api-complaints', 'POST', 'Criar nova denúncia no sistema', ARRAY['complaints:write'], 200, true),
('/api-complaints/{id}', 'PUT', 'Atualizar dados de denúncia existente', ARRAY['complaints:write'], 100, true),
('/api-complaints/{id}', 'DELETE', 'Arquivar denúncia (exclusão lógica)', ARRAY['complaints:delete'], 50, true),
('/api-complaints/{id}/status', 'PATCH', 'Alterar status da denúncia', ARRAY['complaints:write'], 200, true),
('/api-complaints/{id}/assign', 'PATCH', 'Atribuir denúncia a um atendente', ARRAY['complaints:write'], 100, true),
('/api-complaints/export', 'GET', 'Exportar denúncias em formato CSV/Excel', ARRAY['complaints:read'], 10, true),
('/api-complaints/statistics', 'GET', 'Obter estatísticas das denúncias', ARRAY['complaints:read'], 100, true),
('/api-complaints/search', 'GET', 'Buscar denúncias por critérios específicos', ARRAY['complaints:read'], 200, true);

-- ENDPOINTS DE CNPJ
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-cnpj/{cnpj}', 'GET', 'Consultar dados completos de CNPJ na Receita Federal', ARRAY['cnpj:read'], 300, true),
('/api-cnpj/{cnpj}/validate', 'GET', 'Validar formato e existência de CNPJ', ARRAY['cnpj:read'], 500, true),
('/api-cnpj/search', 'GET', 'Buscar empresa por nome ou razão social', ARRAY['cnpj:read'], 100, true);

-- ENDPOINTS DE CONFIGURAÇÕES
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-settings', 'GET', 'Obter todas as configurações do sistema', ARRAY['settings:read'], 1000, true),
('/api-settings/{key}', 'GET', 'Obter configuração específica por chave', ARRAY['settings:read'], 500, true),
('/api-settings', 'POST', 'Criar nova configuração no sistema', ARRAY['settings:write'], 100, true),
('/api-settings/{key}', 'PUT', 'Atualizar configuração existente', ARRAY['settings:write'], 200, true),
('/api-settings/{key}', 'DELETE', 'Remover configuração do sistema', ARRAY['settings:write'], 50, true),
('/api-settings/reset', 'POST', 'Resetar configurações para padrão', ARRAY['settings:write'], 10, true);

-- ENDPOINTS DE UPLOAD E ARQUIVOS
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-upload', 'POST', 'Upload de arquivo único (imagem, vídeo, documento)', ARRAY['files:write'], 200, true),
('/api-upload/multiple', 'POST', 'Upload de múltiplos arquivos simultaneamente', ARRAY['files:write'], 100, true),
('/api-upload/{id}', 'GET', 'Obter informações de arquivo específico', ARRAY['files:read'], 500, true),
('/api-upload/{id}', 'DELETE', 'Excluir arquivo do sistema', ARRAY['files:delete'], 100, true),
('/api-upload/list', 'GET', 'Listar todos os arquivos do usuário', ARRAY['files:read'], 200, true);

-- ENDPOINTS DE RELATÓRIOS
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-reports/complaints', 'GET', 'Relatório detalhado de denúncias', ARRAY['reports:read'], 50, true),
('/api-reports/users', 'GET', 'Relatório de atividade dos usuários', ARRAY['reports:read'], 50, true),
('/api-reports/performance', 'GET', 'Relatório de performance do sistema', ARRAY['reports:read'], 50, true),
('/api-reports/custom', 'POST', 'Gerar relatório personalizado', ARRAY['reports:create'], 20, true);

-- ENDPOINTS DE NOTIFICAÇÕES
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-notifications', 'GET', 'Listar notificações do usuário', ARRAY['notifications:read'], 500, true),
('/api-notifications/{id}', 'PATCH', 'Marcar notificação como lida', ARRAY['notifications:write'], 200, true),
('/api-notifications/send', 'POST', 'Enviar notificação para usuários', ARRAY['notifications:send'], 100, true),
('/api-notifications/whatsapp', 'POST', 'Enviar notificação via WhatsApp', ARRAY['notifications:whatsapp'], 50, true);

-- ENDPOINTS DE AUDITORIA
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-audit/logs', 'GET', 'Consultar logs de auditoria do sistema', ARRAY['audit:read'], 200, true),
('/api-audit/user/{id}', 'GET', 'Logs de auditoria de usuário específico', ARRAY['audit:read'], 100, true),
('/api-audit/export', 'GET', 'Exportar logs de auditoria', ARRAY['audit:export'], 10, true);

-- ENDPOINTS DE TIPOS DE OCORRÊNCIA
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-occurrence-types', 'GET', 'Listar tipos de ocorrência disponíveis', ARRAY['*'], 1000, true),
('/api-occurrence-types', 'POST', 'Criar novo tipo de ocorrência', ARRAY['settings:write'], 50, true),
('/api-occurrence-types/{id}', 'PUT', 'Atualizar tipo de ocorrência', ARRAY['settings:write'], 100, true),
('/api-occurrence-types/{id}', 'DELETE', 'Remover tipo de ocorrência', ARRAY['settings:write'], 20, true);

-- ENDPOINT DE SAÚDE DO SISTEMA
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit_per_hour, is_enabled) VALUES
('/api-health', 'GET', 'Verificar saúde e status da API', ARRAY['*'], 2000, true),
('/api-health/database', 'GET', 'Status específico do banco de dados', ARRAY['system:read'], 500, true),
('/api-health/services', 'GET', 'Status de serviços externos', ARRAY['system:read'], 100, true);