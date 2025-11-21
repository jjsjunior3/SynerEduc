import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CheckCircle, AlertTriangle, User, Shield, Settings, RefreshCw } from 'lucide-react';
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

interface CorrecaoTipoUsuarioProps {
  onFechar?: () => void;
}

export function CorrecaoTipoUsuario({ onFechar }: CorrecaoTipoUsuarioProps) {
  const [email, setEmail] = useState('jrsantosdev1@gmail.com');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: buscar, 2: confirmar, 3: sucesso

  const buscarUsuario = async () => {
    if (!email.trim()) {
      setError('Por favor, digite um email');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('[CORRECAO_TIPO] Buscando usuário:', email);

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
        const usuarioEncontrado = data.usuarios?.find((u: Usuario) => u.email === email);

        if (usuarioEncontrado) {
          setUsuario(usuarioEncontrado);
          setStep(2);
          setMessage(`Usuário encontrado: ${usuarioEncontrado.nome} (${usuarioEncontrado.tipo})`);
        } else {
          setError('Usuário não encontrado no sistema');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        setError(errorData.error || 'Erro ao buscar usuário');
      }
    } catch (error) {
      console.error('[CORRECAO_TIPO] Erro ao buscar usuário:', error);
      setError('Erro de conexão ao buscar usuário');
    } finally {
      setLoading(false);
    }
  };

  const corrigirTipoUsuario = async () => {
    if (!usuario) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('[CORRECAO_TIPO] Corrigindo tipo do usuário:', usuario.id);

      const dadosCorrecao = {
        tipo: 'administrador',
        serie: null, // Remover série de aluno
        turma: null  // Remover turma de aluno
      };

      const response = await fetch(
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

      if (response.ok) {
        const data = await response.json();
        console.log('[CORRECAO_TIPO] Usuário corrigido com sucesso:', data);
        
        setUsuario(data.usuario);
        setStep(3);
        setMessage('Tipo de usuário corrigido com sucesso! Agora você é um administrador.');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        setError(errorData.error || 'Erro ao corrigir tipo de usuário');
      }
    } catch (error) {
      console.error('[CORRECAO_TIPO] Erro ao corrigir usuário:', error);
      setError('Erro de conexão ao corrigir usuário');
    } finally {
      setLoading(false);
    }
  };

  const reiniciarProcesso = () => {
    setStep(1);
    setUsuario(null);
    setMessage('');
    setError('');
    setEmail('jrsantosdev1@gmail.com');
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-2xl">Correção de Tipo de Usuário</CardTitle>
              <CardDescription>
                Ferramenta para corrigir o tipo de usuário no sistema AVA
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
                Buscar Usuário
              </span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(2)}
              <span className={step >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                Confirmar Correção
              </span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(3)}
              <span className={step >= 3 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                Concluído
              </span>
            </div>
          </div>

          <Separator />

          {/* Step 1: Buscar usuário */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do usuário para correção
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o email do usuário"
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={buscarUsuario} 
                disabled={loading || !email.trim()}
                className="w-full"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Buscando...' : 'Buscar Usuário'}
              </Button>
            </div>
          )}

          {/* Step 2: Confirmar correção */}
          {step === 2 && usuario && (
            <div className="space-y-4">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Usuário encontrado:</strong> {usuario.nome} ({usuario.email})
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-gray-900">Informações atuais:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <Badge className={`ml-2 ${getTipoBadgeColor(usuario.tipo)}`}>
                      {usuario.tipo}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <Badge className={`ml-2 ${usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
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

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Alterações que serão feitas:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Tipo:</strong> {usuario.tipo} → <strong>administrador</strong></li>
                  {usuario.serie && <li>• <strong>Série:</strong> {usuario.serie} → <strong>(removida)</strong></li>}
                  {usuario.turma && <li>• <strong>Turma:</strong> {usuario.turma} → <strong>(removida)</strong></li>}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={corrigirTipoUsuario} 
                  disabled={loading}
                  className="flex-1"
                  variant="default"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Corrigindo...' : 'Confirmar Correção'}
                </Button>
                <Button 
                  onClick={reiniciarProcesso}
                  variant="outline"
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Sucesso */}
          {step === 3 && usuario && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Correção realizada com sucesso!</strong> O tipo de usuário foi alterado.
                </AlertDescription>
              </Alert>

              <div className="bg-green-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-green-900">Informações atualizadas:</h4>
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
                  <strong>Importante:</strong> Faça logout e login novamente para que as alterações tenham efeito no sistema.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  onClick={reiniciarProcesso}
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Corrigir Outro Usuário
                </Button>
                {onFechar && (
                  <Button 
                    onClick={onFechar}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                )}
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