import { useEffect } from 'react';
import { logger } from '@/lib/secureLogger';

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  useEffect(() => {
    // Proteções básicas simplificadas para garantir carregamento
    
    // HTTPS enforcement apenas quando necessário
    const enforceHTTPS = () => {
      if (location.protocol !== 'https:' && 
          !location.hostname.includes('localhost') &&
          !location.hostname.includes('127.0.0.1') &&
          !location.hostname.includes('lovableproject.com') &&
          !location.hostname.includes('lovable.app')) {
        logger.warn('Redirecionando para HTTPS');
        location.replace(`https:${location.href.substring(location.protocol.length)}`);
      }
    };

    // Proteção básica contra iframe
    const basicFrameProtection = () => {
      if (window.top !== window.self) {
        logger.warn('Aplicação carregada em iframe');
        try {
          window.top!.location = window.self.location;
        } catch (e) {
          // Silently fail if blocked by same-origin policy
        }
      }
    };

    // Executar apenas proteções essenciais
    try {
      enforceHTTPS();
      basicFrameProtection();
      logger.debug('🛡️ Proteções básicas ativadas');
    } catch (error) {
      logger.error('Erro nas proteções:', error);
      // Continue loading even if protections fail
    }
  }, []);

  return <>{children}</>;
};