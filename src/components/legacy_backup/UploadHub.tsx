import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Upload, Zap, Cloud, WifiOff, TestTube, Shield } from 'lucide-react';

interface UploadHubProps {
  onBack: () => void;
}

export function UploadHub({ onBack }: UploadHubProps) {
  const uploadOptions = [
    {
      id: 'garantido',
      name: '🛡️ Upload Garantido',
      description: 'Sistema à prova de falhas - sempre funciona',
      url: '?upload-semfalhas=true',
      icon: Shield,
      color: 'bg-green-600 hover:bg-green-700',
      badge: 'Recomendado'
    },
    {
      id: 'avancado',
      name: '⚡ Upload Avançado',
      description: 'Timeout flexível e múltiplas opções',
      icon: Zap,
      color: 'bg-yellow-600 hover:bg-yellow-700',
      badge: 'Flexível'
    },
    {
      id: 'emergencia',
      name: '🚨 Upload de Emergência',
      description: 'Processamento local - sem servidor',
      url: '?upload-emergency=true',
      icon: WifiOff,
      color: 'bg-orange-600 hover:bg-orange-700',
      badge: 'Offline'
    },
    {
      id: 'teste',
      name: '🧪 Centro de Testes',
      description: 'Teste todos os modos de upload',
      icon: TestTube,
      color: 'bg-purple-600 hover:bg-purple-700',
      badge: 'Debug'
    }
  ];

  const getLocalUploads = () => {
    try {
      const local = JSON.parse(localStorage.getItem('local_uploads') || '[]');
      const emergency = JSON.parse(localStorage.getItem('emergency_uploads') || '[]');
      const fallback = JSON.parse(localStorage.getItem('fallback_uploads') || '[]');
      return local.length + emergency.length + fallback.length;
    } catch {
      return 0;
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
                <Upload className="w-5 h-5" />
                Central de Upload - Todas as Opções
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600">
              Escolha o método de upload mais adequado para sua situação
            </p>
          </CardHeader>
        </Card>

        {/* Upload Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {uploadOptions.map((option) => (
            <Card key={option.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <option.icon className="w-5 h-5" />
                    {option.name}
                  </div>
                  <Badge variant="outline">{option.badge}</Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">{option.description}</p>
              </CardHeader>
              <CardContent>
                <Button 
                  className={`w-full ${option.color} text-white`}
                  onClick={() => {
                    if (option.url) {
                      window.location.href = option.url;
                    } else if (option.id === 'avancado') {
                      // Trigger advanced upload test
                      window.location.href = '?test-upload=advanced';
                    } else if (option.id === 'teste') {
                      // Trigger test center
                      window.location.href = '?test-upload=all';
                    }
                  }}
                >
                  Acessar {option.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-medium text-blue-900 mb-2">📊 Estatísticas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <strong>Uploads Locais:</strong> {getLocalUploads()}
                </div>
                <div>
                  <strong>Sistema:</strong> Online
                </div>
                <div>
                  <strong>Modo:</strong> Múltiplas opções
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium text-gray-900 mb-3">💡 Qual opção escolher?</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div><strong>🛡️ Upload Garantido:</strong> Para quando você precisa que funcione sempre</div>
              <div><strong>⚡ Upload Avançado:</strong> Para controle total sobre timeout e configurações</div>
              <div><strong>🚨 Upload de Emergência:</strong> Para quando o servidor está offline</div>
              <div><strong>🧪 Centro de Testes:</strong> Para testar e diagnosticar problemas</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}