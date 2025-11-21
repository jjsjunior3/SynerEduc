import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  BookOpen,
  Loader2,
  RefreshCcw,
  Wrench,
  Database,
  Bug
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoErroDisciplinasEspecificoProps {
  onVoltar: () => void;
}

export function CorrecaoErroDisciplinasEspecifico({ onVoltar }: CorrecaoErroDisciplinasEspecificoProps) {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [fixing, setFixing] = useState(false);

  const adicionarResultado = (teste: string, status: 'sucesso' | 'erro', detalhes: any) => {
    setResultados(prev => [...prev, {
      teste,
      status,
      detalhes,
      timestamp: new Date().toISOString()
    }]);
  };

  const diagnosticarAPIDisciplinas = async () => {
    try {
      console.log('[CORRECAO_DISCIPLINAS] Testando API de disciplinas...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[CORRECAO_DISCIPLINAS] Dados da API:', data);
        
        // Análise detalhada da estrutura dos dados
        const analise = {
          response_ok: response.ok,
          has_disciplinas: !!data.disciplinas,
          disciplinas_is_array: Array.isArray(data.disciplinas),
          disciplinas_length: data.disciplinas?.length || 0,
          first_disciplina: data.disciplinas?.[0] || null,
          disciplinas_sample: data.disciplinas?.slice(0, 3) || [],
          disciplinas_invalid: [],
          disciplinas_valid: []
        };

        // Verificar disciplinas inválidas
        if (data.disciplinas && Array.isArray(data.disciplinas)) {
          data.disciplinas.forEach((disc: any, index: number) => {
            if (!disc || typeof disc !== 'object' || !disc.nome || !disc.serie) {
              analise.disciplinas_invalid.push({ index, disc });
            } else {
              analise.disciplinas_valid.push({ index, nome: disc.nome, serie: disc.serie });
            }
          });
        }

        adicionarResultado('Análise API Disciplinas', 'sucesso', analise);
        return { success: true, data };
      } else {
        adicionarResultado('Análise API Disciplinas', 'erro', {
          status: response.status,
          statusText: response.statusText
        });
        return { success: false };
      }
    } catch (error) {
      adicionarResultado('Análise API Disciplinas', 'erro', error.message);
      return { success: false };
    }
  };

  const testarFuncaoDisciplinas = async () => {
    try {
      console.log('[CORRECAO_DISCIPLINAS] Testando função getDisciplinasPorSerie...');
      
      const { getDisciplinasPorSerie, clearCache } = await import('../utils/disciplinasPorSerie');
      clearCache(); // Limpar cache antes do teste
      
      const seriesTeste = [
        '3ª série - Ensino Médio',
        '1ª série - Ensino Médio',
        '2ª série - Ensino Médio'
      ];

      for (const serie of seriesTeste) {
        try {
          const disciplinas = await getDisciplinasPorSerie(serie as any);
          
          const analise = {
            serie: serie,
            disciplinas_count: disciplinas.length,
            disciplinas_validas: disciplinas.filter(d => d && d.nome && d.serie).length,
            disciplinas_invalidas: disciplinas.filter(d => !d || !d.nome || !d.serie).length,
            primeira_disciplina: disciplinas[0] || null,
            todas_disciplinas: disciplinas.map(d => ({ nome: d?.nome, serie: d?.serie, id: d?.id }))
          };
          
          adicionarResultado(`Teste getDisciplinasPorSerie (${serie})`, 'sucesso', analise);
        } catch (error) {
          adicionarResultado(`Teste getDisciplinasPorSerie (${serie})`, 'erro', {
            serie: serie,
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5)
          });
        }
      }
    } catch (error) {
      adicionarResultado('Import getDisciplinasPorSerie', 'erro', error.message);
    }
  };

  const regenerarDisciplinasServidor = async () => {
    try {
      console.log('[CORRECAO_DISCIPLINAS] Solicitando regeneração de disciplinas no servidor...');
      
      // Fazer uma requisição para forçar regeneração das disciplinas
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas?refresh=true`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        adicionarResultado('Regeneração Disciplinas Servidor', 'sucesso', {
          disciplinas_count: data.disciplinas?.length || 0,
          timestamp: new Date().toISOString()
        });
        return true;
      } else {
        adicionarResultado('Regeneração Disciplinas Servidor', 'erro', {
          status: response.status,
          statusText: response.statusText
        });
        return false;
      }
    } catch (error) {
      adicionarResultado('Regeneração Disciplinas Servidor', 'erro', error.message);
      return false;
    }
  };

  const corrigirProblemaEspecifico = async () => {
    setFixing(true);
    
    try {
      console.log('[CORRECAO_DISCIPLINAS] Iniciando correção específica...');
      
      // 1. Limpar cache local
      try {
        const { clearCache } = await import('../utils/disciplinasPorSerie');
        clearCache();
        adicionarResultado('Limpeza Cache Local', 'sucesso', 'Cache limpo com sucesso');
      } catch (error) {
        adicionarResultado('Limpeza Cache Local', 'erro', error.message);
      }
      
      // 2. Solicitar regeneração no servidor
      await regenerarDisciplinasServidor();
      
      // Aguardar um pouco para o servidor processar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Testar novamente
      await diagnosticarAPIDisciplinas();
      await testarFuncaoDisciplinas();
      
      toast.success('✅ Correção específica de disciplinas concluída!');
      
    } catch (error) {
      console.error('[CORRECAO_DISCIPLINAS] Erro:', error);
      toast.error('❌ Erro durante a correção');
    } finally {
      setFixing(false);
    }
  };

  const executarDiagnosticoCompleto = async () => {
    setLoading(true);
    setResultados([]);

    try {
      toast.info('🔍 Iniciando diagnóstico específico de disciplinas...');
      
      // 1. Diagnosticar API
      await diagnosticarAPIDisciplinas();
      
      // 2. Testar função local
      await testarFuncaoDisciplinas();
      
      toast.success('✅ Diagnóstico específico concluído!');
      
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast.error('❌ Erro durante o diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const limparResultados = () => {
    setResultados([]);
  };

  return (
    <div className="min-h-screen bg-red-50">
      {/* Header */}
      <div className="bg-red-600 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-red-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">🐛 CORREÇÃO ESPECÍFICA - DISCIPLINAS INVÁLIDAS</h1>
            <p className="text-sm opacity-90">Solução para: "Disciplina inválida encontrada" e "Nenhuma disciplina encontrada"</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Card de controles */}
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Bug className="w-5 h-5" />
              Correção de Disciplinas Inválidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={executarDiagnosticoCompleto}
                disabled={loading || fixing}
                className="flex-1 bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Diagnosticando...
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5 mr-2" />
                    Diagnosticar Disciplinas
                  </>
                )}
              </Button>

              <Button 
                onClick={corrigirProblemaEspecifico}
                disabled={loading || fixing}
                variant="outline"
                size="lg"
              >
                {fixing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Corrigindo...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5 mr-2" />
                    Corrigir Problema
                  </>
                )}
              </Button>

              <Button 
                onClick={limparResultados}
                disabled={loading || fixing}
                variant="outline"
                size="lg"
              >
                <RefreshCcw className="w-5 h-5 mr-2" />
                Limpar
              </Button>
            </div>

            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">🎯 ERROS ESPECÍFICOS:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• <code>[DISCIPLINAS] Disciplina inválida encontrada:</code></li>
                <li>• <code>[DISCIPLINAS] Nenhuma disciplina encontrada, usando padrão</code></li>
                <li>• Estrutura de dados inconsistente da API</li>
                <li>• Problemas na validação de disciplinas</li>
              </ul>
            </div>

            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">🔧 CORREÇÕES APLICADAS:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Corrigida interpretação da estrutura de dados da API</li>
                <li>• Melhorada validação de disciplinas inválidas</li>
                <li>• Logs detalhados para identificar problema exato</li>
                <li>• Fallback robusto para disciplinas padrão</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Resultados da Análise ({resultados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      resultado.status === 'sucesso'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {resultado.status === 'sucesso' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <h3 className="font-medium">{resultado.teste}</h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        resultado.status === 'sucesso'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {resultado.status === 'sucesso' ? 'SUCESSO' : 'ERRO'}
                      </span>
                    </div>
                    
                    <div className="text-sm bg-white p-3 rounded border max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(resultado.detalhes, null, 2)}
                      </pre>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(resultado.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Sobre Este Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <h4 className="font-semibold text-yellow-800 mb-1">⚠️ PROBLEMA IDENTIFICADO:</h4>
                <p className="text-yellow-700">
                  O servidor estava retornando disciplinas em formato de array direto, 
                  mas o frontend estava tentando fazer <code>.map(item =&gt; item.value)</code>, 
                  causando disciplinas inválidas (undefined).
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h4 className="font-semibold text-green-800 mb-1">✅ CORREÇÃO APLICADA:</h4>
                <p className="text-green-700">
                  Corrigida a função <code>getDisciplinasPorSerie</code> para interpretar 
                  corretamente a estrutura de dados retornada pela API.
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="font-semibold text-blue-800 mb-1">🔍 O QUE ESTE DIAGNÓSTICO FAZ:</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• Analisa a estrutura exata dos dados da API</li>
                  <li>• Identifica disciplinas inválidas vs válidas</li>
                  <li>• Testa a função de processamento local</li>
                  <li>• Força regeneração de disciplinas no servidor</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}