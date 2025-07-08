import { useEffect, useRef } from 'react';

/**
 * Hook para detectar se DevTools está aberto e aplicar contramedidas
 */
export const useDevToolsProtection = () => {
  const devToolsOpen = useRef(false);
  const threshold = 160; // Diferença de tamanho que indica DevTools aberto

  useEffect(() => {
    // Só ativa proteção em produção
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen.current) {
          devToolsOpen.current = true;
          handleDevToolsOpen();
        }
      } else {
        devToolsOpen.current = false;
      }
    };

    const handleDevToolsOpen = () => {
      // Limpar dados sensíveis do localStorage/sessionStorage
      try {
        const keysToPreserve = ['theme', 'language']; // Manter apenas dados não sensíveis
        const storageData: { [key: string]: string } = {};
        
        keysToPreserve.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            storageData[key] = value;
          }
        });

        localStorage.clear();
        sessionStorage.clear();
        
        // Restaurar dados não sensíveis
        Object.entries(storageData).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });

        // Limpar variáveis globais sensíveis
        if ((window as any).supabaseClient) {
          delete (window as any).supabaseClient;
        }

        // Mostrar aviso discreto
        console.clear();
        console.log('%c⚠️ Ferramentas de desenvolvedor detectadas', 'color: red; font-size: 16px; font-weight: bold;');
        console.log('%cPor segurança, dados sensíveis foram limpos.', 'color: orange; font-size: 12px;');
        
      } catch (error) {
        // Falha silenciosa para não expor funcionamento interno
      }
    };

    // Múltiplas formas de detecção
    const interval = setInterval(detectDevTools, 1000);
    
    // Detecção via redimensionamento
    window.addEventListener('resize', detectDevTools);
    
    // Detecção via console
    const devtools = {
      open: false,
      orientation: null
    };
    
    const setOpen = (val: boolean, orientation: string | null) => {
      devtools.open = val;
      devtools.orientation = orientation;
      if (val && !devToolsOpen.current) {
        handleDevToolsOpen();
      }
    };

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200) {
        setOpen(true, 'horizontal');
      } else if (window.outerWidth - window.innerWidth > 200) {
        setOpen(true, 'vertical');
      } else {
        setOpen(false, null);
      }
    }, 500);

    // Proteção contra debug
    const debugProtection = () => {
      try {
        (function() {}).constructor('debugger')();
      } catch (e) {
        handleDevToolsOpen();
      }
    };

    const debugInterval = setInterval(debugProtection, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(debugInterval);
      window.removeEventListener('resize', detectDevTools);
    };
  }, []);

  return devToolsOpen.current;
};