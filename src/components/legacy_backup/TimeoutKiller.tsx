import { ReactNode, useEffect } from 'react';

interface TimeoutKillerProps {
  children: ReactNode;
}

export function TimeoutKiller({ children }: TimeoutKillerProps) {
  useEffect(() => {
    let timeoutCount = 0;
    
    // Override fetch globally to enforce timeout
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        timeoutCount++;
        
        if (timeoutCount >= 2) {
          console.error('Multiple timeouts detected, redirecting to emergency mode');
          window.location.href = window.location.pathname + '?emergency=timeout';
        }
      }, 5000); // 5 second global timeout

      try {
        const response = await originalFetch(input, {
          ...init,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        timeoutCount = 0; // Reset on success
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Cleanup function
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}