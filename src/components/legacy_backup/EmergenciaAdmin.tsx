import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, UserPlus, RefreshCw, Shield } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function EmergenciaAdmin() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const forcarCriacaoAdmin = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);
    
    try {
      console.log('🚨 EMERGÊNCIA: Forçando criação do administrador principal...');
      
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Resposta da criação forçada:', data);
      
      setResultado(data);
      
    } catch (err) {
      console.error('❌ Erro na criação forçada:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const verificarStatusCompleto = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Verificando status completo...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/listar-todos`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const adminPrincipal = data.usuarios?.find((u: any) => u.email === 'jrsantosdev1@gmail.com');
      
      setResultado({
        success: true,
        message: 'Status verificado',
        totalUsuarios: data.usuarios?.length || 0,
        adminPrincipal,
        podeLogar: adminPrincipal?.ativo && adminPrincipal?.tipo === 'administrador'
      });
      
    } catch (err) {
      console.error('Erro na verificação:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const irParaLogin = () => {
    window.location.href = window.location.origin;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-900 mb-2 flex items-center justify-center gap-3">
            🚨 <Shield className="h-10 w-10" /> Emergência Admin
          </h1>
          <p className="text-red-700">
            Ferramenta de última instância para forçar criação do administrador principal
          </p>
        </div>

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
                
                {resultado.action && (
                  <p><strong>Ação realizada:</strong> {resultado.action}</p>
                )}

                {resultado.totalUsuarios !== undefined && (
                  <p><strong>Total de usuários:</strong> {resultado.totalUsuarios}</p>
                )}

                {resultado.adminPrincipal && (
                  <div className="mt-4 p-4 bg-white rounded-lg border">
                    <h4 className="font-medium mb-2">📋 Status do Admin Principal:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Nome:</strong> {resultado.adminPrincipal.nome}</div>
                      <div><strong>Email:</strong> {resultado.adminPrincipal.email}</div>
                      <div><strong>Tipo:</strong> {resultado.adminPrincipal.tipo}</div>
                      <div>
                        <strong>Status:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs ${
                          resultado.adminPrincipal.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {resultado.adminPrincipal.ativo ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                      <div><strong>Criado em:</strong> {new Date(resultado.adminPrincipal.criadoEm || resultado.adminPrincipal.created_at).toLocaleString('pt-BR')}</div>
                      <div><strong>Última atualização:</strong> {new Date(resultado.adminPrincipal.atualizadoEm || resultado.adminPrincipal.updated_at).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                )}

                {resultado.podeLogar && (
                  <div className="mt-4">
                    <Button onClick={irParaLogin} className="w-full bg-green-600 hover:bg-green-700">
                      ✅ ADMIN CORRIGIDO - IR PARA LOGIN
                    </Button>
                  </div>
                )}

                {resultado.success && !resultado.podeLogar && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800">⚠️ Admin existe mas ainda não pode fazer login. Execute "Forçar Criação" novamente.</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <UserPlus className="h-5 w-5" />
                Forçar Criação Admin
              </CardTitle>
              <CardDescription>
                Força a criação/reativação do administrador principal com todos os campos obrigatórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={forcarCriacaoAdmin} 
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <UserPlus className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Forçando Criação...' : 'FORÇAR CRIAÇÃO ADMIN'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="h-5 w-5" />
                Verificar Status
              </CardTitle>
              <CardDescription>
                Verificar se o administrador principal foi criado corretamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={verificarStatusCompleto} 
                disabled={loading}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Verificando...' : 'Verificar Status'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">🆘 Informações de Emergência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Credenciais do Administrador Principal:</h4>
              <p><strong>Email:</strong> jrsantosdev1@gmail.com</p>
              <p><strong>Senha:</strong> Jvni0R@87</p>
              <p><strong>Tipo:</strong> Administrador</p>
            </div>
            
            <div className="space-y-2 text-gray-600">
              <p><strong>🎯 Objetivo:</strong> Garantir que o admin principal existe e pode fazer login</p>
              <p><strong>🔧 Como usar:</strong> Clique em "Forçar Criação", depois "Verificar Status"</p>
              <p><strong>✅ Quando funcionar:</strong> Aparecerá botão verde para ir ao login</p>
              <p><strong>🚨 Acesso:</strong> Use <code>?emergencia</code> na URL</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}