import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  User,
  Loader2,
  RefreshCcw,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoEmergencialLoginProps {
  onVoltar: () => void;
}

export function CorrecaoEmergencialLogin({ onVoltar }: CorrecaoEmergencialLoginProps) {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('jrsantosdev1@gmail.com');
  const [testPassword, setTestPassword] = useState('Jvni0R@87');
  const [testUsername, setTestUsername] = useState('admin.principal');
  const [resultados, setResultados] = useState<any[]>([]);

  const adicionarResultado = (teste: string, status: 'sucesso' | 'erro', detalhes: any) => {
    setResultados(prev => [...prev, {
      teste,
      status,
      detalhes,
      timestamp: new Date().toISOString()
    }]);
  };

  const testarConectividade = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        adicionarResultado('Conectividade', 'sucesso', data);
        return true;
      } else {
        adicionarResultado('Conectividade', 'erro', `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      adicionarResultado('Conectividade', 'erro', error.message);
      return false;
    }
  };

  const testarLoginEmail = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          senha: testPassword
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        adicionarResultado('Login por Email', 'sucesso', data);
        return true;
      } else {
        adicionarResultado('Login por Email', 'erro', data);
        return false;
      }
    } catch (error) {
      adicionarResultado('Login por Email', 'erro', error.message);
      return false;
    }
  };

  const testarLoginNomeUsuario = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nomeUsuario: testUsername,
          senha: testPassword
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        adicionarResultado('Login por Nome de Usuário', 'sucesso', data);
        return true;
      } else {
        adicionarResultado('Login por Nome de Usuário', 'erro', data);
        return false;
      }
    } catch (error) {
      adicionarResultado('Login por Nome de Usuário', 'erro', error.message);
      return false;
    }
  };

  const verificarUsuarios = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const usuarios = data.usuarios || [];
        
        const stats = {
          total: usuarios.length,
          comNomeUsuario: usuarios.filter((u: any) => u.nomeUsuario).length,
          semNomeUsuario: usuarios.filter((u: any) => !u.nomeUsuario).length,
          admins: usuarios.filter((u: any) => u.tipo === 'administrador').length
        };
        
        adicionarResultado('Verificação de Usuários', 'sucesso', stats);
        return true;
      } else {
        adicionarResultado('Verificação de Usuários', 'erro', `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      adicionarResultado('Verificação de Usuários', 'erro', error.message);
      return false;
    }
  };

  const corrigirAdminPrincipal = async () => {
    try {
      // Primeiro, verificar se existe
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const adminPrincipal = data.usuarios?.find((u: any) => u.email === 'jrsantosdev1@gmail.com');
        
        if (adminPrincipal) {
          // Atualizar com nome de usuário se não tiver
          if (!adminPrincipal.nomeUsuario) {
            const updateResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${adminPrincipal.id}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  nomeUsuario: 'admin.principal'
                })
              }
            );

            if (updateResponse.ok) {
              adicionarResultado('Correção Admin Principal', 'sucesso', 'Nome de usuário adicionado');
            } else {
              const errorData = await updateResponse.json();
              adicionarResultado('Correção Admin Principal', 'erro', errorData);
            }
          } else {
            adicionarResultado('Correção Admin Principal', 'sucesso', 'Admin já possui nome de usuário');
          }
        } else {
          // Criar admin principal
          const createResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              nome: 'Administrador Principal',
              nomeUsuario: 'admin.principal',
              email: 'jrsantosdev1@gmail.com',
              senha: 'Jvni0R@87',
              tipo: 'administrador'
            })
          });

          if (createResponse.ok) {
            adicionarResultado('Correção Admin Principal', 'sucesso', 'Admin criado com sucesso');
          } else {
            const errorData = await createResponse.json();
            adicionarResultado('Correção Admin Principal', 'erro', errorData);
          }
        }
      }
    } catch (error) {
      adicionarResultado('Correção Admin Principal', 'erro', error.message);
    }
  };

  const executarDiagnosticoCompleto = async () => {
    setLoading(true);
    setResultados([]);

    try {
      toast.info('Iniciando diagnóstico completo...');
      
      // 1. Testar conectividade
      await testarConectividade();
      
      // 2. Verificar usuários
      await verificarUsuarios();
      
      // 3. Testar login por email
      await testarLoginEmail();
      
      // 4. Testar login por nome de usuário  
      await testarLoginNomeUsuario();
      
      // 5. Corrigir admin principal se necessário
      await corrigirAdminPrincipal();
      
      toast.success('Diagnóstico completo concluído!');
      
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast.error('Erro durante o diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-red-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">🚨 Correção Emergencial - Sistema de Login</h1>
            <p className="text-sm opacity-90">Diagnóstico e correção dos problemas de autenticação</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Card de controles */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Diagnóstico Emergencial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Email de Teste</Label>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email para teste"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Nome de Usuário de Teste</Label>
                <Input
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  placeholder="Nome de usuário para teste"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Senha de Teste</Label>
                <Input
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  placeholder="Senha para teste"
                  type="password"
                />
              </div>
            </div>

            <Button 
              onClick={executarDiagnosticoCompleto}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Executando Diagnóstico...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5 mr-2" />
                  Executar Diagnóstico Completo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Resultados do Diagnóstico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      resultado.status === 'sucesso'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {resultado.status === 'sucesso' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <h3 className="font-medium">{resultado.teste}</h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        resultado.status === 'sucesso'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {resultado.status === 'sucesso' ? 'SUCESSO' : 'ERRO'}
                      </span>
                    </div>
                    
                    <div className="text-sm bg-white p-3 rounded border">
                      <pre className="whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(resultado.detalhes, null, 2)}
                      </pre>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(resultado.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Instruções de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>1. Diagnóstico Completo:</strong> Testa conectividade, usuários e login</p>
              <p><strong>2. Credenciais Padrão:</strong> admin.principal / Jvni0R@87</p>
              <p><strong>3. Se houver erros:</strong> Verifique os detalhes nos resultados</p>
              <p><strong>4. Após correções:</strong> Execute o diagnóstico novamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}