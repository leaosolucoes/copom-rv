import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineComplaint {
  id: string;
  timestamp: number;
  data: any;
  photos: Array<{ name: string; data: string }>;
  videos: Array<{ name: string; data: string }>;
  retryCount: number;
  status: 'pending' | 'syncing' | 'error';
  lastError?: string;
}

interface OfflineDB extends DBSchema {
  complaints: {
    key: string;
    value: OfflineComplaint;
    indexes: { 'by-timestamp': number; 'by-status': string };
  };
}

class OfflineStorageManager {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private readonly DB_NAME = 'copom-offline';
  private readonly DB_VERSION = 1;

  async init() {
    if (this.db) return;

    try {
      this.db = await openDB<OfflineDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('complaints')) {
            const store = db.createObjectStore('complaints', { keyPath: 'id' });
            store.createIndex('by-timestamp', 'timestamp');
            store.createIndex('by-status', 'status');
          }
        },
      });
      console.log('✅ IndexedDB inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar IndexedDB:', error);
    }
  }

  async saveComplaint(complaint: OfflineComplaint): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database não inicializado');

    try {
      await this.db.put('complaints', complaint);
      console.log('✅ Denúncia salva offline:', complaint.id);
    } catch (error) {
      console.error('❌ Erro ao salvar denúncia offline:', error);
      throw error;
    }
  }

  async getPendingComplaints(): Promise<OfflineComplaint[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    try {
      const complaints = await this.db.getAllFromIndex('complaints', 'by-status', 'pending');
      return complaints;
    } catch (error) {
      console.error('❌ Erro ao buscar denúncias pendentes:', error);
      return [];
    }
  }

  async getAllComplaints(): Promise<OfflineComplaint[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    try {
      return await this.db.getAll('complaints');
    } catch (error) {
      console.error('❌ Erro ao buscar todas as denúncias:', error);
      return [];
    }
  }

  async removeComplaint(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database não inicializado');

    try {
      await this.db.delete('complaints', id);
      console.log('✅ Denúncia removida:', id);
    } catch (error) {
      console.error('❌ Erro ao remover denúncia:', error);
      throw error;
    }
  }

  async updateComplaintStatus(id: string, status: OfflineComplaint['status'], error?: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database não inicializado');

    try {
      const complaint = await this.db.get('complaints', id);
      if (!complaint) return;

      complaint.status = status;
      if (error) complaint.lastError = error;
      if (status === 'syncing') complaint.retryCount++;

      await this.db.put('complaints', complaint);
      console.log(`✅ Status atualizado para ${status}:`, id);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  }

  async getCount(): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) return 0;

    try {
      return await this.db.count('complaints');
    } catch (error) {
      console.error('❌ Erro ao contar denúncias:', error);
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database não inicializado');

    try {
      await this.db.clear('complaints');
      console.log('✅ Todas as denúncias offline removidas');
    } catch (error) {
      console.error('❌ Erro ao limpar denúncias:', error);
      throw error;
    }
  }
}

export const offlineStorage = new OfflineStorageManager();
