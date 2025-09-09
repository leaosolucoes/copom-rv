import { useEffect, useRef } from 'react';
import { logger } from '@/lib/secureLogger';

/**
 * Hook AGRESSIVO para detectar e bloquear DevTools
 * MÁXIMA PROTEÇÃO contra F12, inspeção de código e engenharia reversa
 */
export const useDevToolsProtection = () => {
  const devToolsOpen = useRef(false);
  const threshold = 160; // Diferença de tamanho que indica DevTools aberto
  const detectionInterval = useRef<NodeJS.Timeout>();
  const redirectTimeout = useRef<NodeJS.Timeout>();
  const isProduction = process.env.NODE_ENV === 'production';

  useEffect(() => {
    // DevTools protection disabled to prevent production issues
    // The aggressive detection was blocking legitimate desktop users
    
    // Simple keyboard shortcuts blocking only
    const blockDevToolsKeys = (e: KeyboardEvent) => {
      // Only block in production
      if (process.env.NODE_ENV !== 'production') return;
      
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }
    };
    
    // Block right-click context menu in production
    const blockRightClick = (e: MouseEvent) => {
      // Only block in production
      if (process.env.NODE_ENV !== 'production') return;
      
      e.preventDefault();
      return false;
    };
    
    document.addEventListener('keydown', blockDevToolsKeys);
    document.addEventListener('contextmenu', blockRightClick);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', blockDevToolsKeys);
      document.removeEventListener('contextmenu', blockRightClick);
    };
  }, []);

  return devToolsOpen.current;
};