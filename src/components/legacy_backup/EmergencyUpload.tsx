import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Zap } from 'lucide-react';

interface EmergencyUploadProps {
  title?: string;
  onUploadComplete?: (fileInfo: any) => void;
}

export function EmergencyUpload({ 
  title = "Upload de Emergência",
  onUploadComplete
}: EmergencyUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const processFileLocally = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Validate file
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (selectedFile.size > maxSize) {
        throw new Error(`Arquivo muito grande: ${formatFileSize(selectedFile.size)}. Máximo: ${formatFileSize(maxSize)}`);
      }

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create file info
      const fileInfo = {
        id: `emergency_${Date.now()}`,
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
        timestamp: new Date().toISOString(),
        status: 'processed_locally',
        mode: 'emergency'
      };

      // Read file content as base64 (for small files) or create URL
      let fileData: string | null = null;
      if (selectedFile.size < 1024 * 1024) { // < 1MB
        fileData = await readFileAsBase64(selectedFile);
      } else {
        fileData = URL.createObjectURL(selectedFile);
      }

      const completeResult = {
        ...fileInfo,
        data: fileData,
        localUrl: URL.createObjectURL(selectedFile)
      };

      // Save to localStorage
      const savedUploads = JSON.parse(localStorage.getItem('emergency_uploads') || '[]');
      savedUploads.push(completeResult);
      localStorage.setItem('emergency_uploads', JSON.stringify(savedUploads));

      setResult(completeResult);
      
      if (onUploadComplete) {
        onUploadComplete(completeResult);
      }

      // Auto-clear after 5 seconds
      setTimeout(() => {
        setSelectedFile(null);
        setResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 5000);

    } catch (err: any) {
      console.error('Emergency upload failed:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getEmergencyUploads = () => {
    try {
      return JSON.parse(localStorage.getItem('emergency_uploads') || '[]');
    } catch {
      return [];
    }
  };

  const clearEmergencyUploads = () => {
    localStorage.removeItem('emergency_uploads');
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-600" />
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">Processamento local - sempre funciona</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* File Selection */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="w-6 h-6 mx-auto text-green-600" />
              <div>
                <p className="font-medium text-green-800">{selectedFile.name}</p>
                <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSelection}
                className="text-red-600 hover:text-red-700"
                disabled={processing}
              >
                <X className="w-4 h-4 mr-1" />
                Remover
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-6 h-6 mx-auto text-gray-400" />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="mx-auto"
              >
                Selecionar Arquivo
              </Button>
              <p className="text-xs text-gray-500">Processamento local - sem servidor necessário</p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success */}
        {result && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div>
                ✅ Arquivo processado localmente com sucesso!
                <div className="mt-2">
                  <Badge className="bg-orange-100 text-orange-800">Modo Emergência</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Process Button */}
        <Button 
          onClick={processFileLocally}
          disabled={!selectedFile || processing}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {processing ? (
            <>
              <Zap className="w-4 h-4 mr-2 animate-pulse" />
              Processando Localmente...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Processar Localmente
            </>
          )}
        </Button>

        {/* Emergency Uploads History */}
        {getEmergencyUploads().length > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-orange-900">
                Uploads de Emergência ({getEmergencyUploads().length})
              </h4>
              <Button 
                size="sm" 
                variant="outline"
                onClick={clearEmergencyUploads}
                className="text-xs"
              >
                Limpar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}