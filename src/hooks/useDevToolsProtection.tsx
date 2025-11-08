import { useEffect } from 'react';
import { clearSensitiveData } from '@/utils/codeProtection';
import { logger } from '@/lib/secureLogger';

/**
 * Hook para detectar e bloquear DevTools em produção
 * Múltiplos métodos de detecção para máxima efetividade
 */
export const useDevToolsProtection = () => {
  useEffect(() => {
    // Apenas ativo em produção
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    let devToolsOpen = false;

    // Método 1: Detecção por timing de console.log
    const detectDevToolsByTiming = () => {
      const start = performance.now();
      // @ts-ignore
      console.profile();
      // @ts-ignore
      console.profileEnd();
      const end = performance.now();
      return end - start > 100; // DevTools causa delay
    };

    // Método 2: Detecção por diferença de tamanho de janela
    const detectDevToolsBySize = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      return widthThreshold || heightThreshold;
    };

    // Método 3: Detecção por Firebug
    const detectFirebug = () => {
      // @ts-ignore
      return window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized;
    };

    // Método 4: Detecção por debugger timing
    const detectDebuggerTiming = () => {
      const start = performance.now();
      // @ts-ignore
      debugger;
      const end = performance.now();
      return end - start > 100;
    };

    // Método 5: Detecção por toString override
    const detectToStringOverride = () => {
      const element = new Image();
      let devToolsDetected = false;
      Object.defineProperty(element, 'id', {
        get: function() {
          devToolsDetected = true;
          return 'detected';
        }
      });
      console.log(element);
      console.clear();
      return devToolsDetected;
    };

    // Ação quando DevTools é detectado
    const handleDevToolsDetected = () => {
      if (devToolsOpen) return;
      
      devToolsOpen = true;
      logger.warn('DevTools detectado - Limpando dados sensíveis');
      
      // Limpar dados sensíveis
      clearSensitiveData();
      
      // Limpar localStorage exceto autenticação essencial
      const authData = localStorage.getItem('sb-auth-token');
      localStorage.clear();
      if (authData) {
        localStorage.setItem('sb-auth-token', authData);
      }
      
      // Redirecionar ou bloquear (opcional - pode ser muito agressivo)
      // window.location.href = '/';
      
      // Ou apenas mostrar aviso
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>Acesso Não Autorizado</h1></div>';
    };

    // Verificação contínua (a cada 1 segundo)
    const checkInterval = setInterval(() => {
      try {
        if (
          detectDevToolsByTiming() ||
          detectDevToolsBySize() ||
          detectFirebug() ||
          detectDebuggerTiming()
        ) {
          handleDevToolsDetected();
        }
      } catch (error) {
        // Ignorar erros de detecção
      }
    }, 1000);

    // Anti-debugging com debugger statements
    const antiDebugInterval = setInterval(() => {
      // @ts-ignore
      debugger;
    }, 100);

    // Cleanup
    return () => {
      clearInterval(checkInterval);
      clearInterval(antiDebugInterval);
    };
  }, []);
};
