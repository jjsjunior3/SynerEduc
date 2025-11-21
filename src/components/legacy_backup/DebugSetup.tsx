import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DebugInfo {
  usuarios: any[];
  needsSetup: boolean;
  totalUsuarios: number;
  adminsAtivos: number;
}

export function DebugSetup() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/debug-usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDebugInfo(data);
    } catch (err) {
      setError(`Erro ao buscar debug info: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const forceSetupComplete = async () => {
    try {
      // Usar o novo endpoint de inicialização
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema?criar_teste=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`Sistema inicializado! Admin: ${data.admin?.email}`);
          await fetchDebugInfo(); // Atualizar informações
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error(data.error || 'Erro na inicialização');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao inicializar sistema: ${errorMsg}`);
    }
  };

  const forceRecreateAdmin = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/recrear-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Administrador verificado! needsSetup: ${data.needsSetup}`);
        await fetchDebugInfo(); // Atualizar informações
        
        if (!data.needsSetup) {
          // Se não precisa mais de setup, recarregar para ir ao login
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        throw new Error('Erro ao recriar administrador');
      }
    } catch (err) {
      setError(`Erro ao recriar admin: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Debug - Configuração do Sistema</CardTitle>
          <CardDescription>
            Informações de debug para investigar o problema de setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={fetchDebugInfo} disabled={loading}>
              {loading ? 'Carregando...' : 'Verificar Status'}
            </Button>
            <Button onClick={forceSetupComplete} variant="outline">
              Inicializar Sistema Completo
            </Button>
            <Button onClick={forceRecreateAdmin} variant="outline">
              Recriar Administrador
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {debugInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Usuários</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{debugInfo.totalUsuarios}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Admins Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{debugInfo.adminsAtivos}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Precisa Setup?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${debugInfo.needsSetup ? 'text-red-500' : 'text-green-500'}`}>
                      {debugInfo.needsSetup ? 'SIM' : 'NÃO'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Usuários Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.usuarios.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                  ) : (
                    <div className="space-y-2">
                      {debugInfo.usuarios.map((usuario, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{usuario.nome}</div>
                              <div className="text-sm text-muted-foreground">{usuario.email}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  usuario.tipo === 'administrador' ? 'bg-red-100 text-red-800' :
                                  usuario.tipo === 'professor' ? 'bg-blue-100 text-blue-800' :
                                  usuario.tipo === 'coordenador' ? 'bg-purple-100 text-purple-800' :
                                  usuario.tipo === 'professor_conteudista' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {usuario.tipo}
                                </span>
                              </div>
                              <div className="text-xs mt-1">
                                <span className={`px-2 py-1 rounded ${
                                  usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {usuario.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}