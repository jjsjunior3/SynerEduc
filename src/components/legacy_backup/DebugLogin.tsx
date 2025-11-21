import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, RefreshCw, Users, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DebugLoginProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  senha: string;
}

export function DebugLogin({ onVoltar }: DebugLoginProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingLogin, setTestingLogin] = useState<string | null>(null);

  const verificarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/debug/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar usuários');
      }

      const data = await response.json();
      setUsuarios(data.usuarios || []);
      toast.success(`${data.total} usuários encontrados`);
    } catch (error) {
      console.error('Erro ao verificar usuários:', error);
      toast.error('Erro ao verificar usuários');
    } finally {
      setLoading(false);
    }
  };

  const resetarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/debug/reset-usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao resetar usuários');
      }

      const data = await response.json();
      toast.success(data.message);
      
      // Recarregar lista
      await verificarUsuarios();
    } catch (error) {
      console.error('Erro ao resetar usuários:', error);
      toast.error('Erro ao resetar usuários');
    } finally {
      setLoading(false);
    }
  };

  const testarLogin = async (email: string, senha: string) => {
    setTestingLogin(email);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, senha })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`Login bem-sucedido para ${email}`);
      } else {
        toast.error(`Falha no login: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao testar login:', error);
      toast.error('Erro ao testar login');
    } finally {
      setTestingLogin(null);
    }
  };

  const getTipoCor = (tipo: string) => {
    switch (tipo) {
      case 'aluno':
        return 'bg-blue-100 text-blue-800';
      case 'professor':
        return 'bg-green-100 text-green-800';
      case 'coordenador':
        return 'bg-orange-100 text-orange-800';
      case 'administrador':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Debug do Sistema de Login</h1>
            <p className="text-sm text-gray-600">Verificar e testar usuários no sistema</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Controles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Controles de Debug
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  onClick={verificarUsuarios}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Verificar Usuários
                </Button>
                
                <Button 
                  onClick={resetarUsuarios}
                  disabled={loading}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Resetar e Recriar Usuários
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários no Sistema ({usuarios.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {usuarios.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum usuário encontrado. Clique em "Verificar Usuários" para carregar.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {usuarios.map((usuario) => (
                    <div key={usuario.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{usuario.nome}</h3>
                            <p className="text-sm text-gray-600">{usuario.email}</p>
                            <p className="text-xs text-gray-500">ID: {usuario.id}</p>
                          </div>
                          <Badge className={getTipoCor(usuario.tipo)}>
                            {usuario.tipo}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              Senha: {usuario.senha}
                            </p>
                          </div>
                          
                          <Button 
                            size="sm"
                            onClick={() => testarLogin(usuario.email, usuario.senha)}
                            disabled={testingLogin === usuario.email}
                          >
                            {testingLogin === usuario.email ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Testando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Testar Login
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Informações de Debug
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Usuários Padrão de Teste:</h4>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• <strong>Aluno:</strong> aluno@escola.com / 123456</li>
                    <li>• <strong>Professor:</strong> professor@escola.com / 123456</li>
                    <li>• <strong>Coordenador:</strong> coordenador@escola.com / 123456</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Como resolver problemas de login:</h4>
                  <ol className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>1. Clique em "Verificar Usuários" para ver se existem usuários</li>
                    <li>2. Se não houver usuários, clique em "Resetar e Recriar Usuários"</li>
                    <li>3. Teste o login de cada usuário usando o botão "Testar Login"</li>
                    <li>4. Se o teste funcionar, o problema está no frontend</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}