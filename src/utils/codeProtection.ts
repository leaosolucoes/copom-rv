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
    // Adicione seus domínios autorizados aqui
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

    // Verifica se scripts foram injetados maliciosamente
    const scripts = document.querySelectorAll('script');
    const suspiciousKeywords = ['eval', 'Function', 'setTimeout', 'setInterval'];
    
    for (const script of scripts) {
      if (script.src && !script.src.includes(window.location.origin)) {
        // Script externo suspeito
        const text = script.textContent || '';
        if (suspiciousKeywords.some(keyword => text.includes(keyword))) {
          return false;
        }
      }
    }

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
    return;
  }

  // Protege contra modificação do console
  const originalConsole = { ...console };
  
  // Monitora mudanças suspeitas no DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' && !element.getAttribute('data-app-script')) {
              // Script suspeito injetado
              element.remove();
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Limpar quando necessário
  return () => {
    observer.disconnect();
    Object.assign(console, originalConsole);
  };
};