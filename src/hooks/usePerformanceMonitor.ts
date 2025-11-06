import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';

interface PerformanceMetric {
  metric_type: 'page_load' | 'api_response' | 'supabase_query' | 'mapbox_query';
  metric_name: string;
  duration_ms: number;
  timestamp?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  error_message?: string;
}

export const usePerformanceMonitor = () => {
  const { user } = useSupabaseAuth();
  const [enabled, setEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Aguardar inicialização completa antes de começar a monitorar
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🔧 Performance Monitor inicializado');
      setIsInitialized(true);
    }, 3000); // 3 segundos de delay para garantir que a app carregou
    
    return () => clearTimeout(timer);
  }, []);

  // Função para registrar métrica com proteções robustas
  const logMetric = useCallback(async (metric: PerformanceMetric) => {
    // Não fazer nada se desabilitado ou não inicializado
    if (!enabled || !isInitialized) {
      return;
    }
    
    // Não tentar inserir se não houver usuário (exceto page_load que pode ser anônimo)
    if (!user && metric.metric_type !== 'page_load') {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          ...metric,
          user_id: user?.id || null,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        console.warn('⚠️ Erro ao registrar métrica (não crítico):', error.message);
        setErrorCount(prev => prev + 1);
        
        // Desabilitar após 3 erros consecutivos para não impactar a aplicação
        if (errorCount >= 2) {
          console.warn('🚫 Performance Monitor desabilitado após múltiplos erros');
          setEnabled(false);
        }
      } else {
        // Resetar contador de erros em caso de sucesso
        setErrorCount(0);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao registrar métrica (não crítico):', error);
      setErrorCount(prev => prev + 1);
      
      if (errorCount >= 2) {
        console.warn('🚫 Performance Monitor desabilitado após múltiplos erros');
        setEnabled(false);
      }
    }
  }, [user, enabled, isInitialized, errorCount]);

  // Monitorar carregamento da página
  useEffect(() => {
    const recordPageLoad = () => {
      // Usar Performance API para obter métricas reais
      if (typeof window !== 'undefined' && window.performance) {
        const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (perfData) {
          const loadTime = perfData.loadEventEnd - perfData.fetchStart;
          const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart;
          
          logMetric({
            metric_type: 'page_load',
            metric_name: window.location.pathname,
            duration_ms: Math.round(loadTime),
            metadata: {
              domContentLoaded: Math.round(domContentLoaded),
              transferSize: perfData.transferSize,
              type: perfData.type,
            },
            success: true,
          });
        }
      }
    };

    // Executar quando a página terminar de carregar
    if (document.readyState === 'complete') {
      recordPageLoad();
    } else {
      window.addEventListener('load', recordPageLoad);
      return () => window.removeEventListener('load', recordPageLoad);
    }
  }, [logMetric]);

  // Função para monitorar tempo de resposta de API
  const measureApiCall = useCallback(async <T,>(
    name: string,
    apiCall: () => Promise<T>,
    type: 'supabase_query' | 'mapbox_query' | 'api_response' = 'api_response'
  ): Promise<T> => {
    const startTime = performance.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw error;
    } finally {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      logMetric({
        metric_type: type,
        metric_name: name,
        duration_ms: duration,
        success,
        error_message: errorMessage,
      });
    }
  }, [logMetric]);

  return {
    logMetric,
    measureApiCall,
  };
};
