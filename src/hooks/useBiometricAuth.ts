import { useState, useEffect } from 'react';
import { NativeBiometric, BiometryType, AvailableResult } from 'capacitor-native-biometric';
import { BiometricStorage } from '@/utils/biometricStorage';
import { toast } from '@/hooks/use-toast';

export const useBiometricAuth = () => {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometryType | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    setIsChecking(true);
    try {
      const result: AvailableResult = await NativeBiometric.isAvailable();
      setIsBiometricAvailable(result.isAvailable);
      setBiometricType(result.biometryType);

      if (result.isAvailable) {
        const enabled = await BiometricStorage.isBiometricEnabled();
        setIsBiometricEnabled(enabled);
      }
    } catch (error) {
      console.error('Erro ao verificar biometria:', error);
      setIsBiometricAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const authenticate = async (reason?: string): Promise<boolean> => {
    try {
      const promptReason = reason || getBiometricPromptText();
      
      await NativeBiometric.verifyIdentity({
        reason: promptReason,
        title: 'Autenticação Necessária',
        subtitle: 'COPOM Rio Verde',
        description: 'Use sua biometria para fazer login',
        maxAttempts: 3,
      });

      return true;
    } catch (error: any) {
      console.error('Erro na autenticação biométrica:', error);
      
      if (error.code === 10 || error.code === 13) {
        // User cancelled
        return false;
      } else if (error.code === 11) {
        // Too many attempts
        toast({
          title: 'Muitas Tentativas',
          description: 'Tente novamente mais tarde ou use sua senha',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro de Autenticação',
          description: 'Não foi possível autenticar. Use sua senha.',
          variant: 'destructive',
        });
      }
      
      return false;
    }
  };

  const enableBiometric = async (email: string, userId: string, sessionToken: string): Promise<boolean> => {
    try {
      // Primeiro verificar se biometria está disponível
      if (!isBiometricAvailable) {
        toast({
          title: 'Biometria Indisponível',
          description: 'Este dispositivo não suporta autenticação biométrica',
          variant: 'destructive',
        });
        return false;
      }

      // Solicitar autenticação biométrica para confirmar
      const authenticated = await authenticate('Configure sua biometria para login rápido');
      
      if (!authenticated) {
        return false;
      }

      // Salvar credenciais
      await BiometricStorage.saveCredentials({
        email,
        userId,
        sessionToken,
        timestamp: Date.now(),
      });

      // Também salvar no secure storage nativo
      try {
        await NativeBiometric.setCredentials({
          username: email,
          password: sessionToken,
          server: 'copom-rv-app',
        });
      } catch (error) {
        console.warn('Não foi possível salvar no secure storage nativo:', error);
      }

      await BiometricStorage.setBiometricEnabled(true);
      setIsBiometricEnabled(true);

      toast({
        title: 'Biometria Ativada',
        description: 'Você pode usar sua biometria para fazer login',
      });

      return true;
    } catch (error) {
      console.error('Erro ao habilitar biometria:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar a autenticação biométrica',
        variant: 'destructive',
      });
      return false;
    }
  };

  const disableBiometric = async (): Promise<void> => {
    try {
      await BiometricStorage.clearCredentials();
      
      // Também limpar do secure storage nativo
      try {
        await NativeBiometric.deleteCredentials({
          server: 'copom-rv-app',
        });
      } catch (error) {
        console.warn('Não foi possível limpar secure storage nativo:', error);
      }

      setIsBiometricEnabled(false);

      toast({
        title: 'Biometria Desativada',
        description: 'Você precisará usar sua senha para fazer login',
      });
    } catch (error) {
      console.error('Erro ao desabilitar biometria:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar a biometria',
        variant: 'destructive',
      });
    }
  };

  const authenticateAndGetCredentials = async () => {
    if (!isBiometricEnabled) {
      return null;
    }

    const authenticated = await authenticate('Autentique-se para fazer login');
    
    if (!authenticated) {
      return null;
    }

    // Tentar buscar do secure storage nativo primeiro
    try {
      const nativeCredentials = await NativeBiometric.getCredentials({
        server: 'copom-rv-app',
      });
      
      if (nativeCredentials) {
        const storedData = await BiometricStorage.getCredentials();
        if (storedData) {
          return storedData;
        }
      }
    } catch (error) {
      console.warn('Não foi possível buscar do secure storage nativo, usando fallback');
    }

    // Fallback para Preferences
    return await BiometricStorage.getCredentials();
  };

  const getBiometricPromptText = (): string => {
    switch (biometricType) {
      case BiometryType.FINGERPRINT:
        return 'Use sua impressão digital para continuar';
      case BiometryType.FACE_ID:
        return 'Use o Face ID para continuar';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Use o reconhecimento facial para continuar';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Use o reconhecimento de íris para continuar';
      default:
        return 'Use sua biometria para continuar';
    }
  };

  const getBiometricTypeLabel = (): string => {
    switch (biometricType) {
      case BiometryType.FINGERPRINT:
        return 'Impressão Digital';
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Reconhecimento Facial';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Reconhecimento de Íris';
      case BiometryType.MULTIPLE:
        return 'Múltiplas Biometrias';
      default:
        return 'Biometria';
    }
  };

  return {
    isBiometricAvailable,
    biometricType,
    isBiometricEnabled,
    isChecking,
    authenticate,
    enableBiometric,
    disableBiometric,
    authenticateAndGetCredentials,
    getBiometricTypeLabel,
    checkBiometricAvailability,
  };
};
