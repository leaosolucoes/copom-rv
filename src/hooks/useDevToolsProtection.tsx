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
    // PROTEÇÃO ATIVA baseada no ambiente

    // DETECÇÃO MÚLTIPLA E AGRESSIVA DE DEVTOOLS
    const detectDevToolsMultiple = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      // Método 1: Diferença de tamanho da janela
      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen.current) {
          devToolsOpen.current = true;
          handleDevToolsDetected('window_size');
        }
      } else {
        devToolsOpen.current = false;
      }
      
      // Método 2: Console timing attack (apenas em produção)
      if (isProduction) {
        let start = performance.now();
        debugger; // Essa linha vai pausar se DevTools estiver aberto
        let end = performance.now();
        if (end - start > 100) { // Se demorou mais que 100ms, DevTools está aberto
          handleDevToolsDetected('debugger_timing');
        }
      }
      
      // Método 3: Detecção via console.clear (apenas em produção)
      if (isProduction) {
        try {
          const devtools = /./;
          devtools.toString = function() {
            handleDevToolsDetected('console_access');
            return 'DevTools detectado';
          };
          console.log('%c', devtools);
        } catch (e) {}
      }
    };

    // AÇÃO IMEDIATA E AGRESSIVA QUANDO DEVTOOLS É DETECTADO
    const handleDevToolsDetected = (method: string) => {
      if (devToolsOpen.current) return; // Evita múltiplas execuções
      
      devToolsOpen.current = true;
      logger.error(`🚨 DevTools detectado via ${method} - Aplicando contramedidas`);
      
      // LIMPEZA DE DADOS SENSÍVEIS (sempre executar)
      try {
        // 1. Limpar TUDO do localStorage e sessionStorage
        const keysToPreserve = isProduction ? [] : ['theme', 'language']; // Preservar alguns dados em dev
        const storageData: { [key: string]: string } = {};
        
        keysToPreserve.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            storageData[key] = value;
          }
        });
        
        localStorage.clear();
        sessionStorage.clear();
        
        // Restaurar dados preservados
        Object.entries(storageData).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        
        // 2. Limpar cookies apenas em produção
        if (isProduction) {
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
        }
        
        // 3. Limpar variáveis globais sensíveis
        if ((window as any).supabaseClient) delete (window as any).supabaseClient;
        if ((window as any).__SUPABASE_CLIENT__) delete (window as any).__SUPABASE_CLIENT__;
        if ((window as any).__AUTH_DATA__) delete (window as any).__AUTH_DATA__;
        
        // 4. Bloquear fetch apenas em produção
        if (isProduction) {
          window.fetch = async () => {
            throw new Error('Acesso bloqueado por motivos de segurança');
          };
        }
        
        // 5. Mensagens no console
        console.clear();
        if (isProduction) {
          console.log('%c🛡️ SISTEMA DE SEGURANÇA ATIVADO', 'color: red; font-size: 20px; font-weight: bold;');
          console.log('%c⚠️ DevTools detectado - Dados sensíveis foram limpos', 'color: orange; font-size: 16px;');
          console.log('%c🔒 Acesso bloqueado por segurança', 'color: red; font-size: 14px;');
        } else {
          console.warn('🔧 DevTools detectado em desenvolvimento');
        }
        
        // Mobile compatibility - disable aggressive DevTools detection
        // The multiple layers were causing false positives on mobile devices
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
          logger.debug('📱 Mobile detected - skipping DevTools protection to prevent auto-logout');
          return;
        }
        
        // Desktop only - reduced aggressiveness
        if (isProduction) {
          setTimeout(() => {
            window.location.href = '/acesso';
          }, 5000);
        }
        
      } catch (error) {
        logger.error('Erro ao aplicar contramedidas');
      }
    };

    // Simplified detection for mobile compatibility
    
    // Camada 6: Proteção contra teclas de atalho
    const blockDevToolsKeys = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        handleDevToolsDetected('f12_key');
        return false;
      }
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        handleDevToolsDetected('ctrl_shift_i');
        return false;
      }
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        handleDevToolsDetected('ctrl_shift_c');
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        handleDevToolsDetected('ctrl_u');
        return false;
      }
    };
    
    document.addEventListener('keydown', blockDevToolsKeys);
    
    // Camada 7: Bloquear menu de contexto (botão direito)
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleDevToolsDetected('right_click');
      return false;
    };
    document.addEventListener('contextmenu', blockContextMenu);

    // CLEANUP FUNCTION - Remove todos os listeners
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
      window.removeEventListener('resize', detectDevToolsMultiple);
      document.removeEventListener('keydown', blockDevToolsKeys);
      document.removeEventListener('contextmenu', blockContextMenu);
    };
  }, []);

  return devToolsOpen.current;
};