import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CheckCircle, AlertTriangle, User, Shield, Settings, RefreshCw, Trash2, Database } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  serie?: string;
  turma?: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: string;
}

export function CorrecaoDefinitivaTipoUsuario() {
  const [email, setEmail] = useState('jrsantosdev1@gmail.com');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: diagnóstico, 2: correção, 3: verificação, 4: sucesso
  const [cacheLimpo, setCacheLimpo] = useState(false);
  const [diagnostico, setDiagnostico] = useState<any>(null);

  // Limpar cache local primeiro
  const limparCacheLocal = () => {
    try {
      localStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_user');
      localStorage.removeItem('user_data');
      sessionStorage.removeItem('user_data');
      // Limpar outros possíveis caches
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('user') || key.includes('auth') || key.includes('login')) {
          localStorage.removeItem(key);
        }
      });
      setCacheLimpo(true);
      setMessage('Cache local limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      setError('Erro ao limpar cache local');
    }
  };

  // Diagnóstico completo do usuário
  const executarDiagnostico = async () => {
    if (!email.trim()) {
      setError('Por favor, digite um email');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('Executando diagnóstico completo...');

    try {
      console.log('[DIAGNOSTICO] Iniciando diagnóstico para:', email);

      // Buscar todos os usuários para análise
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const todosUsuarios = data.usuarios || [];
        
        // Buscar usuario específico
        const usuarioEncontrado = todosUsuarios.find((u: Usuario) => u.email === email);
        
        // Buscar possíveis duplicatas
        const duplicatas = todosUsuarios.filter((u: Usuario) => u.email === email);
        
        // Buscar usuários admin
        const admins = todosUsuarios.filter((u: Usuario) => u.tipo === 'administrador');
        
        const diagnosticoData = {
          usuarioEncontrado,
          totalUsuarios: todosUsuarios.length,
          duplicatas: duplicatas.length,
          listaAdmin: admins,
          emailProcurado: email,
          statusCache: cacheLimpo ? 'Limpo' : 'Não limpo'
        };

        setDiagnostico(diagnosticoData);

        if (usuarioEncontrado) {
          setUsuario(usuarioEncontrado);
          setStep(2);
          setMessage(`Diagnóstico concluído. Usuário encontrado: ${usuarioEncontrado.nome} (${usuarioEncontrado.tipo})`);
        } else {
          setError('Usuário não encontrado no sistema durante diagnóstico');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        setError(errorData.error || 'Erro ao executar diagnóstico');
      }
    } catch (error) {
      console.error('[DIAGNOSTICO] Erro:', error);
      setError('Erro de conexão durante diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  // Correção de emergência (nova rota específica)
  const executarCorrecaoEmergencia = async () => {
    setLoading(true);
    setError('');
    setMessage('Executando correção de emergência...');

    try {
      console.log('[CORRECAO_EMERGENCIA] Chamando rota de emergência...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/emergency/fix-admin-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[CORRECAO_EMERGENCIA] Resposta da emergência:', data);
        
        if (data.success) {
          setUsuario(data.usuario);
          setStep(4);
          setMessage(`Correção de emergência concluída! ${data.message}`);
        } else {
          setError(data.error || 'Erro na correção de emergência');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro de resposta' }));
        setError(`Erro na correção de emergência: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('[CORRECAO_EMERGENCIA] Erro:', error);
      setError('Erro de conexão durante correção de emergência');
    } finally {
      setLoading(false);
    }
  };

  // Correção forçada do tipo de usuário
  const executarCorrecaoForcada = async () => {
    if (!usuario) return;

    setLoading(true);
    setError('');
    setMessage('Executando correção forçada...');

    try {
      console.log('[CORRECAO_FORCADA] Corrigindo usuário:', usuario.id);

      // Primeiro, tentar a rota padrão
      const dadosCorrecao = {
        tipo: 'administrador',
        serie: null,
        turma: null,
        ativo: true
      };

      let response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosCorrecao)
        }
      );

      // Se falhar, tentar rota alternativa
      if (!response.ok) {
        console.log('[CORRECAO_FORCADA] Tentando rota alternativa...');
        response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/user/${usuario.id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosCorrecao)
          }
        );
      }

      if (response.ok) {
        const data = await response.json();
        console.log('[CORRECAO_FORCADA] Usuário corrigido:', data);
        
        setUsuario(data.usuario);
        setStep(3);
        setMessage('Correção forçada executada! Iniciando verificação...');
        
        // Verificar imediatamente se a correção funcionou
        setTimeout(() => {
          verificarCorrecao();
        }, 1000);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        setError(`Erro na correção forçada: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('[CORRECAO_FORCADA] Erro:', error);
      setError('Erro de conexão durante correção forçada');
    } finally {
      setLoading(false);
    }
  };

  // Verificar se a correção funcionou
  const verificarCorrecao = async () => {
    setLoading(true);
    setMessage('Verificando correção...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const usuarioVerificado = data.usuarios?.find((u: Usuario) => u.email === email);

        if (usuarioVerificado && usuarioVerificado.tipo === 'administrador') {
          setUsuario(usuarioVerificado);
          setStep(4);
          setMessage('Verificação concluída! Correção aplicada com sucesso.');
        } else {
          setError('Verificação falhou. O tipo de usuário não foi alterado corretamente.');
          setStep(2); // Voltar para tentar novamente
        }
      } else {
        setError('Erro durante verificação');
      }
    } catch (error) {
      console.error('[VERIFICACAO] Erro:', error);
      setError('Erro de conexão durante verificação');
    } finally {
      setLoading(false);
    }
  };

  // Forçar logout completo
  const forcarLogoutCompleto = () => {
    // Limpar todos os dados de autenticação
    localStorage.clear();
    sessionStorage.clear();
    
    // Recarregar a página
    setMessage('Logout forçado executado. Redirecionando...');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  const reiniciarProcesso = () => {
    setStep(1);
    setUsuario(null);
    setDiagnostico(null);
    setMessage('');
    setError('');
    setCacheLimpo(false);
  };

  const getStepIcon = (stepNumber: number) => {
    if (step > stepNumber) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (step === stepNumber) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    return <div className="h-5 w-5 bg-gray-200 rounded-full" />;
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'administrador': return 'bg-red-100 text-red-800';
      case 'professor': return 'bg-blue-100 text-blue-800';
      case 'coordenador': return 'bg-purple-100 text-purple-800';
      case 'aluno': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Auto-limpar cache ao iniciar
  useEffect(() => {
    if (!cacheLimpo) {
      limparCacheLocal();
    }
  }, [cacheLimpo]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-2xl">Correção Definitiva de Tipo de Usuário</CardTitle>
              <CardDescription>
                Diagnóstico completo e correção forçada do tipo de usuário
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStepIcon(1)}
              <span className={step >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                Diagnóstico
              </span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(2)}
              <span className={step >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                Correção Forçada
              </span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(3)}
              <span className={step >= 3 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                Verificação
              </span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(4)}
              <span className={step >= 4 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                Concluído
              </span>
            </div>
          </div>

          <Separator />

          {/* Status do Cache */}
          <Alert className={cacheLimpo ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <Trash2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Status do Cache:</strong> {cacheLimpo ? 'Limpo automaticamente' : 'Aguardando limpeza'}
            </AlertDescription>
          </Alert>

          {/* Step 1: Diagnóstico */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do usuário para diagnóstico
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o email do usuário"
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={executarDiagnostico} 
                  disabled={loading || !email.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Executando Diagnóstico...' : 'Executar Diagnóstico Completo'}
                </Button>
                
                <div className="text-center">
                  <span className="text-sm text-gray-500">ou</span>
                </div>
                
                <Button 
                  onClick={executarCorrecaoEmergencia} 
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700"
                  variant="destructive"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Executando Emergência...' : 'Correção de Emergência Direta'}
                </Button>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Correção de Emergência:</strong> Use se o diagnóstico falhar. Esta opção corrige diretamente o email jrsantosdev1@gmail.com para administrador.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Step 2: Correção */}
          {step === 2 && usuario && diagnostico && (
            <div className="space-y-4">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Diagnóstico concluído:</strong> {usuario.nome} ({usuario.email})
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-gray-900">Dados do diagnóstico:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Tipo atual:</span>
                    <Badge className={`ml-2 ${getTipoBadgeColor(usuario.tipo)}`}>
                      {usuario.tipo}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Total de usuários:</span>
                    <span className="ml-2 font-medium">{diagnostico.totalUsuarios}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duplicatas encontradas:</span>
                    <span className="ml-2 font-medium">{diagnostico.duplicatas}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Admins no sistema:</span>
                    <span className="ml-2 font-medium">{diagnostico.listaAdmin.length}</span>
                  </div>
                  {usuario.serie && (
                    <div>
                      <span className="text-gray-500">Série:</span>
                      <span className="ml-2 font-medium">{usuario.serie}</span>
                    </div>
                  )}
                  {usuario.turma && (
                    <div>
                      <span className="text-gray-500">Turma:</span>
                      <span className="ml-2 font-medium">{usuario.turma}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Correção que será aplicada:</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• <strong>Tipo:</strong> {usuario.tipo} → <strong>administrador</strong></li>
                  {usuario.serie && <li>• <strong>Série:</strong> {usuario.serie} → <strong>(removida)</strong></li>}
                  {usuario.turma && <li>• <strong>Turma:</strong> {usuario.turma} → <strong>(removida)</strong></li>}
                  <li>• <strong>Status:</strong> Garantir que está ativo</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={executarCorrecaoForcada} 
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Executando Correção...' : 'Executar Correção Forçada'}
                </Button>
                <Button 
                  onClick={reiniciarProcesso}
                  variant="outline"
                  disabled={loading}
                >
                  Reiniciar
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Verificação */}
          {step === 3 && (
            <div className="space-y-4">
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <strong>Verificando correção...</strong> Aguarde enquanto confirmamos se a alteração foi aplicada.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 4: Sucesso */}
          {step === 4 && usuario && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Correção aplicada com sucesso!</strong> O tipo de usuário foi alterado definitivamente.
                </AlertDescription>
              </Alert>

              <div className="bg-green-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-green-900">Informações finais:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nome:</span>
                    <span className="ml-2 font-medium">{usuario.nome}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{usuario.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <Badge className={`ml-2 ${getTipoBadgeColor(usuario.tipo)}`}>
                      {usuario.tipo}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <Badge className="ml-2 bg-green-100 text-green-800">
                      Ativo
                    </Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Próximo passo obrigatório:</strong> Execute o logout completo abaixo para aplicar as mudanças.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  onClick={forcarLogoutCompleto}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Fazer Logout Completo
                </Button>
                <Button 
                  onClick={reiniciarProcesso}
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Corrigir Outro
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          {message && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Debug info */}
          {diagnostico && (
            <details className="bg-gray-100 p-4 rounded-lg">
              <summary className="cursor-pointer font-medium text-gray-700">
                Informações de Debug (clique para expandir)
              </summary>
              <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                {JSON.stringify(diagnostico, null, 2)}
              </pre>
            </details>
          )}

          {/* Voltar ao sistema */}
          <Separator />
          <div className="flex justify-center">
            <Button 
              onClick={() => window.location.href = '/'}
              variant="ghost"
              size="sm"
            >
              ← Voltar ao Sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}