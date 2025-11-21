import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface TesteLoginRapidoProps {
  onVoltar: () => void;
}

export function TesteLoginRapido({ onVoltar }: TesteLoginRapidoProps) {
  const [email, setEmail] = useState('jrsantosdev1@gmail.com');
  const [password, setPassword] = useState('Jvni0R@87');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const { login } = useAuth();

  const testarLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('[TESTE_LOGIN] Testando login com:', { email, password: '***' });
      
      const success = await login({ 
        email: email, 
        senha: password 
      });

      if (success) {
        setResult({
          success: true,
          message: 'Login realizado com sucesso!'
        });
        toast.success('✅ Login funcionou!');
      } else {
        setResult({
          success: false,
          message: 'Falha no login - credenciais inválidas'
        });
        toast.error('❌ Login falhou');
      }
    } catch (error) {
      console.error('[TESTE_LOGIN] Erro:', error);
      setResult({
        success: false,
        message: error.message || 'Erro desconhecido'
      });
      toast.error('❌ Erro no login: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testarComNomeUsuario = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('[TESTE_LOGIN] Testando login com nome de usuário');
      
      const success = await login({ 
        nomeUsuario: 'admin.principal', 
        senha: password 
      });

      if (success) {
        setResult({
          success: true,
          message: 'Login com nome de usuário funcionou!'
        });
        toast.success('✅ Login com nome de usuário funcionou!');
      } else {
        setResult({
          success: false,
          message: 'Falha no login com nome de usuário'
        });
        toast.error('❌ Login com nome de usuário falhou');
      }
    } catch (error) {
      console.error('[TESTE_LOGIN] Erro:', error);
      setResult({
        success: false,
        message: error.message || 'Erro desconhecido'
      });
      toast.error('❌ Erro no login: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">🧪 TESTE RÁPIDO - LOGIN CORRIGIDO</h1>
            <p className="text-sm opacity-90">Verificar se os erros de login foram resolvidos</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Teste de Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email para teste"
                type="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  type={showPassword ? "text" : "password"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={testarLogin}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Testando...
                  </>
                ) : (
                  'Testar Login por Email'
                )}
              </Button>

              <Button 
                onClick={testarComNomeUsuario}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Testando...
                  </>
                ) : (
                  'Testar por Nome de Usuário'
                )}
              </Button>
            </div>

            {result && (
              <div className={`p-4 rounded-lg border ${
                result.success 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {result.success ? 'SUCESSO' : 'ERRO'}
                  </span>
                </div>
                <p className="text-sm">{result.message}</p>
              </div>
            )}

            <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Como usar:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Email padrão:</strong> jrsantosdev1@gmail.com</li>
                <li>• <strong>Senha padrão:</strong> Jvni0R@87</li>
                <li>• <strong>Nome de usuário:</strong> admin.principal</li>
                <li>• Teste ambos os métodos para ver qual funciona</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Status das Correções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Validação de login no servidor corrigida</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>AuthContext corrigido para enviar dados limpos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Suporte a login por email e nome de usuário</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Logs detalhados para debug</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}