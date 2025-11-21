import { useRef, useCallback } from 'react';

interface TimeoutProtectionOptions {
  maxTimeout?: number;
  maxRetries?: number;
  onTimeout?: (error: Error) => void;
  onMaxRetries?: () => void;
}

export function useTimeoutProtection(options: TimeoutProtectionOptions = {}) {
  const {
    maxTimeout = 5000,
    maxRetries = 3,
    onTimeout,
    onMaxRetries
  } = options;

  const retryCountRef = useRef(0);
  const lastErrorRef = useRef<Error | null>(null);

  const createTimeoutFetch = useCallback((url: string, fetchOptions: RequestInit = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), maxTimeout);

    const fetchPromise = fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    return fetchPromise.catch((error) => {
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${maxTimeout}ms`);
        timeoutError.name = 'TimeoutError';
        
        retryCountRef.current++;
        lastErrorRef.current = timeoutError;
        
        if (onTimeout) {
          onTimeout(timeoutError);
        }
        
        if (retryCountRef.current >= maxRetries && onMaxRetries) {
          onMaxRetries();
        }
        
        throw timeoutError;
      }
      throw error;
    });
  }, [maxTimeout, maxRetries, onTimeout, onMaxRetries]);

  const resetRetryCount = useCallback(() => {
    retryCountRef.current = 0;
    lastErrorRef.current = null;
  }, []);

  const withRetry = useCallback(async (operation: () => Promise<any>, customRetries?: number) => {
    const maxAttempts = customRetries ?? maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        resetRetryCount(); 
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          if (onMaxRetries) {
            onMaxRetries();
          }
          break;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }, [maxRetries, onMaxRetries, resetRetryCount]);

  return {
    timeoutFetch: createTimeoutFetch,
    withRetry,
    retryCount: retryCountRef.current,
    lastError: lastErrorRef.current,
    resetRetryCount
  };
}