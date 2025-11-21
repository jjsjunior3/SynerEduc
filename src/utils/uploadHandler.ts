// Utility para gerenciar uploads com melhor tratamento de erros e progresso

interface UploadOptions {
  maxFileSize?: number; // em bytes
  allowedTypes?: string[];
  timeout?: number; // em ms
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onSuccess?: (response: any) => void;
}

export class UploadHandler {
  private options: UploadOptions;

  constructor(options: UploadOptions = {}) {
    this.options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      allowedTypes: ['application/pdf', 'image/*', 'video/*'],
      timeout: 120000, // 2 minutes default
      ...options
    };
  }

  async uploadFile(file: File, url: string, additionalData?: any): Promise<any> {
    // Validate file
    this.validateFile(file);

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.options.timeout);

    try {
      console.log(`📤 Starting upload: ${file.name} (${this.formatFileSize(file.size)})`);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type header for FormData - let browser set it with boundary
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Upload failed: HTTP ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`✅ Upload completed: ${file.name}`);
      
      if (this.options.onSuccess) {
        this.options.onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      let friendlyError: Error;
      
      if (error.name === 'AbortError') {
        friendlyError = new Error(`Upload timeout: File "${file.name}" took longer than ${this.options.timeout! / 1000} seconds. Try a smaller file or check your internet connection.`);
        friendlyError.name = 'UploadTimeoutError';
      } else if (error.message?.includes('Failed to fetch')) {
        friendlyError = new Error(`Network error: Unable to upload "${file.name}". Check your internet connection and try again.`);
        friendlyError.name = 'NetworkError';
      } else {
        friendlyError = new Error(`Upload failed: ${error.message}`);
        friendlyError.name = error.name || 'UploadError';
      }
      
      console.error(`❌ Upload failed: ${file.name}`, friendlyError);
      
      if (this.options.onError) {
        this.options.onError(friendlyError);
      }
      
      throw friendlyError;
    }
  }

  private validateFile(file: File): void {
    // Check file size
    if (file.size > this.options.maxFileSize!) {
      throw new Error(`File too large: "${file.name}" (${this.formatFileSize(file.size)}). Maximum size allowed: ${this.formatFileSize(this.options.maxFileSize!)}`);
    }

    // Check file type
    if (this.options.allowedTypes && this.options.allowedTypes.length > 0) {
      const isAllowed = this.options.allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });

      if (!isAllowed) {
        throw new Error(`File type not allowed: "${file.type}". Allowed types: ${this.options.allowedTypes.join(', ')}`);
      }
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Static method for quick uploads
  static async quickUpload(file: File, url: string, options?: UploadOptions): Promise<any> {
    const handler = new UploadHandler(options);
    return handler.uploadFile(file, url);
  }
}

// Hook for React components
import { useState, useCallback } from 'react';

export function useUpload(options?: UploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, url: string, additionalData?: any) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    const handler = new UploadHandler({
      ...options,
      onProgress: (prog) => {
        setProgress(prog);
        if (options?.onProgress) options.onProgress(prog);
      },
      onError: (err) => {
        setError(err.message);
        if (options?.onError) options.onError(err);
      },
      onSuccess: (result) => {
        setProgress(100);
        if (options?.onSuccess) options.onSuccess(result);
      }
    });

    try {
      const result = await handler.uploadFile(file, url, additionalData);
      return result;
    } finally {
      setUploading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset
  };
}