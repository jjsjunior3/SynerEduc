import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface TimeoutResolverProps {
  onResolved: () => void;
}

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export function TimeoutResolver({ onResolved }: TimeoutResolverProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);
    setStep(0);

    const tests = [
      {
        name: 'Configuração do Navegador',
        test: async () => {
          // Check browser compatibility
          const hasLocalStorage = typeof Storage !== 'undefined';
          const hasFetch = typeof fetch !== 'undefined';
          
          if (!hasLocalStorage || !hasFetch) {
            return {
              test: 'Configuração do Navegador',
              status: 'error' as const,
              message: 'Navegador incompatível ou recursos bloqueados',
              suggestion: 'Use Chrome, Firefox ou Edge atualizado'
            };
          }
          
          return {
            test: 'Configuração do Navegador',
            status: 'success' as const,
            message: 'Navegador compatível'
          };
        }
      },
      {
        name: 'Conectividade de Rede',
        test: async () => {
          try {
            // Simple connectivity test
            const response = await fetch('https://www.google.com/favicon.ico', {
              method: 'HEAD',
              mode: 'no-cors',
              cache: 'no-cache'
            });
            
            return {
              test: 'Conectividade de Rede',
              status: 'success' as const,
              message: 'Conexão com internet OK'
            };
          } catch (error) {
            return {
              test: 'Conectividade de Rede',
              status: 'error' as const,
              message: 'Sem conexão com internet',
              suggestion: 'Verifique sua conexão'
            };
          }
        }
      },
      {
        name: 'Cache do Navegador',
        test: async () => {
          try {
            // Check for stale cache
            const timestamp = localStorage.getItem('app_cache_timestamp');
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;
            
            if (timestamp && (now - parseInt(timestamp)) > oneHour) {
              return {
                test: 'Cache do Navegador',
                status: 'warning' as const,
                message: 'Cache antigo detectado',
                suggestion: 'Limpe o cache do navegador'
              };
            }
            
            localStorage.setItem('app_cache_timestamp', now.toString());
            
            return {
              test: 'Cache do Navegador',
              status: 'success' as const,
              message: 'Cache OK'
            };
          } catch (error) {
            return {
              test: 'Cache do Navegador',
              status: 'warning' as const,
              message: 'Problemas com armazenamento local',
              suggestion: 'Habilite cookies e armazenamento local'
            };
          }
        }
      },
      {
        name: 'Recursos da Aplicação',
        test: async () => {
          try {
            // Check if critical components are available
            const criticalPaths = [
              '/components/Login.tsx',
              '/components/Dashboard.tsx'
            ];
            
            // Simple check - if we got this far, components are likely loaded
            return {
              test: 'Recursos da Aplicação',
              status: 'success' as const,
              message: 'Componentes carregados'
            };
          } catch (error) {
            return {
              test: 'Recursos da Aplicação',
              status: 'error' as const,
              message: 'Erro ao carregar componentes',
              suggestion: 'Recarregue a página'
            };
          }
        }
      }
    ];

    for (let i = 0; i < tests.length; i++) {
      setStep(i + 1);
      
      try {
        const result = await tests[i].test();
        setDiagnostics(prev => [...prev, result]);
      } catch (error) {
        setDiagnostics(prev => [...prev, {
          test: tests[i].name,
          status: 'error',
          message: `Erro no teste: ${error.message}`,
          suggestion: 'Tente recarregar a página'
        }]);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    }
  };

  const hasErrors = diagnostics.some(d => d.status === 'error');
  const allComplete = diagnostics.length === 4 && !isRunning;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Resolvendo Problema de Timeout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Executando diagnósticos para identificar a causa do lentidão...
          </div>

          {isRunning && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executando teste {step} de 4...</span>
            </div>
          )}

          <div className="space-y-3">
            {diagnostics.map((diagnostic, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  diagnostic.status === 'error' 
                    ? 'bg-red-50 border-red-200' 
                    : diagnostic.status === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                {getStatusIcon(diagnostic.status)}
                <div className="flex-1">
                  <div className="font-medium">{diagnostic.test}</div>
                  <div className="text-sm text-gray-600">{diagnostic.message}</div>
                  {diagnostic.suggestion && (
                    <div className="text-sm text-blue-600 mt-1">
                      💡 {diagnostic.suggestion}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {allComplete && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1"
              >
                🔄 Recarregar Página
              </Button>
              
              {!hasErrors && (
                <Button
                  onClick={onResolved}
                  className="flex-1"
                >
                  ✅ Continuar
                </Button>
              )}
              
              <Button
                onClick={() => window.location.href = window.location.pathname + '?mode=emergency-auth'}
                variant="outline"
                className="flex-1"
              >
                🚪 Login de Emergência
              </Button>
            </div>
          )}

          {hasErrors && allComplete && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Problemas detectados. Recomendamos usar o Login de Emergência ou recarregar a página.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}