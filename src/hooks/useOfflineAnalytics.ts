import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineStorage } from './useOfflineStorage';

interface OfflineAnalytics {
  totalOfflineTime: number;
  offlineSessions: number;
  pendingOperations: number;
  syncSuccessRate: number;
  dataUsage: {
    complaints: number;
    media: number;
    totalSize: number;
  };
  lastSyncTime: number | null;
}

export const useOfflineAnalytics = () => {
  const { isOnline } = useNetworkStatus();
  const { pendingItems } = useOfflineStorage();
  const [analytics, setAnalytics] = useState<OfflineAnalytics>({
    totalOfflineTime: 0,
    offlineSessions: 0,
    pendingOperations: 0,
    syncSuccessRate: 100,
    dataUsage: {
      complaints: 0,
      media: 0,
      totalSize: 0
    },
    lastSyncTime: null
  });

  // Track offline sessions
  useEffect(() => {
    const offlineStartTime = Date.now();
    
    if (!isOnline) {
      // Start offline session tracking
      const sessionData = {
        startTime: offlineStartTime,
        endTime: null,
        operationsCount: 0
      };
      
      localStorage.setItem('currentOfflineSession', JSON.stringify(sessionData));
      
      // Update session count
      const sessions = parseInt(localStorage.getItem('offlineSessions') || '0');
      localStorage.setItem('offlineSessions', (sessions + 1).toString());
    } else {
      // End offline session tracking
      const currentSession = localStorage.getItem('currentOfflineSession');
      if (currentSession) {
        const session = JSON.parse(currentSession);
        const sessionDuration = Date.now() - session.startTime;
        
        // Update total offline time
        const totalTime = parseInt(localStorage.getItem('totalOfflineTime') || '0');
        localStorage.setItem('totalOfflineTime', (totalTime + sessionDuration).toString());
        
        // Clear current session
        localStorage.removeItem('currentOfflineSession');
        
        // Update last sync time
        localStorage.setItem('lastSyncTime', Date.now().toString());
      }
    }
  }, [isOnline]);

  // Track data usage
  useEffect(() => {
    const complaintsCount = pendingItems.filter(item => item.type === 'complaint').length;
    const mediaCount = pendingItems.filter(item => item.type === 'media').length;
    
    // Estimate data size (rough calculation)
    const estimatedSize = (complaintsCount * 2) + (mediaCount * 100); // KB
    
    setAnalytics(prev => ({
      ...prev,
      pendingOperations: pendingItems.length,
      dataUsage: {
        complaints: complaintsCount,
        media: mediaCount,
        totalSize: estimatedSize
      }
    }));
  }, [pendingItems]);

  // Load analytics from localStorage
  useEffect(() => {
    const loadAnalytics = () => {
      const totalOfflineTime = parseInt(localStorage.getItem('totalOfflineTime') || '0');
      const offlineSessions = parseInt(localStorage.getItem('offlineSessions') || '0');
      const lastSyncTime = localStorage.getItem('lastSyncTime');
      const syncSuccessRate = parseFloat(localStorage.getItem('syncSuccessRate') || '100');
      
      setAnalytics(prev => ({
        ...prev,
        totalOfflineTime,
        offlineSessions,
        syncSuccessRate,
        lastSyncTime: lastSyncTime ? parseInt(lastSyncTime) : null
      }));
    };

    loadAnalytics();
  }, []);

  const recordSyncSuccess = () => {
    const currentRate = parseFloat(localStorage.getItem('syncSuccessRate') || '100');
    const newRate = Math.min(100, currentRate + 0.5);
    localStorage.setItem('syncSuccessRate', newRate.toString());
    setAnalytics(prev => ({ ...prev, syncSuccessRate: newRate }));
  };

  const recordSyncFailure = () => {
    const currentRate = parseFloat(localStorage.getItem('syncSuccessRate') || '100');
    const newRate = Math.max(0, currentRate - 2);
    localStorage.setItem('syncSuccessRate', newRate.toString());
    setAnalytics(prev => ({ ...prev, syncSuccessRate: newRate }));
  };

  const clearAnalytics = () => {
    localStorage.removeItem('totalOfflineTime');
    localStorage.removeItem('offlineSessions');
    localStorage.removeItem('lastSyncTime');
    localStorage.removeItem('syncSuccessRate');
    localStorage.removeItem('currentOfflineSession');
    
    setAnalytics({
      totalOfflineTime: 0,
      offlineSessions: 0,
      pendingOperations: 0,
      syncSuccessRate: 100,
      dataUsage: {
        complaints: 0,
        media: 0,
        totalSize: 0
      },
      lastSyncTime: null
    });
  };

  const formatOfflineTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '< 1m';
    }
  };

  const getHealthScore = (): number => {
    const syncScore = analytics.syncSuccessRate;
    const dataScore = analytics.dataUsage.totalSize < 1000 ? 100 : 
                     analytics.dataUsage.totalSize < 5000 ? 80 : 60;
    const pendingScore = analytics.pendingOperations < 5 ? 100 :
                        analytics.pendingOperations < 20 ? 80 : 60;
    
    return Math.round((syncScore + dataScore + pendingScore) / 3);
  };

  return {
    analytics,
    recordSyncSuccess,
    recordSyncFailure,
    clearAnalytics,
    formatOfflineTime,
    getHealthScore,
    isHealthy: getHealthScore() > 80
  };
};