// Advanced Upload Handler with flexible timeout options and chunked uploads

interface AdvancedUploadOptions {
  maxFileSize?: number; // em bytes
  allowedTypes?: string[];
  timeout?: number; // em ms, 0 = no timeout
  chunkSize?: number; // for chunked uploads
  enableChunkedUpload?: boolean;
  maxRetries?: number;
  onProgress?: (progress: number, stage: string) => void;
  onError?: (error: Error) => void;
  onSuccess?: (response: any) => void;
  customHeaders?: Record<string, string>;
}

export class AdvancedUploadHandler {
  private options: Required<AdvancedUploadOptions>;

  constructor(options: AdvancedUploadOptions = {}) {
    this.options = {
      maxFileSize: 500 * 1024 * 1024, // 500MB default
      allowedTypes: ['*/*'], // Accept all by default
      timeout: 300000, // 5 minutes default
      chunkSize: 1024 * 1024, // 1MB chunks
      enableChunkedUpload: false,
      maxRetries: 3,
      onProgress: () => {},
      onError: () => {},
      onSuccess: () => {},
      customHeaders: {},
      ...options
    };
  }

  async uploadFile(file: File, url: string, additionalData?: any): Promise<any> {
    // Validate file
    this.validateFile(file);

    // Determine upload strategy
    const shouldUseChunkedUpload = this.options.enableChunkedUpload && 
                                   file.size > this.options.chunkSize * 10; // Use chunks for files > 10MB

    if (shouldUseChunkedUpload) {
      return this.uploadFileChunked(file, url, additionalData);
    } else {
      return this.uploadFileStandard(file, url, additionalData);
    }
  }

  private async uploadFileStandard(file: File, url: string, additionalData?: any): Promise<any> {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    // Prepare headers
    const headers: Record<string, string> = {
      ...this.options.customHeaders
    };

    // Add no-timeout header for large files or if timeout is 0
    if (this.options.timeout === 0 || file.size > 50 * 1024 * 1024) {
      headers['X-No-Timeout'] = 'true';
    }

    // Create abort controller only if timeout is specified
    let controller: AbortController | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    if (this.options.timeout > 0) {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller!.abort();
      }, this.options.timeout);
    }

    try {
      this.options.onProgress(0, 'Starting upload...');
      console.log(`📤 Starting standard upload: ${file.name} (${this.formatFileSize(file.size)})`);
      
      const fetchOptions: RequestInit = {
        method: 'POST',
        body: formData,
        headers,
        ...(controller && { signal: controller.signal })
      };

      const response = await fetch(url, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

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

      this.options.onProgress(100, 'Upload completed!');
      const result = await response.json();
      console.log(`✅ Upload completed: ${file.name}`);
      
      this.options.onSuccess(result);
      return result;
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      let friendlyError: Error;
      
      if (error.name === 'AbortError') {
        friendlyError = new Error(`Upload timeout: "${file.name}" took longer than ${this.options.timeout / 1000} seconds. 

Suggestions:
• Try a smaller file (current: ${this.formatFileSize(file.size)})
• Use a faster internet connection
• Enable chunked upload for large files
• Set timeout to 0 for unlimited time`);
        friendlyError.name = 'UploadTimeoutError';
      } else if (error.message?.includes('Failed to fetch')) {
        friendlyError = new Error(`Network error: Unable to upload "${file.name}". Check your internet connection and try again.`);
        friendlyError.name = 'NetworkError';
      } else {
        friendlyError = new Error(`Upload failed: ${error.message}`);
        friendlyError.name = error.name || 'UploadError';
      }
      
      console.error(`❌ Upload failed: ${file.name}`, friendlyError);
      this.options.onError(friendlyError);
      throw friendlyError;
    }
  }

  private async uploadFileChunked(file: File, url: string, additionalData?: any): Promise<any> {
    const chunks = Math.ceil(file.size / this.options.chunkSize);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📦 Starting chunked upload: ${file.name} (${chunks} chunks)`);
    this.options.onProgress(0, `Preparing ${chunks} chunks...`);

    try {
      // Upload each chunk
      for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
        const start = chunkIndex * this.options.chunkSize;
        const end = Math.min(start + this.options.chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const chunkFormData = new FormData();
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('chunkIndex', chunkIndex.toString());
        chunkFormData.append('totalChunks', chunks.toString());
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('originalFileName', file.name);
        chunkFormData.append('totalSize', file.size.toString());
        
        if (additionalData && chunkIndex === 0) {
          Object.keys(additionalData).forEach(key => {
            chunkFormData.append(key, additionalData[key]);
          });
        }

        const progress = ((chunkIndex + 1) / chunks) * 100;
        this.options.onProgress(progress, `Uploading chunk ${chunkIndex + 1}/${chunks}...`);

        await this.uploadChunk(chunkFormData, `${url}/chunk`, chunkIndex);
      }

      // Finalize upload
      this.options.onProgress(100, 'Finalizing upload...');
      const result = await this.finalizeChunkedUpload(uploadId, url);
      
      console.log(`✅ Chunked upload completed: ${file.name}`);
      this.options.onSuccess(result);
      return result;
    } catch (error: any) {
      console.error(`❌ Chunked upload failed: ${file.name}`, error);
      this.options.onError(error);
      throw error;
    }
  }

  private async uploadChunk(chunkData: FormData, chunkUrl: string, chunkIndex: number): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const response = await fetch(chunkUrl, {
          method: 'POST',
          body: chunkData,
          headers: {
            ...this.options.customHeaders,
            'X-Chunk-Upload': 'true'
          }
        });

        if (!response.ok) {
          throw new Error(`Chunk ${chunkIndex} upload failed: HTTP ${response.status}`);
        }

        return; // Success
      } catch (error: any) {
        lastError = error;
        if (attempt < this.options.maxRetries) {
          console.warn(`Chunk ${chunkIndex} failed, retrying (${attempt}/${this.options.maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  private async finalizeChunkedUpload(uploadId: string, baseUrl: string): Promise<any> {
    const response = await fetch(`${baseUrl}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.options.customHeaders
      },
      body: JSON.stringify({ uploadId })
    });

    if (!response.ok) {
      throw new Error(`Failed to finalize upload: HTTP ${response.status}`);
    }

    return response.json();
  }

  private validateFile(file: File): void {
    // Check file size
    if (file.size > this.options.maxFileSize) {
      throw new Error(`File too large: "${file.name}" (${this.formatFileSize(file.size)}). Maximum size allowed: ${this.formatFileSize(this.options.maxFileSize)}`);
    }

    // Check file type
    if (this.options.allowedTypes.length > 0 && !this.options.allowedTypes.includes('*/*')) {
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

  // Static method for quick uploads with custom timeout
  static async quickUpload(
    file: File, 
    url: string, 
    options?: AdvancedUploadOptions & { unlimitedTimeout?: boolean }
  ): Promise<any> {
    const handler = new AdvancedUploadHandler({
      ...options,
      timeout: options?.unlimitedTimeout ? 0 : options?.timeout
    });
    return handler.uploadFile(file, url);
  }
}

// Enhanced React Hook
import { useState, useCallback } from 'react';

export function useAdvancedUpload(options?: AdvancedUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File, 
    url: string, 
    additionalData?: any,
    customOptions?: Partial<AdvancedUploadOptions>
  ) => {
    setUploading(true);
    setProgress(0);
    setStage('Preparing...');
    setError(null);

    const handler = new AdvancedUploadHandler({
      ...options,
      ...customOptions,
      onProgress: (prog, stg) => {
        setProgress(prog);
        setStage(stg);
        if (options?.onProgress) options.onProgress(prog, stg);
      },
      onError: (err) => {
        setError(err.message);
        if (options?.onError) options.onError(err);
      },
      onSuccess: (result) => {
        setStage('Complete!');
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
    setStage('');
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    stage,
    error,
    reset
  };
}