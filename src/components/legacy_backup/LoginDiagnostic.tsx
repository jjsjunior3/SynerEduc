import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  Globe,
  Server,
  Database,
  Key
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LoginDiagnosticProps {
  onBack: () => void;
}

interface DiagnosticResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export function LoginDiagnostic({ onBack }: LoginDiagnosticProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);

    const tests: DiagnosticResult[] = [
      { name: 'Configuração do Projeto', status: 'pending', message: 'Verificando...' },
      { name: 'Conectividade Internet', status: 'pending', message: 'Verificando...' },
      { name: 'Servidor Supabase', status: 'pending', message: 'Verificando...' },
      { name: 'API de Saúde', status: 'pending', message: 'Verificando...' },
      { name: 'API de Login', status: 'pending', message: 'Verificando...' }
    ];

    setResults([...tests]);

    // Test 1: Project Configuration
    await new Promise(resolve => setTimeout(resolve, 500));
    if (projectId && publicAnonKey && 
        projectId !== 'SEU_PROJECT_ID_AQUI' && 
        publicAnonKey !== 'SEU_ANON_KEY_AQUI') {
      tests[0] = { 
        name: 'Configuração do Projeto', 
        status: 'success', 
        message: 'Configurado corretamente',
        details: `Project ID: ${projectId.substring(0, 8)}...`
      };
    } else {
      tests[0] = { 
        name: 'Configuração do Projeto', 
        status: 'error', 
        message: 'Configuração inválida',
        details: 'Project ID ou Anon Key não configurados'
      };
    }
    setResults([...tests]);

    // Test 2: Internet Connectivity
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        signal: AbortSignal.timeout(3000)
      });
      tests[1] = { 
        name: 'Conectividade Internet', 
        status: 'success', 
        message: 'Conectado à internet' 
      };
    } catch {
      tests[1] = { 
        name: 'Conectividade Internet', 
        status: 'error', 
        message: 'Sem conexão com a internet' 
      };
    }
    setResults([...tests]);

    // Test 3: Supabase Server
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const response = await fetch(`https://${projectId}.supabase.co`, {
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      tests[2] = { 
        name: 'Servidor Supabase', 
        status: 'success', 
        message: 'Servidor acessível' 
      };
    } catch (error: any) {
      tests[2] = { 
        name: 'Servidor Supabase', 
        status: 'error', 
        message: 'Servidor inacessível',
        details: error.message
      };
    }
    setResults([...tests]);

    // Test 4: Health API
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (response.ok) {
        tests[3] = { 
          name: 'API de Saúde', 
          status: 'success', 
          message: 'API funcionando',
          details: `Status: ${response.status}`
        };
      } else {
        tests[3] = { 
          name: 'API de Saúde', 
          status: 'error', 
          message: `HTTP ${response.status}`,
          details: response.statusText
        };
      }
    } catch (error: any) {
      tests[3] = { 
        name: 'API de Saúde', 
        status: 'error', 
        message: 'API inacessível',
        details: error.message
      };
    }
    setResults([...tests]);

    // Test 5: Login API
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}` 
          },
          body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
          signal: AbortSignal.timeout(5000)
        }
      );
      
      // We expect 401 or 400 for wrong credentials, not 500/404
      if (response.status === 401 || response.status === 400) {
        tests[4] = { 
          name: 'API de Login', 
          status: 'success', 
          message: 'API funcionando',
          details: 'Rejeita credenciais inválidas corretamente'
        };
      } else if (response.status === 404) {
        tests[4] = { 
          name: 'API de Login', 
          status: 'error', 
          message: 'Endpoint não encontrado',
          details: 'Rota de login não existe'
        };
      } else {
        tests[4] = { 
          name: 'API de Login', 
          status: 'error', 
          message: `HTTP ${response.status}`,
          details: response.statusText
        };
      }
    } catch (error: any) {
      tests[4] = { 
        name: 'API de Login', 
        status: 'error', 
        message: 'API inacessível',
        details: error.message
      };
    }
    setResults([...tests]);

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">ERRO</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">TESTANDO</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Diagnóstico de Login
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Verificando problemas de conectividade e configuração
                  </p>
                </div>
              </div>
              <Button 
                onClick={runDiagnostic} 
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  'Executar Diagnóstico'
                )}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {results.length === 0 && !isRunning && (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Clique em "Executar Diagnóstico" para verificar problemas
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-sm text-gray-600">{result.message}</div>
                        {result.details && (
                          <div className="text-xs text-gray-500 mt-1">{result.details}</div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Soluções Sugeridas:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Se há erro de configuração: Execute o setup inicial</li>
                    <li>• Se há erro de conectividade: Verifique sua internet</li>
                    <li>• Se há erro de API: O servidor pode estar inativo</li>
                    <li>• Se tudo está OK: O problema pode ser nas credenciais</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}