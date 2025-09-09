/**
 * Utilitários para proteção de código e anti-engenharia reversa
 */

// Verifica se a aplicação está rodando no domínio correto
export const validateDomain = (): boolean => {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const allowedDomains = [
    'localhost',
    '127.0.0.1',
    'lovable.app',
    'lovableproject.com',
    '668e639d-dc0b-4b7a-ab49-c9f19cc751b2.lovableproject.com',
    'conectarioverde.com.br',
    'posturas.conectarioverde.com.br',
    // Domínios oficiais do sistema
  ];

  const currentDomain = window.location.hostname;
  return allowedDomains.some(domain => 
    currentDomain === domain || currentDomain.endsWith(`.${domain}`)
  );
};

// Verifica integridade básica da aplicação
export const checkIntegrity = (): boolean => {
  try {
    // Verifica se elementos críticos da página existem
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      return false;
    }

    // Mobile compatibility - skip script verification that causes false positives
    return true;
  } catch (error) {
    return false;
  }
};

// Ofusca strings sensíveis simples
export const obfuscateString = (str: string): string => {
  if (process.env.NODE_ENV === 'development') {
    return str;
  }
  
  return btoa(str);
};

// Decodifica strings ofuscadas
export const deobfuscateString = (str: string): string => {
  if (process.env.NODE_ENV === 'development') {
    return str;
  }
  
  try {
    return atob(str);
  } catch {
    return str;
  }
};

// Gera identificador único da sessão para tracking
export const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${randomStr}`;
};

// Função para limpar dados sensíveis na memória
export const clearSensitiveData = () => {
  // Limpar variáveis globais
  if ((window as any).__SUPABASE_CLIENT__) {
    delete (window as any).__SUPABASE_CLIENT__;
  }
  
  // Limpar arrays/objetos que podem conter dados sensíveis
  if ((window as any).__APP_STATE__) {
    delete (window as any).__APP_STATE__;
  }
  
  // Forçar garbage collection se disponível
  if ((window as any).gc) {
    (window as any).gc();
  }
};

// Anti-tamper básico
export const initAntiTamper = () => {
  if (process.env.NODE_ENV !== 'production') {
    return () => {}; // No-op in development
  }

  // Proteção mínima - apenas observação básica
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Apenas alertar sobre scripts suspeitos, não remover
            if (element.tagName === 'SCRIPT') {
              const scriptElement = element as HTMLScriptElement;
              if (scriptElement.src && 
                  !scriptElement.src.includes('lovable') &&
                  !scriptElement.src.includes('supabase') &&
                  !element.getAttribute('data-app-script')) {
                console.warn('Script externo detectado:', scriptElement.src);
              }
            }
          }
        });
      }
    });
  });

  try {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } catch (error) {
    console.warn('Erro ao inicializar observer:', error);
  }

  // Cleanup function
  return () => {
    try {
      observer.disconnect();
    } catch (error) {
      // Silent fail
    }
  };
};