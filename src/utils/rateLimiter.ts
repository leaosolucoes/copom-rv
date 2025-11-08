/**
 * Rate Limiter client-side para monitorar requisições suspeitas
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private blocked: Set<string> = new Set();

  /**
   * Verifica se uma ação está rate limited
   * @param key Identificador único da ação
   * @param config Configuração do rate limit
   * @returns true se permitido, false se bloqueado
   */
  check(key: string, config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }): boolean {
    // Em desenvolvimento, sempre permitir
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Se já está bloqueado, negar
    if (this.blocked.has(key)) {
      console.warn(`Rate limit: ${key} está bloqueado`);
      return false;
    }

    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remover requisições antigas fora da janela de tempo
    const validRequests = requests.filter(timestamp => now - timestamp < config.windowMs);

    // Verificar se excedeu o limite
    if (validRequests.length >= config.maxRequests) {
      console.warn(`Rate limit excedido para ${key}`);
      this.blocked.add(key);
      
      // Desbloquear após o dobro da janela de tempo
      setTimeout(() => {
        this.blocked.delete(key);
        this.requests.delete(key);
      }, config.windowMs * 2);

      return false;
    }

    // Adicionar nova requisição
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Limpa histórico de uma chave específica
   */
  clear(key: string) {
    this.requests.delete(key);
    this.blocked.delete(key);
  }

  /**
   * Limpa todo o histórico
   */
  clearAll() {
    this.requests.clear();
    this.blocked.clear();
  }

  /**
   * Verifica se uma chave está bloqueada
   */
  isBlocked(key: string): boolean {
    return this.blocked.has(key);
  }

  /**
   * Obtém estatísticas de uma chave
   */
  getStats(key: string): { requests: number; blocked: boolean } {
    return {
      requests: this.requests.get(key)?.length || 0,
      blocked: this.blocked.has(key),
    };
  }
}

// Instância global do rate limiter
export const rateLimiter = new ClientRateLimiter();

// Configurações padrão para diferentes tipos de ações
export const RATE_LIMIT_CONFIGS = {
  API_REQUEST: { maxRequests: 100, windowMs: 60000 }, // 100 req/min
  LOGIN: { maxRequests: 5, windowMs: 60000 }, // 5 tentativas/min
  FORM_SUBMIT: { maxRequests: 10, windowMs: 60000 }, // 10 submits/min
  SEARCH: { maxRequests: 30, windowMs: 60000 }, // 30 searches/min
};
