interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkLatency: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring() {
    this.startTime = performance.now();
    
    // Monitor page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.recordLoadTime();
      });
    } else {
      this.recordLoadTime();
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      this.monitorMemory();
    }

    // Monitor network latency
    this.monitorNetworkLatency();
  }

  private recordLoadTime() {
    const loadTime = performance.now() - this.startTime;
    console.log(`Page load time: ${loadTime.toFixed(2)}ms`);
    
    if (loadTime > 3000) {
      console.warn('Slow page load detected:', loadTime);
      this.triggerSlowLoadWarning(loadTime);
    }
  }

  private monitorMemory() {
    const checkMemory = () => {
      // @ts-ignore - memory is experimental
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        
        console.log(`Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
        
        if (usedMB / limitMB > 0.8) {
          console.warn('High memory usage detected:', usedMB);
          this.triggerHighMemoryWarning(usedMB);
        }
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  private async monitorNetworkLatency() {
    try {
      const start = performance.now();
      await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      const latency = performance.now() - start;
      
      console.log(`Network latency: ${latency.toFixed(2)}ms`);
      
      if (latency > 2000) {
        console.warn('High network latency detected:', latency);
        this.triggerHighLatencyWarning(latency);
      }
    } catch (error) {
      console.warn('Network connectivity issue:', error);
      this.triggerConnectivityIssue();
    }
  }

  measureRenderTime(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      
      if (renderTime > 1000) {
        console.warn(`Slow render detected for ${componentName}:`, renderTime);
        this.triggerSlowRenderWarning(componentName, renderTime);
      }
    };
  }

  private triggerSlowLoadWarning(loadTime: number) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Performance Alert', {
        body: `Slow page load: ${loadTime.toFixed(0)}ms`,
        icon: '/favicon.ico'
      });
    }
    
    // Store in localStorage for debugging
    localStorage.setItem('ava_performance_warning', JSON.stringify({
      type: 'slow_load',
      value: loadTime,
      timestamp: Date.now()
    }));
  }

  private triggerHighMemoryWarning(memoryUsage: number) {
    console.warn('High memory usage - consider refreshing the page');
    
    localStorage.setItem('ava_performance_warning', JSON.stringify({
      type: 'high_memory',
      value: memoryUsage,
      timestamp: Date.now()
    }));
  }

  private triggerHighLatencyWarning(latency: number) {
    console.warn('High network latency - network may be slow');
    
    localStorage.setItem('ava_performance_warning', JSON.stringify({
      type: 'high_latency',
      value: latency,
      timestamp: Date.now()
    }));
  }

  private triggerConnectivityIssue() {
    console.error('Network connectivity issue detected');
    
    localStorage.setItem('ava_performance_warning', JSON.stringify({
      type: 'connectivity_issue',
      timestamp: Date.now()
    }));
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }

  static init() {
    const monitor = PerformanceMonitor.getInstance();
    monitor.startMonitoring();
    return monitor;
  }
}

export default PerformanceMonitor;