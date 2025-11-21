import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function DiagnosticPanel() {
  const [testResults, setTestResults] = useState<{[key: string]: { status: 'loading' | 'success' | 'error', message: string }}>({});

  const runTest = async (testName: string, testFn: () => Promise<string>) => {
    setTestResults(prev => ({ ...prev, [testName]: { status: 'loading', message: 'Testando...' } }));
    
    try {
      const result = await testFn();
      setTestResults(prev => ({ ...prev, [testName]: { status: 'success', message: result } }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          status: 'error', 
          message: error instanceof Error ? error.message : String(error) 
        } 
      }));
    }
  };

  const testHealthEndpoint = async () => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return `Health check OK: ${JSON.stringify(data)}`;
  };

  const testSetupStatus = async () => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/setup-status`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return `Setup status: ${JSON.stringify(data)}`;
  };

  const testDatabaseConnection = async () => {
    // Teste simples fazendo uma requisição que deve acessar o banco
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return `Database OK: ${data.disciplinas ? data.disciplinas.length : 0} disciplinas encontradas`;
  };

  const getStatusIcon = (status: 'loading' | 'success' | 'error') => {
    switch (status) {
      case 'loading': return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const runAllTests = () => {
    runTest('Configuração', async () => {
      if (projectId === 'SEU_PROJECT_ID_AQUI' || !projectId) {
        throw new Error('Project ID não configurado');
      }
      if (publicAnonKey === 'SEU_ANON_KEY_AQUI' || !publicAnonKey) {
        throw new Error('Anon Key não configurada');
      }
      return `Project ID: ${projectId.substring(0, 8)}... | Anon Key configurada`;
    });

    runTest('Health Check', testHealthEndpoint);
    runTest('Teste Básico', async () => {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/test`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      return `Teste OK: ${JSON.stringify(data)}`;
    });
    runTest('Setup Status', testSetupStatus);
    runTest('Database', testDatabaseConnection);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Painel de Diagnóstico do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Use este painel para diagnosticar problemas de conectividade com o Supabase.
        </div>
        
        <Button onClick={runAllTests} className="w-full">
          Executar Todos os Testes
        </Button>

        <div className="space-y-3">
          {Object.entries(testResults).map(([testName, result]) => (
            <div key={testName} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="mt-0.5">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{testName}</span>
                  <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                    {result.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">{result.message}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Configurações Atuais:</h4>
          <div className="text-sm space-y-1">
            <div><strong>Project ID:</strong> {projectId}</div>
            <div><strong>Anon Key:</strong> {publicAnonKey.substring(0, 20)}...</div>
            <div><strong>URL Base:</strong> https://{projectId}.supabase.co</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}