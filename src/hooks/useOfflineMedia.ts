import { useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineStorage } from './useOfflineStorage';
import { useToast } from '@/hooks/use-toast';

interface MediaFile {
  file: File;
  preview: string;
  type: 'photo' | 'video';
}

export const useOfflineMedia = () => {
  const { isOnline } = useNetworkStatus();
  const { saveOffline } = useOfflineStorage();
  const { toast } = useToast();
  const [pendingUploads, setPendingUploads] = useState<MediaFile[]>([]);

  const addMediaFile = async (files: FileList, type: 'photo' | 'video') => {
    const newFiles: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const preview = URL.createObjectURL(file);
      
      const mediaFile: MediaFile = {
        file,
        preview,
        type
      };

      newFiles.push(mediaFile);

      if (!isOnline) {
        // Store file data for offline use
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          preview,
          arrayBuffer: await file.arrayBuffer()
        };

        await saveOffline('media', fileData);
        console.log(`💾 Arquivo ${file.name} salvo para sincronização offline`);
      }
    }

    setPendingUploads(prev => [...prev, ...newFiles]);

    if (!isOnline) {
      toast({
        title: "Arquivos salvos offline",
        description: `${newFiles.length} arquivo(s) serão enviados quando a conexão for restabelecida.`,
      });
    }

    return newFiles.map(f => f.preview);
  };

  const removeMediaFile = (preview: string) => {
    setPendingUploads(prev => {
      const fileToRemove = prev.find(f => f.preview === preview);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.preview !== preview);
    });
  };

  const clearPendingUploads = () => {
    pendingUploads.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    setPendingUploads([]);
  };

  return {
    addMediaFile,
    removeMediaFile,
    clearPendingUploads,
    pendingUploads,
    hasPendingUploads: pendingUploads.length > 0
  };
};