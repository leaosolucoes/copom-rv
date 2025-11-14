import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Fingerprint, ShieldCheck, Smartphone } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { Badge } from '@/components/ui/badge';

export const BiometricSettings = () => {
  const {
    isBiometricAvailable,
    isBiometricEnabled,
    isChecking,
    disableBiometric,
    getBiometricTypeLabel,
    checkBiometricAvailability,
  } = useBiometricAuth();

  const handleToggle = async (enabled: boolean) => {
    if (!enabled) {
      await disableBiometric();
    }
    // Se tentar habilitar, precisa fazer novo login
  };

  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Autenticação Biométrica
          </CardTitle>
          <CardDescription>Verificando disponibilidade...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Autenticação Biométrica
        </CardTitle>
        <CardDescription>
          Use sua biometria para fazer login rapidamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status da Biometria */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${isBiometricAvailable ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Smartphone className={`h-4 w-4 ${isBiometricAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Status do Dispositivo</p>
              <p className="text-xs text-muted-foreground">
                {isBiometricAvailable 
                  ? `${getBiometricTypeLabel()} disponível`
                  : 'Biometria não disponível'}
              </p>
            </div>
          </div>
          {isBiometricAvailable && (
            <Badge variant={isBiometricEnabled ? 'default' : 'secondary'}>
              {isBiometricEnabled ? 'Ativado' : 'Desativado'}
            </Badge>
          )}
        </div>

        {/* Toggle de Ativação */}
        {isBiometricAvailable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  Login com {getBiometricTypeLabel()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isBiometricEnabled 
                    ? 'Desative para usar apenas senha'
                    : 'Faça login novamente para ativar'}
                </p>
              </div>
              <Switch
                checked={isBiometricEnabled}
                onCheckedChange={handleToggle}
                disabled={!isBiometricEnabled}
              />
            </div>

            {/* Informações de Segurança */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Segurança</p>
                  <p className="text-xs text-muted-foreground">
                    Suas credenciais são armazenadas de forma criptografada apenas neste dispositivo.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Reconfigurar */}
            {isBiometricEnabled && (
              <Button
                variant="outline"
                onClick={disableBiometric}
                className="w-full"
              >
                Desativar Biometria
              </Button>
            )}
          </div>
        )}

        {/* Mensagem quando não disponível */}
        {!isBiometricAvailable && (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Este dispositivo não possui sensor biométrico ou a funcionalidade não está habilitada.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={checkBiometricAvailability}
            >
              Verificar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
