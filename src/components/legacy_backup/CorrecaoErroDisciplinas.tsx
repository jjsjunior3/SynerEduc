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
  User,
  Database
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface CorrecaoErroDisciplinasProps {
  onVoltar: () => void;
}

export function CorrecaoErroDisciplinas({ onVoltar }: CorrecaoErroDisciplinasProps) {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [fixing, setFixing] = useState(false);
  
  const { usuario } = useAuth();

  const adicionarResultado = (teste: string, status: 'sucesso' | 'erro', detalhes: any) => {
    setResultados(prev => [...prev, {
      teste,
      status,
      detalhes,
      timestamp: new Date().toISOString()
    }]);
  };

  const diagnosticarUsuario = async () => {
    console.log('[DIAGNOSTICO_DISCIPLINAS] Verificando dados do usuário...');
    
    const diagnostico = {
      usuario_existe: !!usuario,
      usuario_id: usuario?.id || null,
      usuario_nome: usuario?.nome || null,
      usuario_serie: usuario?.serie || null,
      usuario_tipo: usuario?.tipo || null,
      usuario_objeto_completo: usuario
    };

    adicionarResultado('Diagnóstico do Usuário', 
      usuario ? 'sucesso' : 'erro', 
      diagnostico
    );

    return !!usuario;
  };

  const testarConectividadeDisciplinas = async () => {
    try {
      console.log('[DIAGNOSTICO_DISCIPLINAS] Testando conectividade com API de disciplinas...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        adicionarResultado('Conectividade API Disciplinas', 'sucesso', {
          status: response.status,
          disciplinas_count: data.disciplinas?.length || 0,
          sample_data: data.disciplinas?.slice(0, 3) || []
        });
        return true;
      } else {
        adicionarResultado('Conectividade API Disciplinas', 'erro', {
          status: response.status,
          statusText: response.statusText
        });
        return false;
      }
    } catch (error) {
      adicionarResultado('Conectividade API Disciplinas', 'erro', error.message);
      return false;
    }
  };

  const testarGetDisciplinasPorSerie = async () => {
    try {
      console.log('[DIAGNOSTICO_DISCIPLINAS] Testando função getDisciplinasPorSerie...');
      
      // Testar com série padrão
      const seriesTeste = [
        '3ª série - Ensino Médio',
        '1ª série - Ensino Médio', 
        '2ª série - Ensino Médio',
        usuario?.serie || '3ª série - Ensino Médio'
      ];

      for (const serie of seriesTeste) {
        try {
          // Importar dinamicamente para testar
          const { getDisciplinasPorSerie } = await import('../utils/disciplinasPorSerie');
          const disciplinas = await getDisciplinasPorSerie(serie as any);
          
          adicionarResultado(`Teste getDisciplinasPorSerie (${serie})`, 'sucesso', {
            serie: serie,
            disciplinas_count: disciplinas.length,
            disciplinas_nomes: disciplinas.map(d => d.nome),
            sample_disciplina: disciplinas[0] || null
          });
        } catch (error) {
          adicionarResultado(`Teste getDisciplinasPorSerie (${serie})`, 'erro', {
            serie: serie,
            error: error.message,
            stack: error.stack
          });
        }
      }
    } catch (error) {
      adicionarResultado('Import getDisciplinasPorSerie', 'erro', error.message);
    }
  };

  const verificarDadosUsuarioCompletos = async () => {
    if (!usuario?.id) {
      adicionarResultado('Verificação Dados Usuário', 'erro', 'Usuário não está logado');
      return false;
    }

    try {
      // Buscar dados completos do usuário do servidor
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const usuarioCompleto = data.usuarios?.find((u: any) => u.id === usuario.id);
        
        adicionarResultado('Dados Completos do Usuário', 'sucesso', {
          usuario_frontend: usuario,
          usuario_backend: usuarioCompleto,
          series_disponiveis: [
            '5º ano - Ensino Fundamental',
            '6º ano - Ensino Fundamental',
            '7º ano - Ensino Fundamental', 
            '8º ano - Ensino Fundamental',
            '9º ano - Ensino Fundamental',
            '1ª série - Ensino Médio',
            '2ª série - Ensino Médio',
            '3ª série - Ensino Médio'
          ]
        });
        
        return true;
      } else {
        adicionarResultado('Dados Completos do Usuário', 'erro', `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      adicionarResultado('Dados Completos do Usuário', 'erro', error.message);
      return false;
    }
  };

  const corrigirProblemasDisciplinas = async () => {
    setFixing(true);
    
    try {
      console.log('[CORRECAO_DISCIPLINAS] Iniciando correção automática...');
      
      // 1. Se usuário não tem série, definir uma padrão
      if (usuario && (!usuario.serie || usuario.serie.trim() === '')) {
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                serie: '3ª série - Ensino Médio'
              })
            }
          );

          if (response.ok) {
            adicionarResultado('Correção Série do Usuário', 'sucesso', 'Série padrão definida');
          } else {
            const errorData = await response.json();
            adicionarResultado('Correção Série do Usuário', 'erro', errorData);
          }
        } catch (error) {
          adicionarResultado('Correção Série do Usuário', 'erro', error.message);
        }
      }

      // 2. Limpar cache e testar novamente
      try {
        const { clearCache } = await import('../utils/disciplinasPorSerie');
        clearCache();
        adicionarResultado('Limpeza de Cache', 'sucesso', 'Cache de disciplinas limpo');
      } catch (error) {
        adicionarResultado('Limpeza de Cache', 'erro', error.message);
      }

      toast.success('✅ Correção de disciplinas concluída!');
      
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
      toast.info('🔍 Iniciando diagnóstico do erro de disciplinas...');
      
      // 1. Diagnosticar usuário
      await diagnosticarUsuario();
      
      // 2. Testar conectividade
      await testarConectividadeDisciplinas();
      
      // 3. Verificar dados completos do usuário
      await verificarDadosUsuarioCompletos();
      
      // 4. Testar função específica
      await testarGetDisciplinasPorSerie();
      
      toast.success('✅ Diagnóstico completo concluído!');
      
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
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-orange-600 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-orange-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">📚 CORREÇÃO - ERRO DE DISCIPLINAS</h1>
            <p className="text-sm opacity-90">Solução para: "Cannot read properties of undefined (reading 'serie')"</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Card de controles */}
        <Card className="mb-6 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <BookOpen className="w-5 h-5" />
              Diagnóstico do Erro de Disciplinas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={executarDiagnosticoCompleto}
                disabled={loading || fixing}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Executando Diagnóstico...
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5 mr-2" />
                    Executar Diagnóstico Completo
                  </>
                )}
              </Button>

              <Button 
                onClick={corrigirProblemasDisciplinas}
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
                    Corrigir Problemas
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

            <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-2">🎯 Objetivo:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Identificar por que `usuario.serie` está undefined</li>
                <li>• Verificar conectividade com API de disciplinas</li>
                <li>• Testar função getDisciplinasPorSerie</li>
                <li>• Corrigir dados do usuário se necessário</li>
              </ul>
            </div>

            {usuario && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">👤 Usuário Atual:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <div><strong>ID:</strong> {usuario.id}</div>
                  <div><strong>Nome:</strong> {usuario.nome}</div>
                  <div><strong>Email:</strong> {usuario.email}</div>
                  <div><strong>Tipo:</strong> {usuario.tipo}</div>
                  <div><strong>Série:</strong> {usuario.serie || '❌ NÃO DEFINIDA'}</div>
                  <div><strong>Turma:</strong> {usuario.turma || 'Não definida'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Resultados do Diagnóstico ({resultados.length})
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
            <CardTitle>📋 Instruções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-800 mb-1">🔥 ERRO QUE ESTE COMPONENTE RESOLVE:</h4>
                <p className="text-red-700">"TypeError: Cannot read properties of undefined (reading 'serie')"</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="font-semibold text-blue-800 mb-1">🔍 POSSÍVEIS CAUSAS:</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• Usuário não está logado corretamente</li>
                  <li>• Campo `serie` está null/undefined no usuário</li>
                  <li>• Problema na função getDisciplinasPorSerie</li>
                  <li>• Cache corrompido de disciplinas</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h4 className="font-semibold text-green-800 mb-1">✅ SOLUÇÕES APLICADAS:</h4>
                <ul className="text-green-700 space-y-1">
                  <li>• Verificação completa dos dados do usuário</li>
                  <li>• Definição de série padrão se necessário</li>
                  <li>• Limpeza de cache de disciplinas</li>
                  <li>• Testes de conectividade com APIs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}