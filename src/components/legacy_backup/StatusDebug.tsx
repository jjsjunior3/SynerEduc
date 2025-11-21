import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Settings, 
  Users,
  Loader2
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function StatusDebug() {
  const [status, setStatus] = useState<{
    servidor: 'loading' | 'online' | 'offline';
    usuarios: any[];
    adminsAtivos: number;
    totalUsuarios: number;
    needsSetup: boolean;
    erro?: string;
  }>({
    servidor: 'loading',
    usuarios: [],
    adminsAtivos: 0,
    totalUsuarios: 0,
    needsSetup: true
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    setFixResult(null);

    try {
      // Verificar se servidor está online
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!healthResponse.ok) {
        setStatus(prev => ({ ...prev, servidor: 'offline', erro: `HTTP ${healthResponse.status}` }));
        return;
      }

      setStatus(prev => ({ ...prev, servidor: 'online' }));

      // Buscar informações dos usuários
      const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/debug-usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        setStatus(prev => ({
          ...prev,
          usuarios: debugData.usuarios || [],
          adminsAtivos: debugData.adminsAtivos || 0,
          totalUsuarios: debugData.totalUsuarios || 0,
          needsSetup: debugData.needsSetup || false
        }));
      }

    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setStatus(prev => ({ 
        ...prev, 
        servidor: 'offline', 
        erro: error instanceof Error ? error.message : 'Erro desconhecido' 
      }));
    } finally {
      setIsChecking(false);
    }
  };

  const reativarUsuarios = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/reativar-todos-usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFixResult(`✅ ${data.message}. Total de usuários processados: ${data.totalUsuarios}`);
          // Recarregar status após correção
          setTimeout(() => {
            checkStatus();
          }, 1000);
        } else {
          setFixResult(`❌ Falha: ${data.error}`);
        }
      } else {
        const errorText = await response.text();
        setFixResult(`❌ Erro HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      setFixResult(`❌ Erro de conexão: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsFixing(false);
    }
  };

  const criarAdminPrincipal = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/forcar-reativacao-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFixResult(`✅ ${data.message} (Ação: ${data.action})`);
          // Recarregar status após correção
          setTimeout(() => {
            checkStatus();
          }, 1000);
        } else {
          setFixResult(`❌ Falha: ${data.error || data.message}`);
        }
      } else {
        const errorText = await response.text();
        setFixResult(`❌ Erro HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      setFixResult(`❌ Erro de conexão: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsFixing(false);
    }
  };

  const inicializarSistema = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFixResult(`✅ ${data.message}`);
          // Recarregar status após correção
          setTimeout(() => {
            checkStatus();
          }, 1000);
        } else {
          setFixResult(`❌ Falha: ${data.error || data.message}`);
        }
      } else {
        const errorText = await response.text();
        setFixResult(`❌ Erro HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      setFixResult(`❌ Erro de conexão: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Status do Sistema AVA
        </CardTitle>
        <CardDescription>
          Diagnóstico e correção de problemas do sistema
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status do Servidor */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Status do Servidor
          </h3>
          
          <div className="flex items-center gap-3">
            {status.servidor === 'loading' ? (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Verificando...
              </Badge>
            ) : status.servidor === 'online' ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            
            <Button 
              onClick={checkStatus} 
              disabled={isChecking}
              variant="outline" 
              size="sm"
            >
              {isChecking ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Atualizar
            </Button>
          </div>
          
          {status.erro && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>
                Erro: {status.erro}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Informações dos Usuários */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários do Sistema
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{status.totalUsuarios}</div>
              <div className="text-sm text-blue-600">Total de Usuários</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{status.adminsAtivos}</div>
              <div className="text-sm text-green-600">Admins Ativos</div>
            </div>
            
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {status.usuarios.filter(u => !u.ativo).length}
              </div>
              <div className="text-sm text-orange-600">Usuários Desativados</div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {status.usuarios.filter(u => u.ativo).length}
              </div>
              <div className="text-sm text-purple-600">Usuários Ativos</div>
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        {status.usuarios.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Lista de Usuários</h3>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {status.usuarios.map((usuario, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{usuario.nome}</td>
                      <td className="p-2 text-sm text-gray-600">{usuario.email}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {usuario.tipo}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        {usuario.ativo ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Desativado
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resultado das Correções */}
        {fixResult && (
          <Alert className={fixResult.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={fixResult.includes('✅') ? 'text-green-700' : 'text-red-700'}>
              {fixResult}
            </AlertDescription>
          </Alert>
        )}

        {/* Ações de Correção */}
        <div className="space-y-3">
          <h3 className="font-semibold">Ações de Correção</h3>
          
          <div className="grid gap-3 md:grid-cols-2">
            <Button 
              onClick={reativarUsuarios}
              disabled={isFixing || status.servidor !== 'online'}
              className="flex items-center gap-2 h-12 bg-green-600 hover:bg-green-700"
            >
              {isFixing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Reativar Todos os Usuários
            </Button>

            <Button 
              onClick={criarAdminPrincipal}
              disabled={isFixing || status.servidor !== 'online'}
              variant="outline"
              className="flex items-center gap-2 h-12"
            >
              {isFixing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Criar/Reativar Admin Principal
            </Button>

            <Button 
              onClick={inicializarSistema}
              disabled={isFixing || status.servidor !== 'online'}
              className="flex items-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 md:col-span-2"
            >
              {isFixing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Settings className="w-4 h-4" />
              )}
              Inicializar Sistema Completo (com usuários de teste)
            </Button>
          </div>
        </div>

        {/* Informações de Depuração */}
        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">Informações de Depuração:</h4>
          <div className="space-y-1 font-mono text-xs">
            <p><strong>Project ID:</strong> {projectId}</p>
            <p><strong>Server URL:</strong> https://{projectId}.supabase.co/functions/v1/make-server-c61d1ad0/</p>
            <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
            <p><strong>Precisa Setup:</strong> {status.needsSetup ? 'Sim' : 'Não'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}