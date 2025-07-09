import { useState } from 'react';
import { useOfflineTests } from '@/hooks/useOfflineTests';
import { SystemCompatibilityValidator } from '@/components/ui/system-compatibility-validator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader,
  TestTube,
  Smartphone,
  Monitor,
  Wifi,
  Database,
  Zap,
  AlertTriangle
} from 'lucide-react';

const getTestIcon = (testName: string) => {
  if (testName.includes('Offline')) return <Wifi className="h-4 w-4" />;
  if (testName.includes('Integridade')) return <Database className="h-4 w-4" />;
  if (testName.includes('Performance')) return <Zap className="h-4 w-4" />;
  if (testName.includes('Conflitos')) return <AlertTriangle className="h-4 w-4" />;
  if (testName.includes('Mobile')) return <Smartphone className="h-4 w-4" />;
  if (testName.includes('Navegador')) return <Monitor className="h-4 w-4" />;
  return <TestTube className="h-4 w-4" />;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'passed':
      return <Badge className="bg-green-100 text-green-800">Passou</Badge>;
    case 'failed':
      return <Badge variant="destructive">Falhou</Badge>;
    case 'running':
      return <Badge className="bg-blue-100 text-blue-800">Executando</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
};

export const OfflineTestSuite = () => {
  const {
    testResults,
    isRunning,
    currentTest,
    runAllTests
  } = useOfflineTests();
  
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);

  const toggleTestExpansion = (testName: string) => {
    setExpandedTests(prev =>
      prev.includes(testName)
        ? prev.filter(name => name !== testName)
        : [...prev, testName]
    );
  };

  const suite = testResults[0];
  const overallProgress = suite ? (suite.passed + suite.failed) / suite.total * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed bottom-4 left-20 z-50"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Testes
          {suite && suite.failed > 0 && (
            <Badge variant="destructive" className="ml-2 h-5">
              {suite.failed}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Suite Completa de Testes & Validação
            {suite && (
              <Badge variant={suite.failed > 0 ? "destructive" : "default"}>
                {suite.passed}/{suite.total} Passaram
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Test Suite */}
          <div className="space-y-6">
          {/* Test Controls */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Controles de Teste</CardTitle>
                <Button
                  onClick={runAllTests}
                  disabled={isRunning}
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? 'Executando...' : 'Executar Todos os Testes'}
                </Button>
              </div>
            </CardHeader>
            
            {isRunning && (
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progresso Geral</span>
                    <span>{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                  
                  {currentTest && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader className="h-3 w-3 animate-spin" />
                      Executando: {currentTest}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Test Results */}
          {suite && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  Resultados dos Testes
                  <Badge variant={suite.failed > 0 ? "destructive" : "default"}>
                    {suite.passed} ✓ / {suite.failed} ✗ / {suite.total} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {suite.tests.map((test, index) => (
                    <Collapsible key={index}>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {getTestIcon(test.testName)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{test.testName}</span>
                              {getStatusBadge(test.status)}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span>Duração: {test.duration}ms</span>
                              {test.error && (
                                <span className="text-red-600">Erro: {test.error}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusIcon(test.status)}
                          
                          {(test.details || test.error) && (
                            <CollapsibleTrigger
                              onClick={() => toggleTestExpansion(test.testName)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {expandedTests.includes(test.testName) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </CollapsibleTrigger>
                          )}
                        </div>
                      </div>
                      
                      <CollapsibleContent>
                        <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                          {test.error && (
                            <Alert className="mb-3">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Erro:</strong> {test.error}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {test.details && (
                            <div>
                              <h4 className="font-medium mb-2">Detalhes do Teste:</h4>
                              <pre className="text-xs bg-background p-2 rounded border overflow-auto">
                                {JSON.stringify(test.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Coverage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cobertura de Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <Wifi className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="font-medium">Funcionalidade Offline</div>
                  <div className="text-muted-foreground">Simulação & Conectividade</div>
                </div>
                
                <div className="text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="font-medium">Integridade de Dados</div>
                  <div className="text-muted-foreground">Armazenamento & Recuperação</div>
                </div>
                
                <div className="text-center">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <div className="font-medium">Performance</div>
                  <div className="text-muted-foreground">Volume & Velocidade</div>
                </div>
                
                <div className="text-center">
                  <Monitor className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="font-medium">Compatibilidade</div>
                  <div className="text-muted-foreground">Cross-browser & Mobile</div>
                </div>
              </div>
            </CardContent>
          </Card>

            {!suite && (
              <Alert>
                <TestTube className="h-4 w-4" />
                <AlertDescription>
                  Clique em "Executar Todos os Testes" para iniciar a validação completa do sistema offline.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column: System Compatibility */}
          <div className="space-y-6">
            <div className="sticky top-0">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Compatibilidade do Sistema
              </h3>
              <SystemCompatibilityValidator />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};