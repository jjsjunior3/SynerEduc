import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Upload, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useUpload } from '../utils/uploadHandler';

interface UploadComponentProps {
  onUploadSuccess?: (result: any) => void;
  uploadUrl: string;
  acceptedTypes?: string;
  maxSizeMB?: number;
  title?: string;
  description?: string;
}

export function UploadComponent({
  onUploadSuccess,
  uploadUrl,
  acceptedTypes = ".pdf,.doc,.docx,image/*,video/*",
  maxSizeMB = 50,
  title = "Upload de Arquivo",
  description = "Selecione um arquivo para fazer upload"
}: UploadComponentProps) {
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, uploading, progress, error, reset } = useUpload({
    maxFileSize: maxSizeMB * 1024 * 1024,
    allowedTypes: acceptedTypes.split(',').map(t => t.trim()),
    timeout: 120000, // 2 minutes
    onSuccess: (result) => {
      console.log('Upload successful:', result);
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
      // Reset after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        reset();
      }, 2000);
    }
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    reset(); // Clear any previous errors
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

    try {
      await upload(selectedFile, uploadUrl);
    } catch (err: any) {
      console.error('Upload failed:', err);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    reset();
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
                  Máximo: {maxSizeMB}MB
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
              <span>Fazendo upload...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {progress === 100 && !error && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Upload realizado com sucesso!
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        <div className="flex gap-2">
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-pulse" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </>
            )}
          </Button>
          
          {selectedFile && (
            <Button 
              variant="outline" 
              onClick={clearSelection}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* File Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Tipos aceitos: {acceptedTypes.replace(/,/g, ', ')}</div>
          <div>Timeout: 2 minutos</div>
        </div>
      </CardContent>
    </Card>
  );
}