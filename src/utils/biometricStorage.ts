import { Preferences } from '@capacitor/preferences';

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const USER_CREDENTIALS_KEY = 'user_credentials_encrypted';

interface StoredCredentials {
  email: string;
  userId: string;
  sessionToken: string;
  timestamp: number;
}

export class BiometricStorage {
  static async setBiometricEnabled(enabled: boolean): Promise<void> {
    await Preferences.set({
      key: BIOMETRIC_ENABLED_KEY,
      value: enabled.toString(),
    });
  }

  static async isBiometricEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
    return value === 'true';
  }

  static async saveCredentials(credentials: StoredCredentials): Promise<void> {
    // Em produção, considere usar encriptação adicional
    const encoded = btoa(JSON.stringify(credentials));
    await Preferences.set({
      key: USER_CREDENTIALS_KEY,
      value: encoded,
    });
  }

  static async getCredentials(): Promise<StoredCredentials | null> {
    try {
      const { value } = await Preferences.get({ key: USER_CREDENTIALS_KEY });
      if (!value) return null;

      const decoded = JSON.parse(atob(value));
      
      // Verificar se o token não está muito antigo (30 dias)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - decoded.timestamp > thirtyDaysMs;
      
      if (isExpired) {
        await this.clearCredentials();
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Erro ao recuperar credenciais:', error);
      return null;
    }
  }

  static async clearCredentials(): Promise<void> {
    await Preferences.remove({ key: USER_CREDENTIALS_KEY });
    await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
  }

  static async hasStoredCredentials(): Promise<boolean> {
    const credentials = await this.getCredentials();
    return credentials !== null;
  }
}
