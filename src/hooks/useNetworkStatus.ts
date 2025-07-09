import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: string | null;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    effectiveType: null
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        isSlowConnection: connection ? (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') : false,
        effectiveType: connection ? connection.effectiveType : null
      });
    };

    const handleOnline = () => {
      updateNetworkStatus();
      console.log('🟢 Conectado à internet');
      console.log('🔄 Tentando registrar background sync...');
      
      // Trigger background sync when back online
      if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration: any) => {
          return registration.sync.register('background-sync-complaints');
        }).then(() => {
          console.log('✅ Background sync registrado com sucesso');
        }).catch((error) => {
          console.error('❌ Falha ao registrar background sync:', error);
        });
      } else {
        console.log('⚠️ Background sync não suportado neste navegador');
      }
    };

    const handleOffline = () => {
      updateNetworkStatus();
      console.log('🔴 Desconectado da internet - modo offline ativado');
    };

    const handleConnectionChange = () => {
      updateNetworkStatus();
    };

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial status
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
};