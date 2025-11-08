import React, { useEffect, ReactNode } from 'react';
import { validateDomain, initAntiTamper, clearSensitiveData } from '@/utils/codeProtection';
import { logger } from '@/lib/secureLogger';

interface SecurityProviderProps {
  children: ReactNode;
}

/**
 * Provider de segurança que envolve toda a aplicação
 * Implementa múltiplas camadas de proteção em produção
 */
export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  useEffect(() => {
    const isProduction = process.env.NODE_ENV === 'production';

    // Validar domínio
    if (isProduction && !validateDomain()) {
      logger.error('Domínio não autorizado detectado');
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>Acesso Negado</h1></div>';
      return;
    }

    // Verificar HTTPS em produção
    if (isProduction && window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      logger.warn('Redirecionando para HTTPS');
      window.location.href = window.location.href.replace('http://', 'https://');
      return;
    }

    // Bloquear teclas de atalho para DevTools
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isProduction) return;

      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        logger.warn('F12 bloqueado');
        return false;
      }

      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        logger.warn('Ctrl+Shift+I bloqueado');
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        logger.warn('Ctrl+Shift+J bloqueado');
        return false;
      }

      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        logger.warn('Ctrl+Shift+C bloqueado');
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        logger.warn('Ctrl+U bloqueado');
        return false;
      }

      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        logger.warn('Ctrl+S bloqueado');
        return false;
      }

      // F11 (Fullscreen - pode ser usado para bypass)
      if (e.key === 'F11') {
        e.preventDefault();
        logger.warn('F11 bloqueado');
        return false;
      }
    };

    // Bloquear botão direito do mouse
    const handleContextMenu = (e: MouseEvent) => {
      if (!isProduction) return;
      e.preventDefault();
      logger.warn('Botão direito bloqueado');
      return false;
    };

    // Bloquear seleção de texto em produção
    const handleSelectStart = (e: Event) => {
      if (!isProduction) return;
      // Permitir seleção em inputs e textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      return false;
    };

    // Bloquear copiar/colar em produção
    const handleCopy = (e: ClipboardEvent) => {
      if (!isProduction) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      logger.warn('Cópia bloqueada');
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!isProduction) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      logger.warn('Recorte bloqueado');
      return false;
    };

    // Bloquear drag and drop
    const handleDragStart = (e: DragEvent) => {
      if (!isProduction) return;
      e.preventDefault();
      return false;
    };

    // Adicionar event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('dragstart', handleDragStart);

    // Iniciar anti-tamper
    const cleanupAntiTamper = initAntiTamper();

    // Verificar se está em iframe (anti-clickjacking)
    if (isProduction && window.self !== window.top) {
      logger.error('Iframe detectado - possível clickjacking');
      window.top!.location.href = window.self.location.href;
    }

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('dragstart', handleDragStart);
      cleanupAntiTamper();
      clearSensitiveData();
    };
  }, []);

  return <>{children}</>;
};
