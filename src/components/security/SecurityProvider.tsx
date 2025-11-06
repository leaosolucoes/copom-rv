import { useEffect } from 'react';
import { logger } from '@/lib/secureLogger';

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  useEffect(() => {
    // PROTEÇÃO MÁXIMA CONTRA EXPOSIÇÃO DE CÓDIGO
    const isLovableEnv = location.hostname.includes('lovableproject.com') || location.hostname.includes('lovable.app');
    const isIframed = window.top !== window.self;
    
    // 1. Headers de segurança básicos (CSP já definido no index.html)
    const addBasicSecurityHeaders = () => {
      // Apenas adicionar headers complementares, não sobrescrever CSP
      const headers = [
        ['X-Content-Type-Options', 'nosniff'],
        ['Referrer-Policy', 'no-referrer'],
      ];

      headers.forEach(([name, content]) => {
        if (!document.querySelector(`meta[http-equiv="${name}"]`)) {
          const meta = document.createElement('meta');
          meta.httpEquiv = name;
          meta.content = content;
          document.head.appendChild(meta);
        }
      });
    };

    // 2. HTTPS obrigatório e agressivo
    const enforceHTTPS = () => {
      if (location.protocol !== 'https:' && 
          !location.hostname.includes('localhost') &&
          !location.hostname.includes('127.0.0.1') &&
          !location.hostname.includes('lovableproject.com') &&
          !location.hostname.includes('lovable.app')) {
        logger.warn('Forçando HTTPS por segurança');
        location.replace(`https:${location.href.substring(location.protocol.length)}`);
      }
    };

    // 3. Proteções básicas de devtools (não bloquear console para debugging)
    const setupBasicDevToolsProtection = () => {
      if (process.env.NODE_ENV !== 'production') {
        return;
      }
      
      // Apenas desabilitar hooks de devtools, mas manter console ativo
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };
      (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };
    };

    // 4. Rate limiting moderado
    const setupRateLimit = () => {
      const requests = new Map();
      const GLOBAL_LIMIT = 500; // Máximo 500 requests por minuto
      
      window.addEventListener('beforeunload', () => {
        requests.clear();
      });

      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const now = Date.now();
        const globalKey = 'global_requests';
        const recentRequests = requests.get(globalKey) || [];
        
        // Filtrar requests dos últimos 60 segundos
        const filteredRequests = recentRequests.filter((time: number) => now - time < 60000);
        
        if (filteredRequests.length >= GLOBAL_LIMIT) {
          logger.error('Rate limit global excedido');
          throw new Error('Muitas requisições. Acesso temporariamente bloqueado.');
        }
        
        filteredRequests.push(now);
        requests.set(globalKey, filteredRequests);
        
        return originalFetch(...args);
      };
    };

    // 5. Proteção básica contra iframe/clickjacking
    const setupClickjackingProtection = () => {
      // Permitir embed no preview do Lovable
      if (isLovableEnv && (window.top !== window.self)) {
        return;
      }
      
      // Apenas log de aviso, sem bloquear aplicação
      if (window.top !== window.self) {
        logger.warn('Aplicação carregada em iframe - monitorando');
      }
    };


    // EXECUTAR PROTEÇÕES SIMPLIFICADAS
    try {
      addBasicSecurityHeaders();
      enforceHTTPS();
      setupBasicDevToolsProtection();
      setupRateLimit();
      setupClickjackingProtection();
      
      logger.info('🛡️ Proteções básicas de segurança ativadas');
    } catch (error) {
      logger.error('Erro ao ativar proteções:', error);
      // Não bloquear a aplicação em caso de erro
    }
  }, []);

  return <>{children}</>;
};