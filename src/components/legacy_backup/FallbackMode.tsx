import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Wifi, RefreshCw, Settings, ArrowLeft } from 'lucide-react';

interface FallbackModeProps {
  onBack?: () => void;
}

export function FallbackMode({ onBack }: FallbackModeProps) {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runConnectivityTest = async () => {
    setTesting(true);
    setTestResults([]);
    
    const results = [];
    
    // Test 1: Basic internet connectivity
    try {
      results.push('✅ Internet: Testando...');
      setTestResults([...results]);
      
      await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        signal: AbortSignal.timeout(3000)
      });
      results[results.length - 1] = '✅ Internet: Conectado';
    } catch {
      results[results.length - 1] = '❌ Internet: Sem conexão';
    }
    
    setTestResults([...results]);
    
    // Test 2: Supabase connectivity
    try {
      results.push('✅ Supabase: Testando...');
      setTestResults([...results]);
      
      const response = await fetch('https://supabase.com/favicon.ico', {
        mode: 'no-cors',
        signal: AbortSignal.timeout(3000)
      });
      results[results.length - 1] = '✅ Supabase: Acessível';
    } catch {
      results[results.length - 1] = '❌ Supabase: Inacessível';
    }
    
    setTestResults([...results]);
    
    // Test 3: Local storage
    try {
      results.push('✅ Storage: Testando...');
      setTestResults([...results]);
      
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      results[results.length - 1] = '✅ Storage: Funcionando';
    } catch {
      results[results.length - 1] = '❌ Storage: Bloqueado';
    }
    
    setTestResults([...results]);
    setTesting(false);
  };

  const clearAllData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      alert('Todos os dados foram limpos. A página será recarregada.');
      window.location.reload();
    } catch (error) {
      alert('Erro ao limpar dados: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Modo de Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              O sistema detectou problemas de performance ou conectividade. 
              Use as ferramentas abaixo para diagnosticar e corrigir.
            </p>
          </CardContent>
        </Card>

        {/* Connectivity Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Teste de Conectividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runConnectivityTest}
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Testar Conectividade
                </>
              )}
            </Button>
            
            {testResults.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recovery Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ações de Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Página
            </Button>
            
            <Button 
              onClick={() => {
                localStorage.removeItem('ava_auth_state');
                localStorage.removeItem('ava_emergency_mode');
                window.location.href = window.location.pathname;
              }}
              variant="outline"
              className="w-full"
            >
              🔑 Limpar Dados de Login
            </Button>
            
            <Button 
              onClick={clearAllData}
              variant="destructive"
              className="w-full"
            >
              🗑️ Limpar Todos os Dados
            </Button>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Button 
                onClick={() => window.location.href = window.location.pathname}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Sistema
              </Button>
              
              {onBack && (
                <Button 
                  onClick={onBack}
                  variant="outline"
                  className="flex-1"
                >
                  Voltar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-700">
              <h4 className="font-medium mb-2">💡 Dicas para resolver problemas:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Verifique sua conexão com a internet</li>
                <li>Desative extensões do navegador temporariamente</li>
                <li>Tente usar uma aba anônima/privada</li>
                <li>Verifique se o JavaScript está habilitado</li>
                <li>Limpe o cache do navegador</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}