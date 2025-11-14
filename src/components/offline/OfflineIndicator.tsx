import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { offlineStorage } from '@/utils/offlineStorage';
import { syncService, SyncStatus } from '@/services/syncService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const OfflineIndicator = () => {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    total: 0,
    completed: 0,
    failed: 0
  });

  // Atualizar contador de pendentes
  const updatePendingCount = async () => {
    const count = await offlineStorage.getCount();
    setPendingCount(count);
  };

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listener de status de sincronização
  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
      
      if (status.status === 'completed') {
        updatePendingCount();
        
        if (status.completed > 0) {
          toast.success(`✅ ${status.completed} denúncia(s) sincronizada(s)!`);
        }
        
        if (status.failed > 0) {
          toast.error(`❌ ${status.failed} denúncia(s) falharam`);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Sincronizar automaticamente quando voltar online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && syncStatus.status === 'idle') {
      console.log('🌐 Internet detectada, iniciando sincronização automática...');
      syncService.syncPendingComplaints();
    }
  }, [isOnline, pendingCount, syncStatus.status]);

  const handleSyncNow = async () => {
    if (syncStatus.status === 'syncing') return;
    
    toast.info('🔄 Sincronizando denúncias...');
    await syncService.syncPendingComplaints();
  };

  const isSyncing = syncStatus.status === 'syncing';

  // Não mostrar nada se estiver online e não houver pendências
  if (isOnline && pendingCount === 0 && syncStatus.status === 'idle') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {/* Indicador de Offline */}
      {!isOnline && (
        <Badge variant="destructive" className="gap-2 px-3 py-2">
          <WifiOff className="h-4 w-4" />
          <span className="font-semibold">Modo Offline</span>
          {pendingCount > 0 && (
            <span className="ml-1 opacity-90">({pendingCount} pendente{pendingCount > 1 ? 's' : ''})</span>
          )}
        </Badge>
      )}

      {/* Indicador de Sincronização */}
      {isOnline && pendingCount > 0 && (
        <div className="flex gap-2 items-center bg-background border border-border rounded-lg shadow-lg p-2">
          <Badge variant="secondary" className="gap-2">
            <Wifi className="h-4 w-4" />
            <span className="font-semibold">
              {isSyncing ? 'Sincronizando...' : `${pendingCount} para sincronizar`}
            </span>
          </Badge>
          
          <Button
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing}
            variant="outline"
            className="h-8 px-3"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      {/* Progresso de Sincronização */}
      {isSyncing && syncStatus.total > 0 && (
        <Badge variant="outline" className="gap-2 px-3 py-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="font-semibold">
            {syncStatus.completed} / {syncStatus.total}
          </span>
        </Badge>
      )}

      {/* Feedback de Conclusão */}
      {syncStatus.status === 'completed' && syncStatus.completed > 0 && (
        <Badge variant="default" className="gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 animate-in fade-in duration-300">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-semibold">Sincronizado!</span>
        </Badge>
      )}
    </div>
  );
};
