import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LoginEmergenciaProps {
  onClose: () => void;
  onLoginSuccess: (usuario: any) => void;
}

export function LoginEmergencia({ onClose, onLoginSuccess }: LoginEmergenciaProps) {
  const [processando, setProcessando] = useState(false);
  const [etapa, setEtapa] = useState<'inicio' | 'criando' | 'logando' | 'sucesso' | 'erro'>('inicio');
  const [erro, setErro] = useState<string | null>(null);

  const loginEmergencia = async () => {
    setProcessando(true);
    setErro(null);
    
    try {
      // Usar a rota de login de emergência que faz tudo de uma vez
      setEtapa('criando');
      console.log('Executando login de emergência...');
      
      const emergenciaResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login-emergencia`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!emergenciaResponse.ok) {
        const errorData = await emergenciaResponse.json();
        throw new Error(errorData.error || `HTTP ${emergenciaResponse.status}: Erro desconhecido`);
      }

      const loginData = await emergenciaResponse.json();
      
      if (!loginData.success || !loginData.usuario) {
        throw new Error('Resposta de login de emergência inválida');
      }

      setEtapa('sucesso');
      console.log('Login de emergência bem-sucedido:', loginData.usuario.nome);
      
      // Salvar sessão
      localStorage.setItem('ava_user_session', JSON.stringify(loginData.usuario));
      
      setTimeout(() => {
        onLoginSuccess(loginData.usuario);
      }, 1500);

    } catch (error) {
      console.error('Erro no login de emergência:', error);
      setErro(error.message);
      setEtapa('erro');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Login de Emergência
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={processando}>
              ✕
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-red-50 border-red-200">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              Este é um login de emergência que força a criação de usuários e faz login automaticamente.
              Use apenas se o login normal não estiver funcionando.
            </AlertDescription>
          </Alert>

          {/* Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {etapa === 'criando' ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : etapa === 'sucesso' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : etapa === 'erro' ? (
                <XCircle className="w-4 h-4 text-red-600" />
              ) : (
                <div className="w-4 h-4 bg-gray-300 rounded-full" />
              )}
              <span className="text-sm">Reinicializar sistema completo</span>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <strong>Erro:</strong> {erro}
              </AlertDescription>
            </Alert>
          )}

          {/* Sucesso */}
          {etapa === 'sucesso' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                <strong>Sucesso!</strong> Login realizado com sucesso. Redirecionando...
              </AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            <Button 
              onClick={loginEmergencia} 
              disabled={processando || etapa === 'sucesso'}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando sistema...
                </>
              ) : etapa === 'sucesso' ? (
                'Sucesso!'
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Executar Login de Emergência
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-600 text-center">
            Este processo irá fazer login automaticamente como aluno (Maria Silva)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}