import { ReactNode, useEffect, useRef } from 'react';

interface TimeoutHandlerSimpleProps {
  children: ReactNode;
}

export function TimeoutHandlerSimple({ children }: TimeoutHandlerSimpleProps) {
  const timeoutCountRef = useRef(0);
  const lastTimeoutRef = useRef(0);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      const message = event.message;
      
      if (
        message?.includes('timeout') || 
        message?.includes('Timeout') ||
        message?.includes('timed out') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('AbortError')
      ) {
        console.warn('Timeout detected:', message || error?.message);
        
        const now = Date.now();
        
        if (now - lastTimeoutRef.current > 5 * 60 * 1000) {
          timeoutCountRef.current = 0;
        }
        
        timeoutCountRef.current++;
        lastTimeoutRef.current = now;
        
        if (timeoutCountRef.current >= 3) {
          console.error('Multiple timeouts detected, suggesting emergency mode');
          
          try {
            localStorage.setItem('ava_emergency_mode', 'true');
            localStorage.setItem('ava_last_error', message || error?.message || 'Multiple timeouts');
            
            setTimeout(() => {
              window.location.href = window.location.pathname + '?emergency=timeout';
            }, 2000);
          } catch (e) {
            console.error('Failed to save emergency state:', e);
          }
        }
      }
    };

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

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}