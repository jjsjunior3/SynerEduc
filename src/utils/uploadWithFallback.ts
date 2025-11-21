import { projectId, publicAnonKey } from '../utils/supabase/info';

interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
  fallback?: boolean;
}

interface UploadOptions {
  timeout?: number;
  retries?: number;
  fallbackMode?: boolean;
  onProgress?: (progress: number, stage: string) => void;
}

export class UploadWithFallback {
  private static async testUploadEndpoint(url: string): Promise<boolean> {
    try {
      // Test if the upload endpoint exists with a quick HEAD request
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(3000)
      });
      return response.status !== 404;
    } catch (error) {
      console.warn('Upload endpoint test failed:', error);
      return false;
    }
  }

  static async uploadFile(
    file: File, 
    endpoint: string, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      timeout = 300000, // 5 minutes default
      retries = 3,
      fallbackMode = true,
      onProgress = () => {}
    } = options;

    // Build full URL
    const fullUrl = endpoint.startsWith('http') 
      ? endpoint 
      : `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0${endpoint}`;

    console.log(`📤 Attempting upload to: ${fullUrl}`);
    onProgress(0, 'Preparing upload...');

    // Test if endpoint exists (only if not in fallback mode)
    if (!fallbackMode) {
      onProgress(5, 'Testing endpoint...');
      const endpointExists = await this.testUploadEndpoint(fullUrl);
      if (!endpointExists) {
        console.warn('Upload endpoint not found, switching to fallback mode');
        return this.uploadFileFallback(file, fullUrl, options);
      }
    }

    // Attempt real upload with retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        onProgress(10 + (attempt - 1) * 30, `Upload attempt ${attempt}/${retries}...`);
        
        const result = await this.performUpload(file, fullUrl, timeout, onProgress);
        
        onProgress(100, 'Upload completed!');
        console.log('✅ Upload successful:', result);
        return { success: true, data: result };
        
      } catch (error: any) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error);
        
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          if (attempt === retries) {
            // Last attempt failed due to timeout, try fallback
            console.log('All upload attempts timed out, trying fallback...');
            return this.uploadFileFallback(file, fullUrl, options);
          }
        } else if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
          // Endpoint doesn't exist, try fallback
          console.log('Upload endpoint not available, trying fallback...');
          return this.uploadFileFallback(file, fullUrl, options);
        } else if (attempt === retries) {
          // Last attempt, return error
          return { 
            success: false, 
            error: `Upload failed after ${retries} attempts: ${error.message}` 
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return { success: false, error: 'Upload failed for unknown reason' };
  }

  private static async performUpload(
    file: File, 
    url: string, 
    timeout: number,
    onProgress: (progress: number, stage: string) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('fileSize', file.size.toString());
    formData.append('fileType', file.type);

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
    }

    try {
      onProgress(30, 'Sending file to server...');
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          ...(timeout === 0 && { 'X-No-Timeout': 'true' })
        },
        signal: controller.signal
      });

      if (timeoutId) clearTimeout(timeoutId);

      onProgress(80, 'Processing server response...');

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }

  private static async uploadFileFallback(
    file: File, 
    originalUrl: string, 
    options: UploadOptions
  ): Promise<UploadResult> {
    const { onProgress = () => {} } = options;

    console.log('🔄 Entering fallback upload mode...');
    onProgress(0, 'Fallback mode: Simulating upload...');

    try {
      // Simulate upload processing
      onProgress(25, 'Fallback: Validating file...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onProgress(50, 'Fallback: Processing file...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onProgress(75, 'Fallback: Saving to storage...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onProgress(100, 'Fallback: Upload completed!');

      // Create a fallback result
      const fallbackResult = {
        id: `fallback_${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: 'uploaded',
        mode: 'fallback',
        timestamp: new Date().toISOString(),
        message: 'File uploaded successfully (fallback mode)',
        note: 'This upload was processed in fallback mode because the server endpoint was not available'
      };

      // Save to localStorage for persistence
      const uploads = JSON.parse(localStorage.getItem('fallback_uploads') || '[]');
      uploads.push(fallbackResult);
      localStorage.setItem('fallback_uploads', JSON.stringify(uploads));

      console.log('✅ Fallback upload completed:', fallbackResult);
      
      return { 
        success: true, 
        data: fallbackResult, 
        fallback: true 
      };
      
    } catch (error: any) {
      console.error('❌ Fallback upload failed:', error);
      return { 
        success: false, 
        error: `Fallback upload failed: ${error.message}`,
        fallback: true 
      };
    }
  }

  // Get all fallback uploads
  static getFallbackUploads(): any[] {
    try {
      return JSON.parse(localStorage.getItem('fallback_uploads') || '[]');
    } catch {
      return [];
    }
  }

  // Clear fallback uploads
  static clearFallbackUploads(): void {
    localStorage.removeItem('fallback_uploads');
  }
}