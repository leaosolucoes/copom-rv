import { useState, useEffect } from 'react';
import { useOfflineAnalytics } from '@/hooks/useOfflineAnalytics';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BarChart3,
  Clock,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Info
} from 'lucide-react';

export const OfflineAnalyticsDashboard = () => {
  const { 
    analytics, 
    formatOfflineTime, 
    getHealthScore, 
    clearAnalytics,
    isHealthy 
  } = useOfflineAnalytics();
  const { conflicts, hasConflicts } = useConflictResolution();
  const [isOpen, setIsOpen] = useState(false);

  const healthScore = getHealthScore();

  const formatFileSize = (kb: number): string => {
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getHealthColor = (score: number): string => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed bottom-4 left-4 z-50"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
          {!isHealthy && (
            <AlertTriangle className="h-3 w-3 ml-1 text-amber-500" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Offline
            <Badge variant={getHealthBadgeVariant(healthScore)}>
              Score: {healthScore}%
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Health Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Status de Saúde do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Score Geral</span>
                  <span className={`font-semibold ${getHealthColor(healthScore)}`}>
                    {healthScore}%
                  </span>
                </div>
                <Progress value={healthScore} className="h-2" />
                
                {hasConflicts && (
                  <Alert className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {conflicts.length} conflito(s) detectado(s) que precisam de resolução manual.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estatísticas de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sessões Offline</span>
                    <span className="text-sm font-medium">{analytics.offlineSessions}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tempo Total Offline</span>
                    <span className="text-sm font-medium">
                      {formatOfflineTime(analytics.totalOfflineTime)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Taxa de Sucesso</span>
                    <span className="text-sm font-medium">
                      {analytics.syncSuccessRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Operações Pendentes</span>
                    <span className="text-sm font-medium">{analytics.pendingOperations}</span>
                  </div>
                  
                  {analytics.lastSyncTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Última Sincronização</span>
                      <span className="text-sm font-medium">
                        {new Date(analytics.lastSyncTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Uso de Dados Offline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Denúncias em Cache</span>
                  <Badge variant="outline">{analytics.dataUsage.complaints}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Arquivos de Mídia</span>
                  <Badge variant="outline">{analytics.dataUsage.media}</Badge>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tamanho Total Estimado</span>
                  <span className="text-sm font-semibold">
                    {formatFileSize(analytics.dataUsage.totalSize)}
                  </span>
                </div>
                
                {analytics.dataUsage.totalSize > 5000 && (
                  <Alert className="py-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Cache grande detectado. Considere sincronizar para liberar espaço.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAnalytics}
                  className="flex-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar Dados
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};