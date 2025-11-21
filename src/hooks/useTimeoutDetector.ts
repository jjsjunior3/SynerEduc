import { useState, useEffect, useRef } from 'react';

interface TimeoutConfig {
  maxTimeout: number;
  retryCount: number;
  autoResolve: boolean;
}

interface TimeoutError {
  id: string;
  timestamp: number;
  url: string;
  error: Error;
  retryCount: number;
}

export function useTimeoutDetector(config: Partial<TimeoutConfig> = {}) {
  const {
    maxTimeout = 30000,
    retryCount = 3,
    autoResolve = true
  } = config;

  const [timeoutErrors, setTimeoutErrors] = useState<TimeoutError[]>([]);
  const [isDetected, setIsDetected] = useState(false);
  const timeoutCounter = useRef(0);
  const errorThreshold = 3; // Número de timeouts para considerar um problema

  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        timeoutCounter.current++;
        
        const error = new Error(`Request timeout after ${maxTimeout}ms`);
        const timeoutError: TimeoutError = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          url: input.toString(),
          error,
          retryCount: 0
        };

        setTimeoutErrors(prev => [...prev, timeoutError]);
        
        // Detectar padrão de timeouts
        if (timeoutCounter.current >= errorThreshold) {
          setIsDetected(true);
          
          if (autoResolve) {
            console.warn('[TIMEOUT_DETECTOR] Muitos timeouts detectados, ativando modo de resolução automática');
            setTimeout(() => {
              window.location.href = window.location.pathname + '?mode=timeout-killer';
            }, 2000);
          }
        }
      }, maxTimeout);

      const newInit = {
        ...init,
        signal: controller.signal
      };

      try {
        const response = await originalFetch(input, newInit);
        clearTimeout(timeoutId);
        
        // Reset counter em caso de sucesso
        if (response.ok) {
          timeoutCounter.current = Math.max(0, timeoutCounter.current - 1);
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Verificar se é erro de timeout
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('[TIMEOUT_DETECTOR] Timeout detectado:', input.toString());
        }
        
        throw error;
      }
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, [maxTimeout, autoResolve]);

  const clearTimeouts = () => {
    setTimeoutErrors([]);
    setIsDetected(false);
    timeoutCounter.current = 0;
  };

  const getTimeoutStats = () => {
    const now = Date.now();
    const recentTimeouts = timeoutErrors.filter(
      error => now - error.timestamp < 60000 // Últimos 60 segundos
    );

    return {
      total: timeoutErrors.length,
      recent: recentTimeouts.length,
      urls: [...new Set(timeoutErrors.map(e => e.url))],
      isProblematic: timeoutCounter.current >= errorThreshold
    };
  };

  return {
    timeoutErrors,
    isDetected,
    clearTimeouts,
    getTimeoutStats,
    timeoutCount: timeoutCounter.current
  };
}

// Hook para monitoramento global de timeouts
export function useGlobalTimeoutMonitor() {
  const [globalTimeouts, setGlobalTimeouts] = useState(0);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('timeout') || event.message.includes('timed out')) {
        setGlobalTimeouts(prev => prev + 1);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('timeout') || 
          event.reason?.name === 'AbortError') {
        setGlobalTimeouts(prev => prev + 1);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return {
    globalTimeouts,
    resetGlobalTimeouts: () => setGlobalTimeouts(0)
  };
}