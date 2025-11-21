import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Book, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useTimeoutOptimizer } from './TimeoutOptimizer';
import { optimizedFetch, fetchWithFastFallback } from '../utils/networkOptimizer';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Usuario } from '../types/auth';

interface OptimizedLoginProps {
  onLogin: (user: Usuario) => void;
  onBackToSite: () => void;
}

export function OptimizedLoginWithConnectivity({ onLogin, onBackToSite }: OptimizedLoginProps) {
  const [loginField, setLoginField] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [conectividade, setConectividade] = useState<'checking' | 'online' | 'offline'>('checking');
  const [tempoResposta, setTempoResposta] = useState<number | null>(null);
  
  const { optimizedFetch: customOptimizedFetch, cancelAllRequests } = useTimeoutOptimizer();

  // Teste de conectividade otimizado
  const testarConectividade = async () => {
    const inicio = Date.now();
    
    try {
      console.log('[LoginOptimizado] Testando conectividade...');
      
      const response = await optimizedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const tempo = Date.now() - inicio;
      setTempoResposta(tempo);
      
      if (response.ok) {
        console.log(`[LoginOptimizado] Conectividade OK (${tempo}ms)`);
        setConectividade('online');
        return true;
      } else {
        console.log(`[LoginOptimizado] Servidor respondeu com erro: ${response.status}`);
        setConectividade('offline');
        return false;
      }
    } catch (error) {
      const tempo = Date.now() - inicio;
      console.log(`[LoginOptimizado] Erro de conectividade após ${tempo}ms:`, error.message);
      setConectividade('offline');
      setTempoResposta(tempo);
      return false;
    }
  };

  useEffect(() => {
    testarConectividade();
    
    // Cancelar requests ao desmontar
    return () => {
      cancelAllRequests();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      if (conectividade === 'online') {
        console.log('[LoginOptimizado] Tentando login com backend...');
        
        const userData = await fetchWithFastFallback(
          `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/buscar-por-login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              login: loginField,
              senha: senha
            })
          },
          null // Sem fallback data - irá para modo offline se falhar
        );

        if (userData && userData.id) {
          localStorage.setItem('ava_user', JSON.stringify(userData));
          onLogin(userData);
          return;
        }
      }

      // Fallback para modo offline/demo
      console.log('[LoginOptimizado] Usando modo offline para:', loginField);
      const user = criarUsuarioDemo(loginField, senha);
      localStorage.setItem('ava_user', JSON.stringify(user));
      onLogin(user);

    } catch (error) {
      console.error('[LoginOptimizado] Erro no login:', error);
      
      if (error.message.includes('timeout')) {
        setErro('Login demorou muito para responder. Usando modo offline.');
        // Continuar com modo offline
        const user = criarUsuarioDemo(loginField, senha);
        localStorage.setItem('ava_user', JSON.stringify(user));
        onLogin(user);
      } else {
        setErro('Erro ao fazer login. Tente novamente ou use modo offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  const criarUsuarioDemo = (loginField: string, senha: string): Usuario => {
    let tipoUsuario = 'aluno';
    let nomeUsuario = loginField;
    
    const isEmail = loginField.includes('@');
    
    if (loginField === 'jrsantosdev1@gmail.com' || loginField === 'admin' || loginField.includes('admin')) {
      tipoUsuario = 'administrador';
      nomeUsuario = 'Desenvolvedor Admin';
    } else if (loginField.includes('prof') && !loginField.includes('conteudista')) {
      tipoUsuario = 'professor';
      nomeUsuario = isEmail ? loginField.split('@')[0] : loginField;
    } else if (loginField.includes('coord')) {
      tipoUsuario = 'coordenador';
      nomeUsuario = isEmail ? loginField.split('@')[0] : loginField;
    } else if (loginField.includes('conteudista')) {
      tipoUsuario = 'professor_conteudista';
      nomeUsuario = isEmail ? loginField.split('@')[0] : loginField;
    } else {
      nomeUsuario = isEmail ? loginField.split('@')[0] : loginField;
    }

    let dadosUsuario: any = {
      id: 'demo_' + Date.now(),
      nome: nomeUsuario,
      nomeUsuario: isEmail ? loginField.split('@')[0] : loginField,
      email: isEmail ? loginField : `${loginField}@conexaoead.ma.gov.br`,
      tipo: tipoUsuario
    };

    if (tipoUsuario === 'aluno') {
      dadosUsuario.serie = '6º ano - Ensino Fundamental';
    } else if (tipoUsuario === 'professor') {
      dadosUsuario.disciplinas = ['Português'];
      dadosUsuario.turmas = ['6º ano - Ensino Fundamental', '7º ano - Ensino Fundamental'];
    } else if (tipoUsuario === 'professor_conteudista') {
      dadosUsuario.disciplinas = ['Todas as disciplinas'];
      dadosUsuario.especialidade = 'Gestão de Conteúdo Didático';
    }

    return dadosUsuario as Usuario;
  };

  const loginRapido = async (tipo: string) => {
    const logins = {
      admin: 'admin',
      professor: 'prof',
      aluno: 'aluno',
      coordenador: 'coord',
      conteudista: 'conteudista'
    };
    
    const loginValue = logins[tipo as keyof typeof logins];
    setLoginField(loginValue);
    setSenha('123456');
    
    // Auto-login otimizado
    setTimeout(async () => {
      const user = criarUsuarioDemo(loginValue, '123456');
      localStorage.setItem('ava_user', JSON.stringify(user));
      onLogin(user);
    }, 100);
  };

  const getStatusColor = () => {
    switch (conectividade) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = () => {
    switch (conectividade) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'offline': return <WifiOff className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4 animate-pulse" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
        <CardHeader className="text-center">
          <Button 
            onClick={onBackToSite}
            variant="ghost" 
            size="sm"
            className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
          >
            ← Voltar ao site
          </Button>
          
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Book className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-blue-800">Portal do Aluno</CardTitle>
          <p className="text-gray-600">Colégio Conexão EAD Maranhense</p>
          
          {/* Status de Conectividade */}
          <div className={`flex items-center justify-center gap-2 mt-3 text-sm ${getStatusColor()}`}>
            {getStatusIcon()}
            <span>
              {conectividade === 'online' && `Online ${tempoResposta ? `(${tempoResposta}ms)` : ''}`}
              {conectividade === 'offline' && 'Modo Offline Ativo'}
              {conectividade === 'checking' && 'Verificando conexão...'}
            </span>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Email ou Nome de Usuário:</label>
              <input
                type="text"
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="seu@email.com ou nomeUsuario"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Senha:</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {erro}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar no Portal'}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-sm text-gray-600 text-center mb-3">Acesso rápido para demonstração:</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button 
                onClick={() => loginRapido('admin')} 
                variant="outline" 
                size="sm"
                className="text-xs"
                disabled={loading}
              >
                Admin
              </Button>
              <Button 
                onClick={() => loginRapido('professor')} 
                variant="outline" 
                size="sm"
                className="text-xs"
                disabled={loading}
              >
                Professor
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={() => loginRapido('aluno')} 
                variant="outline" 
                size="sm"
                className="text-xs"
                disabled={loading}
              >
                Aluno
              </Button>
              <Button 
                onClick={() => loginRapido('coordenador')} 
                variant="outline" 
                size="sm"
                className="text-xs"
                disabled={loading}
              >
                Coordenador
              </Button>
              <Button 
                onClick={() => loginRapido('conteudista')} 
                variant="outline" 
                size="sm"
                className="text-xs"
                disabled={loading}
              >
                Conteudista
              </Button>
            </div>
          </div>

          {/* Botão de reconectar */}
          {conectividade === 'offline' && (
            <div className="mt-4 text-center">
              <Button 
                onClick={testarConectividade}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Wifi className="w-3 h-3 mr-1" />
                Tentar Reconectar
              </Button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              {conectividade === 'offline' && (
                <span className="text-blue-600 font-medium">
                  ✓ Modo offline ativo - Login funciona sem conexão
                </span>
              )}
              {conectividade === 'online' && (
                <span className="text-green-600 font-medium">
                  ✓ Conectado ao servidor
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}