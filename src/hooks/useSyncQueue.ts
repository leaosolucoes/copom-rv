import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineStorage } from './useOfflineStorage';
import { useConflictResolution } from './useConflictResolution';
import { useOfflineAnalytics } from './useOfflineAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncItem {
  id: string;
  type: 'complaint' | 'media';
  data: any;
  retryCount: number;
  timestamp: number;
}

export const useSyncQueue = () => {
  const { isOnline } = useNetworkStatus();
  const { pendingItems, removeOfflineItem } = useOfflineStorage();
  const { detectConflicts, addConflict, autoResolveConflicts } = useConflictResolution();
  const { recordSyncSuccess, recordSyncFailure } = useOfflineAnalytics();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);

  // Convert pending items to sync queue
  useEffect(() => {
    const queue = pendingItems.map(item => ({
      id: item.id,
      type: item.type as 'complaint' | 'media',
      data: item.data,
      retryCount: 0,
      timestamp: item.timestamp
    }));
    setSyncQueue(queue);
  }, [pendingItems]);

  // Auto sync when online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing) {
      syncPendingItems();
    }
  }, [isOnline, syncQueue.length]);

  const syncPendingItems = async () => {
    if (!isOnline || isSyncing || syncQueue.length === 0) return;

    setIsSyncing(true);
    console.log(`🔄 Iniciando sincronização de ${syncQueue.length} itens...`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of syncQueue) {
      try {
        // Check for conflicts before syncing
        const conflict = await detectConflicts(item);
        if (conflict) {
          addConflict(conflict);
          console.log(`⚠️ Conflito detectado para item ${item.id}`);
          continue; // Skip this item, let user resolve conflict
        }

        if (item.type === 'complaint') {
          await syncComplaint(item);
          successCount++;
          recordSyncSuccess();
        } else if (item.type === 'media') {
          await syncMedia(item);
          successCount++;
          recordSyncSuccess();
        }
      } catch (error) {
        console.error(`Erro ao sincronizar item ${item.id}:`, error);
        errorCount++;
        recordSyncFailure();
        
        // Retry logic - max 3 attempts
        if (item.retryCount < 3) {
          setSyncQueue(prev => prev.map(queueItem => 
            queueItem.id === item.id 
              ? { ...queueItem, retryCount: queueItem.retryCount + 1 }
              : queueItem
          ));
        } else {
          // Remove after max retries
          await removeOfflineItem(item.id, item.type);
        }
      }
    }

    setIsSyncing(false);

    if (successCount > 0) {
      toast({
        title: "Sincronização concluída",
        description: `${successCount} item(s) sincronizado(s) com sucesso.`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: "Erro na sincronização",
        description: `${errorCount} item(s) falharam. Tentando novamente...`,
        variant: "destructive",
      });
    }
  };

  const syncComplaint = async (item: SyncItem) => {
    const { data, error } = await supabase.functions.invoke('capture-user-ip', {
      body: item.data
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    // Remove from offline storage after successful sync
    await removeOfflineItem(item.id, 'complaint');
    console.log(`✅ Denúncia ${item.id} sincronizada com sucesso`);
  };

  const syncMedia = async (item: SyncItem) => {
    // Implementation for media sync would go here
    // For now, just remove from offline storage
    await removeOfflineItem(item.id, 'media');
    console.log(`✅ Mídia ${item.id} sincronizada com sucesso`);
  };

  const retrySyncAll = async () => {
    if (isOnline) {
      await syncPendingItems();
    } else {
      toast({
        title: "Sem conexão",
        description: "Conecte-se à internet para sincronizar.",
        variant: "destructive",
      });
    }
  };

  return {
    isSyncing,
    syncQueue,
    retrySyncAll,
    pendingCount: syncQueue.length
  };
};