import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Key, User, AlertCircle, CheckCircle } from 'lucide-react';

interface LoginQuickTestProps {
  onBack: () => void;
}

export function LoginQuickTest({ onBack }: LoginQuickTestProps) {
  const [email, setEmail] = useState('admin@escola.com');
  const [password, setPassword] = useState('admin123');
  const [result, setResult] = useState<string>('');
  const [testing, setTesting] = useState(false);
  
  const { login } = useAuth();

  const testLogin = async () => {
    setTesting(true);
    setResult('');
    
    try {
      const credentials = email.includes('@') 
        ? { email, password }
        : { username: email, password };
        
      console.log('🧪 Testando login com credenciais:', {
        tipo: email.includes('@') ? 'email' : 'username',
        ...credentials
      });
      
      const success = await login(credentials);
      
      if (success) {
        setResult('✅ Login realizado com sucesso!');
      } else {
        setResult('❌ Falha no login - credenciais inválidas');
      }
    } catch (error: any) {
      setResult(`❌ Erro no teste: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Teste Rápido de Login
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email/Usuário</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@escola.com ou admin.user"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
            />
          </div>
          
          <Button 
            onClick={testLogin}
            disabled={testing || !email || !password}
            className="w-full"
          >
            {testing ? (
              <>
                <User className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Testar Login
              </>
            )}
          </Button>
          
          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {result.includes('✅') ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {result}
              </div>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 text-sm mb-2">📋 Credenciais de Teste:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Admin:</strong> admin@escola.com / admin123</div>
              <div><strong>Professor:</strong> professor@escola.com / prof123</div>
              <div><strong>Aluno:</strong> aluno@escola.com / aluno123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}