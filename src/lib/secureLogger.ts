/**
 * Sistema de logging seguro que funciona apenas em desenvolvimento
 * Remove automaticamente logs em produção
 */

declare const __DEV__: boolean;

class SecureLogger {
  private isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

  log(...args: any[]) {
    if (this.isDev) {
      console.log(...args);
    }
  }

  info(...args: any[]) {
    if (this.isDev) {
      console.info(...args);
    }
  }

  warn(...args: any[]) {
    if (this.isDev) {
      console.warn(...args);
    }
  }

  error(...args: any[]) {
    // Erros sempre devem ser logados, mas sem dados sensíveis
    if (this.isDev) {
      console.error(...args);
    } else {
      // Em produção, loga apenas mensagem genérica
      console.error('Erro na aplicação');
    }
  }

  debug(...args: any[]) {
    if (this.isDev) {
      console.debug(...args);
    }
  }

  // Método para logging condicional de dados sensíveis
  sensitiveData(label: string, data: any) {
    if (this.isDev) {
      console.log(`[SENSITIVE] ${label}:`, data);
    }
  }
}

export const logger = new SecureLogger();