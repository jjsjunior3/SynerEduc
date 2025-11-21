import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Server,
  Database,
  Users,
  Bug
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DebugAPIAdminProps {
  onVoltar: () => void;
}

interface TesteResultado {
  nome: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  mensagem: string;
  detalhes?: any;
  tempo?: number;
}

export function DebugAPIAdmin({ onVoltar }: DebugAPIAdminProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<TesteResultado[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  const adicionarResultado = (resultado: TesteResultado) => {
    setResultados(prev => [...prev, resultado]);
  };

  const atualizarResultado = (index: number, resultado: Partial<TesteResultado>) => {
    setResultados(prev => prev.map((r, i) => i === index ? { ...r, ...resultado } : r));
  };

  const testarConectividade = async (): Promise<TesteResultado> => {
    const inicio = Date.now();
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        return {
          nome: '🔌 Conectividade do Servidor',
          status: 'error',
          mensagem: `Servidor inacessível (HTTP ${response.status})`,
          tempo
        };
      }

      const data = await response.json();
      
      return {
        nome: '🔌 Conectividade do Servidor',
        status: 'success',
        mensagem: `Servidor respondeu em ${tempo}ms`,
        detalhes: data,
        tempo
      };
      
    } catch (error) {
      return {
        nome: '🔌 Conectividade do Servidor',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  const testarListarUsuarios = async (): Promise<TesteResultado> => {
    const inicio = Date.now();
    try {
      console.log('[DEBUG_API_ADMIN] Testando listar usuários...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const tempo = Date.now() - inicio;
      
      console.log('[DEBUG_API_ADMIN] Resposta da API:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG_API_ADMIN] Erro da API:', errorText);
        
        return {
          nome: '👥 Listar Usuários Admin',
          status: 'error',
          mensagem: `API retornou erro (HTTP ${response.status})`,
          detalhes: { erro: errorText, status: response.status },
          tempo
        };
      }

      const data = await response.json();
      console.log('[DEBUG_API_ADMIN] Dados recebidos:', data);
      
      if (!data.success) {
        return {
          nome: '👥 Listar Usuários Admin',
          status: 'error',
          mensagem: `API retornou erro: ${data.error}`,
          detalhes: data,
          tempo
        };
      }

      const usuariosList = data.usuarios || [];
      setUsuarios(usuariosList);
      
      return {
        nome: '👥 Listar Usuários Admin',
        status: 'success',
        mensagem: `${usuariosList.length} usuários encontrados em ${tempo}ms`,
        detalhes: { total: usuariosList.length, usuarios: usuariosList.slice(0, 3) },
        tempo
      };
      
    } catch (error) {
      console.error('[DEBUG_API_ADMIN] Erro no teste:', error);
      return {
        nome: '👥 Listar Usuários Admin',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  const testarEditarUsuario = async (): Promise<TesteResultado> => {
    if (usuarios.length === 0) {
      return {
        nome: '✏️ Editar Usuário',
        status: 'warning',
        mensagem: 'Não há usuários para testar edição',
        tempo: 0
      };
    }

    const usuarioTeste = usuarios[0];
    const inicio = Date.now();
    
    try {
      console.log('[DEBUG_API_ADMIN] Testando editar usuário:', usuarioTeste.id);
      
      const dadosEdicao = {
        nome: usuarioTeste.nome + ' (Teste)',
        atualizadoEm: new Date().toISOString()
      };
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosEdicao)
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG_API_ADMIN] Erro na edição:', errorText);
        
        return {
          nome: '✏️ Editar Usuário',
          status: 'error',
          mensagem: `Erro na edição (HTTP ${response.status})`,
          detalhes: { erro: errorText, usuarioId: usuarioTeste.id },
          tempo
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          nome: '✏️ Editar Usuário',
          status: 'error',
          mensagem: `API retornou erro: ${data.error}`,
          detalhes: data,
          tempo
        };
      }

      // Reverter a alteração
      const dadosReverter = {
        nome: usuarioTeste.nome
      };
      
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosReverter)
      });
      
      return {
        nome: '✏️ Editar Usuário',
        status: 'success',
        mensagem: `Usuário editado e revertido com sucesso em ${tempo}ms`,
        detalhes: { usuarioId: usuarioTeste.id, dadosEdicao },
        tempo
      };
      
    } catch (error) {
      console.error('[DEBUG_API_ADMIN] Erro no teste de edição:', error);
      return {
        nome: '✏️ Editar Usuário',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  const testarAlterarStatus = async (): Promise<TesteResultado> => {
    if (usuarios.length === 0) {
      return {
        nome: '🔄 Alterar Status',
        status: 'warning',
        mensagem: 'Não há usuários para testar alteração de status',
        tempo: 0
      };
    }

    const usuarioTeste = usuarios.find(u => u.email !== 'jrsantosdev1@gmail.com') || usuarios[0];
    const inicio = Date.now();
    
    try {
      console.log('[DEBUG_API_ADMIN] Testando alterar status:', usuarioTeste.id);
      
      const novoStatus = !usuarioTeste.ativo;
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: novoStatus })
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG_API_ADMIN] Erro na alteração de status:', errorText);
        
        return {
          nome: '🔄 Alterar Status',
          status: 'error',
          mensagem: `Erro na alteração (HTTP ${response.status})`,
          detalhes: { erro: errorText, usuarioId: usuarioTeste.id },
          tempo
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          nome: '🔄 Alterar Status',
          status: 'error',
          mensagem: `API retornou erro: ${data.error}`,
          detalhes: data,
          tempo
        };
      }

      // Reverter a alteração
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: usuarioTeste.ativo })
      });
      
      return {
        nome: '🔄 Alterar Status',
        status: 'success',
        mensagem: `Status alterado e revertido com sucesso em ${tempo}ms`,
        detalhes: { usuarioId: usuarioTeste.id, statusOriginal: usuarioTeste.ativo, statusTeste: novoStatus },
        tempo
      };
      
    } catch (error) {
      console.error('[DEBUG_API_ADMIN] Erro no teste de status:', error);
      return {
        nome: '🔄 Alterar Status',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  const executarTestes = async () => {
    setTestando(true);
    setResultados([]);
    setUsuarios([]);

    const testes = [
      { nome: '🔌 Conectividade do Servidor', funcao: testarConectividade },
      { nome: '👥 Listar Usuários Admin', funcao: testarListarUsuarios },
      { nome: '✏️ Editar Usuário', funcao: testarEditarUsuario },
      { nome: '🔄 Alterar Status', funcao: testarAlterarStatus }
    ];

    // Inicializar todos os testes como pendentes
    setResultados(testes.map(t => ({
      nome: t.nome,
      status: 'pending',
      mensagem: 'Aguardando execução...'
    })));

    for (let i = 0; i < testes.length; i++) {
      const teste = testes[i];
      
      // Marcar como executando
      atualizarResultado(i, {
        status: 'pending',
        mensagem: 'Executando teste...'
      });

      try {
        const resultado = await teste.funcao();
        atualizarResultado(i, resultado);
        
        // Se o teste falhou e é crítico, parar execução
        if (resultado.status === 'error' && i < 2) {
          toast.error(`Teste crítico falhou: ${resultado.nome}`);
          break;
        }
        
      } catch (error) {
        atualizarResultado(i, {
          status: 'error',
          mensagem: `Erro inesperado: ${error.message}`
        });
      }

      // Aguardar um pouco entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTestando(false);
    
    const sucessos = resultados.filter(r => r.status === 'success').length;
    const total = resultados.length;
    
    if (sucessos === total) {
      toast.success('Todos os testes da API Admin passaram!');
    } else if (sucessos > 0) {
      toast.warning(`${sucessos}/${total} testes passaram`);
    } else {
      toast.error('Todos os testes falharam - API Admin com problemas');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'pending':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Bug className="w-6 h-6 text-red-600" />
                Debug API Admin
              </h1>
              <p className="text-sm text-gray-600">Teste completo das funcionalidades da API de administração</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={executarTestes}
              disabled={testando}
              className="flex items-center gap-2"
            >
              {testando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {testando ? 'Executando Testes...' : 'Executar Testes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Informações da Conexão */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Informações da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Project ID:</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{projectId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Base URL:</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                  {`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados dos Testes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Resultados dos Testes da API Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Clique em "Executar Testes" para iniciar o diagnóstico</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${getStatusColor(resultado.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(resultado.status)}
                        <span className="font-medium">{resultado.nome}</span>
                        {resultado.tempo && (
                          <Badge variant="outline" className="text-xs">
                            {resultado.tempo}ms
                          </Badge>
                        )}
                      </div>
                      <Badge variant={resultado.status === 'success' ? 'default' : 
                                   resultado.status === 'error' ? 'destructive' : 
                                   resultado.status === 'warning' ? 'secondary' : 'outline'}>
                        {resultado.status === 'success' ? 'Sucesso' :
                         resultado.status === 'error' ? 'Erro' :
                         resultado.status === 'warning' ? 'Aviso' : 'Pendente'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{resultado.mensagem}</p>
                    
                    {resultado.detalhes && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          Ver detalhes técnicos
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(resultado.detalhes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usuários Encontrados */}
        {usuarios.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários Encontrados ({usuarios.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {usuarios.slice(0, 5).map((usuario, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{usuario.nome}</p>
                      <p className="text-sm text-gray-600">{usuario.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant="outline">
                        {usuario.tipo}
                      </Badge>
                    </div>
                  </div>
                ))}
                {usuarios.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... e mais {usuarios.length - 5} usuários
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Alert className="mt-6">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Instruções:</strong> Este teste verifica todas as funcionalidades críticas da API Admin. 
            Se algum teste falhar, verifique os logs do console e os detalhes técnicos de cada resultado.
            Os testes incluem verificação de conectividade, listagem de usuários, edição e alteração de status.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}