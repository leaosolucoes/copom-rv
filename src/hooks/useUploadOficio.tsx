import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useUploadOficio = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadOficio = async (file: File, userId: string) => {
    setIsUploading(true);

    try {
      // Validar arquivo
      if (!file.type.includes('pdf')) {
        throw new Error('Apenas arquivos PDF são permitidos');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('Arquivo muito grande. Máximo 10MB');
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '_');
      const fileName = `${userId}/${timestamp}_${sanitizedFileName}`;

      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from('oficios-audiencias')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Obter URL pública do arquivo
      const { data: publicUrl } = supabase.storage
        .from('oficios-audiencias')
        .getPublicUrl(fileName);

      toast({
        title: 'Sucesso',
        description: 'Arquivo enviado com sucesso',
      });

      return {
        fileName,
        publicUrl: publicUrl.publicUrl,
        path: data.path
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: `Erro ao enviar arquivo: ${errorMessage}`,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadOficio,
    isUploading
  };
};