import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, User, Shield } from 'lucide-react';

interface EmergencyAuthProps {
  onAuthSuccess: (usuario: any) => void;
}

export function EmergencyAuth({ onAuthSuccess }: EmergencyAuthProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmergencyLogin = async () => {
    setLoading(true);
    setError(null);

    // Emergency login - bypass server validation for testing
    if (username && password) {
      // Simulate different user types for testing
      let userType = 'aluno';
      let userName = username;

      if (username.toLowerCase().includes('admin')) {
        userType = 'administrador';
        userName = 'Administrador Teste';
      } else if (username.toLowerCase().includes('prof')) {
        userType = 'professor';
        userName = 'Professor Teste';
      } else if (username.toLowerCase().includes('coord')) {
        userType = 'coordenador';
        userName = 'Coordenador Teste';
      }

      const mockUser = {
        id: `emergency-${Date.now()}`,
        nome: userName,
        email: `${username}@teste.com`,
        tipo: userType,
        ativo: true,
        serie: userType === 'aluno' ? '1ª série - Ensino Médio' : undefined,
        disciplinas: userType === 'professor' ? ['Matemática', 'Física'] : undefined,
        criadoEm: new Date().toISOString()
      };

      setTimeout(() => {
        setLoading(false);
        onAuthSuccess(mockUser);
      }, 1000);
    } else {
      setLoading(false);
      setError('Por favor, preencha usuário e senha');
    }
  };

  const quickAccess = [
    { user: 'admin', pass: '123', label: 'Admin Teste', type: 'administrador' },
    { user: 'professor', pass: '123', label: 'Professor Teste', type: 'professor' },
    { user: 'aluno', pass: '123', label: 'Aluno Teste', type: 'aluno' },
    { user: 'coordenador', pass: '123', label: 'Coordenador Teste', type: 'coordenador' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center">
            <Shield className="w-5 h-5 text-orange-600" />
            Modo de Emergência - Auth
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Sistema em modo de emergência. Autenticação local ativa.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite o usuário"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleEmergencyLogin}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Entrando...
                </div>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Entrar (Modo Emergência)
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Acesso Rápido:</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickAccess.map((quick) => (
                <Button
                  key={quick.user}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUsername(quick.user);
                    setPassword(quick.pass);
                  }}
                  disabled={loading}
                  className="text-xs"
                >
                  {quick.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = window.location.pathname + '?mode=diagnostico'}
            >
              🔍 Diagnóstico
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}