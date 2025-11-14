import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Fingerprint, Scan } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

interface BiometricSetupPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  userId: string;
  sessionToken: string;
  onComplete: () => void;
}

export const BiometricSetupPrompt = ({
  open,
  onOpenChange,
  email,
  userId,
  sessionToken,
  onComplete,
}: BiometricSetupPromptProps) => {
  const { enableBiometric, getBiometricTypeLabel } = useBiometricAuth();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const success = await enableBiometric(email, userId, sessionToken);
      if (success) {
        onComplete();
        onOpenChange(false);
      }
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Fingerprint className="h-8 w-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            Ativar {getBiometricTypeLabel()}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Faça login rapidamente usando sua biometria nas próximas vezes, sem precisar digitar sua senha.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Scan className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Rápido e Seguro</p>
              <p className="text-xs">
                Suas credenciais ficam armazenadas de forma segura no dispositivo
              </p>
            </div>
          </div>
        </div>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleSkip} disabled={isEnabling}>
            Agora Não
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleEnable} disabled={isEnabling}>
            {isEnabling ? 'Configurando...' : 'Ativar Biometria'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
