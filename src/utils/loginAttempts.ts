/**
 * Gerenciador de tentativas de login para prevenir ataques de força bruta
 */

const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

interface LoginAttemptData {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class LoginAttemptsManager {
  /**
   * Obtém os dados de tentativas de login do localStorage
   */
  private static getData(): LoginAttemptData {
    const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!data) {
      return { count: 0, lastAttempt: Date.now() };
    }
    return JSON.parse(data);
  }

  /**
   * Salva os dados de tentativas de login no localStorage
   */
  private static setData(data: LoginAttemptData): void {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
  }

  /**
   * Registra uma tentativa de login falhada
   */
  static recordFailedAttempt(): void {
    const data = this.getData();
    const now = Date.now();

    // Se passou mais de 15 minutos desde a última tentativa, resetar contador
    if (now - data.lastAttempt > LOCKOUT_DURATION_MS) {
      this.setData({ count: 1, lastAttempt: now });
      return;
    }

    const newCount = data.count + 1;
    const newData: LoginAttemptData = {
      count: newCount,
      lastAttempt: now,
    };

    // Se atingiu o máximo, bloquear por 15 minutos
    if (newCount >= MAX_ATTEMPTS) {
      newData.lockedUntil = now + LOCKOUT_DURATION_MS;
    }

    this.setData(newData);
  }

  /**
   * Obtém o número de tentativas falhadas
   */
  static getAttemptCount(): number {
    const data = this.getData();
    const now = Date.now();

    // Se passou o período de bloqueio, resetar
    if (data.lockedUntil && now > data.lockedUntil) {
      this.reset();
      return 0;
    }

    return data.count;
  }

  /**
   * Verifica se deve mostrar CAPTCHA
   */
  static shouldShowCaptcha(): boolean {
    return this.getAttemptCount() >= MAX_ATTEMPTS;
  }

  /**
   * Verifica se está bloqueado e retorna tempo restante em segundos
   */
  static getLockedTimeRemaining(): number {
    const data = this.getData();
    if (!data.lockedUntil) return 0;

    const now = Date.now();
    if (now > data.lockedUntil) {
      this.reset();
      return 0;
    }

    return Math.ceil((data.lockedUntil - now) / 1000);
  }

  /**
   * Verifica se está bloqueado
   */
  static isLocked(): boolean {
    return this.getLockedTimeRemaining() > 0;
  }

  /**
   * Reseta as tentativas (após login bem-sucedido)
   */
  static reset(): void {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  }

  /**
   * Obtém mensagem de erro apropriada
   */
  static getErrorMessage(): string {
    const count = this.getAttemptCount();
    const remaining = MAX_ATTEMPTS - count;

    if (this.isLocked()) {
      const timeRemaining = this.getLockedTimeRemaining();
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      return `Muitas tentativas falhadas. Tente novamente em ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (count >= MAX_ATTEMPTS - 1) {
      return `Email ou senha incorretos. Você tem ${remaining} tentativa(s) restante(s)`;
    }

    return 'Email ou senha incorretos';
  }
}
