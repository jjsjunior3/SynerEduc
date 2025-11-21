import { ReactNode, useEffect } from 'react';

interface TimeoutKillerUltraProps {
  children: ReactNode;
}

export function TimeoutKillerUltra({ children }: TimeoutKillerUltraProps) {
  useEffect(() => {
    let timeoutCount = 0;
    
    // Override fetch globally with ultra-flexible timeout logic
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      const hasBody = init?.body !== undefined;
      
      // Enhanced upload detection
      const isUpload = method === 'POST' && hasBody && (
        url.includes('/upload') ||
        url.includes('/conteudo') ||
        url.includes('/pdf') ||
        url.includes('/storage') ||
        url.includes('/files') ||
        url.includes('/media') ||
        url.includes('/assets') ||
        (init?.body instanceof FormData) ||
        (typeof init?.body === 'string' && init.body.length > 10000) || // Large payloads
        (init?.headers && Object.entries(init.headers).some(([key, value]) => 
          key.toLowerCase().includes('content-type') && 
          (value as string)?.includes('multipart/form-data')
        ))
      );
      
      // Ultra-large upload detection (for files > 10MB estimated)
      const isLargeUpload = isUpload && (
        (init?.body instanceof FormData) ||
        (typeof init?.body === 'string' && init.body.length > 10 * 1024 * 1024) ||
        url.includes('/large-upload') ||
        url.includes('/bulk-upload')
      );
      
      // Custom timeout logic
      let timeout: number;
      let useTimeout = true;
      
      if (isLargeUpload) {
        // For large uploads: 10 minutes or no timeout if specified
        timeout = 600000; // 10 minutes
        // Check if no-timeout is requested in URL or headers
        if (url.includes('no-timeout') || 
            (init?.headers && Object.entries(init.headers).some(([key, value]) => 
              key.toLowerCase() === 'x-no-timeout' || value === 'true'
            ))) {
          useTimeout = false;
        }
      } else if (isUpload) {
        // For regular uploads: 3 minutes
        timeout = 180000; // 3 minutes
      } else {
        // For regular requests: 10 seconds
        timeout = 10000;
      }
      
      console.log(`🌐 Request: ${method} ${url}`, {
        isUpload,
        isLargeUpload,
        timeout: useTimeout ? `${timeout/1000}s` : 'no timeout',
        bodySize: init?.body ? (
          init.body instanceof FormData ? 'FormData' : 
          typeof init.body === 'string' ? `${init.body.length} chars` : 'unknown'
        ) : 'none'
      });
      
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      
      if (useTimeout) {
        timeoutId = setTimeout(() => {
          console.warn(`⏰ Request timeout after ${timeout}ms:`, { url, method, isUpload, isLargeUpload });
          controller.abort();
          
          // Only count timeouts for non-upload operations
          if (!isUpload) {
            timeoutCount++;
            
            if (timeoutCount >= 3) {
              console.error('Multiple non-upload timeouts detected');
              localStorage.setItem('timeout_reason', `Multiple timeouts. Last URL: ${url}`);
              window.location.href = window.location.pathname + '?emergency=timeout';
            }
          }
        }, timeout);
      }

      try {
        const response = await originalFetch(input, {
          ...init,
          signal: controller.signal
        });
        
        if (timeoutId) clearTimeout(timeoutId);
        
        // Reset timeout count on successful requests
        if (response.ok) {
          timeoutCount = 0;
        }
        
        console.log(`✅ Request completed: ${method} ${url} (${response.status})`);
        return response;
      } catch (error: any) {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          let message: string;
          
          if (isLargeUpload) {
            message = `Large upload timeout: File is very large and took longer than ${timeout/60000} minutes. Consider:
            • Using a faster internet connection
            • Compressing the file before upload
            • Splitting large files into smaller parts
            • Adding '?no-timeout=true' to the URL for unlimited timeout`;
          } else if (isUpload) {
            message = `Upload timeout: File took longer than ${timeout/1000} seconds. Try:
            • A smaller file size
            • Better internet connection
            • Adding 'X-No-Timeout: true' header for unlimited timeout`;
          } else {
            message = `Request timeout: ${url} took longer than ${timeout/1000} seconds`;
          }
          
          console.error('🚫 Request aborted:', message);
          
          // Create enhanced error for uploads
          if (isUpload) {
            const uploadError = new Error(message);
            uploadError.name = isLargeUpload ? 'LargeUploadTimeoutError' : 'UploadTimeoutError';
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