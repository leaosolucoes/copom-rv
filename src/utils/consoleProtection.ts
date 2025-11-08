/**
 * Proteção do console em produção
 * Sobrescreve todos os métodos do console para prevenir logging
 */

// Função vazia para substituir métodos do console
const noop = () => {};

export const initConsoleProtection = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Salvar referências originais (se necessário para debugging crítico)
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    table: console.table,
    dir: console.dir,
    dirxml: console.dirxml,
    group: console.group,
    groupCollapsed: console.groupCollapsed,
    groupEnd: console.groupEnd,
    trace: console.trace,
    assert: console.assert,
    count: console.count,
    profile: console.profile,
    profileEnd: console.profileEnd,
    time: console.time,
    timeEnd: console.timeEnd,
    timeLog: console.timeLog,
    clear: console.clear,
  };

  // Sobrescrever todos os métodos do console
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
  console.table = noop;
  console.dir = noop;
  console.dirxml = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.trace = noop;
  console.count = noop;
  console.profile = noop;
  console.profileEnd = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.timeLog = noop;
  console.clear = noop;

  // Manter apenas console.error com mensagem genérica
  console.error = (...args: any[]) => {
    // Em produção, logar apenas mensagem genérica
    originalConsole.error('Erro na aplicação');
  };

  // Manter console.assert mas sanitizado
  console.assert = (condition?: boolean, ...args: any[]) => {
    if (!condition) {
      originalConsole.error('Assertion failed');
    }
  };

  // Prevenir que o console seja redefinido
  Object.defineProperty(window, 'console', {
    value: console,
    writable: false,
    configurable: false,
  });

  // Desabilitar React DevTools em produção
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: true,
      supportsFiber: true,
      inject: noop,
      onCommitFiberRoot: noop,
      onCommitFiberUnmount: noop,
    };
  }
};
