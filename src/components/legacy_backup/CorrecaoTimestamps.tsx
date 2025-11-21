import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function CorrecaoTimestamps() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const corrigirTimestamps = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);
    
    try {
      console.log('Iniciando correção de timestamps...');
      
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
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Correção concluída:', data);
      setResultado(data);
      
    } catch (err) {
      console.error('Erro na correção:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const reativarAdminPrincipal = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Reativando administrador principal...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/reativar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'jrsantosdev1@gmail.com' })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Admin reativado:', data);
      
      setResultado({
        success: true,
        message: 'Administrador principal reativado com sucesso!',
        action: 'reactivated',
        ...data
      });
      
    } catch (err) {
      console.error('Erro na reativação:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Correção de Sistema</h1>
          <p className="text-gray-600 mt-1">
            Ferramentas para corrigir problemas de timestamps e reativar usuários
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {resultado && (
          <Alert variant={resultado.success ? "default" : "destructive"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{resultado.message}</p>
                {resultado.usuariosCorrigidos && (
                  <p>Usuários corrigidos: {resultado.usuariosCorrigidos}</p>
                )}
                {resultado.totalUsuarios && (
                  <p>Total de usuários: {resultado.totalUsuarios}</p>
                )}
                {resultado.detalhes && (
                  <div className="mt-2 text-sm">
                    <details>
                      <summary>Ver detalhes</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                        {JSON.stringify(resultado, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Corrigir Timestamps</CardTitle>
              <CardDescription>
                Adiciona campos created_at e updated_at em todos os usuários que não possuem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={corrigirTimestamps} 
                disabled={loading}
                className="w-full flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Corrigindo...' : 'Corrigir Timestamps'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reativar Admin Principal</CardTitle>
              <CardDescription>
                Força a reativação do administrador principal (jrsantosdev1@gmail.com)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={reativarAdminPrincipal} 
                disabled={loading}
                className="w-full flex items-center gap-2"
                variant="outline"
              >
                <CheckCircle className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Reativando...' : 'Reativar Admin'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>1. Corrigir Timestamps:</strong> Adiciona os campos created_at e updated_at necessários para compatibilidade com o banco PostgreSQL do Supabase.
            </p>
            <p>
              <strong>2. Reativar Admin:</strong> Força a reativação do usuário administrador principal, garantindo que ele possa fazer login.
            </p>
            <p>
              <strong>Acesso:</strong> Use <code>?correcao</code> na URL para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}