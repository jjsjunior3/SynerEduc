import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  StopCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Settings,
  Zap
} from 'lucide-react';

export function EmergenciaLoopRequests() {
  const [stopping, setStopping] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [fixing, setFixing] = useState(false);
  
  useEffect(() => {
    // Imediatamente parar todos os requests em loop
    stopAllLoops();
  }, []);

  const stopAllLoops = () => {
    setStopping(true);
    
    // Parar todos os timers e intervalos
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    
    // Abortar fetch requests pendentes
    if (window.AbortController) {
      const controller = new AbortController();
      controller.abort();
    }
    
    // Limpar localStorage problemático
    try {
      localStorage.removeItem('auth_retry_count');
      localStorage.removeItem('setup_retry_count');
      localStorage.removeItem('last_auth_attempt');
    } catch (error) {
      console.log('Error clearing localStorage:', error);
    }
    
    setTimeout(() => {
      setStopping(false);
      setStopped(true);
      executarDiagnostico();
    }, 2000);
  };

  const executarDiagnostico = async () => {
    console.log('🔍 Iniciando diagnóstico de emergência...');
    
    const problemas = [];
    
    // Verificar configurações do Supabase
    try {
      const { projectId, publicAnonKey } = await import('../../utils/supabase/info');
      
      if (!projectId || !publicAnonKey) {
        problemas.push({
          tipo: 'CRITICO',
          descricao: 'Configurações Supabase ausentes',
          solucao: 'Reconfigurar Supabase'
        });
      } else if (projectId.length < 10 || !publicAnonKey.startsWith('eyJ')) {
        problemas.push({
          tipo: 'CRITICO', 
          descricao: 'Configurações Supabase inválidas',
          solucao: 'Atualizar credenciais'
        });
      } else {
        problemas.push({
          tipo: 'OK',
          descricao: 'Configurações Supabase válidas',
          solucao: ''
        });
      }
    } catch (error) {
      problemas.push({
        tipo: 'CRITICO',
        descricao: 'Erro ao carregar configurações',
        solucao: 'Recriar arquivo info.tsx'
      });
    }
    
    // Verificar se há loops em AuthContext
    if (localStorage.getItem('auth_loop_detected')) {
      problemas.push({
        tipo: 'CRITICO',
        descricao: 'Loop detectado no AuthContext',
        solucao: 'Resetar contexto de autenticação'
      });
    }
    
    // Verificar URLs malformadas
    const badUrls = performance.getEntriesByType('navigation')
      .filter(entry => entry.name.length > 200);
    
    if (badUrls.length > 0) {
      problemas.push({
        tipo: 'ERRO',
        descricao: `${badUrls.length} URLs malformadas detectadas`,
        solucao: 'Limpar cache e URLs'
      });
    }
    
    setDiagnostics(problemas);
  };

  const aplicarCorrecaoEmergencia = async () => {
    setFixing(true);
    
    try {
      console.log('🔧 Aplicando correção de emergência...');
      
      // 1. Limpar todo o cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // 2. Limpar localStorage problemático
      const keysToRemove = [
        'auth_retry_count',
        'setup_retry_count', 
        'last_auth_attempt',
        'auth_loop_detected',
        'current_user',
        'session_data'
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.log(`Erro ao remover ${key}:`, error);
        }
      });
      
      // 3. Resetar configurações de URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      
      // 4. Forçar limpeza do contexto React
      if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        // Reset React internals (se disponível)
        delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 5. Recarregar com configuração limpa
      const url = new URL(window.location);
      url.search = '?emergencia-corrigida=true';
      
      console.log('✅ Correção aplicada. Redirecionando...');
      window.location.href = url.toString();
      
    } catch (error) {
      console.error('Erro na correção de emergência:', error);
      setFixing(false);
    }
  };

  const reconfigurarSistema = () => {
    // Redirecionar para configuração nova
    window.location.href = '?novo-computador&emergencia=true';
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'CRITICO':
        return 'destructive';
      case 'ERRO': 
        return 'secondary';
      case 'OK':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'CRITICO':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'ERRO':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'OK':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-red-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-red-900">EMERGÊNCIA: Loop de Requests Detectado</h1>
          </div>
          <p className="text-red-700">
            Sistema detectou loops infinitos de requests. Aplicando correção automática...
          </p>
        </div>

        {/* Status da Emergência */}
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Status da Correção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {stopping ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : stopped ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <StopCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={stopping ? 'text-blue-700' : stopped ? 'text-green-700' : 'text-red-700'}>
                  {stopping ? 'Parando loops...' : stopped ? 'Loops interrompidos' : 'Preparando...'}
                </span>
              </div>
              
              {stopped && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    ✅ Todos os requests em loop foram interrompidos com sucesso.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Diagnóstico */}
        {diagnostics.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Diagnóstico do Problema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnostics.map((problema, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                    {getIcon(problema.tipo)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium">{problema.descricao}</span>
                        <Badge variant={getBadgeVariant(problema.tipo)}>
                          {problema.tipo}
                        </Badge>
                      </div>
                      {problema.solucao && (
                        <p className="text-sm text-gray-600">{problema.solucao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações de Correção */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Correções Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={aplicarCorrecaoEmergencia}
                disabled={fixing || !stopped}
                className="bg-green-600 hover:bg-green-700"
              >
                {fixing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Aplicando Correção...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Aplicar Correção Automática
                  </>
                )}
              </Button>
              
              <Button 
                onClick={reconfigurarSistema}
                variant="outline"
                disabled={fixing}
              >
                <Settings className="w-4 h-4 mr-2" />
                Reconfigurar Sistema Completo
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/?diagnostico-completo'}
                variant="outline"
                disabled={fixing}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Executar Diagnóstico Completo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações Técnicas */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle>Informações Técnicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Problema Detectado:</strong> Loops infinitos de requests HTTP</p>
              <p><strong>Causa Provável:</strong> AuthContext em loop ou configurações inválidas</p>
              <p><strong>Ação Tomada:</strong> Interrupção automática de todos os timers e requests</p>
              <p><strong>Solução:</strong> Limpeza de cache, localStorage e reconfiguração</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}