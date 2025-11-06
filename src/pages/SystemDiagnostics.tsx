import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Monitor, 
  Wifi, 
  Shield, 
  Map,
  Database,
  Loader2,
  Info,
  ArrowLeft,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DiagnosticTest {
  name: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface SpeedDataPoint {
  timestamp: string;
  supabase?: number;
  mapbox?: number;
}

export default function SystemDiagnostics() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<DiagnosticTest[]>([
    { name: 'Informações do Navegador', status: 'pending', message: '' },
    { name: 'Suporte a WebGL', status: 'pending', message: '' },
    { name: 'Content Security Policy', status: 'pending', message: '' },
    { name: 'Conectividade Supabase', status: 'pending', message: '' },
    { name: 'Velocidade Supabase', status: 'pending', message: '' },
    { name: 'Conectividade Mapbox', status: 'pending', message: '' },
    { name: 'Velocidade Mapbox', status: 'pending', message: '' },
    { name: 'Permissões de Geolocalização', status: 'pending', message: '' },
  ]);
  const [running, setRunning] = useState(false);
  const [speedHistory, setSpeedHistory] = useState<SpeedDataPoint[]>([]);

  const updateTest = (name: string, updates: Partial<DiagnosticTest>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const checkBrowserInfo = async () => {
    updateTest('Informações do Navegador', { status: 'running', message: 'Coletando...' });
    
    try {
      const userAgent = navigator.userAgent;
      const browserName = (() => {
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Desconhecido';
      })();

      const details = [
        `Navegador: ${browserName}`,
        `Plataforma: ${navigator.platform}`,
        `Idioma: ${navigator.language}`,
        `Cookies: ${navigator.cookieEnabled ? 'Habilitados' : 'Desabilitados'}`,
        `Online: ${navigator.onLine ? 'Sim' : 'Não'}`,
      ].join('\n');

      updateTest('Informações do Navegador', {
        status: 'success',
        message: `${browserName} detectado`,
        details
      });
    } catch (error) {
      updateTest('Informações do Navegador', {
        status: 'error',
        message: 'Erro ao coletar informações',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const checkWebGL = async () => {
    updateTest('Suporte a WebGL', { status: 'running', message: 'Verificando...' });
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Desconhecido';
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Desconhecido';
        
        updateTest('Suporte a WebGL', {
          status: 'success',
          message: 'WebGL disponível',
          details: `Vendor: ${vendor}\nRenderer: ${renderer}`
        });
      } else {
        updateTest('Suporte a WebGL', {
          status: 'error',
          message: 'WebGL não disponível',
          details: 'Habilite a aceleração de hardware nas configurações do navegador'
        });
      }
    } catch (error) {
      updateTest('Suporte a WebGL', {
        status: 'error',
        message: 'Erro ao verificar WebGL',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const checkCSP = async () => {
    updateTest('Content Security Policy', { status: 'running', message: 'Verificando...' });
    
    try {
      // Tentar fazer uma requisição teste ao Mapbox
      const testUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v12';
      const response = await fetch(testUrl + '?access_token=pk.test', { method: 'HEAD' });
      
      updateTest('Content Security Policy', {
        status: 'success',
        message: 'CSP configurado corretamente',
        details: 'Domínios do Mapbox estão permitidos no CSP'
      });
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        updateTest('Content Security Policy', {
          status: 'error',
          message: 'CSP bloqueando requisições',
          details: 'Verifique se os domínios do Mapbox estão no CSP do index.html'
        });
      } else {
        updateTest('Content Security Policy', {
          status: 'warning',
          message: 'Verificação inconclusiva',
          details: 'Não foi possível verificar completamente o CSP'
        });
      }
    }
  };

  const checkSupabase = async () => {
    updateTest('Conectividade Supabase', { status: 'running', message: 'Testando conexão...' });
    
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('id')
        .limit(1);

      if (error) throw error;

      updateTest('Conectividade Supabase', {
        status: 'success',
        message: 'Conexão estabelecida',
        details: 'Supabase está respondendo corretamente'
      });
    } catch (error) {
      updateTest('Conectividade Supabase', {
        status: 'error',
        message: 'Erro de conexão',
        details: error instanceof Error ? error.message : 'Não foi possível conectar ao Supabase'
      });
    }
  };

  const checkSupabaseSpeed = async () => {
    updateTest('Velocidade Supabase', { status: 'running', message: 'Medindo latência...' });
    
    try {
      const measurements: number[] = [];
      
      // Fazer 3 requisições e calcular média
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();
        
        const { error } = await supabase
          .from('system_settings')
          .select('id')
          .limit(1);
        
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        if (error) throw error;
        measurements.push(latency);
        
        // Pequeno delay entre requisições
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const minLatency = Math.min(...measurements);
      const maxLatency = Math.max(...measurements);

      let status: 'success' | 'warning' | 'error';
      let message: string;

      if (avgLatency < 100) {
        status = 'success';
        message = `Excelente (${avgLatency.toFixed(0)}ms)`;
      } else if (avgLatency < 300) {
        status = 'success';
        message = `Boa (${avgLatency.toFixed(0)}ms)`;
      } else if (avgLatency < 500) {
        status = 'warning';
        message = `Aceitável (${avgLatency.toFixed(0)}ms)`;
      } else {
        status = 'warning';
        message = `Lenta (${avgLatency.toFixed(0)}ms)`;
      }

      const details = [
        `Latência Média: ${avgLatency.toFixed(2)}ms`,
        `Latência Mínima: ${minLatency.toFixed(2)}ms`,
        `Latência Máxima: ${maxLatency.toFixed(2)}ms`,
        `Medições: ${measurements.map(m => m.toFixed(0) + 'ms').join(', ')}`,
        '',
        'Referência:',
        '• < 100ms: Excelente',
        '• 100-300ms: Boa',
        '• 300-500ms: Aceitável',
        '• > 500ms: Lenta'
      ].join('\n');

      updateTest('Velocidade Supabase', {
        status,
        message,
        details
      });

      // Adicionar ao histórico
      const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSpeedHistory(prev => [...prev.slice(-19), { timestamp, supabase: avgLatency }]);
    } catch (error) {
      updateTest('Velocidade Supabase', {
        status: 'error',
        message: 'Erro ao medir velocidade',
        details: error instanceof Error ? error.message : 'Não foi possível medir latência'
      });
    }
  };

  const checkMapbox = async () => {
    updateTest('Conectividade Mapbox', { status: 'running', message: 'Testando token...' });
    
    try {
      // Buscar token do banco
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'mapbox_public_token')
        .maybeSingle();

      if (!settingsData?.value) {
        updateTest('Conectividade Mapbox', {
          status: 'warning',
          message: 'Token não configurado',
          details: 'Configure o token do Mapbox nas configurações'
        });
        return;
      }

      let token = settingsData.value;
      if (typeof token === 'string') {
        try {
          if (token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1);
          } else {
            token = JSON.parse(token);
          }
        } catch {
          // Se falhar, usar como está
        }
      }

      // Testar token
      const response = await fetch(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${token}`
      );

      if (response.ok) {
        updateTest('Conectividade Mapbox', {
          status: 'success',
          message: 'Token válido',
          details: 'Mapbox está respondendo corretamente'
        });
      } else {
        const errorText = await response.text();
        updateTest('Conectividade Mapbox', {
          status: 'error',
          message: `Token inválido (${response.status})`,
          details: errorText.substring(0, 200)
        });
      }
    } catch (error) {
      updateTest('Conectividade Mapbox', {
        status: 'error',
        message: 'Erro ao conectar',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const checkMapboxSpeed = async () => {
    updateTest('Velocidade Mapbox', { status: 'running', message: 'Medindo latência...' });
    
    try {
      // Buscar token do banco
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'mapbox_public_token')
        .maybeSingle();

      if (!settingsData?.value) {
        updateTest('Velocidade Mapbox', {
          status: 'warning',
          message: 'Token não configurado',
          details: 'Configure o token do Mapbox para medir velocidade'
        });
        return;
      }

      let token = settingsData.value;
      if (typeof token === 'string') {
        try {
          if (token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1);
          } else {
            token = JSON.parse(token);
          }
        } catch {
          // Se falhar, usar como está
        }
      }

      const measurements: number[] = [];
      
      // Fazer 3 requisições e calcular média
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();
        
        const response = await fetch(
          `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${token}`,
          { method: 'HEAD' }
        );
        
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        measurements.push(latency);
        
        // Pequeno delay entre requisições
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const minLatency = Math.min(...measurements);
      const maxLatency = Math.max(...measurements);

      let status: 'success' | 'warning' | 'error';
      let message: string;

      if (avgLatency < 150) {
        status = 'success';
        message = `Excelente (${avgLatency.toFixed(0)}ms)`;
      } else if (avgLatency < 400) {
        status = 'success';
        message = `Boa (${avgLatency.toFixed(0)}ms)`;
      } else if (avgLatency < 700) {
        status = 'warning';
        message = `Aceitável (${avgLatency.toFixed(0)}ms)`;
      } else {
        status = 'warning';
        message = `Lenta (${avgLatency.toFixed(0)}ms)`;
      }

      const details = [
        `Latência Média: ${avgLatency.toFixed(2)}ms`,
        `Latência Mínima: ${minLatency.toFixed(2)}ms`,
        `Latência Máxima: ${maxLatency.toFixed(2)}ms`,
        `Medições: ${measurements.map(m => m.toFixed(0) + 'ms').join(', ')}`,
        '',
        'Referência:',
        '• < 150ms: Excelente',
        '• 150-400ms: Boa',
        '• 400-700ms: Aceitável',
        '• > 700ms: Lenta'
      ].join('\n');

      updateTest('Velocidade Mapbox', {
        status,
        message,
        details
      });

      // Adicionar ao histórico
      const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSpeedHistory(prev => {
        const existing = prev.find(p => p.timestamp === timestamp);
        if (existing) {
          return prev.map(p => p.timestamp === timestamp ? { ...p, mapbox: avgLatency } : p);
        }
        return [...prev.slice(-19), { timestamp, mapbox: avgLatency }];
      });
    } catch (error) {
      updateTest('Velocidade Mapbox', {
        status: 'error',
        message: 'Erro ao medir velocidade',
        details: error instanceof Error ? error.message : 'Não foi possível medir latência'
      });
    }
  };

  const checkGeolocation = async () => {
    updateTest('Permissões de Geolocalização', { status: 'running', message: 'Verificando...' });
    
    if (!('geolocation' in navigator)) {
      updateTest('Permissões de Geolocalização', {
        status: 'error',
        message: 'Geolocalização não disponível',
        details: 'Este navegador não suporta API de geolocalização'
      });
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      const statusMap = {
        'granted': { status: 'success' as const, message: 'Permissão concedida' },
        'denied': { status: 'error' as const, message: 'Permissão negada' },
        'prompt': { status: 'warning' as const, message: 'Permissão não solicitada' },
      };

      const result = statusMap[permission.state] || { status: 'warning' as const, message: 'Status desconhecido' };

      updateTest('Permissões de Geolocalização', {
        ...result,
        details: `Estado atual: ${permission.state}`
      });
    } catch (error) {
      updateTest('Permissões de Geolocalização', {
        status: 'warning',
        message: 'Não foi possível verificar',
        details: 'API de permissões não disponível neste navegador'
      });
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    
    await checkBrowserInfo();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await checkWebGL();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await checkCSP();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await checkSupabase();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await checkSupabaseSpeed();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await checkMapbox();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await checkMapboxSpeed();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await checkGeolocation();
    
    setRunning(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DiagnosticTest['status']) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive',
      running: 'outline',
      pending: 'outline',
    } as const;

    const labels = {
      success: 'OK',
      warning: 'Atenção',
      error: 'Erro',
      running: 'Verificando...',
      pending: 'Pendente',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getTestIcon = (name: string) => {
    if (name.includes('Navegador')) return <Monitor className="h-5 w-5" />;
    if (name.includes('WebGL')) return <Map className="h-5 w-5" />;
    if (name.includes('CSP')) return <Shield className="h-5 w-5" />;
    if (name.includes('Conectividade Supabase')) return <Database className="h-5 w-5" />;
    if (name.includes('Velocidade Supabase')) return <Wifi className="h-5 w-5" />;
    if (name.includes('Conectividade Mapbox')) return <Map className="h-5 w-5" />;
    if (name.includes('Velocidade Mapbox')) return <Wifi className="h-5 w-5" />;
    if (name.includes('Geolocalização')) return <Wifi className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
  };

  const allTestsComplete = tests.every(t => t.status !== 'pending' && t.status !== 'running');
  const hasErrors = tests.some(t => t.status === 'error');
  const hasWarnings = tests.some(t => t.status === 'warning');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
            <p className="text-muted-foreground mt-1">
              Verificação completa de requisitos técnicos e conectividade
            </p>
          </div>
          <Button
            onClick={runAllTests}
            disabled={running}
            size="lg"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Executar Novamente
              </>
            )}
          </Button>
        </div>

        {/* Status Geral */}
        {allTestsComplete && (
          <Alert variant={hasErrors ? 'destructive' : hasWarnings ? 'default' : 'default'}>
            {hasErrors ? (
              <XCircle className="h-4 w-4" />
            ) : hasWarnings ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertTitle>
              {hasErrors
                ? 'Problemas Detectados'
                : hasWarnings
                ? 'Atenção Necessária'
                : 'Sistema Funcionando Corretamente'}
            </AlertTitle>
            <AlertDescription>
              {hasErrors
                ? 'Alguns componentes críticos apresentaram erros. Verifique os detalhes abaixo.'
                : hasWarnings
                ? 'Alguns componentes necessitam atenção, mas o sistema pode funcionar.'
                : 'Todos os testes foram concluídos com sucesso. O sistema está operacional.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de Testes */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados dos Testes</CardTitle>
            <CardDescription>
              Verificação detalhada de cada componente do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tests.map((test, index) => (
              <div key={test.name}>
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(test.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        {getTestIcon(test.name)}
                        <h3 className="font-semibold">{test.name}</h3>
                      </div>
                      {getStatusBadge(test.status)}
                    </div>
                    {test.message && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {test.message}
                      </p>
                    )}
                    {test.details && (
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {test.details}
                      </pre>
                    )}
                  </div>
                </div>
                {index < tests.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gráfico de Histórico de Velocidade */}
        {speedHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Histórico de Velocidade
              </CardTitle>
              <CardDescription>
                Evolução da latência ao longo do tempo (últimas 20 medições)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={speedHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="timestamp" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Latência (ms)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => `${value.toFixed(2)}ms`}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="supabase" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Supabase"
                    dot={{ fill: 'hsl(var(--primary))' }}
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mapbox" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Mapbox"
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Supabase (BD)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                  <span className="text-muted-foreground">Mapbox (Mapas)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recomendações */}
        {allTestsComplete && (hasErrors || hasWarnings) && (
          <Card>
            <CardHeader>
              <CardTitle>Recomendações</CardTitle>
              <CardDescription>Ações sugeridas para resolver os problemas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tests
                .filter(t => t.status === 'error' || t.status === 'warning')
                .map(test => (
                  <div key={test.name} className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-sm text-muted-foreground">{test.details}</p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
