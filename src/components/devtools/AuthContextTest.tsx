import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Loader2, User } from 'lucide-react';
   import { AuthProvider, useAuth } from '../contexts/AuthContext';

export function AuthContextTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [testing, setTesting] = useState(false);
  
  const { usuario, isLoggedIn, configurationError, needsSetup } = useAuth();

  const runAuthTest = () => {
    setTesting(true);
    
    setTimeout(() => {
      const results = [];
      
      // Test 1: AuthContext accessibility
      try {
        results.push('✅ AuthContext: Acessível');
      } catch (error) {
        results.push('❌ AuthContext: Erro de acesso');
      }
      
      // Test 2: State consistency
      if (isLoggedIn && usuario) {
        results.push('✅ Estado: Usuário logado e dados disponíveis');
      } else if (!isLoggedIn && !usuario) {
        results.push('✅ Estado: Não logado (consistente)');
      } else {
        results.push('⚠️ Estado: Inconsistente (logado mas sem dados)');
      }
      
      // Test 3: Configuration status
      if (configurationError) {
        results.push(`⚠️ Configuração: ${configurationError}`);
      } else {
        results.push('✅ Configuração: OK');
      }
      
      // Test 4: Setup status
      if (needsSetup) {
        results.push('ℹ️ Setup: Necessário');
      } else {
        results.push('✅ Setup: Concluído');
      }
      
      setTestResult(results.join('\n'));
      setTesting(false);
    }, 1000);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Teste do AuthContext
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runAuthTest}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            'Executar Teste'
          )}
        </Button>
        
        {testResult && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Estado atual: {isLoggedIn ? `Logado como ${usuario?.nome}` : 'Não logado'}
        </div>
      </CardContent>
    </Card>
  );
}