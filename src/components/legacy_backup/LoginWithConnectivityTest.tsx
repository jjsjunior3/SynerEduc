import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Book, Wifi, WifiOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Usuario } from '../types/auth';

interface LoginWithConnectivityTestProps {
  onLogin: (user: Usuario) => void;
  onBackToSite: () => void;
}

export function LoginWithConnectivityTest({ onLogin, onBackToSite }: LoginWithConnectivityTestProps) {
  const [loginField, setLoginField] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [conectividade, setConectividade] = useState<'testando' | 'online' | 'offline'>('testando');

  // Testar conectividade ao carregar o componente
  useEffect(() => {
    testarConectividade();
  }, []);

  const testarConectividade = async () => {
    try {
      console.log('Testando conectividade do backend...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setConectividade('online');
        console.log('Backend online e acessível');
      } else {
        setConectividade('offline');
        console.log('Backend respondeu mas com erro:', response.status);
      }
    } catch (error) {
      setConectividade('offline');
      console.log('Backend offline ou inacessível:', error.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      if (conectividade === 'online') {
        // Tentar login com backend
        console.log('Tentando login com backend...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/buscar-por-login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              login: loginField,
              senha: senha
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const userData = await response.json();
            if (userData && userData.id) {
              localStorage.setItem('ava_user', JSON.stringify(userData));
              onLogin(userData);
              return;
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            setErro(errorData.error || 'Credenciais inválidas');
            return;
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.log('Erro na requisição:', fetchError.message);
          setErro('Erro de conexão. Tentando modo offline...');
        }
      }

      // Login offline/demo
      console.log('Login offline ativado para:', loginField);
      
      // Determinar tipo de usuário baseado no campo de login
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

      const dadosUsuario: any = {
        id: 'offline_' + Date.now(),
        nome: nomeUsuario,
        nomeUsuario: isEmail ? loginField.split('@')[0] : loginField,
        email: isEmail ? loginField : `${loginField}@conexaoead.ma.gov.br`,
        tipo: tipoUsuario
      };

      // Adicionar dados específicos por tipo de usuário
      if (tipoUsuario === 'aluno') {
        dadosUsuario.serie = '6º ano - Ensino Fundamental';
      } else if (tipoUsuario === 'professor') {
        dadosUsuario.disciplinas = ['Português'];
        dadosUsuario.turmas = ['6º ano - Ensino Fundamental', '7º ano - Ensino Fundamental'];
      } else if (tipoUsuario === 'professor_conteudista') {
        dadosUsuario.disciplinas = ['Todas as disciplinas'];
        dadosUsuario.especialidade = 'Gestão de Conteúdo Didático';
      }

      const user: Usuario = dadosUsuario;
      localStorage.setItem('ava_user', JSON.stringify(user));
      onLogin(user);

    } catch (error) {
      console.error('Erro no login:', error);
      setErro('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
    
    // Auto-login
    setTimeout(async () => {
      setLoading(true);
      setErro('');
      
      try {
        const dadosUsuario: any = {
          id: 'demo_' + tipo + '_' + Date.now(),
          nome: tipo === 'admin' ? 'Administrador Demo' : 
                tipo === 'professor' ? 'Professor Demo' :
                tipo === 'coordenador' ? 'Coordenador Demo' :
                tipo === 'conteudista' ? 'Professor Conteudista Demo' :
                'Aluno Demo',
          nomeUsuario: loginValue,
          email: `${loginValue}@conexaoead.ma.gov.br`,
          tipo: tipo === 'admin' ? 'administrador' : 
                tipo === 'professor' ? 'professor' :
                tipo === 'coordenador' ? 'coordenador' :
                tipo === 'conteudista' ? 'professor_conteudista' :
                'aluno'
        };

        if (dadosUsuario.tipo === 'aluno') {
          dadosUsuario.serie = '6º ano - Ensino Fundamental';
        } else if (dadosUsuario.tipo === 'professor') {
          dadosUsuario.disciplinas = ['Português'];
          dadosUsuario.turmas = ['6º ano - Ensino Fundamental'];
        } else if (dadosUsuario.tipo === 'professor_conteudista') {
          dadosUsuario.disciplinas = ['Todas as disciplinas'];
          dadosUsuario.especialidade = 'Gestão de Conteúdo Didático';
        }

        const user: Usuario = dadosUsuario;
        localStorage.setItem('ava_user', JSON.stringify(user));
        onLogin(user);
      } catch (error) {
        console.error('Erro no login rápido:', error);
        setErro('Erro no login rápido. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const StatusConectividade = () => {
    if (conectividade === 'testando') {
      return (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          Testando conexão...
        </div>
      );
    } else if (conectividade === 'online') {
      return (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="w-4 h-4" />
          Backend online
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-orange-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Modo offline ativo
        </div>
      );
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
          
          {/* Status de conectividade */}
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <StatusConectividade />
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
              <p className="text-xs text-gray-500 mt-1">
                Você pode usar seu email ou nome de usuário para entrar
              </p>
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

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
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

          {conectividade === 'offline' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              <p><strong>Modo offline ativo:</strong></p>
              <p>• Login funciona normalmente</p>
              <p>• Dados são salvos localmente</p>
              <p>• Use os botões de acesso rápido</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              Problemas para acessar? Entre em contato:<br />
              <a href="tel:+5598988887777" className="text-blue-600 hover:underline">
                (98) 98888-7777
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}