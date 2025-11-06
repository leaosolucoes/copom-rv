import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/secureLogger';
import { 
  Key, 
  Activity, 
  FileText, 
  Copy, 
  Plus, 
  Eye, 
  EyeOff, 
  Download,
  AlertCircle,
  CheckCircle,
  Settings,
  PlayCircle,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ApiToken {
  id: string;
  name: string;
  token: string;
  permissions: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  token_id: string;
  request_body: any;
  response_body: any;
}

interface ApiEndpoint {
  id: string;
  path: string;
  method: string;
  description: string | null;
  rate_limit: number;
  active: boolean;
  created_at: string;
}

export function ApiManagement() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [newTokenData, setNewTokenData] = useState({
    token_name: '',
    token_type: 'sandbox' as 'sandbox' | 'production',
    scopes: [] as string[],
    expires_at: '',
    rate_limit_per_hour: 1000
  });
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [showGeneratedToken, setShowGeneratedToken] = useState(false);
  const [testingTokenId, setTestingTokenId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [tokenToTest, setTokenToTest] = useState<string>('');
  const { toast } = useToast();

  const availableScopes = [
    // Usuários
    'users:read', 'users:write', 'users:delete',
    
    // Denúncias
    'complaints:read', 'complaints:write', 'complaints:delete',
    
    // Configurações
    'settings:read', 'settings:write',
    
    // CNPJ
    'cnpj:read',
    
    // Arquivos
    'files:read', 'files:write', 'files:delete',
    
    // Tokens
    'token:create', 'token:validate', 'token:refresh', 'token:read', 'token:delete',
    
    // Relatórios
    'reports:read', 'reports:create', 'reports:export',
    
    // Notificações
    'notifications:read', 'notifications:write', 'notifications:send', 'notifications:whatsapp',
    
    // Auditoria
    'audit:read', 'audit:export',
    
    // Sistema
    'system:read', 'system:write',
    
    // Todas as permissões
    '*'
  ];

  useEffect(() => {
    logger.debug('🎯 Componente ApiManagement montado');
    setIsLoading(false); // Parar o loading imediatamente
    loadData(); // Carregar todos os dados
  }, []);

  const loadTokensDirectly = async () => {
    try {
      logger.debug('🔄 Carregando tokens...');
      
      // Primeiro tentar carregar direto da API usando service role
      const response = await supabase.functions.invoke('api-auth', {
        body: { 
          action: 'list-tokens'
        }
      });
      
      // REMOVIDO: Log de resposta da edge function por segurança
      
      if (response.data?.success && response.data?.tokens) {
        setTokens(response.data.tokens);
        logger.info('✅ Tokens carregados via edge function:', response.data.tokens.length);
        return;
      }
      
      // Se não funcionou, tentar carregar diretamente da tabela (fallback)
      logger.debug('🔄 Tentando carregar tokens diretamente da tabela...');
      const { data: directTokens, error: directError } = await supabase
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false });
      
      // REMOVIDO: Log de tokens diretos por segurança
      
      if (directError) {
        logger.error('❌ Erro ao carregar tokens diretamente:', directError);
        // Mostrar erro detalhado no toast
        toast({
          title: "Erro ao carregar tokens",
          description: `${directError.message}`,
          variant: "destructive",
        });
        setTokens([]);
        return;
      }
      
      setTokens(directTokens || []);
      logger.info('✅ Tokens carregados diretamente:', directTokens?.length || 0);
      
    } catch (error) {
      logger.error('💥 Erro geral ao carregar tokens:', error);
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message}`,
        variant: "destructive",
      });
      setTokens([]);
    }
  };

  const loadData = async () => {
    logger.debug('🔄 Função loadData chamada');
    setIsLoading(false); // Garantir que pare o loading
    await Promise.all([
      loadTokensDirectly(),
      loadLogs(),
      loadEndpoints()
    ]);
  };

  const loadTokensWithServiceRole = async () => {
    try {
      logger.debug('🔧 Carregando tokens usando service role...');
      
      // Usar edge function para carregar tokens
      const response = await supabase.functions.invoke('api-auth', {
        body: { 
          action: 'list-tokens'
        }
      });
      
      // REMOVIDO: Log de resposta do service role por segurança
      
      if (response.data?.tokens) {
        setTokens(response.data.tokens);
        logger.info('✅ Tokens carregados via service role');
      }
    } catch (error) {
      logger.error('💥 Erro ao carregar via service role:', error);
    }
  };

  const loadTokens = async () => {
    try {
      logger.debug('🔄 Carregando tokens...');
      
      // Verificar permissões de admin
      
      // REMOVIDO: Log de verificação de super admin por segurança
      
      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      // REMOVIDO: Log de resultado do carregamento por segurança

      if (error) {
        logger.error('❌ Erro ao carregar tokens:', error);
        logger.debug('🔧 Tentando carregar via service role...');
        await loadTokensWithServiceRole();
        return;
      }
      
      logger.info('✅ Tokens carregados:', data?.length || 0);
      setTokens(data || []);
    } catch (error: any) {
      logger.error('💥 Erro na função loadTokens:', error);
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadLogs = async () => {
    try {
      logger.debug('🔄 Carregando logs da API...');
      
      // Verificar permissões de admin
      
      // REMOVIDO: Log de verificação de super admin para logs por segurança
      
      const { data, error } = await supabase
        .from('api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // REMOVIDO: Log de resultado do carregamento de logs por segurança

      if (error) {
        logger.error('❌ Erro ao carregar logs:', error);
        throw error;
      }
      
      logger.info('✅ Logs carregados:', data?.length || 0);
      setLogs(data || []);
    } catch (error: any) {
      logger.error('💥 Erro na função loadLogs:', error);
      setLogs([]);
      toast({
        title: "Erro",
        description: `Erro ao carregar logs: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadEndpoints = async () => {
    try {
      logger.debug('🔄 Carregando endpoints...');
      const { data, error } = await supabase
        .from('api_endpoints')
        .select('*')
        .order('path');

      if (error) {
        logger.error('❌ Erro ao carregar endpoints:', error);
        throw error;
      }
      
      logger.info('✅ Endpoints carregados:', data?.length || 0);
      setEndpoints(data || []);
    } catch (error) {
      logger.error('💥 Erro na função loadEndpoints:', error);
      setEndpoints([]);
    }
  };

  const generateToken = async () => {
    try {
      logger.debug('🔄 Iniciando geração de token...');
      // REMOVIDO: Log de dados sensíveis do token

      // Abordagem mais simples - usar invoke diretamente sem headers customizados
      const response = await supabase.functions.invoke('api-auth', {
        body: { 
          action: 'generate-token',
          ...newTokenData 
        }
      });

      // REMOVIDO: Log de resposta completa por segurança

      if (response.error) {
        logger.error('❌ Erro na função:', response.error);
        throw new Error(`Erro na API: ${response.error.message || response.error}`);
      }

      if (response.data?.success) {
        logger.info('✅ Token gerado com sucesso!');
        setGeneratedToken(response.data.token);
        setShowGeneratedToken(true);
        setShowTokenDialog(false);
        setNewTokenData({
          token_name: '',
          token_type: 'sandbox',
          scopes: [],
          expires_at: '',
          rate_limit_per_hour: 1000
        });
        loadTokens();
        loadLogs(); // Recarregar logs também
        toast({
          title: "Sucesso",
          description: "Token gerado com sucesso!",
        });
      } else {
        logger.error('❌ Resposta sem sucesso:', response.data);
        throw new Error(response.data?.error || 'Falha na geração do token');
      }
    } catch (error: any) {
      logger.error('💥 Erro completo ao gerar token:', error);
      toast({
        title: "Erro",
        description: `Erro: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const testToken = async (tokenId: string) => {
    setTestingTokenId(tokenId);
    setTokenToTest('');
    setShowTestDialog(true);
  };

  const executeTokenTest = async () => {
    if (!tokenToTest.trim()) {
      toast({
        title: "Erro",
        description: "Cole o token que você deseja testar",
        variant: "destructive"
      });
      return;
    }

    // Validar formato do token
    const trimmedToken = tokenToTest.trim();
    if (!trimmedToken.startsWith('sat_')) {
      toast({
        title: "⚠️ Formato de token inválido",
        description: "O token deve começar com 'sat_'. Certifique-se de colar o token COMPLETO que foi gerado, não o hash da base de dados.",
        variant: "destructive"
      });
      return;
    }

    if (trimmedToken.length < 40) {
      toast({
        title: "⚠️ Token muito curto",
        description: "O token parece incompleto. Certifique-se de copiar o token COMPLETO quando ele for gerado.",
        variant: "destructive"
      });
      return;
    }

    setTestResult(null);
    
    try {
      logger.info('🧪 Testando token:', trimmedToken.substring(0, 20) + '...');
      
      const startTime = Date.now();
      
      // Fazer uma requisição de teste para a API de complaints
      const response = await fetch(
        'https://doyttekxvonlwmmxfezd.supabase.co/functions/v1/api-complaints?page=1&limit=1',
        {
          method: 'GET',
          headers: {
            'x-api-token': trimmedToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }
      
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime: responseTime,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      setTestResult(result);
      
      if (response.ok) {
        toast({
          title: "✅ Token válido!",
          description: `Requisição bem-sucedida em ${responseTime}ms`,
        });
      } else {
        toast({
          title: "❌ Erro no teste",
          description: `Status ${response.status}: ${response.statusText}`,
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      logger.error('💥 Erro ao testar token:', error);
      setTestResult({
        success: false,
        error: error.message,
        details: error.toString()
      });
      toast({
        title: "Erro ao testar token",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingTokenId(null);
    }
  };

  const toggleTokenStatus = async (tokenId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .update({ active: !isActive })
        .eq('id', tokenId);

      if (error) throw error;

      loadTokens();
      toast({
        title: "Sucesso",
        description: `Token ${!isActive ? 'ativado' : 'desativado'} com sucesso!`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do token",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Token copiado para a área de transferência",
    });
  };

  const exportPostmanCollection = () => {
    const collection = {
      info: {
        name: "Sistema de Denúncias API",
        description: "API completa do sistema de denúncias",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      auth: {
        type: "apikey",
        apikey: [
          {
            key: "key",
            value: "x-api-token",
            type: "string"
          },
          {
            key: "value",
            value: "{{API_TOKEN}}",
            type: "string"
          },
          {
            key: "in",
            value: "header",
            type: "string"
          }
        ]
      },
      variable: [
        {
          key: "baseUrl",
          value: "https://doyttekxvonlwmmxfezd.supabase.co/functions/v1",
          type: "string"
        },
        {
          key: "API_TOKEN",
          value: "seu_token_aqui",
          type: "string"
        }
      ],
      item: endpoints.map(endpoint => ({
        name: endpoint.description,
        request: {
          method: endpoint.method,
          header: [
            {
              key: "Content-Type",
              value: "application/json",
              type: "text"
            }
          ],
          url: {
            raw: `{{baseUrl}}${endpoint.path}`,
            host: ["{{baseUrl}}"],
            path: endpoint.path.split('/').filter(Boolean)
          },
          description: `${endpoint.description || 'Sem descrição'}\nRate limit: ${endpoint.rate_limit} requisições/hora`
        }
      }))
    };

    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api-collection.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Sucesso",
      description: "Collection do Postman exportada com sucesso!",
    });
  };

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="default" className="bg-green-500">Sucesso</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge variant="destructive">Cliente</Badge>;
    } else if (statusCode >= 500) {
      return <Badge variant="destructive">Servidor</Badge>;
    }
    return <Badge variant="secondary">Outros</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de API</h2>
          <p className="text-muted-foreground">
            Configure tokens, monitore uso e gerencie endpoints da API
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadTokensDirectly} variant="outline" size="sm">
            Recarregar Tokens
          </Button>
          <Button onClick={loadLogs} variant="outline" size="sm">
            Recarregar Logs
          </Button>
          <Button onClick={exportPostmanCollection} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Postman
          </Button>
          <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Gerar Token
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Gerar Novo Token da API</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="token_name">Nome do Token</Label>
                  <Input
                    id="token_name"
                    value={newTokenData.token_name}
                    onChange={(e) => setNewTokenData(prev => ({ ...prev, token_name: e.target.value }))}
                    placeholder="Ex: Token N8N Produção"
                  />
                </div>
                
                <div>
                  <Label htmlFor="token_type">Tipo do Token</Label>
                  <Select 
                    value={newTokenData.token_type} 
                    onValueChange={(value: 'sandbox' | 'production') => 
                      setNewTokenData(prev => ({ ...prev, token_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Permissões (Scopes)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableScopes.map(scope => (
                      <div key={scope} className="flex items-center space-x-2">
                        <Checkbox
                          id={scope}
                          checked={newTokenData.scopes.includes(scope)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewTokenData(prev => ({
                                ...prev,
                                scopes: [...prev.scopes, scope]
                              }));
                            } else {
                              setNewTokenData(prev => ({
                                ...prev,
                                scopes: prev.scopes.filter(s => s !== scope)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={scope} className="text-sm">{scope}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="rate_limit">Rate Limit (requisições/hora)</Label>
                  <Input
                    id="rate_limit"
                    type="number"
                    value={newTokenData.rate_limit_per_hour}
                    onChange={(e) => setNewTokenData(prev => ({ 
                      ...prev, 
                      rate_limit_per_hour: parseInt(e.target.value) || 1000 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="expires_at">Data de Expiração (opcional)</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={newTokenData.expires_at}
                    onChange={(e) => setNewTokenData(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>

                <Button onClick={generateToken} className="w-full">
                  Gerar Token
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dialog para mostrar token gerado */}
      <Dialog open={showGeneratedToken} onOpenChange={setShowGeneratedToken}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Token Gerado com Sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Token da API (copie e guarde em local seguro):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-background rounded text-sm font-mono break-all">
                  {generatedToken}
                </code>
                <Button size="sm" onClick={() => copyToClipboard(generatedToken)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-800">Importante:</p>
                <p className="text-yellow-700">
                  Este token só será exibido uma vez. Guarde-o em local seguro. 
                  Use o header <code>x-api-token</code> nas suas requisições.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Teste de Token */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult ? (
                testResult.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Teste Bem-Sucedido
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Teste Falhou
                  </>
                )
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" />
                  Testar Token da API
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {!testResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  ℹ️ Por segurança, o token original não é armazenado no sistema (apenas seu hash).
                </p>
                <p className="text-sm text-blue-700">
                  Cole abaixo o token completo que você salvou quando o gerou para testá-lo.
                </p>
              </div>

              <div>
                <Label htmlFor="token-test">Token da API</Label>
                <Input
                  id="token-test"
                  type="text"
                  placeholder="Cole seu token aqui (ex: tok_xxxxxxxxxxxxx)"
                  value={tokenToTest}
                  onChange={(e) => setTokenToTest(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTestDialog(false);
                    setTokenToTest('');
                    setTestingTokenId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={executeTokenTest}
                  disabled={!tokenToTest.trim()}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Testar Token
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status e Tempo de Resposta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Status HTTP</p>
                  <p className="text-lg font-semibold">
                    {testResult.status ? (
                      <Badge variant={testResult.success ? "default" : "destructive"}>
                        {testResult.status} {testResult.statusText}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Erro de Conexão</Badge>
                    )}
                  </p>
                </div>
                
                {testResult.responseTime && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Tempo de Resposta</p>
                    <p className="text-lg font-semibold">{testResult.responseTime}ms</p>
                  </div>
                )}
              </div>

              {/* Resposta da API */}
              <div>
                <p className="text-sm font-medium mb-2">Resposta da API:</p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(testResult.data || testResult.error, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Detalhes do Erro */}
              {testResult.details && (
                <div>
                  <p className="text-sm font-medium mb-2">Detalhes do Erro:</p>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="text-sm text-red-800">{testResult.details}</p>
                  </div>
                </div>
              )}

              {/* Instruções para n8n */}
              {testResult.success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 mb-2">
                    ✅ Token válido! Configure no n8n assim:
                  </p>
                  <div className="space-y-2 text-sm text-green-700">
                    <p>1. No nó HTTP Request, vá em "Parameters" → "Specify Headers"</p>
                    <p>2. Adicione um header:</p>
                    <code className="block bg-white p-2 rounded mt-1 text-xs">
                      Name: x-api-token<br/>
                      Value: [seu token completo]
                    </code>
                    <p>3. URL da API: https://doyttekxvonlwmmxfezd.supabase.co/functions/v1/api-complaints</p>
                  </div>
                </div>
              )}

              {!testResult.success && testResult.status === 401 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    ⚠️ Token não autorizado
                  </p>
                  <div className="space-y-2 text-sm text-yellow-700">
                    <p>Possíveis causas:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Token inativo ou expirado</li>
                      <li>Token não tem a permissão <code>complaints:read</code></li>
                      <li>Token incorreto ou mal formatado</li>
                    </ul>
                    <p className="mt-2">Solução: Gere um novo token com as permissões corretas.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTestDialog(false);
                    setTestResult(null);
                    setTokenToTest('');
                    setTestingTokenId(null);
                  }}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setTestResult(null);
                    setTokenToTest('');
                  }}
                >
                  Testar Outro Token
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="tokens" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Tokens da API</CardTitle>
              <CardDescription>
                Gerencie os tokens de acesso à API do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tokens.map((token) => (
                  <div key={token.id} className="border rounded-lg p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{token.name}</h3>
                          <Badge variant={token.active ? 'default' : 'destructive'}>
                            {token.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <p>Criado em: {new Date(token.created_at).toLocaleString('pt-BR')}</p>
                          <p>Atualizado em: {new Date(token.updated_at).toLocaleString('pt-BR')}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">Permissões:</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(token.permissions) && token.permissions.map((perm: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                            {!Array.isArray(token.permissions) && (
                              <span className="text-xs text-muted-foreground">Nenhuma permissão definida</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => testToken(token.id)}
                          disabled={testingTokenId === token.id}
                        >
                          {testingTokenId === token.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Testando...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Testar Token
                            </>
                          )}
                        </Button>
                        <Button 
                          variant={token.active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleTokenStatus(token.id, token.active)}
                        >
                          {token.active ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {tokens.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum token encontrado. Gere seu primeiro token da API!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs da API</CardTitle>
              <CardDescription>
                Monitore todas as requisições feitas à API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tempo (ms)</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.endpoint}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.method}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status_code)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {logs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado ainda.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>Endpoints da API</CardTitle>
              <CardDescription>
                Lista de todos os endpoints disponíveis na API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-mono text-sm">
                        {endpoint.path}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.method}</Badge>
                      </TableCell>
                      <TableCell>{endpoint.description}</TableCell>
                      <TableCell>{endpoint.rate_limit}/h</TableCell>
                      <TableCell>
                        <Badge variant={endpoint.active ? 'default' : 'destructive'}>
                          {endpoint.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentação da API</CardTitle>
                <CardDescription>
                  Guia completo de uso da API do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">🔑 Autenticação</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="mb-2 font-medium">Use o header <code className="bg-background px-2 py-1 rounded">x-api-token</code> em todas as requisições:</p>
                     <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`curl -H "x-api-token: seu_token_aqui" \\
     -H "Content-Type: application/json" \\
     https://doyttekxvonlwmmxfezd.supabase.co/functions/v1/api-users`}
                     </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">📊 Estrutura de Resposta</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="mb-2 font-medium">Todas as respostas seguem este padrão:</p>
                    <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">🚦 Códigos de Status HTTP</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500 min-w-12">200</Badge>
                      <span>Sucesso - Operação realizada</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-500 min-w-12">201</Badge>
                      <span>Criado - Recurso criado com sucesso</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="min-w-12">400</Badge>
                      <span>Dados inválidos - Erro na requisição</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="min-w-12">401</Badge>
                      <span>Token inválido - Não autorizado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="min-w-12">403</Badge>
                      <span>Sem permissão - Acesso negado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="min-w-12">404</Badge>
                      <span>Não encontrado - Recurso inexistente</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="min-w-12">429</Badge>
                      <span>Rate limit excedido</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="min-w-12">500</Badge>
                      <span>Erro interno do servidor</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">⏱️ Rate Limiting</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-muted-foreground mb-2">
                      Cada token possui um limite de requisições por hora. Quando o limite é atingido, 
                      você receberá um erro 429 com os headers:
                    </p>
                    <pre className="bg-background p-3 rounded text-sm">
{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📋 Endpoints Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                    🏛️ Denúncias
                  </h4>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">POST</Badge>
                        <code className="text-sm">/api-complaints</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Criar nova denúncia no sistema</p>
                      <div className="bg-background p-2 rounded text-xs">
                        <p><strong>Scopes:</strong> complaints:write</p>
                        <p><strong>Rate Limit:</strong> 200/hora</p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">GET</Badge>
                        <code className="text-sm">/api-complaints</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Listar denúncias com filtros e paginação</p>
                      <div className="bg-background p-2 rounded text-xs">
                        <p><strong>Scopes:</strong> complaints:read</p>
                        <p><strong>Rate Limit:</strong> 1000/hora</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">GET</Badge>
                        <code className="text-sm">/api-complaints/&#123;id&#125;</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Obter detalhes completos de uma denúncia</p>
                      <div className="bg-background p-2 rounded text-xs">
                        <p><strong>Scopes:</strong> complaints:read</p>
                        <p><strong>Rate Limit:</strong> 500/hora</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                    👥 Usuários
                  </h4>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">GET</Badge>
                        <code className="text-sm">/api-users</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Listar todos os usuários do sistema</p>
                      <div className="bg-background p-2 rounded text-xs">
                        <p><strong>Scopes:</strong> users:read</p>
                        <p><strong>Rate Limit:</strong> 1000/hora</p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">POST</Badge>
                        <code className="text-sm">/api-users</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Criar novo usuário no sistema</p>
                      <div className="bg-background p-2 rounded text-xs">
                        <p><strong>Scopes:</strong> users:write</p>
                        <p><strong>Rate Limit:</strong> 100/hora</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                    🏢 CNPJ
                  </h4>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">GET</Badge>
                        <code className="text-sm">/api-cnpj/&#123;cnpj&#125;</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Consultar dados completos de CNPJ na Receita Federal</p>
                      <div className="bg-background p-2 rounded text-xs">
                        <p><strong>Scopes:</strong> cnpj:read</p>
                        <p><strong>Rate Limit:</strong> 300/hora</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                    📤 Upload de Arquivos
                  </h4>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">POST</Badge>
                        <code className="text-sm">/api-upload</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Upload de arquivo único (imagem, vídeo, documento)</p>
                      <div className="bg-background p-2 rounded text-xs">
                        <p><strong>Scopes:</strong> files:write</p>
                        <p><strong>Rate Limit:</strong> 200/hora</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔧 Exemplos de Uso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-md font-semibold mb-3">Criar uma denúncia</h4>
                  <div className="bg-muted p-4 rounded-lg">
                     <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`curl -X POST \\
  https://doyttekxvonlwmmxfezd.supabase.co/functions/v1/api-complaints \\
  -H "Content-Type: application/json" \\
  -H "x-api-token: seu_token_aqui" \\
  -d '{
    "complainant_name": "João Silva",
    "complainant_phone": "11999887766",
    "complainant_type": "pessoa_fisica",
    "complainant_address": "Rua das Flores, 123",
    "complainant_neighborhood": "Centro",
    "occurrence_type": "poluicao_sonora",
    "occurrence_address": "Rua do Barulho, 456",
    "occurrence_neighborhood": "Vila Nova",
    "narrative": "Som muito alto durante a madrugada",
    "classification": "urgente"
  }'`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold mb-3">Listar denúncias</h4>
                  <div className="bg-muted p-4 rounded-lg">
                     <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`curl -X GET \\
  "https://doyttekxvonlwmmxfezd.supabase.co/functions/v1/api-complaints?page=1&limit=10&status=nova" \\
  -H "x-api-token: seu_token_aqui"`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold mb-3">Consultar CNPJ</h4>
                  <div className="bg-muted p-4 rounded-lg">
                     <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`curl -X GET \\
  https://doyttekxvonlwmmxfezd.supabase.co/functions/v1/api-cnpj/11222333000181 \\
  -H "x-api-token: seu_token_aqui"`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔗 Integração com N8N</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="mb-3 font-medium">Configuração do nó HTTP Request no N8N:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="min-w-20 font-medium text-sm">Method:</div>
                      <div className="text-sm">GET/POST/PUT/DELETE conforme endpoint</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="min-w-20 font-medium text-sm">URL:</div>
                       <div className="text-sm font-mono bg-background px-2 py-1 rounded">
                         https://doyttekxvonlwmmxfezd.supabase.co/functions/v1/api-[endpoint]
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="min-w-20 font-medium text-sm">Headers:</div>
                      <div className="text-sm">
                        <div>x-api-token: seu_token_aqui</div>
                        <div>Content-Type: application/json</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold mb-3">Exemplo de Workflow N8N</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Webhook Trigger - Recebe dados da denúncia</li>
                      <li>HTTP Request - Envia para /api-complaints</li>
                      <li>Condition - Verifica se criada com sucesso</li>
                      <li>HTTP Request - Notifica por WhatsApp (opcional)</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📚 Recursos Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-semibold mb-2">📖 Documentação Completa</h5>
                    <p className="text-sm text-muted-foreground">
                      Consulte o arquivo docs/api-complaints-post.md para documentação detalhada do endpoint de criação de denúncias.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-semibold mb-2">🔧 Collection Postman</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Use o botão "Exportar Postman" acima para baixar uma collection completa com todos os endpoints.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-semibold mb-2">🎯 Rate Limits</h5>
                    <p className="text-sm text-muted-foreground">
                      Cada endpoint possui limites específicos. Consulte a aba "Endpoints" para ver os limites de cada um.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-semibold mb-2">🔐 Scopes</h5>
                    <p className="text-sm text-muted-foreground">
                      Configure os scopes corretos ao gerar tokens. Use '*' apenas para tokens de desenvolvimento.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}