class PerformanceMonitorSimple {
  private static instance: PerformanceMonitorSimple;
  private startTime: number = 0;

  static getInstance(): PerformanceMonitorSimple {
    if (!PerformanceMonitorSimple.instance) {
      PerformanceMonitorSimple.instance = new PerformanceMonitorSimple();
    }
    return PerformanceMonitorSimple.instance;
  }

  startMonitoring() {
    this.startTime = performance.now();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.recordLoadTime();
      });
    } else {
      this.recordLoadTime();
    }

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

  private async monitorNetworkLatency() {
    try {
      const start = performance.now();
      await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        signal: AbortSignal.timeout && AbortSignal.timeout(5000)
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

  private triggerSlowLoadWarning(loadTime: number) {    
    localStorage.setItem('ava_performance_warning', JSON.stringify({
      type: 'slow_load',
      value: loadTime,
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

  clearMetrics() {
    // Simple cleanup
    localStorage.removeItem('ava_performance_warning');
  }

  static init() {
    const monitor = PerformanceMonitorSimple.getInstance();
    monitor.startMonitoring();
    return monitor;
  }
}

export default PerformanceMonitorSimple;