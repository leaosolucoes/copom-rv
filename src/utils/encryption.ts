export class EncryptionUtils {
  // Gerar token seguro
  static async generateSecureToken(length: number = 32): Promise<string> {
    const array = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback para Node.js
      const crypto = require('crypto');
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        array[i] = randomBytes[i];
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Hash simples usando SHA-256
  static async simpleHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    if (typeof window !== 'undefined' && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback para Node.js
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(data).digest('hex');
    }
  }
}