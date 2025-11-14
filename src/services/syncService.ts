import { offlineStorage, OfflineComplaint } from '@/utils/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  total: number;
  completed: number;
  failed: number;
  error?: string;
}

type SyncListener = (status: SyncStatus) => void;

class SyncService {
  private isSyncing = false;
  private syncListeners: SyncListener[] = [];
  private readonly MAX_RETRIES = 3;

  async syncPendingComplaints(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sincronização já em andamento');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Iniciando sincronização...');

    try {
      const pending = await offlineStorage.getPendingComplaints();
      
      if (pending.length === 0) {
        console.log('✅ Nenhuma denúncia pendente');
        this.notifyListeners({
          status: 'completed',
          total: 0,
          completed: 0,
          failed: 0
        });
        return;
      }

      console.log(`📋 ${pending.length} denúncia(s) para sincronizar`);
      this.notifyListeners({
        status: 'syncing',
        total: pending.length,
        completed: 0,
        failed: 0
      });

      let completed = 0;
      let failed = 0;

      for (const complaint of pending) {
        // Verificar se já atingiu o limite de tentativas
        if (complaint.retryCount >= this.MAX_RETRIES) {
          console.error(`❌ Denúncia ${complaint.id} excedeu ${this.MAX_RETRIES} tentativas`);
          await offlineStorage.updateComplaintStatus(complaint.id, 'error', 'Máximo de tentativas excedido');
          failed++;
          continue;
        }

        try {
          // Marcar como "syncing"
          await offlineStorage.updateComplaintStatus(complaint.id, 'syncing');

          // Enviar ao servidor via edge function
          const { data, error } = await supabase.functions.invoke('capture-user-ip', {
            body: complaint.data
          });

          if (error) throw error;

          // Remover da fila local após sucesso
          await offlineStorage.removeComplaint(complaint.id);
          completed++;
          
          console.log(`✅ Denúncia ${complaint.id} sincronizada`);
          
          this.notifyListeners({
            status: 'syncing',
            total: pending.length,
            completed,
            failed
          });
        } catch (error: any) {
          console.error(`❌ Erro ao sincronizar ${complaint.id}:`, error);
          
          // Voltar para status pending com erro
          await offlineStorage.updateComplaintStatus(
            complaint.id,
            'pending',
            error.message || 'Erro desconhecido'
          );
          failed++;
        }
      }

      console.log(`🎉 Sincronização concluída: ${completed} sucesso, ${failed} falhas`);
      
      this.notifyListeners({
        status: 'completed',
        total: pending.length,
        completed,
        failed
      });
    } catch (error: any) {
      console.error('❌ Erro na sincronização:', error);
      this.notifyListeners({
        status: 'error',
        total: 0,
        completed: 0,
        failed: 0,
        error: error.message
      });
    } finally {
      this.isSyncing = false;
    }
  }

  onSyncStatusChange(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Erro no listener de sincronização:', error);
      }
    });
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
