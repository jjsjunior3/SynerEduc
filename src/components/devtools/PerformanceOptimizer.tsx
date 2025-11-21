import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Activity, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Monitor de performance otimizado
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestQueue: Array<() => void> = [];
  private isProcessing = false;
  private maxConcurrentRequests = 2;
  private currentRequests = 0;
  private metrics = {
    totalRequests: 0,
    timeouts: 0,
    errors: 0,
    averageResponseTime: 0
  };

  static getInstance() {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Agendar operação para evitar sobrecarga
  scheduleOperation(operation: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const wrappedOperation = async () => {
        const startTime = Date.now();
        this.currentRequests++;
        this.metrics.totalRequests++;

        try {
          const result = await operation();
          const responseTime = Date.now() - startTime;
          this.updateAverageResponseTime(responseTime);
          resolve(result);
        } catch (error) {
          this.metrics.errors++;
          if (error.message.includes('timeout')) {
            this.metrics.timeouts++;
          }
          reject(error);
        } finally {
          this.currentRequests--;
          this.processQueue();
        }
      };

      if (this.currentRequests < this.maxConcurrentRequests) {
        wrappedOperation();
      } else {
        this.requestQueue.push(wrappedOperation);
      }
    });
  }

  private processQueue() {
    if (this.requestQueue.length > 0 && this.currentRequests < this.maxConcurrentRequests) {
      const nextOperation = this.requestQueue.shift();
      if (nextOperation) {
        nextOperation();
      }
    }
  }

  private updateAverageResponseTime(responseTime: number) {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
  }

  // Limpar fila em caso de problemas
  clearQueue() {
    console.log(`[PerformanceOptimizer] Limpando ${this.requestQueue.length} operações na fila`);
    this.requestQueue.length = 0;
    this.currentRequests = 0;
  }

  // Reduzir limite de concorrência se muitos timeouts
  adaptiveConcurrency() {
    const timeoutRate = this.metrics.timeouts / this.metrics.totalRequests;
    
    if (timeoutRate > 0.3 && this.maxConcurrentRequests > 1) {
      this.maxConcurrentRequests--;
      console.log(`[PerformanceOptimizer] Reduzindo concorrência para ${this.maxConcurrentRequests}`);
    } else if (timeoutRate < 0.1 && this.maxConcurrentRequests < 3) {
      this.maxConcurrentRequests++;
      console.log(`[PerformanceOptimizer] Aumentando concorrência para ${this.maxConcurrentRequests}`);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      queueLength: this.requestQueue.length,
      currentRequests: this.currentRequests,
      maxConcurrent: this.maxConcurrentRequests
    };
  }

  reset() {
    this.clearQueue();
    this.metrics = {
      totalRequests: 0,
      timeouts: 0,
      errors: 0,
      averageResponseTime: 0
    };
  }
}

// Hook para usar o otimizador
export function usePerformanceOptimizer() {
  const optimizer = useRef(PerformanceOptimizer.getInstance());

  const scheduleOperation = (operation: () => Promise<any>) => {
    return optimizer.current.scheduleOperation(operation);
  };

  const clearQueue = () => {
    optimizer.current.clearQueue();
  };

  const getMetrics = () => {
    return optimizer.current.getMetrics();
  };

  return { scheduleOperation, clearQueue, getMetrics };
}

// Componente para monitorar performance
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState(PerformanceOptimizer.getInstance().getMetrics());
  const [showDetails, setShowDetails] = useState(false);
  const optimizer = PerformanceOptimizer.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(optimizer.getMetrics());
      optimizer.adaptiveConcurrency();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getPerformanceStatus = () => {
    const { timeouts, totalRequests, averageResponseTime } = metrics;
    const timeoutRate = totalRequests > 0 ? timeouts / totalRequests : 0;
    
    if (timeoutRate > 0.3 || averageResponseTime > 10000) {
      return { status: 'poor', color: 'text-red-600', icon: AlertTriangle };
    } else if (timeoutRate > 0.1 || averageResponseTime > 5000) {
      return { status: 'fair', color: 'text-yellow-600', icon: Activity };
    } else {
      return { status: 'good', color: 'text-green-600', icon: Zap };
    }
  };

  const { status, color, icon: StatusIcon } = getPerformanceStatus();

  // Só mostrar se houver problemas de performance ou requests ativos
  if (metrics.totalRequests === 0 && metrics.queueLength === 0 && !showDetails) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80">
        <CardHeader className="pb-2">
          <CardTitle className={`flex items-center gap-2 text-sm ${color}`}>
            <StatusIcon className="w-4 h-4" />
            Performance Monitor
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="ml-auto h-auto p-1"
            >
              {showDetails ? '−' : '+'}
            </Button>
          </CardTitle>
        </CardHeader>
        
        {showDetails && (
          <CardContent className="pt-0">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Requests Totais:</span>
                <span className="font-medium">{metrics.totalRequests}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Timeouts:</span>
                <span className={`font-medium ${metrics.timeouts > 0 ? 'text-red-600' : ''}`}>
                  {metrics.timeouts}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Erros:</span>
                <span className={`font-medium ${metrics.errors > 0 ? 'text-red-600' : ''}`}>
                  {metrics.errors}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Tempo Médio:</span>
                <span className="font-medium">
                  {Math.round(metrics.averageResponseTime)}ms
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Na Fila:</span>
                <span className={`font-medium ${metrics.queueLength > 0 ? 'text-yellow-600' : ''}`}>
                  {metrics.queueLength}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Ativos:</span>
                <span className="font-medium">{metrics.currentRequests}</span>
              </div>

              <div className="pt-2 space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => optimizer.clearQueue()}
                  className="w-full h-auto py-1 text-xs"
                  disabled={metrics.queueLength === 0}
                >
                  Limpar Fila
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => optimizer.reset()}
                  className="w-full h-auto py-1 text-xs"
                >
                  Reset Métricas
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Componente compacto para mostrar apenas status
export function PerformanceIndicator() {
  const [metrics, setMetrics] = useState(PerformanceOptimizer.getInstance().getMetrics());
  const optimizer = PerformanceOptimizer.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(optimizer.getMetrics());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Só mostrar se houver atividade ou problemas
  if (metrics.totalRequests === 0 && metrics.queueLength === 0 && metrics.currentRequests === 0) {
    return null;
  }

  const hasIssues = metrics.timeouts > 0 || metrics.errors > 0 || metrics.queueLength > 3;

  return (
    <div className={`fixed top-4 right-20 px-2 py-1 rounded-full text-xs font-medium z-50 ${
      hasIssues 
        ? 'bg-red-100 text-red-700 border border-red-200' 
        : 'bg-green-100 text-green-700 border border-green-200'
    }`}>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${
          hasIssues ? 'bg-red-500' : 'bg-green-500'
        } ${metrics.currentRequests > 0 ? 'animate-pulse' : ''}`}></div>
        
        <span>
          {metrics.currentRequests > 0 ? 'Ativo' : 'OK'}
          {metrics.queueLength > 0 && ` (${metrics.queueLength})`}
        </span>
      </div>
    </div>
  );
}