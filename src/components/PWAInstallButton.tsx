import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { useToast } from '@/hooks/use-toast';

export const PWAInstallButton = () => {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const { toast } = useToast();

  const handleInstall = async () => {
    const success = await installApp();
    
    if (success) {
      toast({
        title: "App instalado!",
        description: "O aplicativo foi instalado com sucesso em seu dispositivo.",
      });
    }
  };

  // Não mostrar se já está instalado
  if (isInstalled) return null;

  // Só mostrar se for instalável
  if (!isInstallable) return null;

  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 z-50 shadow-lg bg-background border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
    >
      <Download className="w-4 h-4 mr-2" />
      <Smartphone className="w-4 h-4 mr-1" />
      Instalar App
    </Button>
  );
};