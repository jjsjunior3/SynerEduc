import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RouteTest {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expectedStatus: number;
  description: string;
  testData?: any;
}

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  response?: any;
  error?: string;
  statusCode?: number;
  responseTime?: number;
}

interface DiagnosticoRotasAdminProps {
  onVoltar: () => void;
}

export function DiagnosticoRotasAdmin({ onVoltar }: DiagnosticoRotasAdminProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`;

  const routeTests: RouteTest[] = [
    {
      name: 'Health Check Geral',
      url: `${baseUrl}/health`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Verifica se o servidor está respondendo'
    },
    {
      name: 'Health Check Admin',
      url: `${baseUrl}/admin/health`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Verifica se as APIs administrativas estão funcionando'
    },
    {
      name: 'Listar Usuários (Admin)',
      url: `${baseUrl}/admin/usuarios`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Lista todos os usuários do sistema'
    },
    {
      name: 'Listar Usuários (Geral)',
      url: `${baseUrl}/usuarios`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Lista usuários via endpoint geral'
    },
    {
      name: 'Relatórios Admin',
      url: `${baseUrl}/admin/relatorios`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Obtém estatísticas administrativas'
    }
  ];

  const runSingleTest = async (test: RouteTest): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      console.log(`[TESTE] Executando teste: ${test.name} - ${test.method} ${test.url}`);
      
      const options: RequestInit = {
        method: test.method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      };

      if (test.testData && (test.method === 'POST' || test.method === 'PUT')) {
        options.body = JSON.stringify(test.testData);
      }

      const response = await fetch(test.url, options);
      const responseTime = Date.now() - startTime;
      
      console.log(`[TESTE] ${test.name} - Status: ${response.status}, Esperado: ${test.expectedStatus}`);
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { text: await response.text() };
      }

      if (response.status === test.expectedStatus) {
        return {
          name: test.name,
          status: 'success',
          response: responseData,
          statusCode: response.status,
          responseTime
        };
      } else {
        return {
          name: test.name,
          status: 'error',
          error: `Status esperado: ${test.expectedStatus}, recebido: ${response.status}`,
          response: responseData,
          statusCode: response.status,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[TESTE] Erro no teste ${test.name}:`, error);
      
      return {
        name: test.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        responseTime
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setTestResults([]);

    const results: TestResult[] = [];

    for (const test of routeTests) {
      setCurrentTest(test.name);
      
      // Adicionar resultado pendente
      const pendingResult: TestResult = {
        name: test.name,
        status: 'pending'
      };
      setTestResults(prev => [...prev.filter(r => r.name !== test.name), pendingResult]);

      const result = await runSingleTest(test);
      results.push(result);
      
      // Atualizar resultado
      setTestResults(prev => [...prev.filter(r => r.name !== test.name), result]);
      
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCurrentTest('');
    setTesting(false);

    // Log resumo dos testes
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`[DIAGNÓSTICO] Testes concluídos: ${successCount} sucessos, ${errorCount} erros`);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'pending') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'pending') => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'pending':
        return <Badge variant="secondary">Testando...</Badge>;
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const totalTests = routeTests.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Diagnóstico de Rotas - Admin</h1>
            <p className="text-gray-600 mt-2">
              Teste das rotas administrativas para identificar problemas 404
            </p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar
          </Button>
        </div>

        {/* Configuração de Teste */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Configuração do Teste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servidor Base
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-mono">
                  {baseUrl}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authorization Token
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-mono truncate">
                  Bearer {publicAnonKey.substring(0, 20)}...
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total de Testes
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                  {routeTests.length} rotas
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                onClick={runAllTests} 
                disabled={testing}
                className="flex items-center gap-2"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {testing ? 'Testando...' : 'Executar Todos os Testes'}
              </Button>

              {testing && currentTest && (
                <div className="text-sm text-gray-600">
                  Testando: <span className="font-medium">{currentTest}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumo dos Resultados */}
        {testResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resumo dos Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{successCount}</div>
                  <div className="text-sm text-green-700">Sucessos</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                  <div className="text-sm text-red-700">Erros</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.length}/{totalTests}
                  </div>
                  <div className="text-sm text-blue-700">Concluídos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultados Detalhados */}
        <div className="grid grid-cols-1 gap-4">
          {routeTests.map((test, index) => {
            const result = testResults.find(r => r.name === test.name);
            
            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result ? getStatusIcon(result.status) : <AlertCircle className="w-5 h-5 text-gray-400" />}
                      <div>
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        <p className="text-sm text-gray-600">{test.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result && getStatusBadge(result.status)}
                      <Badge variant="outline">
                        {test.method}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
                      <div className="px-3 py-2 bg-gray-50 rounded text-sm font-mono break-all">
                        {test.url}
                      </div>
                    </div>

                    {result && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status Code</label>
                            <div className={`px-3 py-2 rounded text-sm font-medium ${
                              result.statusCode === test.expectedStatus 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.statusCode || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tempo de Resposta</label>
                            <div className="px-3 py-2 bg-gray-50 rounded text-sm">
                              {result.responseTime ? `${result.responseTime}ms` : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {result.error && (
                          <div>
                            <label className="block text-xs font-medium text-red-500 mb-1">Erro</label>
                            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              {result.error}
                            </div>
                          </div>
                        )}

                        {result.response && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Resposta</label>
                            <div className="px-3 py-2 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-y-auto">
                              <pre>{JSON.stringify(result.response, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Instruções de Solução */}
        {testResults.length > 0 && errorCount > 0 && (
          <Card className="mt-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">Próximos Passos para Correção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-orange-700">
                <p>• Se os testes de Health Check falharam, verifique se o servidor Supabase está rodando</p>
                <p>• Se as rotas de usuários falharam, pode ser necessário reinicializar o sistema</p>
                <p>• Para erros 404, verifique se as rotas estão corretamente definidas no servidor</p>
                <p>• Para erros 500, consulte os logs do servidor para mais detalhes</p>
                <p>• Se persistir, execute o diagnóstico completo do sistema</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}