import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineStorage } from './useOfflineStorage';
import { supabase } from '@/integrations/supabase/client';

interface ConflictItem {
  id: string;
  type: 'complaint' | 'media';
  localData: any;
  serverData: any;
  conflictFields: string[];
  timestamp: number;
}

export const useConflictResolution = () => {
  const { isOnline } = useNetworkStatus();
  const { removeOfflineItem } = useOfflineStorage();
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  const detectConflicts = async (localItem: any): Promise<ConflictItem | null> => {
    if (!isOnline || localItem.type !== 'complaint') return null;

    try {
      // Check if item exists on server with same system_identifier
      const { data: serverItem, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('system_identifier', localItem.data.system_identifier)
        .maybeSingle();

      if (error || !serverItem) return null;

      // Compare timestamps and data
      const localTimestamp = new Date(localItem.timestamp).getTime();
      const serverTimestamp = new Date(serverItem.updated_at).getTime();

      if (serverTimestamp > localTimestamp) {
        // Server has newer data, detect conflicts
        const conflictFields = detectDataDifferences(localItem.data, serverItem);
        
        if (conflictFields.length > 0) {
          return {
            id: localItem.id,
            type: localItem.type,
            localData: localItem.data,
            serverData: serverItem,
            conflictFields,
            timestamp: localTimestamp
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return null;
    }
  };

  const detectDataDifferences = (localData: any, serverData: any): string[] => {
    const differences: string[] = [];
    const fieldsToCheck = [
      'complainant_name',
      'complainant_phone', 
      'occurrence_address',
      'narrative',
      'classification',
      'status'
    ];

    fieldsToCheck.forEach(field => {
      if (localData[field] !== serverData[field]) {
        differences.push(field);
      }
    });

    return differences;
  };

  const resolveConflict = async (
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge',
    mergeData?: any
  ) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    try {
      switch (resolution) {
        case 'local':
          // Use local data, update server
          await supabase
            .from('complaints')
            .update({
              ...conflict.localData,
              updated_at: new Date().toISOString()
            })
            .eq('system_identifier', conflict.localData.system_identifier);
          break;

        case 'server':
          // Keep server data, discard local changes
          break;

        case 'merge':
          // Use merged data
          if (mergeData) {
            await supabase
              .from('complaints')
              .update({
                ...mergeData,
                updated_at: new Date().toISOString()
              })
              .eq('system_identifier', conflict.localData.system_identifier);
          }
          break;
      }

      // Remove from offline storage and conflicts list
      await removeOfflineItem(conflict.id, conflict.type);
      setConflicts(prev => prev.filter(c => c.id !== conflictId));

      console.log(`✅ Conflito resolvido: ${resolution}`, conflictId);
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  };

  const autoResolveConflicts = (conflicts: ConflictItem[]) => {
    // Auto-resolve simple conflicts based on business rules
    conflicts.forEach(async (conflict) => {
      // Rule 1: If only status changed on server, keep server version
      if (conflict.conflictFields.length === 1 && conflict.conflictFields[0] === 'status') {
        await resolveConflict(conflict.id, 'server');
        return;
      }

      // Rule 2: If local has more detailed narrative, prefer local
      if (conflict.conflictFields.includes('narrative') && 
          conflict.localData.narrative.length > conflict.serverData.narrative.length) {
        await resolveConflict(conflict.id, 'local');
        return;
      }

      // Rule 3: For timestamp-based conflicts, prefer most recent
      const timeDiff = Math.abs(conflict.timestamp - new Date(conflict.serverData.updated_at).getTime());
      if (timeDiff > 60000) { // More than 1 minute difference
        // Keep the conflict for manual resolution
        return;
      }

      // Auto-merge compatible changes
      const mergedData = {
        ...conflict.serverData,
        // Keep local narrative if longer
        narrative: conflict.localData.narrative.length > conflict.serverData.narrative.length 
          ? conflict.localData.narrative 
          : conflict.serverData.narrative,
        // Keep server status
        status: conflict.serverData.status
      };

      await resolveConflict(conflict.id, 'merge', mergedData);
    });
  };

  const addConflict = (conflict: ConflictItem) => {
    setConflicts(prev => [...prev, conflict]);
  };

  return {
    conflicts,
    detectConflicts,
    resolveConflict,
    autoResolveConflicts,
    addConflict,
    hasConflicts: conflicts.length > 0
  };
};
