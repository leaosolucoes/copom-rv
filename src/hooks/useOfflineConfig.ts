import { useState, useEffect } from 'react';
import { useOfflineStorage } from './useOfflineStorage';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '@/integrations/supabase/client';

interface SystemConfig {
  public_neighborhoods: string[];
  public_complaint_types: string[];
  public_occurrence_types: any[];
  public_classifications: string[];
  form_fields_config: any[];
}

export const useOfflineConfig = () => {
  const { isOnline } = useNetworkStatus();
  const { cacheConfig, getCachedConfig, isInitialized } = useOfflineStorage();
  const [config, setConfig] = useState<SystemConfig>({
    public_neighborhoods: [],
    public_complaint_types: [],
    public_occurrence_types: [],
    public_classifications: [],
    form_fields_config: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration (online first, fallback to cache)
  const loadConfig = async () => {
    setIsLoading(true);
    
    try {
      if (isOnline) {
        // Try to fetch from online first
        const { data, error } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', [
            'public_neighborhoods',
            'public_complaint_types', 
            'public_occurrence_types',
            'public_classifications',
            'form_fields_config'
          ]);

        if (!error && data) {
          const newConfig: SystemConfig = {
            public_neighborhoods: [],
            public_complaint_types: [],
            public_occurrence_types: [],
            public_classifications: [],
            form_fields_config: []
          };

          // Process and cache each setting
          for (const item of data) {
            const value = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
            (newConfig as any)[item.key] = value;
            
            // Cache for offline use
            await cacheConfig(item.key, value);
          }

          setConfig(newConfig);
          console.log('⚙️ Configurações carregadas do servidor e cacheadas');
        } else {
          throw new Error('Falha ao carregar configurações online');
        }
      } else {
        throw new Error('Offline - usando cache');
      }
    } catch (error) {
      console.log('📱 Carregando configurações do cache offline...', error);
      
      // Fallback to cached data
      const cachedConfig: SystemConfig = {
        public_neighborhoods: [],
        public_complaint_types: [],
        public_occurrence_types: [],
        public_classifications: [],
        form_fields_config: []
      };

      const keys = [
        'public_neighborhoods',
        'public_complaint_types',
        'public_occurrence_types', 
        'public_classifications',
        'form_fields_config'
      ];

      for (const key of keys) {
        const cachedValue = await getCachedConfig(key);
        if (cachedValue) {
          (cachedConfig as any)[key] = cachedValue;
        }
      }

      setConfig(cachedConfig);
      console.log('📦 Configurações carregadas do cache offline');
    } finally {
      setIsLoading(false);
    }
  };

  // Load config when online status changes or component mounts
  useEffect(() => {
    if (isInitialized) {
      loadConfig();
    }
  }, [isOnline, isInitialized]);

  return {
    config,
    isLoading,
    reloadConfig: loadConfig
  };
};