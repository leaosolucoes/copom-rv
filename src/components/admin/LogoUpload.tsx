
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Image, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogoUploadProps {
  onLogoUpdate: (logoUrl: string) => void;
}

export const LogoUpload = ({ onLogoUpdate }: LogoUploadProps) => {
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [colors, setColors] = useState({
    primary: '#228B22',
    secondary: '#1F4E79', 
    accent: '#FF6B35',
    background: '#F8F9FA'
  });
  const [savingColors, setSavingColors] = useState(false);
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

  const fetchSystemColors = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_colors')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        setColors(data.value as any);
      }
    } catch (error) {
      console.error('Erro ao carregar cores:', error);
    }
  };

  const saveSystemColors = async () => {
    try {
      setSavingColors(true);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'system_colors',
          value: colors,
          description: 'Cores personalizadas do sistema'
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cores do sistema atualizadas com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao salvar cores:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar cores do sistema",
        variant: "destructive",
      });
    } finally {
      setSavingColors(false);
    }
  };

  useEffect(() => {
    fetchCurrentLogo();
    fetchSystemColors();
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Cores do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={colors.primary}
                    onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                    className="w-16 h-10 p-1 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.primary}
                    onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                    placeholder="#228B22"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="secondary-color"
                    type="color"
                    value={colors.secondary}
                    onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                    className="w-16 h-10 p-1 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.secondary}
                    onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                    placeholder="#1F4E79"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-color">Cor de Destaque</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="accent-color"
                    type="color"
                    value={colors.accent}
                    onChange={(e) => setColors(prev => ({ ...prev, accent: e.target.value }))}
                    className="w-16 h-10 p-1 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.accent}
                    onChange={(e) => setColors(prev => ({ ...prev, accent: e.target.value }))}
                    placeholder="#FF6B35"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background-color">Cor de Fundo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="background-color"
                    type="color"
                    value={colors.background}
                    onChange={(e) => setColors(prev => ({ ...prev, background: e.target.value }))}
                    className="w-16 h-10 p-1 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.background}
                    onChange={(e) => setColors(prev => ({ ...prev, background: e.target.value }))}
                    placeholder="#F8F9FA"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button 
                onClick={saveSystemColors}
                disabled={savingColors}
                variant="default"
              >
                {savingColors ? "Salvando..." : "Salvar Cores"}
              </Button>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-medium text-amber-900 mb-2">Preview das Cores:</h4>
              <div className="flex gap-2 flex-wrap">
                <div 
                  className="w-16 h-8 rounded border border-gray-300 flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  Primária
                </div>
                <div 
                  className="w-16 h-8 rounded border border-gray-300 flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: colors.secondary, color: '#fff' }}
                >
                  Secund.
                </div>
                <div 
                  className="w-16 h-8 rounded border border-gray-300 flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: colors.accent, color: '#fff' }}
                >
                  Destaque
                </div>
                <div 
                  className="w-16 h-8 rounded border border-gray-300 flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: colors.background, color: '#333' }}
                >
                  Fundo
                </div>
              </div>
            </div>
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
