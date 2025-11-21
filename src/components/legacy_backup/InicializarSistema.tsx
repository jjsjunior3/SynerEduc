import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, Loader2, RefreshCw, Users, AlertTriangle, Zap } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface InicializarSistemaProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InicializarSistema({ onClose, onSuccess }: InicializarSistemaProps) {
  const [iniciando, setIniciando] = useState(false);
  const [etapas, setEtapas] = useState({
    conectividade: 'pending',
    usuarios: 'pending',
    login: 'pending'
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const adicionarLog = (mensagem: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${mensagem}`]);
  };

  const atualizarEtapa = (etapa: keyof typeof etapas, status: 'pending' | 'loading' | 'success' | 'error') => {
    setEtapas(prev => ({ ...prev, [etapa]: status }));
  };

  const inicializarSistema = async () => {
    setIniciando(true);
    setErro(null);
    setLogs([]);
    
    try {
      // Etapa 1: Testar conectividade
      adicionarLog('Testando conectividade com o servidor...');
      atualizarEtapa('conectividade', 'loading');
      
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!healthResponse.ok) {
        throw new Error(`Servidor não responde: HTTP ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      adicionarLog(`Servidor online: ${healthData.message}`);
      atualizarEtapa('conectividade', 'success');

      // Etapa 2: Verificar e criar usuários
      adicionarLog('Verificando usuários existentes...');
      atualizarEtapa('usuarios', 'loading');

      const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/debug/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      let usuariosCount = 0;
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        usuariosCount = debugData.total || 0;
        adicionarLog(`Encontrados ${usuariosCount} usuários no sistema`);
      }

      if (usuariosCount === 0) {
        adicionarLog('Nenhum usuário encontrado, criando usuários de teste...');
        
        const createResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/criar-usuarios-teste`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(`Erro ao criar usuários: ${errorData.error || 'Erro desconhecido'}`);
        }

        const createData = await createResponse.json();
        adicionarLog(`Usuários criados com sucesso: ${createData.usuarios?.length || 5} usuários`);
      } else {
        adicionarLog('Usuários já existem no sistema');
      }

      atualizarEtapa('usuarios', 'success');

      // Etapa 3: Testar login
      adicionarLog('Testando login com usuário de teste...');
      atualizarEtapa('login', 'loading');

      const loginResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'aluno@escola.com',
          senha: '123456'
        })
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(`Teste de login falhou: ${errorData.error || 'Erro desconhecido'}`);
      }

      const loginData = await loginResponse.json();
      if (loginData.success) {
        adicionarLog(`Login de teste bem-sucedido para: ${loginData.usuario.nome}`);
        atualizarEtapa('login', 'success');
        adicionarLog('✅ Sistema inicializado com sucesso!');
        
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error('Login de teste falhou: resposta inválida');
      }

    } catch (error) {
      console.error('Erro na inicialização:', error);
      setErro(error.message);
      adicionarLog(`❌ Erro: ${error.message}`);
      
      // Marcar etapa atual como erro
      if (etapas.conectividade === 'loading') atualizarEtapa('conectividade', 'error');
      else if (etapas.usuarios === 'loading') atualizarEtapa('usuarios', 'error');
      else if (etapas.login === 'loading') atualizarEtapa('login', 'error');
    } finally {
      setIniciando(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Inicializar Sistema AVA
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={iniciando}>
              ✕
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Etapas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(etapas.conectividade)}
                <span className="text-sm font-medium">1. Conectividade</span>
              </div>
              <Badge className={getStatusColor(etapas.conectividade)}>
                {etapas.conectividade === 'pending' && 'Aguardando'}
                {etapas.conectividade === 'loading' && 'Testando...'}
                {etapas.conectividade === 'success' && 'Online'}
                {etapas.conectividade === 'error' && 'Erro'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(etapas.usuarios)}
                <span className="text-sm font-medium">2. Usuários de Teste</span>
              </div>
              <Badge className={getStatusColor(etapas.usuarios)}>
                {etapas.usuarios === 'pending' && 'Aguardando'}
                {etapas.usuarios === 'loading' && 'Criando...'}
                {etapas.usuarios === 'success' && 'Criados'}
                {etapas.usuarios === 'error' && 'Erro'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(etapas.login)}
                <span className="text-sm font-medium">3. Teste de Login</span>
              </div>
              <Badge className={getStatusColor(etapas.login)}>
                {etapas.login === 'pending' && 'Aguardando'}
                {etapas.login === 'loading' && 'Testando...'}
                {etapas.login === 'success' && 'Funcionando'}
                {etapas.login === 'error' && 'Erro'}
              </Badge>
            </div>
          </div>

          {/* Botão de Iniciar */}
          <div className="flex justify-center">
            <Button 
              onClick={inicializarSistema} 
              disabled={iniciando}
              size="lg"
              className="px-8"
            >
              {iniciando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inicializando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Inicializar Sistema
                </>
              )}
            </Button>
          </div>

          {/* Erro */}
          {erro && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <strong>Erro na inicialização:</strong> {erro}
                <div className="mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={inicializarSistema}
                    disabled={iniciando}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Log de Inicialização:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono text-gray-600">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações do Sistema */}
          <div className="text-xs text-gray-600 space-y-1 border-t pt-4">
            <div>Project ID: {projectId}</div>
            <div>Endpoint: functions/v1/make-server-c61d1ad0</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}