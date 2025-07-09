import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Monitor, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Loader,
  RefreshCw,
  Globe,
  Cpu,
  HardDrive
} from 'lucide-react';

interface BrowserTest {
  name: string;
  feature: string;
  supported: boolean;
  required: boolean;
}

interface PerformanceMetrics {
  memoryUsage: number;
  storageUsage: number;
  renderTime: number;
  networkLatency: number;
}

export const SystemCompatibilityValidator = () => {
  const [browserTests, setBrowserTests] = useState<BrowserTest[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  const runCompatibilityTests = async () => {
    setIsRunning(true);
    
    // Browser Feature Tests
    const tests: BrowserTest[] = [
      {
        name: 'IndexedDB',
        feature: 'Armazenamento Local',
        supported: !!window.indexedDB,
        required: true
      },
      {
        name: 'Service Worker',
        feature: 'Cache Offline',
        supported: 'serviceWorker' in navigator,
        required: true
      },
      {
        name: 'Local Storage',
        feature: 'Configurações',
        supported: !!window.localStorage,
        required: true
      },
      {
        name: 'Fetch API',
        feature: 'Requisições HTTP',
        supported: !!window.fetch,
        required: true
      },
      {
        name: 'Promises',
        feature: 'Operações Assíncronas',
        supported: !!window.Promise,
        required: true
      },
      {
        name: 'WebSocket',
        feature: 'Tempo Real',
        supported: !!window.WebSocket,
        required: false
      },
      {
        name: 'Geolocation',
        feature: 'Localização',
        supported: 'geolocation' in navigator,
        required: false
      },
      {
        name: 'Online Events',
        feature: 'Detecção de Conectividade',
        supported: 'onLine' in navigator,
        required: true
      },
      {
        name: 'File API',
        feature: 'Upload de Arquivos',
        supported: !!window.File && !!window.FileReader,
        required: true
      },
      {
        name: 'Notification API',
        feature: 'Notificações Push',
        supported: 'Notification' in window,
        required: false
      }
    ];

    setBrowserTests(tests);

    // Performance Metrics
    const startTime = performance.now();
    
    // Memory usage (if available)
    const memory = (performance as any).memory;
    const memoryUsage = memory ? memory.usedJSHeapSize / memory.totalJSHeapSize * 100 : 0;

    // Storage usage estimate
    let storageUsage = 0;
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        storageUsage = estimate.usage ? (estimate.usage / (estimate.quota || 1)) * 100 : 0;
      }
    } catch (e) {
      // Storage API not available
    }

    // Render time test
    const renderStartTime = performance.now();
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
    const renderTime = performance.now() - renderStartTime;

    // Simple network latency test
    const networkStart = performance.now();
    try {
      await fetch('data:text/plain;base64,', { method: 'HEAD' });
    } catch (e) {
      // Ignore errors for this test
    }
    const networkLatency = performance.now() - networkStart;

    setPerformanceMetrics({
      memoryUsage,
      storageUsage,
      renderTime,
      networkLatency
    });

    // Device Info
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
      version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox/')) {
      browser = 'Firefox'; 
      version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge/')) {
      browser = 'Edge';
      version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
    }

    setDeviceInfo({
      browser,
      version,
      isMobile,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      }
    });

    setIsRunning(false);
  };

  useEffect(() => {
    runCompatibilityTests();
  }, []);

  const requiredTests = browserTests.filter(test => test.required);
  const passedRequired = requiredTests.filter(test => test.supported).length;
  const compatibilityScore = requiredTests.length > 0 ? (passedRequired / requiredTests.length) * 100 : 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Overall Compatibility Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Compatibilidade do Sistema
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getScoreBadge(compatibilityScore)}>
                {Math.round(compatibilityScore)}% Compatível
              </Badge>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={runCompatibilityTests}
                disabled={isRunning}
              >
                {isRunning ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Score de Compatibilidade</span>
              <span className={`font-semibold ${getScoreColor(compatibilityScore)}`}>
                {Math.round(compatibilityScore)}%
              </span>
            </div>
            <Progress value={compatibilityScore} className="h-2" />
            
            {compatibilityScore < 100 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Algumas funcionalidades podem não estar disponíveis neste navegador.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Device Information */}
      {deviceInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {deviceInfo.isMobile ? (
                <Smartphone className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
              Informações do Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium">Navegador</div>
                <div className="text-muted-foreground">{deviceInfo.browser} {deviceInfo.version}</div>
              </div>
              <div>
                <div className="font-medium">Plataforma</div>
                <div className="text-muted-foreground">{deviceInfo.platform}</div>
              </div>
              <div>
                <div className="font-medium">Tipo</div>
                <div className="text-muted-foreground">{deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</div>
              </div>
              <div>
                <div className="font-medium">Viewport</div>
                <div className="text-muted-foreground">
                  {deviceInfo.viewport.width} × {deviceInfo.viewport.height}
                </div>
              </div>
              <div>
                <div className="font-medium">Tela</div>
                <div className="text-muted-foreground">
                  {deviceInfo.screen.width} × {deviceInfo.screen.height}
                </div>
              </div>
              <div>
                <div className="font-medium">Idioma</div>
                <div className="text-muted-foreground">{deviceInfo.language}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Browser Feature Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Testes de Funcionalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {browserTests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {test.supported ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-muted-foreground">{test.feature}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {test.required && (
                    <Badge variant="outline" className="text-xs">
                      Obrigatório
                    </Badge>
                  )}
                  <Badge variant={test.supported ? "default" : "destructive"}>
                    {test.supported ? 'Suportado' : 'Não Suportado'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Métricas de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(performanceMetrics.memoryUsage)}%
                </div>
                <div className="text-sm text-muted-foreground">Uso de Memória</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(performanceMetrics.storageUsage)}%
                </div>
                <div className="text-sm text-muted-foreground">Uso de Storage</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(performanceMetrics.renderTime)}ms
                </div>
                <div className="text-sm text-muted-foreground">Tempo de Render</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(performanceMetrics.networkLatency)}ms
                </div>
                <div className="text-sm text-muted-foreground">Latência de Rede</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};