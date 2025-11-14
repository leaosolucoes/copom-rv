import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    // Listeners para browser
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capacitor Network API para mobile
    const setupNetworkListener = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);

        Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
        });
      } catch (error) {
        console.log('Network API não disponível, usando navigator.onLine');
      }
    };

    setupNetworkListener();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      Network.removeAllListeners().catch(() => {});
    };
  }, []);

  return { isOnline, connectionType };
};
