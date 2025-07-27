import { useEffect } from 'react';
import { logger } from '@/lib/secureLogger';

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  useEffect(() => {
    // PROTEÇÃO MÁXIMA CONTRA EXPOSIÇÃO DE CÓDIGO
    
    // 1. Headers de segurança ULTRA restritivos
    const addMaxSecurityHeaders = () => {
      // Content Security Policy MÁXIMO
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";
        document.head.appendChild(meta);
      }

      // X-Frame-Options ULTRA restritivo
      const frameMeta = document.querySelector('meta[http-equiv="X-Frame-Options"]');
      if (!frameMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'X-Frame-Options';
        meta.content = 'DENY';
        document.head.appendChild(meta);
      }

      // Outros headers de segurança
      const headers = [
        ['X-Content-Type-Options', 'nosniff'],
        ['X-XSS-Protection', '1; mode=block'],
        ['Referrer-Policy', 'no-referrer'],
        ['Permissions-Policy', 'geolocation=(), microphone=(), camera=()'],
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

    // 3. PROTEÇÃO CONTRA DEVTOOLS (apenas em produção)
    const setupDevToolsProtection = () => {
      if (process.env.NODE_ENV !== 'production') {
        return; // Não bloquear em desenvolvimento
      }
      
      // Disable todas as ferramentas de debug
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };
      (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };
      
      // Sobrescrever console methods apenas em produção
      const blockConsole = () => {
        ['log', 'debug', 'info', 'warn', 'error', 'trace', 'dir', 'dirxml', 'table', 'group', 'groupEnd', 'clear'].forEach(method => {
          (console as any)[method] = () => {};
        });
      };
      
      blockConsole();
      
      // Anti-debug apenas em produção
      setInterval(() => {
        try {
          debugger;
        } catch (e) {}
      }, 500); // Menos agressivo
      
      // Bloquear acesso ao console apenas em produção
      if (process.env.NODE_ENV === 'production') {
        Object.defineProperty(window, 'console', {
          get: () => {
            logger.error('Tentativa de acesso ao console detectada');
            return {};
          },
          set: () => {},
          configurable: false
        });
      }
    };

    // 4. Rate limiting ULTRA restritivo
    const setupUltraRateLimit = () => {
      const requests = new Map();
      const GLOBAL_LIMIT = 100; // Máximo 100 requests por minuto
      
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

    // 5. PROTEÇÃO CONTRA IFRAME/CLICKJACKING ULTRA
    const setupUltraClickjackingProtection = () => {
      // Verificação contínua
      const checkFraming = () => {
        if (window.top !== window.self) {
          logger.error('Carregamento em iframe detectado - Bloqueando');
          // Forçar saída do iframe
          window.top!.location = window.self.location;
          // Bloquear completamente se não conseguir sair
          document.body.innerHTML = '<h1>🚫 ACESSO NEGADO</h1><p>Esta aplicação não pode ser carregada em iframe.</p>';
        }
      };
      
      checkFraming();
      setInterval(checkFraming, 1000);
    };

    // 6. PROTEÇÃO CONTRA VIEW SOURCE
    const setupSourceProtection = () => {
      // Bloquear Ctrl+U (View Source)
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.keyCode === 85 || e.key === 'u')) {
          e.preventDefault();
          e.stopPropagation();
          logger.error('Tentativa de visualizar código fonte bloqueada');
          return false;
        }
      });
      
      // Adicionar texto falso para confundir
      const script = document.createElement('script');
      script.textContent = `
        // Sistema de proteção ativo
        // Código fonte protegido
        // Tentativas de acesso são monitoradas
      `;
      document.head.appendChild(script);
    };

    // EXECUTAR PROTEÇÕES BASEADAS NO AMBIENTE
    try {
      addMaxSecurityHeaders();
      enforceHTTPS();
      setupDevToolsProtection(); // Renomeado e ajustado
      setupUltraRateLimit();
      setupUltraClickjackingProtection();
      setupSourceProtection();
      
      logger.debug('🛡️ Proteções de segurança ativadas');
    } catch (error) {
      logger.error('Erro ao ativar proteções:', error);
    }
  }, []);

  return <>{children}</>;
};