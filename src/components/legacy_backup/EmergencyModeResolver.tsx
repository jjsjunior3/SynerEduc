import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertTriangle, 
  Wifi, 
  RefreshCw, 
  Settings, 
  HelpCircle,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

interface EmergencyModeResolverProps {
  onResolve: () => void;
}

export function EmergencyModeResolver({ onResolve }: EmergencyModeResolverProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const emergencyActions = [
    {
      id: 'reload',
      title: '🔄 Recarregar Página',
      description: 'Limpa cache temporário e recarrega a aplicação',
      severity: 'low',
      action: () => {
        localStorage.setItem('emergency_reload_count', String(
          (parseInt(localStorage.getItem('emergency_reload_count') || '0') + 1)
        ));
        window.location.reload();
      }
    },
    {
      id: 'clear-cache',
      title: '🧹 Limpar Cache',
      description: 'Remove todos os dados salvos localmente',
      severity: 'medium',
      action: () => {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        setTimeout(() => window.location.reload(), 1000);
      }
    },
    {
      id: 'emergency-login',
      title: '🚪 Login de Emergência',
      description: 'Acesso direto ao sistema sem verificações',
      severity: 'medium',
      action: () => {
        window.location.href = window.location.pathname + '?mode=emergency-auth';
      }
    },
    {
      id: 'diagnostic',
      title: '🔍 Diagnóstico Completo',
      description: 'Executa testes detalhados do sistema',
      severity: 'high',
      action: () => {
        window.location.href = window.location.pathname + '?mode=diagnostico';
      }
    },
    {
      id: 'fallback',
      title: '⚡ Modo Básico',
      description: 'Interface simplificada para acesso essencial',
      severity: 'high',
      action: () => {
        window.location.href = window.location.pathname + '?mode=fallback';
      }
    },
    {
      id: 'offline',
      title: '📱 Modo Offline',
      description: 'Interface local sem conexão com servidor',
      severity: 'critical',
      action: () => {
        localStorage.setItem('force_offline_mode', 'true');
        window.location.reload();
      }
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-green-200 bg-green-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'high': return 'border-orange-200 bg-orange-50';
      case 'critical': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'low': return 'Recomendado';
      case 'medium': return 'Intermediário';
      case 'high': return 'Avançado';
      case 'critical': return 'Último Recurso';
      default: return '';
    }
  };

  const getReloadCount = () => {
    return parseInt(localStorage.getItem('emergency_reload_count') || '0');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">
            Sistema em Modo de Emergência
          </CardTitle>
          <p className="text-gray-600 mt-2">
            A aplicação demorou muito para carregar. Escolha uma opção para resolver:
          </p>
        </CardHeader>
        
        <CardContent>
          {getReloadCount() > 2 && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Múltiplos recarregamentos detectados ({getReloadCount()}x).</strong>{' '}
                Recomendamos usar o Diagnóstico Completo ou Modo Básico.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {emergencyActions.map((action) => (
              <div
                key={action.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedAction === action.id 
                    ? 'ring-2 ring-blue-500 border-blue-300' 
                    : getSeverityColor(action.severity)
                }`}
                onClick={() => setSelectedAction(action.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        action.severity === 'low' ? 'bg-green-100 text-green-800' :
                        action.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        action.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getSeverityLabel(action.severity)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                  
                  {selectedAction === action.id && (
                    <div className="ml-4">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          action.action();
                        }}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        Executar <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {selectedAction === action.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        {action.id === 'reload' && (
                          <span>Recarrega a página mantendo os dados de login salvos.</span>
                        )}
                        {action.id === 'clear-cache' && (
                          <span>Remove todos os dados salvos. Você precisará fazer login novamente.</span>
                        )}
                        {action.id === 'emergency-login' && (
                          <span>Permite acesso direto ao sistema sem aguardar verificações.</span>
                        )}
                        {action.id === 'diagnostic' && (
                          <span>Executa testes de conectividade, configuração e performance.</span>
                        )}
                        {action.id === 'fallback' && (
                          <span>Interface simplificada com funcionalidades essenciais apenas.</span>
                        )}
                        {action.id === 'offline' && (
                          <span>Modo local sem conexão. Funcionalidades limitadas.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={onResolve}
              variant="outline"
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            
            <Button
              onClick={() => window.location.href = 'https://suporte.conexaoead.com.br'}
              variant="outline"
              className="flex-1"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Contatar Suporte
            </Button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              Se o problema persistir, entre em contato com o suporte técnico.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}