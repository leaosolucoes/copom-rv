import { useEffect } from 'react';
import { logger } from '@/lib/secureLogger';

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  useEffect(() => {
    // Implementar headers de segurança via meta tags
    const addSecurityHeaders = () => {
      // Content Security Policy
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://posturas.conectarioverde.com.br https://*.supabase.co https://*.lovableproject.com https://*.lovable.app; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://*.supabase.co https://*.lovableproject.com https://*.lovable.app wss://*.supabase.co;";
        document.head.appendChild(meta);
      }

      // X-Frame-Options
      const frameMeta = document.querySelector('meta[http-equiv="X-Frame-Options"]');
      if (!frameMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'X-Frame-Options';
        meta.content = 'DENY';
        document.head.appendChild(meta);
      }

      // X-Content-Type-Options
      const typeMeta = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
      if (!typeMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'X-Content-Type-Options';
        meta.content = 'nosniff';
        document.head.appendChild(meta);
      }

      // Referrer Policy
      const referrerMeta = document.querySelector('meta[name="referrer"]');
      if (!referrerMeta) {
        const meta = document.createElement('meta');
        meta.name = 'referrer';
        meta.content = 'strict-origin-when-cross-origin';
        document.head.appendChild(meta);
      }
    };

    // Forçar HTTPS em produção
    const enforceHTTPS = () => {
      if (process.env.NODE_ENV === 'production' && 
          location.protocol !== 'https:' && 
          !location.hostname.includes('localhost') &&
          !location.hostname.includes('127.0.0.1') &&
          !location.hostname.includes('lovableproject.com') &&
          !location.hostname.includes('lovable.app')) {
        logger.warn('Redirecionando para HTTPS');
        location.replace(`https:${location.href.substring(location.protocol.length)}`);
      }
    };

    // Rate limiting básico para requisições
    const setupRateLimit = () => {
      const requests = new Map();
      
      window.addEventListener('beforeunload', () => {
        requests.clear();
      });

      // Monitorar requests de login
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const url = args[0] as string;
        
        if (url.includes('authenticate_user') || url.includes('auth/signin')) {
          const now = Date.now();
          const key = `login_${url}`;
          const recentRequests = requests.get(key) || [];
          
          // Remover requests antigas (mais de 1 minuto)
          const filteredRequests = recentRequests.filter((time: number) => now - time < 60000);
          
          if (filteredRequests.length >= 5) {
            logger.warn('Rate limit excedido para tentativas de login');
            throw new Error('Muitas tentativas de login. Aguarde um momento.');
          }
          
          filteredRequests.push(now);
          requests.set(key, filteredRequests);
        }
        
        return originalFetch(...args);
      };
    };

    // Prevenir ataques de clickjacking
    const preventClickjacking = () => {
      if (window.top !== window.self) {
        logger.error('Tentativa de carregamento em iframe detectada');
        window.top!.location = window.self.location;
      }
    };

    // Aplicar todas as proteções
    addSecurityHeaders();
    enforceHTTPS();
    setupRateLimit();
    preventClickjacking();

    logger.debug('Proteções de segurança aplicadas');
  }, []);

  return <>{children}</>;
};