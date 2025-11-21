import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Settings, Eye, EyeOff, AlertCircle, CheckCircle2, TestTube } from 'lucide-react';
import logoEscola from 'figma:asset/e339c695d5503d560f7e53d2039456d52fd95ea5.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { TesteAplicacao } from './TesteAplicacao';

interface SetupInicialProps {
  onSetupComplete: (adminData: any) => void;
}

export function SetupInicial({ onSetupComplete }: SetupInicialProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarTeste, setMostrarTeste] = useState(false);

  const handleInicializarAutomatico = async () => {
    setCarregando(true);
    setErro('');

    try {
      console.log('Iniciando configuração automática...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Resposta da inicialização:', data);

      if (data.success) {
        if (data.action === 'redirect_to_login') {
          // Sistema já configurado, ir para login
          onSetupComplete(null);
        } else if (data.action === 'show_setup') {
          // Sistema ainda precisa de setup manual
          setErro('Sistema foi inicializado mas ainda requer configuração manual. Use o formulário abaixo ou tente fazer login com admin@escola.com / 123456');
        }
      } else {
        setErro(data.message || 'Erro na inicialização automática');
      }
    } catch (error) {
      console.error('Erro na inicialização automática:', error);
      setErro('Erro de conexão durante inicialização automática');
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // Validações
    if (!formData.nome || !formData.email || !formData.senha) {
      setErro('Todos os campos são obrigatórios');
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    if (formData.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/initial-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha
        })
      });

      const data = await response.json();

      if (data.success) {
        onSetupComplete(data.usuario);
      } else {
        setErro(data.error || 'Erro ao criar administrador');
      }
    } catch (error) {
      setErro('Erro de conexão. Verifique se o servidor está funcionando.');
      console.error('Erro no setup:', error);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4">
              <img src={logoEscola} alt="Colégio Conexão EAD Maranhense" className="w-16 h-16" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Colégio Conexão EAD</h1>
                <p className="text-blue-600 font-medium">Maranhense</p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-6 h-6 text-blue-600" />
                <CardTitle className="text-xl text-blue-900">Configuração Inicial</CardTitle>
              </div>
              <p className="text-sm text-blue-700">
                Bem-vindo! Para começar a usar o sistema AVA, você precisa criar o primeiro usuário administrador.
              </p>
              
              {/* Botão de inicialização automática */}
              <div className="mt-4 pt-3 border-t border-blue-200">
                <Button 
                  onClick={handleInicializarAutomatico}
                  disabled={carregando}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  {carregando ? 'Inicializando...' : '🚀 Inicializar Sistema Automaticamente'}
                </Button>
                <p className="text-xs text-blue-600 mt-2 text-center">
                  Clique aqui se você já tem usuários cadastrados ou quer criar usuários de teste
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite seu nome completo"
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@escola.com"
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                  placeholder="Digite a senha novamente"
                  required
                  className="h-12"
                />
              </div>

              {erro && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1 h-12" 
                  disabled={carregando}
                >
                  {carregando ? 'Criando administrador...' : 'Criar Administrador'}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="h-12 px-4"
                  onClick={() => setMostrarTeste(true)}
                  title="Testar Aplicação"
                >
                  <TestTube className="w-4 h-4" />
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="h-12 px-4"
                  onClick={() => window.location.href = '/?debug=true'}
                  title="Debug Setup"
                >
                  🔧
                </Button>
              </div>
            </form>

            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Após criar o administrador, você poderá fazer login e cadastrar outros usuários (professores, alunos, coordenadores, etc.) através do painel administrativo.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
      
      {mostrarTeste && (
        <TesteAplicacao onClose={() => setMostrarTeste(false)} />
      )}
    </div>
  );
}