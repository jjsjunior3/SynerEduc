import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, UserCheck, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function CorrecaoRapida() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoFixInProgress, setAutoFixInProgress] = useState(false);

  // Auto-correção ao carregar a página
  useEffect(() => {
    autoCorrigir();
  }, []);

  const autoCorrigir = async () => {
    setAutoFixInProgress(true);
    setLoading(true);
    
    try {
      console.log('🔧 Iniciando correção automática...');
      
      // 1. Primeiro, corrigir timestamps
      console.log('📅 Corrigindo timestamps...');
      await corrigirTimestamps();
      
      // Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Depois, reativar o admin principal
      console.log('👤 Reativando administrador principal...');
      const resultadoReativacao = await reativarAdminPrincipal();
      
      setResultado({
        success: true,
        message: 'Correção automática concluída com sucesso!',
        detalhes: [
          '✅ Timestamps corrigidos',
          '✅ Administrador principal reativado',
          '✅ Sistema pronto para login'
        ],
        adminStatus: resultadoReativacao
      });
      
      console.log('✅ Correção automática concluída!');
      
    } catch (err) {
      console.error('❌ Erro na correção automática:', err);
      setError(`Erro na correção: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setAutoFixInProgress(false);
    }
  };

  const corrigirTimestamps = async () => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/corrigir-timestamps`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao corrigir timestamps: ${response.status}`);
    }

    return await response.json();
  };

  const reativarAdminPrincipal = async () => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/forcar-admin`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro ao forçar admin: ${response.status} - ${errorData.message || 'Erro desconhecido'}`);
    }

    return await response.json();
  };

  const verificarStatusAdmin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Verificando status do administrador...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/listar-todos`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const adminPrincipal = data.usuarios?.find((u: any) => u.email === 'jrsantosdev1@gmail.com');
      
      if (adminPrincipal) {
        setResultado({
          success: true,
          message: `Status do Administrador Principal`,
          adminPrincipal,
          isActive: adminPrincipal.ativo,
          canLogin: adminPrincipal.ativo && adminPrincipal.tipo === 'administrador'
        });
      } else {
        setError('Administrador principal não encontrado no sistema!');
      }
      
    } catch (err) {
      console.error('Erro na verificação:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const testarLogin = () => {
    // Redirecionar para a tela de login
    window.location.href = window.location.origin;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔧 Correção Rápida AVA
          </h1>
          <p className="text-gray-600">
            Sistema de correção automática para problemas de login
          </p>
        </div>

        {/* Status da Auto-Correção */}
        {autoFixInProgress && (
          <Alert className="border-blue-200 bg-blue-50">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Correção automática em andamento...</strong>
              <br />
              Corrigindo timestamps e reativando administrador principal.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {resultado && (
          <Alert variant={resultado.success ? "default" : "destructive"} 
                 className={resultado.success ? "border-green-200 bg-green-50" : ""}>
            <CheckCircle className={`h-4 w-4 ${resultado.success ? 'text-green-600' : 'text-red-600'}`} />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium text-lg">{resultado.message}</p>
                
                {resultado.detalhes && (
                  <div className="space-y-1">
                    {resultado.detalhes.map((detalhe: string, index: number) => (
                      <p key={index} className="text-sm">{detalhe}</p>
                    ))}
                  </div>
                )}

                {resultado.adminPrincipal && (
                  <div className="mt-4 p-4 bg-white rounded-lg border">
                    <h4 className="font-medium mb-2">Status do Admin Principal:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Nome:</strong> {resultado.adminPrincipal.nome}</div>
                      <div><strong>Email:</strong> {resultado.adminPrincipal.email}</div>
                      <div>
                        <strong>Status:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs ${
                          resultado.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {resultado.isActive ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                      <div>
                        <strong>Pode fazer login:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs ${
                          resultado.canLogin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {resultado.canLogin ? 'SIM' : 'NÃO'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {resultado.success && (
                  <div className="mt-4">
                    <Button onClick={testarLogin} className="w-full bg-green-600 hover:bg-green-700">
                      ✅ Ir para Login (Correção Concluída)
                    </Button>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Verificar Status Admin
              </CardTitle>
              <CardDescription>
                Verificar se o administrador principal pode fazer login
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={verificarStatusAdmin} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Verificando...' : 'Verificar Status'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                Executar Correção
              </CardTitle>
              <CardDescription>
                Forçar nova correção completa do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={autoCorrigir} 
                disabled={loading || autoFixInProgress}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(loading || autoFixInProgress) ? 'animate-spin' : ''}`} />
                {loading || autoFixInProgress ? 'Corrigindo...' : 'Executar Correção'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações de Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p><strong>Email:</strong> jrsantosdev1@gmail.com</p>
              <p><strong>Senha:</strong> Jvni0R@87</p>
              <p><strong>Tipo:</strong> Administrador</p>
            </div>
            <div className="space-y-2 text-gray-600">
              <p><strong>🔧 Esta página:</strong> Executa correção automática ao carregar</p>
              <p><strong>🔍 Objetivo:</strong> Garantir que o admin principal possa fazer login</p>
              <p><strong>✅ Após correção:</strong> Voltar para tela de login principal</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}