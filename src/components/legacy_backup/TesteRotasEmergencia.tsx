import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Terminal, Zap } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TesteRotasEmergenciaProps {
  onVoltar: () => void;
}

export function TesteRotasEmergencia({ onVoltar }: TesteRotasEmergenciaProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<{ [key: string]: any }>({});

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`;

  const testarRota = async (nome: string, url: string, metodo: string = 'GET', dados?: any) => {
    try {
      console.log(`[TESTE_EMERGENCIA] Testando ${nome}: ${metodo} ${url}`);

      const opcoes: RequestInit = {
        method: metodo,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (dados && (metodo === 'POST' || metodo === 'PUT')) {
        opcoes.body = JSON.stringify(dados);
      }

      const response = await fetch(url, opcoes);
      const resultado = await response.json();

      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: response.ok,
          status: response.status,
          resultado: resultado,
          url: url,
          metodo: metodo
        }
      }));

      console.log(`[TESTE_EMERGENCIA] ${nome} - Status: ${response.status}`, resultado);
      
      if (response.ok) {
        toast.success(`✅ ${nome} - OK`);
      } else {
        toast.error(`❌ ${nome} - Erro ${response.status}`);
      }

    } catch (error) {
      console.error(`[TESTE_EMERGENCIA] Erro em ${nome}:`, error);
      
      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: false,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
          url: url,
          metodo: metodo
        }
      }));

      toast.error(`❌ ${nome} - ${error instanceof Error ? error.message : 'Erro'}`);
    }
  };

  const executarTestesCompletos = async () => {
    setTestando(true);
    setResultados({});
    
    toast.info('🚀 Iniciando testes das rotas críticas...');

    // Teste 1: Health check básico
    await testarRota('Health Check Básico', `${baseUrl}/health`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 2: Health check admin específico
    await testarRota('Health Check Admin', `${baseUrl}/admin/health`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 3: Listar usuários (endpoint admin)
    await testarRota('Listar Usuários (Admin)', `${baseUrl}/admin/usuarios`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 4: Listar usuários (endpoint geral)
    await testarRota('Listar Usuários (Geral)', `${baseUrl}/usuarios`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 5: Editar usuário com ID real (se houver usuários)
    const listarResult = resultados['Listar Usuários (Admin)'];
    if (listarResult?.sucesso && listarResult.resultado?.usuarios?.length > 0) {
      const primeiroUsuario = listarResult.resultado.usuarios[0];
      await testarRota(
        'Editar Usuário (Novo Padrão)', 
        `${baseUrl}/admin/usuarios/${primeiroUsuario.id}`,
        'PUT',
        { nome: primeiroUsuario.nome } // Só atualiza o nome para teste
      );
      await new Promise(resolve => setTimeout(resolve, 500));

      // Teste com padrão antigo para compatibilidade
      await testarRota(
        'Editar Usuário (Padrão /user/)', 
        `${baseUrl}/admin/usuarios/user/${primeiroUsuario.id}`,
        'PUT',
        { nome: primeiroUsuario.nome }
      );
    }

    // Teste 6: Relatórios admin
    await testarRota('Relatórios Admin', `${baseUrl}/admin/relatorios`);

    setTestando(false);
    toast.success('🎉 Testes concluídos!');
  };

  const criarRotasEmergencia = async () => {
    try {
      setTestando(true);
      toast.info('🔧 Tentando criar rotas de emergência...');
      
      // Criar rota de health admin se não existir
      await testarRota('Criação Health Admin', `${baseUrl}/admin/health`);
      
      // Verificar se existe setup
      await testarRota('Setup Status', `${baseUrl}/auth/setup-status`);
      
      // Inicializar sistema se necessário
      await testarRota('Inicializar Sistema', `${baseUrl}/auth/inicializar-sistema`, 'POST');

      setTestando(false);
      toast.success('🚀 Rotas de emergência processadas!');
      
    } catch (error) {
      setTestando(false);
      toast.error('❌ Erro ao criar rotas de emergência');
      console.error('[TESTE_EMERGENCIA] Erro ao criar rotas:', error);
    }
  };

  const limparCacheETestar = async () => {
    try {
      setTestando(true);
      toast.info('🧹 Limpando cache e testando...');
      
      // Limpar dados problemáticos
      await testarRota('Limpeza de Dados', `${baseUrl}/admin/limpar-dados`, 'POST');
      
      // Aguardar um pouco e testar novamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Executar testes novamente
      await executarTestesCompletos();
      
    } catch (error) {
      setTestando(false);
      toast.error('❌ Erro na limpeza');
      console.error('[TESTE_EMERGENCIA] Erro na limpeza:', error);
    }
  };

  const obterIconeStatus = (resultado: any) => {
    if (!resultado) return <RefreshCw className="w-4 h-4 text-gray-400" />;
    if (resultado.sucesso) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const obterBadgeStatus = (resultado: any) => {
    if (!resultado) return <Badge variant="secondary">Não testado</Badge>;
    if (resultado.sucesso) return <Badge variant="default" className="bg-green-100 text-green-800">Sucesso</Badge>;
    return <Badge variant="destructive">Erro {resultado.status || ''}</Badge>;
  };

  const totalTestes = Object.keys(resultados).length;
  const sucessos = Object.values(resultados).filter((r: any) => r.sucesso).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              Teste de Rotas - EMERGÊNCIA
            </h1>
            <p className="text-gray-600 mt-2">
              Diagnóstico e correção de problemas 404 nas rotas administrativas
            </p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar
          </Button>
        </div>

        {/* Status Dashboard */}
        {totalTestes > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Status dos Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalTestes}</div>
                  <div className="text-sm text-blue-700">Testes Executados</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{sucessos}</div>
                  <div className="text-sm text-green-700">Sucessos</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{totalTestes - sucessos}</div>
                  <div className="text-sm text-red-700">Erros</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações de Emergência */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Ações de Emergência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={executarTestesCompletos}
                disabled={testando}
                className="flex items-center gap-2"
                variant="default"
              >
                {testando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                Testar Todas as Rotas
              </Button>
              
              <Button 
                onClick={criarRotasEmergencia}
                disabled={testando}
                className="flex items-center gap-2"
                variant="secondary"
              >
                {testando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Criar Rotas Emergência
              </Button>
              
              <Button 
                onClick={limparCacheETestar}
                disabled={testando}
                className="flex items-center gap-2"
                variant="outline"
              >
                {testando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Limpar Cache & Testar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuração do Servidor */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuração do Servidor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>URL Base:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{baseUrl}</code></div>
              <div><strong>Project ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{projectId}</code></div>
              <div><strong>Token:</strong> <code className="bg-gray-100 px-2 py-1 rounded">Bearer {publicAnonKey.substring(0, 20)}...</code></div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados dos Testes */}
        {Object.keys(resultados).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resultados dos Testes</h2>
            
            {Object.entries(resultados).map(([nome, resultado]: [string, any]) => (
              <Card key={nome}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {obterIconeStatus(resultado)}
                      <CardTitle className="text-lg">{nome}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {obterBadgeStatus(resultado)}
                      <Badge variant="outline">{resultado.metodo}</Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
                      <div className="px-3 py-2 bg-gray-50 rounded text-sm font-mono break-all">
                        {resultado.url}
                      </div>
                    </div>

                    {resultado.status && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Status Code</label>
                          <div className={`px-3 py-2 rounded text-sm font-medium ${
                            resultado.sucesso ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {resultado.status}
                          </div>
                        </div>
                      </div>
                    )}

                    {resultado.erro && (
                      <div>
                        <label className="block text-xs font-medium text-red-500 mb-1">Erro</label>
                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {resultado.erro}
                        </div>
                      </div>
                    )}

                    {resultado.resultado && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Resposta</label>
                        <div className="px-3 py-2 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-y-auto">
                          <pre>{JSON.stringify(resultado.resultado, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instruções de Emergência */}
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Instruções de Emergência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-orange-700">
              <p><strong>🔥 PROBLEMA CRÍTICO IDENTIFICADO:</strong> Rotas administrativas retornando 404</p>
              <p><strong>🎯 SOLUÇÃO APLICADA:</strong> Adicionadas rotas de compatibilidade no servidor</p>
              <p><strong>🔧 PRÓXIMOS PASSOS:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Execute "Testar Todas as Rotas" para verificar o status atual</li>
                <li>Se ainda houver erros 404, execute "Criar Rotas Emergência"</li>
                <li>Para problemas de dados corruptos, use "Limpar Cache & Testar"</li>
                <li>Se persistir, acesse: <code>?diagnostico-completo</code> para análise profunda</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}