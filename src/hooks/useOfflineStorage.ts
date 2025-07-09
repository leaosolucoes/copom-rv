import { useState, useEffect } from 'react';

interface OfflineData {
  id: string;
  data: any;
  timestamp: number;
  type: 'complaint' | 'media' | 'config';
}

export const useOfflineStorage = () => {
  const [pendingItems, setPendingItems] = useState<OfflineData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize IndexedDB
  const initDB = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RioVerdeOfflineDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('pending_complaints')) {
          db.createObjectStore('pending_complaints', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('cached_media')) {
          db.createObjectStore('cached_media', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('system_config')) {
          db.createObjectStore('system_config', { keyPath: 'key' });
        }
      };
    });
  };

  // Save data offline
  const saveOffline = async (type: OfflineData['type'], data: any): Promise<string> => {
    try {
      const db = await initDB();
      const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const offlineData: OfflineData = {
        id,
        data,
        timestamp: Date.now(),
        type
      };

      const storeName = type === 'complaint' ? 'pending_complaints' : 
                       type === 'media' ? 'cached_media' : 'system_config';
      
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      
      await store.add(offlineData);
      
      console.log(`💾 Dados salvos offline: ${type}`, id);
      await loadPendingItems();
      
      return id;
    } catch (error) {
      console.error('Erro ao salvar dados offline:', error);
      throw error;
    }
  };

  // Get pending items
  const loadPendingItems = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(['pending_complaints'], 'readonly');
      const store = tx.objectStore('pending_complaints');
      const request = store.getAll();
      
      request.onsuccess = () => {
        setPendingItems(request.result || []);
      };
    } catch (error) {
      console.error('Erro ao carregar itens pendentes:', error);
    }
  };

  // Remove synced item
  const removeOfflineItem = async (id: string, type: OfflineData['type']) => {
    try {
      const db = await initDB();
      const storeName = type === 'complaint' ? 'pending_complaints' : 
                       type === 'media' ? 'cached_media' : 'system_config';
      
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      
      await store.delete(id);
      
      console.log(`🗑️ Item removido do cache offline: ${id}`);
      await loadPendingItems();
    } catch (error) {
      console.error('Erro ao remover item offline:', error);
    }
  };

  // Cache system configuration
  const cacheConfig = async (key: string, value: any) => {
    try {
      const db = await initDB();
      const tx = db.transaction(['system_config'], 'readwrite');
      const store = tx.objectStore('system_config');
      
      await store.put({ key, value, timestamp: Date.now() });
      console.log(`⚙️ Configuração cacheada: ${key}`);
    } catch (error) {
      console.error('Erro ao cachear configuração:', error);
    }
  };

  // Get cached configuration
  const getCachedConfig = async (key: string): Promise<any | null> => {
    try {
      const db = await initDB();
      const tx = db.transaction(['system_config'], 'readonly');
      const store = tx.objectStore('system_config');
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Erro ao obter configuração cacheada:', error);
      return null;
    }
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        await loadPendingItems();
        setIsInitialized(true);
        console.log('💾 Sistema de armazenamento offline inicializado');
      } catch (error) {
        console.error('Erro ao inicializar armazenamento offline:', error);
      }
    };

    initialize();
  }, []);

  return {
    pendingItems,
    isInitialized,
    saveOffline,
    removeOfflineItem,
    loadPendingItems,
    cacheConfig,
    getCachedConfig
  };
};