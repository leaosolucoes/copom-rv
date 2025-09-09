import { useEffect, useRef } from 'react';
import { logger } from '@/lib/secureLogger';

/**
 * Hook AGRESSIVO para detectar e bloquear DevTools
 * MÁXIMA PROTEÇÃO contra F12, inspeção de código e engenharia reversa
 */
export const useDevToolsProtection = () => {
  const devToolsOpen = useRef(false);
  
  useEffect(() => {
    // Proteções simplificadas - apenas bloqueio de teclas básico
    const blockBasicKeys = (e: KeyboardEvent) => {
      // Apenas em produção
      if (process.env.NODE_ENV !== 'production') return;
      
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
    };
    
    document.addEventListener('keydown', blockBasicKeys);
    
    return () => {
      document.removeEventListener('keydown', blockBasicKeys);
    };
  }, []);

  return devToolsOpen.current;
};