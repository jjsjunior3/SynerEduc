import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AdminUsuariosTestProps {
  onVoltar: () => void;
}

export function AdminUsuariosTest({ onVoltar }: AdminUsuariosTestProps) {
  const [testStep, setTestStep] = useState(0);

  const testToast = () => {
    try {
      toast.success('Toast funcionando!');
      setTestStep(1);
    } catch (error) {
      console.error('Erro no toast:', error);
      setTestStep(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Teste AdminUsuarios</h1>
              <p className="text-sm text-gray-600">Verificação de funcionamento</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teste de Componentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded">
              <h3 className="font-medium mb-2">Status dos Testes:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Componente renderizado ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${testStep === 1 ? 'bg-green-500' : testStep === -1 ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <span>Toast {testStep === 1 ? '✓' : testStep === -1 ? '✗' : '?'}</span>
                </div>
              </div>
            </div>

            <Button onClick={testToast} className="w-full">
              Testar Toast
            </Button>

            <div className="p-4 bg-blue-50 rounded">
              <h4 className="font-medium text-blue-900 mb-2">Informações de Debug:</h4>
              <div className="text-sm space-y-1">
                <div>URL: {window.location.href}</div>
                <div>Search: {window.location.search}</div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}