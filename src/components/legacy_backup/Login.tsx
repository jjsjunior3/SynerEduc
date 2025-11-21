import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { BookOpen, Eye, EyeOff, Loader2, MessageCircle, AlertCircle, Settings } from 'lucide-react';
import { LoginCredentials } from '../types/auth';
import { DiagnosticoLogin } from './DiagnosticoLogin';

interface LoginProps {
  onLoginSuccess: () => void;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  configurationError?: string | null;
}

export function Login({ onLoginSuccess, login, configurationError }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDiagnostico, setShowDiagnostico] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Determinar se o input é email ou nome de usuário
      const isEmail = email.includes('@');
      const credentials = isEmail 
        ? { email: email, password: password }
        : { username: email, password: password };

      const sucesso = await login(credentials);
      if (sucesso) {
        setLoginAttempts(0);
        onLoginSuccess();
      } else {
        setLoginAttempts(prev => prev + 1);
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setLoginAttempts(prev => prev + 1);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const whatsappNumber = "5598702140387";
    const message = "Olá! Esqueci minha senha do Portal AVA e gostaria de recuperá-la. Podem me ajudar?";
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Mostrar diagnóstico se solicitado
  if (showDiagnostico) {
    return <DiagnosticoLogin onBack={() => setShowDiagnostico(false)} />;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl text-white">
                Portal AVA
              </CardTitle>
              <CardDescription className="text-slate-300">
                Colégio Conexão EAD Maranhense
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email ou Nome de Usuário
                </Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu email ou usuário"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:ring-white/20"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:ring-white/20 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            {/* Exibir erro de configuração se houver */}
            {configurationError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-300 text-sm text-center">
                  {configurationError}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleForgotPassword}
                  className="text-slate-300 hover:text-white hover:bg-white/5"
                  disabled={isLoading}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Esqueci minha senha
                </Button>
              </div>

              {/* Botão de diagnóstico após múltiplas tentativas */}
              {loginAttempts >= 2 && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDiagnostico(true)}
                    className="text-orange-300 hover:text-orange-200 hover:bg-orange-500/10"
                    disabled={isLoading}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Diagnóstico do Sistema
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de erro */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-red-200">
          <DialogHeader className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl text-red-700">
              Erro de Login
            </DialogTitle>
            <DialogDescription className="text-red-600">
              {configurationError || "O usuário ou a senha estão incorretos. Verifique suas credenciais e tente novamente."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setShowErrorModal(false)}
                className="flex-1"
              >
                Tentar Novamente
              </Button>
              <Button
                onClick={handleForgotPassword}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Esqueci a Senha
              </Button>
            </div>
            
            {/* Botão de diagnóstico no modal após várias tentativas */}
            {loginAttempts >= 2 && (
              <Button
                onClick={() => {
                  setShowErrorModal(false);
                  setShowDiagnostico(true);
                }}
                variant="outline"
                className="w-full border-orange-500/20 text-orange-600 hover:bg-orange-500/10"
              >
                <Settings className="mr-2 h-4 w-4" />
                Diagnóstico do Sistema
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}