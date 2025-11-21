import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Wifi, WifiOff, Cloud } from 'lucide-react';
import { UploadWithFallback } from '../utils/uploadWithFallback';

interface RobustUploadComponentProps {
  onUploadSuccess?: (result: any) => void;
  uploadEndpoint?: string;
  title?: string;
  description?: string;
  maxSizeMB?: number;
  acceptedTypes?: string;
}

export function RobustUploadComponent({
  onUploadSuccess,
  uploadEndpoint = '/conteudo-pdf/upload',
  title = "Upload Robusto",
  description = "Sistema com fallback automático",
  maxSizeMB = 100,
  acceptedTypes = "*/*"
}: RobustUploadComponentProps) {
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(true);
  const [unlimitedTimeout, setUnlimitedTimeout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setProgress(0);
    setStage('');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setStage('');

    try {
      const uploadResult = await UploadWithFallback.uploadFile(
        selectedFile,
        uploadEndpoint,
        {
          timeout: unlimitedTimeout ? 0 : 300000, // 5 minutes or unlimited
          retries: 3,
          fallbackMode: fallbackMode,
          onProgress: (prog, stg) => {
            setProgress(prog);
            setStage(stg);
          }
        }
      );

      if (uploadResult.success) {
        setResult(uploadResult);
        if (onUploadSuccess) {
          onUploadSuccess(uploadResult);
        }
        
        // Auto-clear after 5 seconds
        setTimeout(() => {
          setSelectedFile(null);
          setResult(null);
          setProgress(0);
          setStage('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 5000);
      } else {
        setError(uploadResult.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFallbackUploads = () => {
    return UploadWithFallback.getFallbackUploads();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="fallback" className="text-sm">Modo Fallback</Label>
            <Switch 
              id="fallback"
              checked={fallbackMode}
              onCheckedChange={setFallbackMode}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="unlimited" className="text-sm">Sem Timeout</Label>
            <Switch 
              id="unlimited"
              checked={unlimitedTimeout}
              onCheckedChange={setUnlimitedTimeout}
            />
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            {fallbackMode ? (
              <>
                <Cloud className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600">Fallback Ativo</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Direto ao Servidor</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unlimitedTimeout ? (
              <span className="text-purple-600">Sem Limite de Tempo</span>
            ) : (
              <span className="text-gray-600">Timeout: 5min</span>
            )}
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : selectedFile 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="w-8 h-8 mx-auto text-green-600" />
              <div>
                <p className="font-medium text-green-800">{selectedFile.name}</p>
                <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSelection}
                className="text-red-600 hover:text-red-700"
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-1" />
                Remover
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className={`w-8 h-8 mx-auto ${dragOver ? 'text-blue-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm text-gray-600">
                  Arraste um arquivo aqui ou{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    clique para selecionar
                  </button>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {maxSizeMB}MB • Tipos: {acceptedTypes}
                </p>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{stage || 'Processando...'}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div>{error}</div>
              {error.includes('Failed to fetch') && (
                <div className="mt-2 text-xs">
                  💡 <strong>Dica:</strong> Ative o "Modo Fallback" para uploads quando o servidor não responde
                </div>
              )}
              {error.includes('timeout') && (
                <div className="mt-2 text-xs">
                  💡 <strong>Dica:</strong> Ative "Sem Timeout" para arquivos muito grandes
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {result && result.success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-1">
                <div>Upload realizado com sucesso!</div>
                {result.fallback && (
                  <div className="text-xs">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Modo Fallback
                    </Badge>
                    {' '}Arquivo processado localmente
                  </div>
                )}
                <div className="text-xs font-mono bg-green-100 p-2 rounded mt-2">
                  {JSON.stringify(result.data, null, 2)}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        <Button 
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-pulse" />
              {stage || 'Uploading...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {fallbackMode ? 'Upload Robusto (com Fallback)' : 'Upload Direto'}
            </>
          )}
        </Button>

        {/* Fallback Uploads History */}
        {getFallbackUploads().length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-blue-900">Uploads em Fallback ({getFallbackUploads().length})</h4>
              <Button 
                size="sm" 
                variant="outline"
                onClick={UploadWithFallback.clearFallbackUploads}
                className="text-xs"
              >
                Limpar
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {getFallbackUploads().slice(-3).map((upload: any) => (
                <div key={upload.id} className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                  <div className="font-medium">{upload.fileName}</div>
                  <div>{upload.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help */}
        <div className="text-xs text-gray-500 bg-gray-100 p-3 rounded">
          <div><strong>💡 Como funciona:</strong></div>
          <div>• <strong>Modo Normal:</strong> Tenta upload direto ao servidor</div>
          <div>• <strong>Modo Fallback:</strong> Se falhar, processa localmente</div>
          <div>• <strong>Sem Timeout:</strong> Remove limite de tempo completamente</div>
          <div>• <strong>Retry Automático:</strong> 3 tentativas antes do fallback</div>
        </div>
      </CardContent>
    </Card>
  );
}