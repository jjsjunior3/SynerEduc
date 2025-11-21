import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, LogOut } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function FixAdminEmergencia() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const executarCorrecaoEmergencia = async () => {
    setLoading(true);
    setError('');
    setResultado(null);
    setSucesso(false);

    try {
      console.log('[FIX_ADMIN] Executando correção de emergência...');

      // Limpar cache primeiro
      localStorage.clear();
      sessionStorage.clear();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/emergency/fix-admin-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[FIX_ADMIN] Resposta:', data);
        
        setResultado(data);
        setSucesso(data.success);
        
        if (!data.success) {
          setError(data.error || 'Erro desconhecido');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro de resposta' }));
        setError(`Erro HTTP ${response.status}: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('[FIX_ADMIN] Erro:', error);
      setError(`Erro de conexão: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const forcarRecarregamento = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-2xl">Correção de Emergência - Admin</CardTitle>
              <CardDescription>
                Correção direta do tipo de usuário para jrsantosdev1@gmail.com
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Problema:</strong> O email jrsantosdev1@gmail.com está cadastrado como "aluno" ao invés de "administrador".
              Esta ferramenta corrige isso diretamente no banco de dados.
            </AlertDescription>
          </Alert>

          {!resultado && (
            <div className="text-center">
              <Button 
                onClick={executarCorrecaoEmergencia} 
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Executando Correção...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 mr-2" />
                    Executar Correção de Emergência
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {resultado && sucesso && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sucesso!</strong> {resultado.message}
                </AlertDescription>
              </Alert>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">Informações do usuário corrigido:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nome:</span>
                    <div className="font-medium">{resultado.usuario?.nome}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <div className="font-medium">{resultado.usuario?.email}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <div>
                      <Badge className="bg-red-100 text-red-800">
                        {resultado.usuario?.tipo}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div>
                      <Badge className="bg-green-100 text-green-800">
                        {resultado.usuario?.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {resultado.alteracoes && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">Alterações realizadas:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Tipo:</span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 line-through">
                          {resultado.alteracoes.tipoAnterior}
                        </Badge>
                        <span>→</span>
                        <Badge className="bg-red-100 text-red-800">
                          {resultado.alteracoes.tipoNovo}
                        </Badge>
                      </div>
                    </div>
                    {resultado.alteracoes.serieAnterior && (
                      <div className="flex items-center justify-between">
                        <span>Série:</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-100 text-gray-800 line-through">
                            {resultado.alteracoes.serieAnterior}
                          </Badge>
                          <span>→</span>
                          <Badge className="bg-gray-200 text-gray-600">
                            (removida)
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Alert>
                <LogOut className="h-4 w-4" />
                <AlertDescription>
                  <strong>Próximo passo obrigatório:</strong> Clique no botão abaixo para fazer logout completo e aplicar as alterações.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={forcarRecarregamento}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Fazer Logout e Recarregar Sistema
              </Button>
            </div>
          )}

          {resultado && !sucesso && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Falha na correção:</strong> {resultado.error}
              </AlertDescription>
            </Alert>
          )}

          {resultado && (
            <details className="bg-gray-100 p-4 rounded-lg">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Informações técnicas (clique para expandir)
              </summary>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </details>
          )}

          <div className="text-center pt-4 border-t">
            <Button 
              onClick={() => window.location.href = '/'}
              variant="ghost"
              size="sm"
            >
              ← Voltar ao Sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}