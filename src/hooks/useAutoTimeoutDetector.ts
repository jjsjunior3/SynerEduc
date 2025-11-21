import { useEffect, useRef } from 'react';

interface TimeoutDetectorOptions {
  timeoutThreshold?: number; // milliseconds
  enableAutoOptimization?: boolean;
  onTimeoutDetected?: () => void;
}

export function useAutoTimeoutDetector(options: TimeoutDetectorOptions = {}) {
  const {
    timeoutThreshold = 15000, // 15 seconds
    enableAutoOptimization = true,
    onTimeoutDetected
  } = options;

  const startTimeRef = useRef<number>(Date.now());
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const hasDetectedTimeoutRef = useRef<boolean>(false);

  useEffect(() => {
    const startTime = startTimeRef.current;
    
    // Set up timeout detector
    timeoutIdRef.current = setTimeout(() => {
      if (!hasDetectedTimeoutRef.current) {
        hasDetectedTimeoutRef.current = true;
        
        console.warn('🚨 TIMEOUT DETECTED: App took more than', timeoutThreshold + 'ms to load');
        
        // Execute callback
        if (onTimeoutDetected) {
          onTimeoutDetected();
        }
        
        // Auto-optimization if enabled
        if (enableAutoOptimization) {
          console.log('🔄 Auto-activating ultra-optimized mode...');
          
          // Set emergency flags
          localStorage.setItem('emergency_mode_timeout', 'true');
          localStorage.setItem('use_ultra_optimized_app', 'true');
          localStorage.setItem('timeout_detected_at', Date.now().toString());
          
          // Show user notification
          if (window.confirm(
            '⚠️ Sistema lento detectado!\n\n' +
            'O sistema está demorando muito para carregar (>' + (timeoutThreshold/1000) + 's).\n' +
            'Deseja ativar o modo ultra-otimizado?\n\n' +
            '✅ Modo otimizado: Carregamento instantâneo\n' +
            '❌ Modo normal: Pode continuar lento'
          )) {
            window.location.href = '?emergency=timeout-auto';
          }
        }
      }
    }, timeoutThreshold);

    // Cleanup function
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [timeoutThreshold, enableAutoOptimization, onTimeoutDetected]);

  // Return detector status
  return {
    isDetected: hasDetectedTimeoutRef.current,
    elapsedTime: Date.now() - startTimeRef.current,
    threshold: timeoutThreshold
  };
}

// Hook for monitoring app performance
export function usePerformanceMonitor() {
  const startTime = useRef<number>(Date.now());
  const metricsRef = useRef({
    loadTime: 0,
    renderCount: 0,
    errorCount: 0
  });

  useEffect(() => {
    // Update load time periodically
    const interval = setInterval(() => {
      metricsRef.current.loadTime = Date.now() - startTime.current;
    }, 100);

    // Increment render count
    metricsRef.current.renderCount++;

    return () => clearInterval(interval);
  }, []);

  // Track errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      metricsRef.current.errorCount++;
      console.error('🚨 Performance Monitor - Error detected:', event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      metricsRef.current.errorCount++;
      console.error('🚨 Performance Monitor - Unhandled rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return {
    metrics: metricsRef.current,
    getPerformanceScore: () => {
      const { loadTime, errorCount } = metricsRef.current;
      
      // Calculate score based on load time and error count
      let score = 100;
      
      // Penalize for slow load time
      if (loadTime > 5000) score -= 30;
      else if (loadTime > 2000) score -= 15;
      else if (loadTime > 1000) score -= 5;
      
      // Penalize for errors
      score -= errorCount * 10;
      
      return Math.max(0, Math.min(100, score));
    }
  };
}