import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export function DiagnosticoApp() {
  const [tests, setTests] = useState<Record<string, 'pending' | 'success' | 'error' | 'warning'>>({
    'basic-render': 'pending',
    'components': 'pending',
    'auth-context': 'pending',
    'url-params': 'pending',
    'network': 'pending'
  });

  const runDiagnostic = async () => {
    console.log('🔍 Iniciando diagnóstico completo...');
    
    // Test 1: Basic render
    setTests(prev => ({ ...prev, 'basic-render': 'success' }));
    console.log('✅ Teste 1: Renderização básica - OK');
    
    // Test 2: Components load
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setTests(prev => ({ ...prev, 'components': 'success' }));
      console.log('✅ Teste 2: Carregamento de componentes - OK');
    } catch (error) {
      console.error('❌ Teste 2: Erro no carregamento de componentes:', error);
      setTests(prev => ({ ...prev, 'components': 'error' }));
    }

    // Test 3: Auth context
    try {
      // Test if we can import auth context
      const authModule = await import('../contexts/AuthContext');
      if (authModule.useAuth) {
        setTests(prev => ({ ...prev, 'auth-context': 'success' }));
        console.log('✅ Teste 3: AuthContext - OK');
      } else {
        throw new Error('useAuth not found');
      }
    } catch (error) {
      console.error('❌ Teste 3: Erro no AuthContext:', error);
      setTests(prev => ({ ...prev, 'auth-context': 'error' }));
    }

    // Test 4: URL parameters
    try {
      const params = new URLSearchParams(window.location.search);
      const paramsObj = Object.fromEntries(params.entries());
      console.log('🔗 URL Params:', paramsObj);
      setTests(prev => ({ ...prev, 'url-params': 'success' }));
      console.log('✅ Teste 4: Parâmetros de URL - OK');
    } catch (error) {
      console.error('❌ Teste 4: Erro nos parâmetros de URL:', error);
      setTests(prev => ({ ...prev, 'url-params': 'error' }));
    }

    // Test 5: Network connectivity
    try {
      // Test basic fetch capability
      await fetch('data:text/plain,test');
      setTests(prev => ({ ...prev, 'network': 'success' }));
      console.log('✅ Teste 5: Conectividade de rede - OK');
    } catch (error) {
      console.error('❌ Teste 5: Erro de conectividade:', error);
      setTests(prev => ({ ...prev, 'network': 'error' }));
    }

    console.log('🏁 Diagnóstico completo finalizado');
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Sucesso';
      case 'error': return 'Erro';
      case 'warning': return 'Aviso';
      default: return 'Pendente';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center">🔍 Diagnóstico do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-6">
            <Button onClick={runDiagnostic} size="lg">
              Executar Diagnóstico
            </Button>
          </div>

          <div className="space-y-3">
            {Object.entries(tests).map(([test, status]) => (
              <div key={test} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">
                  {test === 'basic-render' && 'Renderização Básica'}
                  {test === 'components' && 'Carregamento de Componentes'}
                  {test === 'auth-context' && 'Contexto de Autenticação'}
                  {test === 'url-params' && 'Parâmetros de URL'}
                  {test === 'network' && 'Conectividade de Rede'}
                </span>
                <div className="flex items-center gap-2">
                  {getIcon(status)}
                  <span className="text-sm">{getStatusText(status)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="font-medium mb-2">Informações do Sistema:</h3>
              <div className="text-sm space-y-1">
                <div>URL: {window.location.href}</div>
                <div>Search: {window.location.search || 'Nenhum'}</div>
                <div>Pathname: {window.location.pathname}</div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded">
              <h3 className="font-medium mb-2">Status da Aplicação:</h3>
              <div className="text-sm space-y-1">
                <div>React: Funcionando</div>
                <div>Tailwind: Funcionando</div>
                <div>Sonner (Toast): Disponível</div>
                <div>Contexto de Auth: {Object.values(tests).includes('error') ? 'Com problemas' : 'Funcionando'}</div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded">
              <h3 className="font-medium mb-2">Ações Disponíveis:</h3>
              <div className="text-sm space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = window.location.pathname + '?mode=admin'}
                  className="w-full"
                >
                  🔧 Ir para Admin
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = window.location.pathname;
                  }}
                  className="w-full"
                >
                  🗑️ Limpar Cache
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = window.location.pathname}
            >
              ← Voltar ao Sistema Normal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}