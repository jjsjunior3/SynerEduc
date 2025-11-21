import { ReactNode, useEffect, useRef } from 'react';

interface TimeoutHandlerOptimizedProps {
  children: ReactNode;
}

export function TimeoutHandlerOptimized({ children }: TimeoutHandlerOptimizedProps) {
  const timeoutCountRef = useRef(0);
  const lastTimeoutRef = useRef(0);
  const emergencyModeRef = useRef(false);

  useEffect(() => {
    // Monitor for timeout errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      const message = event.message;
      
      // Check for timeout-related errors
      if (
        message?.includes('timeout') || 
        message?.includes('Timeout') ||
        message?.includes('timed out') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('AbortError')
      ) {
        console.warn('Timeout detected:', message || error?.message);
        
        const now = Date.now();
        
        // Reset counter if it's been more than 5 minutes since last timeout
        if (now - lastTimeoutRef.current > 5 * 60 * 1000) {
          timeoutCountRef.current = 0;
        }
        
        timeoutCountRef.current++;
        lastTimeoutRef.current = now;
        
        // If we've had 3+ timeouts in 5 minutes, enter emergency mode
        if (timeoutCountRef.current >= 3 && !emergencyModeRef.current) {
          console.error('Multiple timeouts detected, entering emergency mode');
          emergencyModeRef.current = true;
          
          // Clear caches and redirect to emergency
          try {
            localStorage.setItem('ava_emergency_mode', 'true');
            localStorage.setItem('ava_last_error', message || error?.message || 'Multiple timeouts');
            
            // Don't immediately redirect, just set flag
            setTimeout(() => {
              if (emergencyModeRef.current) {
                window.location.href = window.location.pathname + '?emergency=timeout';
              }
            }, 1000);
          } catch (e) {
            console.error('Failed to save emergency state:', e);
          }
        }
      }
    };

    // Monitor for unhandled promise rejections (common with fetch timeouts)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      if (
        reason?.message?.includes('timeout') ||
        reason?.message?.includes('AbortError') ||
        reason?.name === 'AbortError'
      ) {
        console.warn('Promise timeout detected:', reason?.message);
        handleError({ message: reason?.message, error: reason } as ErrorEvent);
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Clear emergency mode flag on successful load
    const clearEmergencyMode = () => {
      if (emergencyModeRef.current) {
        setTimeout(() => {
          emergencyModeRef.current = false;
          localStorage.removeItem('ava_emergency_mode');
          console.log('Emergency mode cleared');
        }, 10000); // Clear after 10 seconds of normal operation
      }
    };

    // Clear emergency mode on successful operations
    const clearTimer = setTimeout(clearEmergencyMode, 5000);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clearTimeout(clearTimer);
    };
  }, []);

  // Check if we're in emergency mode on mount
  useEffect(() => {
    const emergencyMode = localStorage.getItem('ava_emergency_mode');
    if (emergencyMode === 'true') {
      emergencyModeRef.current = true;
      console.warn('Starting in emergency mode');
    }
  }, []);

  return <>{children}</>;
}