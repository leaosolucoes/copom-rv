import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  Settings 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ApiToken {
  id: string;
  token_name: string;
  token_type: 'sandbox' | 'production';
  scopes: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
  created_at: string;
}

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  execution_time_ms: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  token_id: string;
}

interface ApiEndpoint {
  id: string;
  path: string;
  method: string;
  description: string;
  required_scopes: string[];
  rate_limit_per_hour: number;
  is_enabled: boolean;
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
  const { toast } = useToast();

  const availableScopes = [
    'users:read', 'users:write', 'users:delete',
    'complaints:read', 'complaints:write', 'complaints:delete',
    'settings:read', 'settings:write',
    'cnpj:read', 'files:read', 'files:write', 'files:delete',
    'token:create', 'token:validate', 'token:refresh',
    '*' // All permissions
  ];

  useEffect(() => {
    console.log('🎯 Componente ApiManagement montado');
    setIsLoading(false); // Parar o loading imediatamente
    loadData(); // Carregar todos os dados
  }, []);

  const loadTokensDirectly = async () => {
    try {
      console.log('🔄 Carregando tokens diretamente...');
      
      // Primeiro tentar carregar direto da API usando service role
      const response = await supabase.functions.invoke('api-auth', {
        body: { 
          action: 'list-tokens'
        }
      });
      
      console.log('📋 Resposta da edge function:', response);
      
      if (response.data?.success && response.data?.tokens) {
        setTokens(response.data.tokens);
        console.log('✅ Tokens carregados via edge function:', response.data.tokens.length);
        return;
      }
      
      // Se não funcionou, tentar carregar diretamente da tabela (fallback)
      console.log('🔄 Tentando carregar tokens diretamente da tabela...');
      const { data: directTokens, error: directError } = await supabase
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📋 Tokens diretos da tabela:', { tokens: directTokens, error: directError });
      
      if (directError) {
        console.error('❌ Erro ao carregar tokens diretamente:', directError);
        // Mostrar erro detalhado no toast
        toast({
          title: "Erro ao carregar tokens",
          description: `${directError.message}`,
          variant: "destructive",
        });
        setTokens([]);
        return;
      }
      
      setTokens((directTokens || []).map(token => ({
        ...token,
        token_type: token.token_type as 'sandbox' | 'production'
      })) as ApiToken[]);
      console.log('✅ Tokens carregados diretamente:', directTokens?.length || 0);
      
    } catch (error) {
      console.error('💥 Erro geral ao carregar tokens:', error);
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message}`,
        variant: "destructive",
      });
      setTokens([]);
    }
  };

  const loadData = async () => {
    console.log('🔄 Função loadData chamada');
    setIsLoading(false); // Garantir que pare o loading
    await Promise.all([
      loadTokensDirectly(),
      loadLogs(),
      loadEndpoints()
    ]);
  };

  const loadTokensWithServiceRole = async () => {
    try {
      console.log('🔧 Carregando tokens usando service role...');
      
      // Usar edge function para carregar tokens
      const response = await supabase.functions.invoke('api-auth', {
        body: { 
          action: 'list-tokens'
        }
      });
      
      console.log('📋 Resposta do service role:', response);
      
      if (response.data?.tokens) {
        setTokens(response.data.tokens);
        console.log('✅ Tokens carregados via service role');
      }
    } catch (error) {
      console.error('💥 Erro ao carregar via service role:', error);
    }
  };

  const loadTokens = async () => {
    try {
      console.log('🔄 Carregando tokens...');
      
      // Primeiro verificar se o usuário pode acessar
      const { data: authCheck, error: authError } = await supabase
        .rpc('is_current_user_super_admin_safe');
      
      console.log('👑 Verificação de super admin:', { result: authCheck, error: authError });
      
      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📋 Resultado do carregamento:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Erro ao carregar tokens:', error);
        console.log('🔧 Tentando carregar via service role...');
        await loadTokensWithServiceRole();
        return;
      }
      
      console.log('✅ Tokens carregados:', data);
      setTokens((data || []) as ApiToken[]);
    } catch (error: any) {
      console.error('💥 Erro na função loadTokens:', error);
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadLogs = async () => {
    try {
      console.log('🔄 Carregando logs da API...');
      
      // Primeiro verificar se o usuário pode acessar
      const { data: authCheck, error: authError } = await supabase
        .rpc('is_current_user_super_admin_safe');
      
      console.log('👑 Verificação de super admin para logs:', { result: authCheck, error: authError });
      
      const { data, error } = await supabase
        .from('api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('📋 Resultado do carregamento de logs:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Erro ao carregar logs:', error);
        throw error;
      }
      
      console.log('✅ Logs carregados:', data?.length || 0);
      setLogs((data || []).map(log => ({
        ...log,
        ip_address: String(log.ip_address || 'unknown')
      })) as ApiLog[]);
    } catch (error: any) {
      console.error('💥 Erro na função loadLogs:', error);
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
      console.log('🔄 Carregando endpoints...');
      const { data, error } = await supabase
        .from('api_endpoints')
        .select('*')
        .order('path');

      if (error) {
        console.error('❌ Erro ao carregar endpoints:', error);
        throw error;
      }
      
      console.log('✅ Endpoints carregados:', data?.length || 0);
      setEndpoints(data || []);
    } catch (error) {
      console.error('💥 Erro na função loadEndpoints:', error);
      setEndpoints([]);
    }
  };

  const generateToken = async () => {
    try {
      console.log('🔄 Iniciando geração de token...');
      console.log('📋 Dados do token:', newTokenData);

      // Abordagem mais simples - usar invoke diretamente sem headers customizados
      const response = await supabase.functions.invoke('api-auth', {
        body: { 
          action: 'generate-token',
          ...newTokenData 
        }
      });

      console.log('📡 Resposta completa da função:', JSON.stringify(response, null, 2));

      if (response.error) {
        console.error('❌ Erro na função:', response.error);
        throw new Error(`Erro na API: ${response.error.message || response.error}`);
      }

      if (response.data?.success) {
        console.log('✅ Token gerado com sucesso!');
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
        console.error('❌ Resposta sem sucesso:', response.data);
        throw new Error(response.data?.error || 'Falha na geração do token');
      }
    } catch (error: any) {
      console.error('💥 Erro completo ao gerar token:', error);
      toast({
        title: "Erro",
        description: `Erro: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const toggleTokenStatus = async (tokenId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .update({ is_active: !isActive })
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
          value: "https://posturas.conectarioverde.com.br/functions/v1",
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
          description: `${endpoint.description}\n\nScopes necessários: ${endpoint.required_scopes.join(', ')}\nRate limit: ${endpoint.rate_limit_per_hour} requisições/hora`
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
                          <h3 className="font-semibold">{token.token_name}</h3>
                          <Badge variant={token.token_type === 'production' ? 'default' : 'secondary'}>
                            {token.token_type === 'production' ? 'Produção' : 'Sandbox'}
                          </Badge>
                          <Badge variant={token.is_active ? 'default' : 'destructive'}>
                            {token.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <p>Criado em: {new Date(token.created_at).toLocaleString('pt-BR')}</p>
                          <p>Último uso: {token.last_used_at ? new Date(token.last_used_at).toLocaleString('pt-BR') : 'Nunca'}</p>
                          <p>Uso total: {token.usage_count} requisições</p>
                          <p>Rate limit: {token.rate_limit_per_hour}/hora</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">Permissões:</p>
                          <div className="flex flex-wrap gap-1">
                            {token.scopes.map(scope => (
                              <Badge key={scope} variant="outline" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Button 
                          variant={token.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleTokenStatus(token.id, token.is_active)}
                        >
                          {token.is_active ? (
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
                      <TableCell>{log.execution_time_ms}</TableCell>
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
                    <TableHead>Scopes</TableHead>
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
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {endpoint.required_scopes.map(scope => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{endpoint.rate_limit_per_hour}/h</TableCell>
                      <TableCell>
                        <Badge variant={endpoint.is_enabled ? 'default' : 'destructive'}>
                          {endpoint.is_enabled ? 'Ativo' : 'Inativo'}
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
          <Card>
            <CardHeader>
              <CardTitle>Documentação da API</CardTitle>
              <CardDescription>
                Guia completo de uso da API do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Autenticação</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="mb-2">Use o header <code>x-api-token</code> em todas as requisições:</p>
                  <pre className="bg-background p-2 rounded text-sm">
{`curl -H "x-api-token: seu_token_aqui" \\
     -H "Content-Type: application/json" \\
     https://posturas.conectarioverde.com.br/functions/v1/api-users`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Estrutura de Resposta</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="bg-background p-2 rounded text-sm">
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
                <h3 className="text-lg font-semibold mb-3">Códigos de Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">200</Badge>
                    <span>Sucesso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500">201</Badge>
                    <span>Criado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">400</Badge>
                    <span>Dados inválidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">401</Badge>
                    <span>Token inválido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">403</Badge>
                    <span>Sem permissão</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">404</Badge>
                    <span>Não encontrado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">429</Badge>
                    <span>Rate limit excedido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">500</Badge>
                    <span>Erro interno</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Rate Limiting</h3>
                <p className="text-muted-foreground">
                  Cada token possui um limite de requisições por hora. Quando o limite é atingido, 
                  você receberá um erro 429. O limite é resetado a cada hora.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Integração com N8N</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="mb-2">Configuração do nó HTTP Request no N8N:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Method: GET/POST/PUT/DELETE conforme endpoint</li>
                    <li>URL: https://posturas.conectarioverde.com.br/functions/v1/api-[endpoint]</li>
                    <li>Headers: x-api-token = seu_token_aqui</li>
                    <li>Content-Type: application/json</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}