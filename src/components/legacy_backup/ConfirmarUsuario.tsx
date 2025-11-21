import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, User, Mail, Calendar, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ConfirmarUsuarioProps {
  onVoltar: () => void;
}

export function ConfirmarUsuario({ onVoltar }: ConfirmarUsuarioProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
  const [reativando, setReativando] = useState(false);
  const { usuario } = useAuth();

  const formatarData = (dataString: string) => {
    if (!dataString) return 'Não informado';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'administrador':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'coordenador':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'professor':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'professor_conteudista':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'aluno':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'administrador':
        return 'Administrador do Sistema';
      case 'coordenador':
        return 'Coordenador';
      case 'professor':
        return 'Professor';
      case 'professor_conteudista':
        return 'Professor Conteudista';
      case 'aluno':
        return 'Aluno';
      default:
        return tipo || 'Tipo não definido';
    }
  };

  const confirmarUsuario = async () => {
    setLoading(true);
    setError(null);

    try {
      // Primeiro, tentar buscar informações do usuário atual
      if (usuario) {
        console.log('Usuário logado encontrado:', usuario);
        setUsuarioAtual(usuario);
        setLoading(false);
        return;
      }

      // Se não há usuário logado, tentar uma verificação básica
      console.log('Verificando configuração do sistema...');
      
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (healthResponse.ok) {
        // Verificar status do usuário administrador
        console.log('Verificando status do administrador principal...');
        
        const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/debug-usuarios`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          const adminPrincipal = debugData.usuarios.find(u => u.email === 'jrsantosdev1@gmail.com');
          
          setUsuarioAtual({
            sistema_configurado: true,
            servidor_online: true,
            admin_encontrado: !!adminPrincipal,
            admin_ativo: adminPrincipal?.ativo,
            total_usuarios: debugData.totalUsuarios,
            admins_ativos: debugData.adminsAtivos,
            admin_principal: adminPrincipal,
            message: 'Sistema funcionando normalmente'
          });
        } else {
          throw new Error('Erro ao verificar usuários');
        }
      } else {
        throw new Error('Servidor não está respondendo');
      }

    } catch (error) {
      console.error('Erro ao confirmar usuário:', error);
      setError(error.message || 'Erro ao verificar usuário');
      
      // Fallback: mostrar informações básicas disponíveis
      setUsuarioAtual({
        sistema_configurado: false,
        servidor_online: false,
        error: error.message,
        usuario_conhecido: 'jrsantosdev1@gmail.com (usuário principal configurado)'
      });
    } finally {
      setLoading(false);
    }
  };

  const reativarAdministrador = async () => {
    setReativando(true);
    setError(null);

    try {
      console.log('Reativando administrador principal...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/reativar-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Administrador reativado:', data);
        
        // Recarregar informações
        await confirmarUsuario();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao reativar administrador:', error);
      setError(`Erro ao reativar: ${error.message}`);
    } finally {
      setReativando(false);
    }
  };

  useEffect(() => {
    confirmarUsuario();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Verificando usuário cadastrado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Confirmar Usuário Cadastrado</h1>
            <p className="text-sm text-gray-600">Verificação do usuário atual do sistema</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Usuário Logado */}
        {usuario && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Usuário Logado Atualmente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{usuario.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{usuario.email}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo de Usuário</label>
                    <div className="mt-1">
                      <Badge className={getTipoColor(usuario.tipo)}>
                        <Shield className="w-3 h-3 mr-1" />
                        {getTipoLabel(usuario.tipo)}
                      </Badge>
                    </div>
                  </div>
                  
                  {usuario.serie_escolar && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Série Escolar</label>
                      <div className="mt-1 text-gray-900">{usuario.serie_escolar}</div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">ID do Usuário</label>
                    <div className="mt-1 text-sm text-gray-500 font-mono">{usuario.id}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações do Sistema */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Usuário Principal Configurado</label>
                  <div className="mt-1 text-gray-900">jrsantosdev1@gmail.com</div>
                  <div className="text-xs text-gray-500 mt-1">Administrador principal do sistema</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Senha Configurada</label>
                  <div className="mt-1 text-gray-900">Jvni0R@87</div>
                  <div className="text-xs text-gray-500 mt-1">Use essas credenciais para login</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Project ID</label>
                  <div className="mt-1 text-sm text-gray-500 font-mono">{projectId}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Status da Configuração</label>
                  <div className="mt-1">
                    {projectId !== 'SEU_PROJECT_ID_AQUI' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configurado
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Não Configurado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status do Servidor */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status do Servidor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usuarioAtual?.sistema_configurado !== undefined && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Sistema Configurado</span>
                    <Badge className={usuarioAtual.sistema_configurado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {usuarioAtual.sistema_configurado ? (
                        <><CheckCircle className="w-3 h-3 mr-1" />Sim</>
                      ) : (
                        <><AlertCircle className="w-3 h-3 mr-1" />Não</>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Servidor Online</span>
                    <Badge className={usuarioAtual.servidor_online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {usuarioAtual.servidor_online ? (
                        <><CheckCircle className="w-3 h-3 mr-1" />Online</>
                      ) : (
                        <><AlertCircle className="w-3 h-3 mr-1" />Offline</>
                      )}
                    </Badge>
                  </div>

                  {usuarioAtual.admin_encontrado !== undefined && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Admin Principal Encontrado</span>
                        <Badge className={usuarioAtual.admin_encontrado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {usuarioAtual.admin_encontrado ? (
                            <><CheckCircle className="w-3 h-3 mr-1" />Sim</>
                          ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" />Não</>
                          )}
                        </Badge>
                      </div>

                      {usuarioAtual.admin_encontrado && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Admin Principal Ativo</span>
                          <Badge className={usuarioAtual.admin_ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {usuarioAtual.admin_ativo ? (
                              <><CheckCircle className="w-3 h-3 mr-1" />Ativo</>
                            ) : (
                              <><AlertCircle className="w-3 h-3 mr-1" />Inativo</>
                            )}
                          </Badge>
                        </div>
                      )}

                      {usuarioAtual.total_usuarios !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Total de Usuários</span>
                          <Badge className="bg-blue-100 text-blue-800">
                            {usuarioAtual.total_usuarios}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Erro de Conexão</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              )}

              {/* Botão para reativar administrador */}
              {usuarioAtual?.admin_encontrado && !usuarioAtual?.admin_ativo && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Administrador Inativo</span>
                  </div>
                  <p className="text-sm text-orange-600 mb-3">
                    O administrador principal está inativo. Clique no botão abaixo para reativá-lo.
                  </p>
                  <Button
                    onClick={reativarAdministrador}
                    disabled={reativando}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {reativando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reativando...
                      </>
                    ) : (
                      'Reativar Administrador'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Para fazer login:</strong> Use o email <code className="bg-gray-100 px-1 rounded">jrsantosdev1@gmail.com</code> 
                {' '}com a senha <code className="bg-gray-100 px-1 rounded">Jvni0R@87</code>
              </p>
              <p>
                <strong>Criação de novos usuários:</strong> Após fazer login como administrador, 
                você pode criar outros usuários através do painel administrativo.
              </p>
              <p>
                <strong>Tipos de usuário disponíveis:</strong> Aluno, Professor, Coordenador, Administrador e Professor Conteudista.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}