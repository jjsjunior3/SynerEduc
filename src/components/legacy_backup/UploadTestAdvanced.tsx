import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AdvancedUploadComponent } from './AdvancedUploadComponent';
import { UploadComponent } from './UploadComponent';
import { RobustUploadComponent } from './RobustUploadComponent';
import { EmergencyUpload } from './EmergencyUpload';
import { ArrowLeft, TestTube, Upload, Zap, Clock, Package } from 'lucide-react';

interface UploadTestAdvancedProps {
  onBack: () => void;
}

export function UploadTestAdvanced({ onBack }: UploadTestAdvancedProps) {
  const [uploads, setUploads] = useState<any[]>([]);

  const handleUploadSuccess = (result: any, type: string) => {
    console.log(`Upload test success (${type}):`, result);
    setUploads(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      type: type,
      result: result,
      status: 'success'
    }]);
  };

  const handleUploadError = (error: Error, type: string) => {
    console.log(`Upload test error (${type}):`, error);
    setUploads(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      type: type,
      result: { error: error.message },
      status: 'error'
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Teste Avançado de Upload - Sem Timeout Forçado
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600">
              Teste uploads grandes com timeout flexível e sem interrupções
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Upload Tests */}
          <div className="xl:col-span-2">
            <Tabs defaultValue="robust" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="robust" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Robusto
                </TabsTrigger>
                <TabsTrigger value="emergency" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Emergência
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Avançado
                </TabsTrigger>
                <TabsTrigger value="standard" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Padrão
                </TabsTrigger>
                <TabsTrigger value="chunked" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Pedaços
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="robust" className="mt-6">
                <RobustUploadComponent
                  uploadEndpoint="/conteudo-pdf/upload"
                  onUploadSuccess={(result) => handleUploadSuccess(result, 'Robust')}
                  title="Upload Robusto"
                  description="Com fallback automático e sem timeout forçado"
                  acceptedTypes="*/*"
                  maxSizeMB={500}
                />
              </TabsContent>
              
              <TabsContent value="emergency" className="mt-6">
                <EmergencyUpload
                  title="Upload de Emergência"
                  onUploadComplete={(result) => handleUploadSuccess(result, 'Emergency')}
                />
              </TabsContent>
              
              <TabsContent value="advanced" className="mt-6">
                <AdvancedUploadComponent
                  uploadUrl={`/api/test-upload/advanced`}
                  onUploadSuccess={(result) => handleUploadSuccess(result, 'Advanced')}
                  title="Upload Avançado"
                  description="Com timeout configurável e modo sem limite"
                  acceptedTypes="*/*"
                  maxSizeMB={1000}
                />
              </TabsContent>
              
              <TabsContent value="standard" className="mt-6">
                <UploadComponent
                  uploadUrl={`/api/test-upload/standard`}
                  onUploadSuccess={(result) => handleUploadSuccess(result, 'Standard')}
                  title="Upload Padrão"
                  description="Timeout fixo de 2 minutos"
                  acceptedTypes=".pdf,.jpg,.png,.mp4"
                  maxSizeMB={100}
                />
              </TabsContent>
              
              <TabsContent value="chunked" className="mt-6">
                <AdvancedUploadComponent
                  uploadUrl={`/api/test-upload/chunked`}
                  onUploadSuccess={(result) => handleUploadSuccess(result, 'Chunked')}
                  title="Upload em Pedaços"
                  description="Arquivos divididos em partes menores"
                  acceptedTypes="*/*"
                  maxSizeMB={2000}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Test Results */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Resultados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {uploads.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhum upload testado ainda
                      </p>
                    ) : (
                      uploads.slice(-5).reverse().map((upload) => (
                        <div 
                          key={upload.id} 
                          className="p-3 border rounded-lg bg-white"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={upload.status === 'success' ? 'default' : 'destructive'}>
                                {upload.type}
                              </Badge>
                              <Badge variant="outline">
                                {upload.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {upload.timestamp}
                            </span>
                          </div>
                          <div className="text-xs bg-gray-50 p-2 rounded font-mono overflow-x-auto">
                            {typeof upload.result === 'string' ? 
                              upload.result : 
                              JSON.stringify(upload.result, null, 2)
                            }
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Information */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <h3 className="font-medium text-green-900 mb-3">🚀 Melhorias Ultra Avançadas:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ <strong>Timeout Flexível:</strong> De 1 minuto até ilimitado</li>
                <li>✅ <strong>Upload em Pedaços:</strong> Para arquivos muito grandes</li>
                <li>✅ <strong>Retry Automático:</strong> 3 tentativas por chunk</li>
                <li>✅ <strong>Configurações Inteligentes:</strong> Sugestões automáticas</li>
              </ul>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ <strong>Modo Sem Timeout:</strong> Para uploads extremos</li>
                <li>✅ <strong>Headers Personalizados:</strong> X-No-Timeout support</li>
                <li>✅ <strong>Detecção Melhorada:</strong> Identifica uploads complexos</li>
                <li>✅ <strong>Progresso Detalhado:</strong> Stage-by-stage feedback</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                onClick={() => window.location.href = window.location.pathname + '?emergency=clear'}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Limpar Timeouts
              </Button>
              
              <Button 
                onClick={() => {
                  localStorage.setItem('upload_mode', 'unlimited');
                  alert('Modo de upload ilimitado ativado globalmente!');
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Ativar Modo Ilimitado
              </Button>
              
              <Button 
                onClick={() => setUploads([])}
                variant="outline"
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Limpar Resultados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}