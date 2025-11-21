import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { UploadComponent } from './UploadComponent';
import { ArrowLeft, TestTube, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

interface UploadTestProps {
  onBack: () => void;
}

export function UploadTest({ onBack }: UploadTestProps) {
  const [uploads, setUploads] = useState<any[]>([]);

  const handleUploadSuccess = (result: any) => {
    console.log('Upload test success:', result);
    setUploads(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      result: result,
      status: 'success'
    }]);
  };

  const simulateSlowServer = async () => {
    // Create a test endpoint that simulates a slow upload
    const testData = new FormData();
    testData.append('test', 'true');
    testData.append('delay', '10000'); // 10 second delay
    
    try {
      const response = await fetch('/api/test-upload', {
        method: 'POST',
        body: testData
      });
      
      if (response.ok) {
        console.log('Slow server test completed');
      }
    } catch (error: any) {
      console.error('Slow server test failed:', error);
      setUploads(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        result: { error: error.message },
        status: 'error'
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Teste de Upload - Sem Timeout
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600">
              Teste o novo sistema de upload que não sofre com timeouts abruptos
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Component */}
          <div>
            <UploadComponent
              uploadUrl="/api/test-upload"
              onUploadSuccess={handleUploadSuccess}
              title="Upload de Teste"
              description="Teste o upload de arquivos grandes sem timeout"
              acceptedTypes=".pdf,.jpg,.png,.mp4,.zip"
              maxSizeMB={100}
            />
          </div>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Resultados dos Testes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={simulateSlowServer}
                  variant="outline"
                  className="w-full"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Simular Servidor Lento (10s)
                </Button>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {uploads.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum upload realizado ainda
                    </p>
                  ) : (
                    uploads.map((upload) => (
                      <div 
                        key={upload.id} 
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={upload.status === 'success' ? 'default' : 'destructive'}>
                            {upload.status === 'success' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {upload.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {upload.timestamp}
                          </span>
                        </div>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(upload.result, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-900 mb-2">💡 Melhorias Implementadas:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ <strong>Timeout Inteligente:</strong> 60s para uploads, 8s para outras requisições</li>
              <li>✅ <strong>Detecção de Uploads:</strong> Identifica automaticamente operações de upload</li>
              <li>✅ <strong>Erros Descritivos:</strong> Mensagens claras sobre o que deu errado</li>
              <li>✅ <strong>Validação de Arquivos:</strong> Tamanho e tipo verificados antes do upload</li>
              <li>✅ <strong>Progresso Visual:</strong> Feedback em tempo real do upload</li>
              <li>✅ <strong>Recuperação de Erros:</strong> Sistema não entra em modo emergência por uploads</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}