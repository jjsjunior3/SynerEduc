import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface TimeoutHandlerProps {
  children: React.ReactNode;
}

export function TimeoutHandler({ children }: TimeoutHandlerProps) {
  const [timeoutDetected, setTimeoutDetected] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Detectar se há indícios de timeout
    const checkForTimeouts = () => {
      const loopDetected = localStorage.getItem('auth_loop_detected');
      const loopCount = parseInt(localStorage.getItem('auth_loop_count') || '0');
      
      if (loopDetected === 'true' || loopCount > 10) {
        setTimeoutDetected(true);
      }
    };

    // Verificar imediatamente
    checkForTimeouts();

    // Verificar a cada 30 segundos
    const interval = setInterval(checkForTimeouts, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    
    try {
      // Limpar todos os dados de cache
      localStorage.clear();
      sessionStorage.clear();
      
      // Limpar cookies se possível
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          registration.unregister();
        }
      }
      
      // Aguardar um pouco e recarregar
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      // Fallback: apenas recarregar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleForceReload = () => {
    // Forçar recarga completa ignorando cache
    window.location.reload();
  };

  const handleIgnoreAndContinue = () => {
    // Limpar apenas os flags de timeout e continuar
    localStorage.removeItem('auth_loop_detected');
    localStorage.removeItem('auth_loop_count');
    setTimeoutDetected(false);
  };

  if (timeoutDetected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
              Timeout Detectado
            </CardTitle>
            <CardDescription>
              O sistema detectou possíveis problemas de conexão ou loops de requisição.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Para resolver este problema, recomendamos limpar o cache do navegador.
                Isso irá resetar todas as configurações locais.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={handleClearCache}
                disabled={isClearing}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Cache e Reiniciar
                  </>
                )}
              </Button>

              <Button 
                onClick={handleForceReload}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Forçar Recarga
              </Button>

              <Button 
                onClick={handleIgnoreAndContinue}
                variant="ghost"
                className="w-full text-gray-600"
              >
                Ignorar e Continuar
              </Button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Possíveis causas:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Conexão lenta com o servidor</li>
                <li>Cache do navegador corrompido</li>
                <li>Problemas temporários no backend</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}