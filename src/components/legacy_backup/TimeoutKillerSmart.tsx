import { ReactNode, useEffect } from 'react';

interface TimeoutKillerSmartProps {
  children: ReactNode;
}

export function TimeoutKillerSmart({ children }: TimeoutKillerSmartProps) {
  useEffect(() => {
    let timeoutCount = 0;
    
    // Override fetch globally with smart timeout logic
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      const hasBody = init?.body !== undefined;
      
      // Determine if this is likely an upload or long-running operation
      const isUpload = method === 'POST' && hasBody && (
        url.includes('/upload') ||
        url.includes('/conteudo') ||
        url.includes('/pdf') ||
        url.includes('/storage') ||
        url.includes('/files') ||
        (init?.body instanceof FormData) ||
        (typeof init?.body === 'string' && init.body.length > 10000) // Large payloads
      );
      
      // Set appropriate timeout based on operation type
      const timeout = isUpload ? 60000 : 8000; // 60s for uploads, 8s for others
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`Request timeout after ${timeout}ms:`, { url, method, isUpload });
        controller.abort();
        
        // Only count timeouts for non-upload operations
        if (!isUpload) {
          timeoutCount++;
          
          if (timeoutCount >= 3) {
            console.error('Multiple non-upload timeouts detected, redirecting to emergency mode');
            localStorage.setItem('timeout_reason', `Multiple timeouts detected. Last URL: ${url}`);
            window.location.href = window.location.pathname + '?emergency=timeout';
          }
        }
      }, timeout);

      try {
        console.log(`🌐 Request started: ${method} ${url} (timeout: ${timeout}ms, upload: ${isUpload})`);
        
        const response = await originalFetch(input, {
          ...init,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Reset timeout count on successful requests
        if (response.ok) {
          timeoutCount = 0;
        }
        
        console.log(`✅ Request completed: ${method} ${url} (${response.status})`);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          const message = isUpload 
            ? `Upload timeout: Operation took longer than ${timeout/1000} seconds`
            : `Request timeout: ${url}`;
          console.error('🚫 Request aborted:', message);
          
          // Create a more descriptive error for uploads
          if (isUpload) {
            const uploadError = new Error(`Upload failed: File too large or connection too slow. Try a smaller file or check your internet connection.`);
            uploadError.name = 'UploadTimeoutError';
            throw uploadError;
          }
        }
        
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