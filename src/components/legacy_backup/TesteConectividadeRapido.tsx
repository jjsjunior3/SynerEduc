import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, Loader2, Wifi, Server, User } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteConectividadeRapidoProps {
  onVoltar: () => void;
}

interface TesteResult {
  teste: string;
  status: 'success' | 'error' | 'loading';
  tempo?: number;
  detalhes?: string;
  dados?: any;
}

export function TesteConectividadeRapido({ onVoltar }: TesteConectividadeRapidoProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<TesteResult[]>([]);

  const adicionarResultado = (resultado: TesteResult) => {
    setResultados(prev => {
      const novos = [...prev];
      const index = novos.findIndex(r => r.teste === resultado.teste);
      if (index >= 0) {
        novos[index] = resultado;
      } else {
        novos.push(resultado);
      }
      return novos;
    });
  };

  const executarTestes = async () => {
    setTestando(true);
    setResultados([]);
    
    // Teste 1: Configuração básica
    adicionarResultado({ teste: 'Configuração', status: 'loading' });
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!projectId || !publicAnonKey) {
      adicionarResultado({
        teste: 'Configuração',
        status: 'error',
        detalhes: 'ProjectId ou PublicAnonKey não encontrados'
      });
      setTestando(false);
      return;
    }
    
    adicionarResultado({
      teste: 'Configuração',
      status: 'success',
      detalhes: `ProjectId: ${projectId}, Key: ${publicAnonKey.substring(0, 20)}...`
    });

    // Teste 2: Health Check básico
    adicionarResultado({ teste: 'Health Check', status: 'loading' });
    const inicioHealth = Date.now();
    
    try {
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`;
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const tempoHealth = Date.now() - inicioHealth;
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        adicionarResultado({
          teste: 'Health Check',
          status: 'success',
          tempo: tempoHealth,
          detalhes: `Status: ${healthResponse.status}`,
          dados: healthData
        });
      } else {
        const errorText = await healthResponse.text();
        adicionarResultado({
          teste: 'Health Check',
          status: 'error',
          tempo: tempoHealth,
          detalhes: `Status: ${healthResponse.status} - ${errorText}`
        });
      }
    } catch (error) {
      adicionarResultado({
        teste: 'Health Check',
        status: 'error',
        tempo: Date.now() - inicioHealth,
        detalhes: `Erro de rede: ${error.message}`
      });
    }

    // Teste 3: Listagem de usuários
    adicionarResultado({ teste: 'Lista Usuários', status: 'loading' });
    const inicioUsuarios = Date.now();
    
    try {
      const usuariosUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`;
      const usuariosResponse = await fetch(usuariosUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const tempoUsuarios = Date.now() - inicioUsuarios;
      
      if (usuariosResponse.ok) {
        const usuariosData = await usuariosResponse.json();
        const totalUsuarios = usuariosData.usuarios?.length || 0;
        const professores = usuariosData.usuarios?.filter((u: any) => u.tipo === 'professor') || [];
        
        adicionarResultado({
          teste: 'Lista Usuários',
          status: 'success',
          tempo: tempoUsuarios,
          detalhes: `${totalUsuarios} usuários, ${professores.length} professores`,
          dados: { total: totalUsuarios, professores: professores.length }
        });
      } else {
        const errorText = await usuariosResponse.text();
        adicionarResultado({
          teste: 'Lista Usuários',
          status: 'error',
          tempo: tempoUsuarios,
          detalhes: `Status: ${usuariosResponse.status} - ${errorText}`
        });
      }
    } catch (error) {
      adicionarResultado({
        teste: 'Lista Usuários',
        status: 'error',
        tempo: Date.now() - inicioUsuarios,
        detalhes: `Erro de rede: ${error.message}`
      });
    }

    // Teste 4: Buscar professor específico
    adicionarResultado({ teste: 'Professor Específico', status: 'loading' });
    const inicioProfessor = Date.now();
    
    try {
      // Primeiro buscar lista de usuários para encontrar um professor
      const usuariosUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`;
      const usuariosResponse = await fetch(usuariosUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (usuariosResponse.ok) {
        const usuariosData = await usuariosResponse.json();
        const professores = usuariosData.usuarios?.filter((u: any) => u.tipo === 'professor') || [];
        
        if (professores.length > 0) {
          const professor = professores[0];
          const disciplinasUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${professor.id}/disciplinas`;
          
          const disciplinasResponse = await fetch(disciplinasUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          const tempoProfessor = Date.now() - inicioProfessor;
          
          if (disciplinasResponse.ok) {
            const disciplinasData = await disciplinasResponse.json();
            adicionarResultado({
              teste: 'Professor Específico',
              status: 'success',
              tempo: tempoProfessor,
              detalhes: `Professor: ${professor.nome}`,
              dados: disciplinasData
            });
          } else {
            const errorText = await disciplinasResponse.text();
            adicionarResultado({
              teste: 'Professor Específico',
              status: 'error',
              tempo: tempoProfessor,
              detalhes: `Status: ${disciplinasResponse.status} - ${errorText}`
            });
          }
        } else {
          adicionarResultado({
            teste: 'Professor Específico',
            status: 'error',
            tempo: Date.now() - inicioProfessor,
            detalhes: 'Nenhum professor encontrado no sistema'
          });
        }
      } else {
        adicionarResultado({
          teste: 'Professor Específico',
          status: 'error',
          tempo: Date.now() - inicioProfessor,
          detalhes: 'Falha ao buscar lista de usuários'
        });
      }
    } catch (error) {
      adicionarResultado({
        teste: 'Professor Específico',
        status: 'error',
        tempo: Date.now() - inicioProfessor,
        detalhes: `Erro de rede: ${error.message}`
      });
    }
    
    setTestando(false);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'loading') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'loading') => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'loading':
        return <Badge className="bg-blue-100 text-blue-800">Testando...</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teste de Conectividade Rápido</h1>
            <p className="text-gray-600">Verificação de conectividade com o backend</p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar
          </Button>
        </div>

        {/* Informações da configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Configuração Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Project ID:</p>
                <p className="font-mono text-sm">{projectId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Public Anon Key:</p>
                <p className="font-mono text-sm">{publicAnonKey?.substring(0, 30)}...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controles */}
        <div className="flex gap-4">
          <Button 
            onClick={executarTestes} 
            disabled={testando}
            className="flex items-center gap-2"
          >
            {testando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            {testando ? 'Testando...' : 'Executar Testes'}
          </Button>
          
          <Button 
            onClick={() => setResultados([])} 
            variant="outline"
            disabled={testando}
          >
            Limpar Resultados
          </Button>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados dos Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(resultado.status)}
                        <h3 className="font-medium">{resultado.teste}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {resultado.tempo && (
                          <span className="text-sm text-gray-500">{resultado.tempo}ms</span>
                        )}
                        {getStatusBadge(resultado.status)}
                      </div>
                    </div>
                    
                    {resultado.detalhes && (
                      <p className="text-sm text-gray-600 mb-2">{resultado.detalhes}</p>
                    )}
                    
                    {resultado.dados && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          Ver dados completos
                        </summary>
                        <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(resultado.dados, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
        {resultados.length > 0 && !testando && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Testes concluídos. {resultados.filter(r => r.status === 'success').length} de {resultados.length} testes passaram.
              {resultados.some(r => r.status === 'error') && (
                <span className="block mt-2 text-red-600">
                  Verifique os erros acima para identificar problemas de conectividade.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}