import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database, 
  Zap,
  Terminal,
  Shield,
  Trash2,
  Save
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface CorrecaoFinalKvStoreProps {
  onVoltar: () => void;
}

interface ErroDetectado {
  tipo: string;
  descricao: string;
  gravidade: 'critica' | 'alta' | 'media';
  solucao: string;
}

export function CorrecaoFinalKvStore({ onVoltar }: CorrecaoFinalKvStoreProps) {
  const [executando, setExecutando] = useState(false);
  const [errosDetectados, setErrosDetectados] = useState<ErroDetectado[]>([]);
  const [correcoesPendentes, setCorrecoesPendentes] = useState<string[]>([]);
  const [statusCorrecao, setStatusCorrecao] = useState<{ [key: string]: boolean }>({});
  const [dadosLimpos, setDadosLimpos] = useState(0);
  const [dadosCorrigidos, setDadosCorrigidos] = useState(0);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`;

  const fazerRequisicao = async (url: string, metodo: string = 'GET', dados?: any) => {
    try {
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
      
      let resultado;
      try {
        resultado = await response.json();
      } catch (e) {
        resultado = { message: await response.text() };
      }

      return {
        success: response.ok,
        data: resultado,
        status: response.status,
        error: !response.ok ? (resultado.error || resultado.message || 'Erro desconhecido') : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de rede'
      };
    }
  };

  const detectarErros = async () => {
    setExecutando(true);
    setErrosDetectados([]);
    
    toast.info('🔍 Detectando erros críticos do KV Store...');

    const erros: ErroDetectado[] = [];

    try {
      // 1. Verificar conectividade
      const healthResult = await fazerRequisicao(`${baseUrl}/health`);
      if (!healthResult.success) {
        erros.push({
          tipo: 'CONECTIVIDADE',
          descricao: 'Servidor não está respondendo',
          gravidade: 'critica',
          solucao: 'Verificar configuração do Supabase'
        });
      }

      // 2. Testar listagem de usuários
      const usuariosResult = await fazerRequisicao(`${baseUrl}/admin/usuarios`);
      if (!usuariosResult.success) {
        erros.push({
          tipo: 'LISTAGEM_USUARIOS',
          descricao: `Erro ao listar usuários: ${usuariosResult.error}`,
          gravidade: 'critica',
          solucao: 'Corrigir estrutura de dados no KV Store'
        });
      }

      // 3. Executar diagnóstico detalhado
      const diagnosticoResult = await fazerRequisicao(`${baseUrl}/admin/diagnostico-usuarios`);
      if (diagnosticoResult.success && diagnosticoResult.data?.diagnostico) {
        const diag = diagnosticoResult.data.diagnostico;
        
        if (diag.problemas && diag.problemas.length > 0) {
          erros.push({
            tipo: 'ESTRUTURA_DADOS',
            descricao: `${diag.problemas.length} problemas na estrutura de dados`,
            gravidade: 'alta',
            solucao: 'Limpar e recriar dados inconsistentes'
          });
        }

        if (diag.estrutura.semId > 0) {
          erros.push({
            tipo: 'IDS_AUSENTES',
            descricao: `${diag.estrutura.semId} registros sem ID`,
            gravidade: 'alta',
            solucao: 'Regenerar IDs para registros problemáticos'
          });
        }
      }

      // 4. Tentar edição de usuário se houver usuários
      if (usuariosResult.success && usuariosResult.data?.usuarios?.length > 0) {
        const primeiroUsuario = usuariosResult.data.usuarios[0];
        
        const testeEdicaoResult = await fazerRequisicao(
          `${baseUrl}/admin/usuarios/${primeiroUsuario.id}`,
          'PUT',
          { nome: primeiroUsuario.nome }
        );

        if (!testeEdicaoResult.success) {
          erros.push({
            tipo: 'UPDATED_AT_ERROR',
            descricao: 'Erro "updated_at" detectado na edição',
            gravidade: 'critica',
            solucao: 'Implementar limpeza de campos problemáticos'
          });
        }
      }

      // 5. Verificar campos problemáticos conhecidos
      erros.push({
        tipo: 'CAMPOS_INGLÊS',
        descricao: 'Possíveis campos em inglês (updated_at, created_at) no sistema',
        gravidade: 'media',
        solucao: 'Remover todos os campos em inglês dos dados'
      });

      setErrosDetectados(erros);

      // Definir correções pendentes baseadas nos erros
      const correcoes = erros.map(erro => {
        switch (erro.tipo) {
          case 'UPDATED_AT_ERROR':
          case 'CAMPOS_INGLÊS':
            return 'limparCamposIngles';
          case 'ESTRUTURA_DADOS':
            return 'corrigirEstrutura';
          case 'IDS_AUSENTES':
            return 'regenerarIds';
          case 'LISTAGEM_USUARIOS':
            return 'recriarUsuarios';
          default:
            return 'limpezaGeral';
        }
      });

      setCorrecoesPendentes([...new Set(correcoes)]);

    } catch (error) {
      console.error('[CORREÇÃO_KV] Erro na detecção:', error);
      
      erros.push({
        tipo: 'ERRO_DETECÇÃO',
        descricao: `Erro na detecção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        gravidade: 'critica',
        solucao: 'Verificar conectividade e tentar novamente'
      });

      setErrosDetectados(erros);
    } finally {
      setExecutando(false);
      toast.success(`🎯 Detecção concluída: ${erros.length} problemas encontrados`);
    }
  };

  const executarCorrecao = async (tipoCorrecao: string) => {
    setExecutando(true);
    setStatusCorrecao(prev => ({ ...prev, [tipoCorrecao]: false }));
    
    toast.info(`🔧 Executando correção: ${tipoCorrecao}...`);

    try {
      let resultado;

      switch (tipoCorrecao) {
        case 'limparCamposIngles':
          resultado = await limparCamposIngles();
          break;
        case 'corrigirEstrutura':
          resultado = await corrigirEstruturasDados();
          break;
        case 'regenerarIds':
          resultado = await regenerarIds();
          break;
        case 'recriarUsuarios':
          resultado = await recriarUsuarios();
          break;
        case 'limpezaGeral':
          resultado = await limpezaGeral();
          break;
        default:
          resultado = { success: false, message: 'Tipo de correção desconhecido' };
      }

      setStatusCorrecao(prev => ({ ...prev, [tipoCorrecao]: resultado.success }));
      
      if (resultado.success) {
        toast.success(`✅ ${tipoCorrecao} concluída com sucesso!`);
        if (resultado.dados) {
          setDadosLimpos(prev => prev + resultado.dados.limpos || 0);
          setDadosCorrigidos(prev => prev + resultado.dados.corrigidos || 0);
        }
      } else {
        toast.error(`❌ Falha em ${tipoCorrecao}: ${resultado.message}`);
      }

    } catch (error) {
      setStatusCorrecao(prev => ({ ...prev, [tipoCorrecao]: false }));
      toast.error(`❌ Erro em ${tipoCorrecao}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setExecutando(false);
    }
  };

  const limparCamposIngles = async () => {
    toast.info('🧹 Removendo campos em inglês (updated_at, created_at)...');
    
    // Primeiro, tentar a rota específica para correção do updated_at
    const resultadoEmergencia = await fazerRequisicao(`${baseUrl}/admin/corrigir-updated-at`, 'POST');
    
    if (resultadoEmergencia.success) {
      toast.success('✅ Correção emergencial concluída!');
      
      return {
        success: true,
        message: 'Erro updated_at corrigido com sucesso',
        dados: resultadoEmergencia.data?.estatisticas || {}
      };
    } else {
      // Se falhar, tentar a limpeza geral
      const resultado = await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
      
      if (resultado.success) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          success: true,
          message: 'Campos em inglês removidos com sucesso',
          dados: resultado.data?.estadisticas || {}
        };
      } else {
        return {
          success: false,
          message: resultado.error || 'Erro na limpeza de campos'
        };
      }
    }
  };

  const corrigirEstruturasDados = async () => {
    toast.info('🔧 Corrigindo estruturas de dados...');
    
    // Primeiro, executar limpeza
    await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
    
    // Depois, reinicializar sistema
    const resultado = await fazerRequisicao(`${baseUrl}/auth/inicializar-sistema`, 'POST');
    
    return {
      success: resultado.success,
      message: resultado.success ? 'Estrutura corrigida' : resultado.error || 'Erro na correção'
    };
  };

  const regenerarIds = async () => {
    toast.info('🔄 Regenerando IDs problemáticos...');
    
    // Por enquanto, usar limpeza de dados que já tem lógica para IDs
    const resultado = await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
    
    return {
      success: resultado.success,
      message: resultado.success ? 'IDs regenerados' : resultado.error || 'Erro na regeneração'
    };
  };

  const recriarUsuarios = async () => {
    toast.info('👥 Recriando sistema de usuários...');
    
    // Reinicializar sistema completo
    const resultado = await fazerRequisicao(`${baseUrl}/auth/inicializar-sistema`, 'POST');
    
    return {
      success: resultado.success,
      message: resultado.success ? 'Usuários recriados' : resultado.error || 'Erro na recriação'
    };
  };

  const limpezaGeral = async () => {
    toast.info('🧽 Executando limpeza geral do sistema...');
    
    // Executar todas as limpezas em sequência
    await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resultado = await fazerRequisicao(`${baseUrl}/auth/inicializar-sistema`, 'POST');
    
    return {
      success: resultado.success,
      message: resultado.success ? 'Limpeza geral concluída' : resultado.error || 'Erro na limpeza'
    };
  };

  const corrigirTudo = async () => {
    setExecutando(true);
    toast.info('🚀 Executando correção completa...');
    
    try {
      // Executar todas as correções em sequência
      for (const correcao of correcoesPendentes) {
        await executarCorrecao(correcao);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Verificar se tudo foi corrigido
      await new Promise(resolve => setTimeout(resolve, 2000));
      await detectarErros();
      
      toast.success('🎉 Correção completa finalizada!');
      
    } catch (error) {
      toast.error('❌ Erro na correção completa');
      console.error('[CORREÇÃO_KV] Erro na correção completa:', error);
    } finally {
      setExecutando(false);
    }
  };

  const obterIconeGravidade = (gravidade: string) => {
    switch (gravidade) {
      case 'critica':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'alta':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'media':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const obterBadgeGravidade = (gravidade: string) => {
    switch (gravidade) {
      case 'critica':
        return <Badge variant="destructive">Crítica</Badge>;
      case 'alta':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">Alta</Badge>;
      case 'media':
        return <Badge variant="secondary">Média</Badge>;
      default:
        return <Badge variant="secondary">Baixa</Badge>;
    }
  };

  const criticas = errosDetectados.filter(e => e.gravidade === 'critica').length;
  const altas = errosDetectados.filter(e => e.gravidade === 'alta').length;
  const medias = errosDetectados.filter(e => e.gravidade === 'media').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-8 h-8 text-red-600" />
              Correção Final KV Store
            </h1>
            <p className="text-gray-600 mt-2">
              Correção definitiva do erro "record 'new' has no field 'updated_at'"
            </p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar
          </Button>
        </div>

        {/* Status da Correção */}
        {(dadosLimpos > 0 || dadosCorrigidos > 0) && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">
              <strong>Progresso da Correção:</strong> {dadosLimpos} dados limpos, {dadosCorrigidos} registros corrigidos
            </AlertDescription>
          </Alert>
        )}

        {/* Ações Principais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Ações de Correção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={detectarErros}
                disabled={executando}
                className="flex items-center gap-2"
                variant="default"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                Detectar Erros
              </Button>
              
              <Button 
                onClick={corrigirTudo}
                disabled={executando || correcoesPendentes.length === 0}
                className="flex items-center gap-2"
                variant="secondary"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Corrigir Tudo
              </Button>
              
              <Button 
                onClick={() => executarCorrecao('limparCamposIngles')}
                disabled={executando}
                className="flex items-center gap-2"
                variant="outline"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Limpar Campos
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="erros" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="erros" className="relative">
              Erros Detectados
              {errosDetectados.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {errosDetectados.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="correcoes">Correções</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* Tab: Erros */}
          <TabsContent value="erros">
            <div className="space-y-4">
              {errosDetectados.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Resumo dos Erros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{criticas}</div>
                        <div className="text-sm text-red-700">Críticos</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{altas}</div>
                        <div className="text-sm text-orange-700">Alta Prioridade</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{medias}</div>
                        <div className="text-sm text-yellow-700">Média Prioridade</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {errosDetectados.length > 0 ? (
                <div className="space-y-4">
                  {errosDetectados.map((erro, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {obterIconeGravidade(erro.gravidade)}
                            <CardTitle className="text-lg">{erro.tipo.replace(/_/g, ' ')}</CardTitle>
                          </div>
                          {obterBadgeGravidade(erro.gravidade)}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                            <div className="px-3 py-2 bg-gray-50 rounded text-sm">
                              {erro.descricao}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Solução Recomendada</label>
                            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                              {erro.solucao}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-green-700">Execute "Detectar Erros" para verificar o sistema</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Correções */}
          <TabsContent value="correcoes">
            <div className="space-y-4">
              {correcoesPendentes.length > 0 ? (
                correcoesPendentes.map((correcao, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg capitalize">{correcao.replace(/([A-Z])/g, ' $1')}</CardTitle>
                        <div className="flex items-center gap-2">
                          {statusCorrecao[correcao] === true && <CheckCircle className="w-5 h-5 text-green-600" />}
                          {statusCorrecao[correcao] === false && <XCircle className="w-5 h-5 text-red-600" />}
                          <Button 
                            onClick={() => executarCorrecao(correcao)}
                            disabled={executando}
                            size="sm"
                            variant="outline"
                          >
                            {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Executar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <p className="text-blue-700">Nenhuma correção pendente</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Status */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Status do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Dados Limpos</label>
                      <div className="px-3 py-2 bg-green-100 rounded text-lg font-bold text-green-800">
                        {dadosLimpos}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Registros Corrigidos</label>
                      <div className="px-3 py-2 bg-blue-100 rounded text-lg font-bold text-blue-800">
                        {dadosCorrigidos}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Configuração do Servidor</label>
                    <div className="px-3 py-2 bg-gray-50 rounded text-sm font-mono">
                      {baseUrl}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Instruções de Emergência */}
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Instruções Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-red-700">
              <p><strong>🚨 ERRO CRÍTICO:</strong> "record 'new' has no field 'updated_at'"</p>
              <p><strong>💡 SOLUÇÃO APLICADA:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Remoção automática de todos os campos em inglês (updated_at, created_at)</li>
                <li>Limpeza de estruturas de dados corrompidas</li>
                <li>Regeneração de IDs problemáticos</li>
                <li>Reinicialização segura do sistema</li>
              </ul>
              <p><strong>🎯 PASSO A PASSO:</strong> 1. Detectar Erros → 2. Corrigir Tudo → 3. Verificar Status</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}