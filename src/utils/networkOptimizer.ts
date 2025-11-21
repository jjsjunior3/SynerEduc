// Utilitários de rede otimizados para reduzir timeouts

interface NetworkConfig {
  maxRetries: number;
  baseTimeout: number;
  retryDelay: number;
  maxConcurrentRequests: number;
}

const DEFAULT_CONFIG: NetworkConfig = {
  maxRetries: 2,
  baseTimeout: 5000, // 5 segundos
  retryDelay: 1000,
  maxConcurrentRequests: 3
};

class NetworkOptimizer {
  private static instance: NetworkOptimizer;
  private config: NetworkConfig;
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance() {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer();
    }
    return NetworkOptimizer.instance;
  }

  // Fetch com retry automático e timeout otimizado
  async optimizedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    return this.executeWithQueue(() => this.fetchWithRetry(url, options));
  }

  private async executeWithQueue<T>(operation: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      console.log('[NetworkOptimizer] Adicionando à fila, limite de requests atingido');
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    return operation();
  }

  private async fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    this.activeRequests++;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[NetworkOptimizer] Timeout na tentativa ${attempt} para ${url}`);
        controller.abort();
      }, this.config.baseTimeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      this.processQueue();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
        console.log(`[NetworkOptimizer] Tentativa ${attempt} falhada, tentando novamente em ${this.config.retryDelay}ms`);
        await this.delay(this.config.retryDelay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  private shouldRetry(error: any): boolean {
    // Não retry em casos específicos
    if (error.name === 'AbortError') return false;
    if (error.message.includes('400') || error.message.includes('401')) return false;
    
    return true;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private processQueue() {
    if (this.requestQueue.length > 0 && this.activeRequests < this.config.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  // Limpar fila de requests
  clearQueue() {
    console.log(`[NetworkOptimizer] Limpando ${this.requestQueue.length} requests da fila`);
    this.requestQueue.length = 0;
  }

  // Status da rede
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      config: this.config
    };
  }
}

// Wrapper simplificado para uso comum
export async function optimizedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const optimizer = NetworkOptimizer.getInstance();
  return optimizer.optimizedFetch(url, options);
}

// Fetch com fallback rápido para modo offline
export async function fetchWithFastFallback(url: string, options: RequestInit = {}, fallbackData?: any): Promise<any> {
  try {
    const response = await optimizedFetch(url, options);
    return await response.json();
  } catch (error) {
    console.log(`[NetworkOptimizer] Fallback ativado para ${url}:`, error.message);
    
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    
    throw error;
  }
}

// Batch de requests com limite de concorrência
export async function batchRequests<T>(
  requests: Array<() => Promise<T>>, 
  maxConcurrent = 2
): Promise<Array<T | Error>> {
  const results: Array<T | Error> = [];
  
  for (let i = 0; i < requests.length; i += maxConcurrent) {
    const batch = requests.slice(i, i + maxConcurrent);
    
    const batchResults = await Promise.allSettled(
      batch.map(request => request())
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push(result.reason);
      }
    });
    
    // Delay entre batches para não sobrecarregar
    if (i + maxConcurrent < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export { NetworkOptimizer };