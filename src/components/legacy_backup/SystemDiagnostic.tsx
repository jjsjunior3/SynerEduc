import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface SystemStatus {
  serverOnline: boolean;
  needsSetup: boolean;
  totalUsuarios: number;
  adminsAtivos: number;
  usuarios: any[];
  lastCheck: string;
}

export function SystemDiagnostic() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const checkSystemStatus = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Test server connectivity
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const serverOnline = healthResponse.ok;

      if (!serverOnline) {
        setStatus({
          serverOnline: false,
          needsSetup: true,
          totalUsuarios: 0,
          adminsAtivos: 0,
          usuarios: [],
          lastCheck: new Date().toISOString()
        });
        return;
      }

      // Get debug info
      const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/debug-usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        
        setStatus({
          serverOnline: true,
          needsSetup: debugData.needsSetup,
          totalUsuarios: debugData.totalUsuarios,
          adminsAtivos: debugData.adminsAtivos,
          usuarios: debugData.usuarios,
          lastCheck: new Date().toISOString()
        });
      } else {
        throw new Error('Failed to get debug info');
      }

    } catch (error) {
      console.error('Error checking system status:', error);
      setError(`Erro ao verificar status: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSystem = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/reset-sistema`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Sistema resetado! ${data.usuariosDeletados} usuários deletados.`);
        checkSystemStatus(); // Refresh status
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no reset do sistema');
      }
    } catch (error) {
      console.error('Error resetting system:', error);
      setError(`Erro no reset: ${error.message}`);
      toast.error('Erro no reset do sistema');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSystem = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        checkSystemStatus(); // Refresh status
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na inicialização');
      }
    } catch (error) {
      console.error('Error initializing system:', error);
      setError(`Erro na inicialização: ${error.message}`);
      toast.error('Erro na inicialização do sistema');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Diagnóstico do Sistema AVA
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-500/20 border-red-500/30">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-white">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={checkSystemStatus} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Verificar Status
              </Button>
              
              <Button 
                onClick={initializeSystem} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                Inicializar Sistema
              </Button>
              
              <Button 
                onClick={resetSystem} 
                disabled={isLoading}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Reset Completo
              </Button>
            </div>

            {status && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Status do Servidor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      {status.serverOnline ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="text-white">
                        Servidor: {status.serverOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={status.needsSetup ? "destructive" : "default"}>
                        {status.needsSetup ? 'Precisa Setup' : 'Configurado'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-300">
                      Última verificação: {new Date(status.lastCheck).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Usuários</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-white">
                      <div>Total: {status.totalUsuarios}</div>
                      <div>Admins Ativos: {status.adminsAtivos}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {status?.usuarios && status.usuarios.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Lista de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {status.usuarios.map((usuario, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                        <div className="text-white">
                          <div className="font-medium">{usuario.nome}</div>
                          <div className="text-sm text-gray-300">{usuario.email}</div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={usuario.ativo ? "default" : "secondary"}>
                            {usuario.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Badge variant="outline" className="text-white border-white/20">
                            {usuario.tipo}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Credenciais de Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-white text-sm space-y-2">
                  <div><strong>Admin:</strong> admin@escola.com / 123456</div>
                  <div><strong>Professor:</strong> professor@escola.com / 123456</div>
                  <div><strong>Aluno:</strong> aluno@escola.com / 123456</div>
                  <div><strong>Coordenador:</strong> coordenador@escola.com / 123456</div>
                  <div><strong>Conteudista:</strong> conteudista@escola.com / 123456</div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}