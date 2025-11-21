import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteConectividadeProps {
  onVoltar: () => void;
}

interface TesteResultado {
  nome: string;
  url: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  tempo: number;
  detalhes: string;
  dados?: any;
}

export function TesteConectividade({ onVoltar }: TesteConectividadeProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<TesteResultado[]>([]);

  const testes = [
    {
      nome: 'Health Check Geral',
      url: `https://${projectId}.supabase.co/functions/v1/health`,
      metodo: 'GET',
      headers: {}
    },
    {
      nome: 'Health Check AVA',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`,
      metodo: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    },
    {
      nome: 'Health Check Admin',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/health`,
      metodo: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    },
    {
      nome: 'API Usuários',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`,
      metodo: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    },
    {
      nome: 'API Relatórios',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios`,
      metodo: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    },
    {
      nome: 'Debug Usuários',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/debug-usuarios`,
      metodo: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    }
  ];

  const executarTeste = async (teste: any): Promise<TesteResultado> => {
    const inicioTempo = Date.now();
    
    try {
      const response = await fetch(teste.url, {
        method: teste.metodo,
        headers: teste.headers,
        signal: AbortSignal.timeout(10000) // Timeout de 10 segundos
      });
      
      const tempo = Date.now() - inicioTempo;
      const dados = await response.json().catch(() => null);
      
      if (response.ok) {
        return {
          nome: teste.nome,
          url: teste.url,
          status: 'success',
          tempo,
          detalhes: `✅ Sucesso (${response.status}) - ${tempo}ms`,
          dados
        };
      } else {
        return {
          nome: teste.nome,
          url: teste.url,
          status: 'error',
          tempo,
          detalhes: `❌ Erro HTTP ${response.status}: ${response.statusText}`,
          dados
        };
      }
    } catch (error) {
      const tempo = Date.now() - inicioTempo;
      
      let detalhes = '';
      let status: 'error' | 'warning' = 'error';
      
      if (error.name === 'TimeoutError') {
        detalhes = '⏱️ Timeout - Servidor não respondeu em 10s';
        status = 'warning';
      } else if (error.message.includes('Failed to fetch')) {
        detalhes = '🔌 Erro de conexão - Verifique internet/servidor';
        status = 'error';
      } else if (error.message.includes('NetworkError')) {
        detalhes = '📡 Erro de rede - Servidor pode estar offline';
        status = 'error';
      } else {
        detalhes = `💥 Erro: ${error.message}`;
        status = 'error';
      }
      
      return {
        nome: teste.nome,
        url: teste.url,
        status,
        tempo,
        detalhes
      };
    }
  };

  const executarTodosTestes = async () => {
    setTestando(true);
    setResultados([]);
    
    toast.info('🧪 Iniciando testes de conectividade...');
    
    const resultadosTemp: TesteResultado[] = [];
    
    for (const teste of testes) {
      // Adicionar estado de loading
      const resultadoLoading: TesteResultado = {
        nome: teste.nome,
        url: teste.url,
        status: 'loading',
        tempo: 0,
        detalhes: '🔄 Testando...'
      };
      
      resultadosTemp.push(resultadoLoading);
      setResultados([...resultadosTemp]);
      
      // Executar teste
      const resultado = await executarTeste(teste);
      
      // Atualizar resultado
      resultadosTemp[resultadosTemp.length - 1] = resultado;
      setResultados([...resultadosTemp]);
      
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Resumo final
    const sucessos = resultadosTemp.filter(r => r.status === 'success').length;
    const erros = resultadosTemp.filter(r => r.status === 'error').length;
    const avisos = resultadosTemp.filter(r => r.status === 'warning').length;
    
    if (sucessos === testes.length) {
      toast.success(`🎉 Todos os ${sucessos} testes passaram!`);
    } else if (erros > 0) {
      toast.error(`❌ ${erros} testes falharam, ${sucessos} sucessos`);
    } else {
      toast.warning(`⚠️ ${avisos} avisos, ${sucessos} sucessos`);
    }
    
    setTestando(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'loading':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'loading':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const estatisticas = {
    total: resultados.length,
    sucessos: resultados.filter(r => r.status === 'success').length,
    erros: resultados.filter(r => r.status === 'error').length,
    avisos: resultados.filter(r => r.status === 'warning').length,
    tempoMedio: resultados.length > 0 
      ? Math.round(resultados.reduce((acc, r) => acc + r.tempo, 0) / resultados.length)
      : 0
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
              <h1 className="text-xl font-semibold text-gray-900">Teste de Conectividade</h1>
              <p className="text-sm text-gray-600">Diagnosticar problemas de conexão com as APIs</p>
            </div>
          </div>
          <Button 
            onClick={executarTodosTestes}
            disabled={testando}
            className="flex items-center gap-2"
          >
            {testando ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            {testando ? 'Testando...' : 'Executar Testes'}
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Estatísticas */}
          {resultados.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{estatisticas.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{estatisticas.sucessos}</div>
                  <div className="text-sm text-gray-600">Sucessos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{estatisticas.erros}</div>
                  <div className="text-sm text-gray-600">Erros</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{estatisticas.avisos}</div>
                  <div className="text-sm text-gray-600">Avisos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{estatisticas.tempoMedio}ms</div>
                  <div className="text-sm text-gray-600">Tempo Médio</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Informações da Configuração */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Configuração Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Project ID:</strong> {projectId}
                </div>
                <div>
                  <strong>Base URL:</strong> https://{projectId}.supabase.co
                </div>
                <div>
                  <strong>Public Key:</strong> {publicAnonKey.substring(0, 20)}...
                </div>
                <div>
                  <strong>Server Prefix:</strong> /functions/v1/make-server-c61d1ad0
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultados dos Testes */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados dos Testes ({resultados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {resultados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wifi className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Clique em "Executar Testes" para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resultados.map((resultado, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(resultado.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{resultado.nome}</h3>
                            <Badge className={getStatusColor(resultado.status)}>
                              {resultado.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{resultado.detalhes}</p>
                          <p className="text-xs text-gray-500 font-mono break-all">
                            {resultado.url}
                          </p>
                          {resultado.dados && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 cursor-pointer">
                                Ver dados da resposta
                              </summary>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                                {JSON.stringify(resultado.dados, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {resultado.tempo}ms
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dicas de Resolução */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>💡 Dicas para Resolução de Problemas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p><strong>🔌 Erro de conexão:</strong> Verifique sua conexão com a internet e se o servidor Supabase está online.</p>
                <p><strong>⏱️ Timeout:</strong> O servidor pode estar sobrecarregado. Tente novamente em alguns minutos.</p>
                <p><strong>❌ Erro 404:</strong> A rota pode não estar implementada no servidor. Verifique se o deploy foi feito corretamente.</p>
                <p><strong>❌ Erro 500:</strong> Erro interno do servidor. Verifique os logs do Supabase Functions.</p>
                <p><strong>🔑 Erro de autorização:</strong> Verifique se as chaves do Supabase estão configuradas corretamente.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}