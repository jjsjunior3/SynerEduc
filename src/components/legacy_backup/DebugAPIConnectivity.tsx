import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Play } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DebugAPIConnectivityProps {
  onVoltar: () => void;
}

interface TesteAPI {
  nome: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  status: 'idle' | 'loading' | 'success' | 'error';
  resultado?: any;
  erro?: string;
}

export function DebugAPIConnectivity({ onVoltar }: DebugAPIConnectivityProps) {
  const [testando, setTestando] = useState(false);
  const [tests, setTests] = useState<TesteAPI[]>([
    {
      nome: 'Health Check',
      url: '/make-server-c61d1ad0/health',
      method: 'GET',
      status: 'idle'
    },
    {
      nome: 'Listar Usuários',
      url: '/make-server-c61d1ad0/admin/usuarios',
      method: 'GET',
      status: 'idle'
    },
    {
      nome: 'Relatórios Admin',
      url: '/make-server-c61d1ad0/admin/relatorios',
      method: 'GET',
      status: 'idle'
    }
  ]);

  const executarTeste = async (teste: TesteAPI, index: number) => {
    // Atualizar status para loading
    setTests(prev => prev.map((t, i) => 
      i === index ? { ...t, status: 'loading' as const } : t
    ));

    try {
      const url = `https://${projectId}.supabase.co/functions/v1${teste.url}`;
      console.log(`[DEBUG] Testando ${teste.nome}: ${url}`);

      const options: RequestInit = {
        method: teste.method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (teste.body) {
        options.body = JSON.stringify(teste.body);
      }

      const response = await fetch(url, options);
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      console.log(`[DEBUG] Resposta ${teste.nome}:`, {
        status: response.status,
        ok: response.ok,
        data: responseData
      });

      if (response.ok) {
        setTests(prev => prev.map((t, i) => 
          i === index ? { 
            ...t, 
            status: 'success' as const, 
            resultado: responseData 
          } : t
        ));
        toast.success(`${teste.nome}: OK`);
      } else {
        setTests(prev => prev.map((t, i) => 
          i === index ? { 
            ...t, 
            status: 'error' as const, 
            erro: `HTTP ${response.status}: ${responseData.error || responseText}` 
          } : t
        ));
        toast.error(`${teste.nome}: Erro ${response.status}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Erro em ${teste.nome}:`, error);
      setTests(prev => prev.map((t, i) => 
        i === index ? { 
          ...t, 
          status: 'error' as const, 
          erro: error.message 
        } : t
      ));
      toast.error(`${teste.nome}: ${error.message}`);
    }
  };

  const executarTodosTestes = async () => {
    setTestando(true);
    
    // Reset all tests
    setTests(prev => prev.map(t => ({ ...t, status: 'idle' as const, resultado: undefined, erro: undefined })));
    
    // Execute tests sequentially
    for (let i = 0; i < tests.length; i++) {
      await executarTeste(tests[i], i);
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTestando(false);
    toast.success('Todos os testes concluídos!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  useEffect(() => {
    // Auto-start basic connectivity test
    console.log('[DEBUG] Informações de conexão:', {
      projectId,
      publicAnonKey: publicAnonKey?.substring(0, 20) + '...'
    });
  }, []);

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
              <h1 className="text-xl font-semibold text-gray-900">Debug de Conectividade API</h1>
              <p className="text-sm text-gray-600">Testar conexões com as APIs do servidor</p>
            </div>
          </div>
          <Button 
            onClick={executarTodosTestes}
            disabled={testando}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {testando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Executar Testes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Informações de Conexão */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações de Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Project ID:</span>
                <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">{projectId}</code>
              </div>
              <div>
                <span className="font-medium">Public Key:</span>
                <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                  {publicAnonKey?.substring(0, 20)}...
                </code>
              </div>
              <div>
                <span className="font-medium">Base URL:</span>
                <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                  https://{projectId}.supabase.co/functions/v1
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testes de API */}
        <Card>
          <CardHeader>
            <CardTitle>Testes de Conectividade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((teste, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(teste.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(teste.status)}
                      <div>
                        <h3 className="font-medium">{teste.nome}</h3>
                        <p className="text-sm text-gray-600">
                          {teste.method} {teste.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={teste.status === 'success' ? 'default' : 
                               teste.status === 'error' ? 'destructive' : 'secondary'}
                      >
                        {teste.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executarTeste(teste, index)}
                        disabled={teste.status === 'loading' || testando}
                      >
                        {teste.status === 'loading' ? 'Testando...' : 'Testar'}
                      </Button>
                    </div>
                  </div>
                  
                  {teste.erro && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                      <strong>Erro:</strong> {teste.erro}
                    </div>
                  )}
                  
                  {teste.resultado && (
                    <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-sm">
                      <strong>Resultado:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(teste.resultado, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{tests.length}</div>
                <div className="text-sm text-gray-600">Total de Testes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {tests.filter(t => t.status === 'success').length}
                </div>
                <div className="text-sm text-gray-600">Sucessos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {tests.filter(t => t.status === 'error').length}
                </div>
                <div className="text-sm text-gray-600">Erros</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {tests.filter(t => t.status === 'idle').length}
                </div>
                <div className="text-sm text-gray-600">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}