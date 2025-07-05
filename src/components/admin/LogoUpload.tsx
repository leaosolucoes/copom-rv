
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogoUploadProps {
  onLogoUpdate: (logoUrl: string) => void;
}

export const LogoUpload = ({ onLogoUpdate }: LogoUploadProps) => {
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchCurrentLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'public_logo_url')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        setCurrentLogoUrl(data.value as string);
        onLogoUpdate(data.value as string);
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  };

  useEffect(() => {
    fetchCurrentLogo();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "O arquivo deve ser menor que 2MB",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(uploadData.path);

      // Save URL to system settings
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          key: 'public_logo_url',
          value: publicUrl,
          description: 'URL da logo do sistema'
        }, {
          onConflict: 'key'
        });

      if (settingsError) throw settingsError;

      // Delete old logo if exists
      if (currentLogoUrl) {
        const oldFileName = currentLogoUrl.split('/').pop();
        if (oldFileName && oldFileName !== fileName) {
          await supabase.storage
            .from('system-assets')
            .remove([oldFileName]);
        }
      }

      setCurrentLogoUrl(publicUrl);
      onLogoUpdate(publicUrl);

      toast({
        title: "Sucesso",
        description: "Logo atualizada com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      if (!currentLogoUrl) return;

      // Remove from storage
      const fileName = currentLogoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('system-assets')
          .remove([fileName]);
      }

      // Remove from settings
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('key', 'public_logo_url');

      if (error) throw error;

      setCurrentLogoUrl('');
      onLogoUpdate('');

      toast({
        title: "Sucesso",
        description: "Logo removida com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao remover logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover logo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {currentLogoUrl ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={currentLogoUrl} 
                  alt="Logo atual" 
                  className="max-h-32 max-w-64 object-contain border rounded-lg p-4"
                />
              </div>
              <div className="flex justify-center">
                <Button variant="destructive" onClick={removeLogo}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Logo
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Nenhuma logo configurada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Nova Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="logo-upload">Selecionar Arquivo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-sm text-gray-500 mt-1">
                Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB
              </p>
            </div>
            
            {uploading && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Fazendo upload...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Instruções:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• A logo aparecerá no cabeçalho de todas as páginas</li>
          <li>• Recomendamos imagens em formato horizontal</li>
          <li>• A altura será ajustada automaticamente para 48px</li>
          <li>• Para melhor qualidade, use imagens com fundo transparente (PNG)</li>
        </ul>
      </div>
    </div>
  );
};
