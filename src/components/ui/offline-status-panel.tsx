import { useState, useEffect } from 'react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  WifiOff, 
  Database,
  Upload
} from 'lucide-react';

export const OfflineStatusPanel = () => {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();
  const { isSyncing, syncQueue, retrySyncAll, pendingCount } = useSyncQueue();
  const [isExpanded, setIsExpanded] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Calculate sync progress
  useEffect(() => {
    if (isSyncing && syncQueue.length > 0) {
      const completed = syncQueue.filter(item => item.retryCount === 0).length;
      const total = syncQueue.length;
      setSyncProgress((completed / total) * 100);
    } else {
      setSyncProgress(0);
    }
  }, [isSyncing, syncQueue]);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-l-4 border-l-primary animate-fade-in">
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isOnline && <WifiOff className="h-4 w-4 text-amber-500" />}
              {isSyncing && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
              {isOnline && !isSyncing && pendingCount > 0 && (
                <Clock className="h-4 w-4 text-green-500" />
              )}
              <span>Status de Sincronização</span>
            </div>
            {pendingCount > 0 && (
              <Badge variant={isOnline ? "default" : "secondary"}>
                {pendingCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Main Status */}
          <div className="space-y-3">
            {!isOnline ? (
              <Alert className="py-2">
                <WifiOff className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Modo offline ativo. {pendingCount} item(s) pendente(s).
                </AlertDescription>
              </Alert>
            ) : isSlowConnection ? (
              <Alert className="py-2" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Conexão lenta detectada ({effectiveType}). Sincronização pode demorar.
                </AlertDescription>
              </Alert>
            ) : pendingCount > 0 ? (
              <Alert className="py-2">
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Online - {pendingCount} item(s) aguardando sincronização.
                </AlertDescription>
              </Alert>
            ) : null}

            {isSyncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Sincronizando...</span>
                  <span>{Math.round(syncProgress)}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}

            {/* Expanded Details */}
            {isExpanded && (
              <div className="space-y-3 animate-fade-in">
                {syncQueue.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Itens Pendentes
                    </h4>
                    {syncQueue.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-muted/30 rounded p-2">
                        <div className="flex items-center gap-2">
                          {item.type === 'complaint' ? (
                            <Database className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Upload className="h-3 w-3 text-green-500" />
                          )}
                          <span>
                            {item.type === 'complaint' ? 'Denúncia' : 'Arquivo'}
                          </span>
                          <span className="text-muted-foreground truncate max-w-20">
                            #{item.id.split('_')[2]?.slice(0, 4)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.retryCount > 0 && (
                            <Badge variant="destructive" className="text-xs px-1">
                              Retry {item.retryCount}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {syncQueue.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{syncQueue.length - 3} itens adicionais
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retrySyncAll}
                    disabled={isSyncing || !isOnline}
                    className="flex-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tentar Novamente
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsExpanded(false)}
                    className="text-xs"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Status Summary */}
            {!isExpanded && pendingCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {isOnline ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Pronto para sincronizar
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    Aguardando conexão
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};