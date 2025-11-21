import React, { useEffect, useRef } from 'react';

// Sistema otimizado para detectar e cancelar timeouts
export class TimeoutOptimizer {
  private static instance: TimeoutOptimizer;
  private activeRequests = new Map<string, AbortController>();
  private requestTimeout = 8000; // 8 segundos máximo
  private maxConcurrentRequests = 3;

  static getInstance() {
    if (!TimeoutOptimizer.instance) {
      TimeoutOptimizer.instance = new TimeoutOptimizer();
    }
    return TimeoutOptimizer.instance;
  }

  // Fetch otimizado com timeout e cancelamento automático
  async optimizedFetch(url: string, options: RequestInit = {}, timeoutMs?: number): Promise<Response> {
    const requestId = `req_${Date.now()}_${Math.random()}`;
    const controller = new AbortController();
    const timeout = timeoutMs || this.requestTimeout;

    // Cancelar requests antigos se exceder limite
    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      console.log('[TimeoutOptimizer] Cancelando requests antigos para evitar sobrecarga');
      this.cancelOldestRequests(this.maxConcurrentRequests - 1);
    }

    this.activeRequests.set(requestId, controller);

    try {
      // Timer de timeout
      const timeoutId = setTimeout(() => {
        console.log(`[TimeoutOptimizer] Request timeout para ${url}`);
        controller.abort();
      }, timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
      
      return response;
    } catch (error) {
      this.activeRequests.delete(requestId);
      
      if (error.name === 'AbortError') {
        console.log(`[TimeoutOptimizer] Request cancelado: ${url}`);
        throw new Error(`Request timeout: ${url}`);
      }
      
      throw error;
    }
  }

  // Cancelar requests mais antigos
  private cancelOldestRequests(keepCount: number) {
    const requests = Array.from(this.activeRequests.entries());
    const toCancel = requests.slice(0, requests.length - keepCount);
    
    toCancel.forEach(([id, controller]) => {
      controller.abort();
      this.activeRequests.delete(id);
    });
  }

  // Cancelar todos os requests pendentes
  cancelAllRequests() {
    console.log(`[TimeoutOptimizer] Cancelando ${this.activeRequests.size} requests pendentes`);
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }

  // Status dos requests ativos
  getActiveRequestsCount() {
    return this.activeRequests.size;
  }
}

// Hook para usar o TimeoutOptimizer
export function useTimeoutOptimizer() {
  const optimizer = useRef(TimeoutOptimizer.getInstance());

  useEffect(() => {
    // Cleanup ao desmontar
    return () => {
      optimizer.current.cancelAllRequests();
    };
  }, []);

  return {
    optimizedFetch: optimizer.current.optimizedFetch.bind(optimizer.current),
    cancelAllRequests: optimizer.current.cancelAllRequests.bind(optimizer.current),
    getActiveRequestsCount: optimizer.current.getActiveRequestsCount.bind(optimizer.current)
  };
}

// Componente para monitorar timeouts
export function TimeoutMonitor() {
  const [activeRequests, setActiveRequests] = React.useState(0);
  const optimizer = TimeoutOptimizer.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRequests(optimizer.getActiveRequestsCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (activeRequests === 0) return null;

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-2 text-sm z-50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span>Requests ativos: {activeRequests}</span>
        <button 
          onClick={() => optimizer.cancelAllRequests()}
          className="text-red-600 hover:text-red-800 ml-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}