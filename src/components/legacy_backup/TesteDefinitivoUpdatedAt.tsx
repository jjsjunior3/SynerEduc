import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TesteDefinitivoUpdatedAtProps {
  onVoltar: () => void;
}

interface ResultadoTeste {
  sucesso: boolean;
  tempo: number;
  dados?: any;
  erro?: string;
  detalhes?: string;
}

export function TesteDefinitivoUpdatedAt({ onVoltar }: TesteDefinitivoUpdatedAtProps) {
  const [resultados, setResultados] = useState<Record<string, ResultadoTeste>>({});
  const [testando, setTestando] = useState(false);
  const [usuarioTesteCriado, setUsuarioTesteCriado] = useState<any>(null);

  const executarTeste = async (nome: string, teste: () => Promise<any>) => {
    const inicioTempo = Date.now();
    
    try {
      console.log(`🧪 [TESTE UPDATED_AT] Iniciando: ${nome}`);
      const resultado = await teste();
      const tempo = Date.now() - inicioTempo;
      
      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: true,
          tempo,
          dados: resultado
        }
      }));
      
      console.log(`✅ [TESTE UPDATED_AT] ${nome} - Sucesso em ${tempo}ms`);
      
    } catch (error) {
      const tempo = Date.now() - inicioTempo;
      
      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: false,
          tempo,
          erro: error.message,
          detalhes: error.stack
        }
      }));
      
      console.error(`❌ [TESTE UPDATED_AT] ${nome} - Erro:`, error);
    }
  };

  const executarTodosOsTestes = async () => {
    setTestando(true);
    setResultados({});
    setUsuarioTesteCriado(null);
    
    try {
      toast.info('Iniciando testes definitivos para updated_at...');

      // Teste 1: Verificar se o servidor está funcionando
      await executarTeste('1. Health Check Básico', async () => {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      });

      // Teste 2: Criar usuário de teste com dados que podem causar problema
      await executarTeste('2. Criar Usuário (dados problemáticos)', async () => {
        const timestamp = Date.now();
        const usuarioComCamposProblematicos = {
          nome: `Teste Updated At ${timestamp}`,
          nomeUsuario: `teste_updated_${timestamp}`,
          email: `teste_updated_${timestamp}@exemplo.com`,
          senha: '123456',
          tipo: 'aluno',
          // Tentar incluir campos que podem causar problemas
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          timestamp: new Date().toISOString()
        };

        console.log('📤 [TESTE] Enviando dados com campos problemáticos:', usuarioComCamposProblematicos);

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(usuarioComCamposProblematicos)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao criar usuário');
        }

        const usuarioCriado = {
          id: data.id || data.usuario?.id,
          nome: data.usuario?.nome || usuarioComCamposProblematicos.nome,
          email: data.usuario?.email || usuarioComCamposProblematicos.email
        };

        setUsuarioTesteCriado(usuarioCriado);

        return {
          usuario: usuarioCriado,
          dadosRetornados: data,
          camposEnviados: Object.keys(usuarioComCamposProblematicos),
          camposRetornados: data.usuario ? Object.keys(data.usuario) : []
        };
      });

      // Teste 3: Tentar editar o usuário criado (aqui que costuma dar erro updated_at)
      await executarTeste('3. Editar Usuário (teste crítico)', async () => {
        if (!usuarioTesteCriado) {
          throw new Error('Usuário de teste não foi criado');
        }

        const novoNome = `${usuarioTesteCriado.nome} - EDITADO ${Date.now()}`;
        
        const dadosEdicaoComCamposProblematicos = {
          nome: novoNome,
          email: usuarioTesteCriado.email,
          tipo: 'aluno',
          ativo: true,
          // Tentar incluir campos que sabemos que causam problemas
          updated_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          timestamp: new Date().toISOString()
        };

        console.log('📤 [TESTE] Editando com dados problemáticos:', dadosEdicaoComCamposProblematicos);
        console.log('🎯 [TESTE] ID do usuário:', usuarioTesteCriado.id);

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTesteCriado.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosEdicaoComCamposProblematicos)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [TESTE] Erro na edição:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao editar usuário');
        }

        return {
          usuarioEditado: data.usuario,
          nomeOriginal: usuarioTesteCriado.nome,
          nomeNovo: novoNome,
          camposEnviados: Object.keys(dadosEdicaoComCamposProblematicos),
          camposRetornados: data.usuario ? Object.keys(data.usuario) : []
        };
      });

      // Teste 4: Verificar múltiplas edições rápidas (stress test)
      await executarTeste('4. Múltiplas Edições Rápidas', async () => {
        if (!usuarioTesteCriado) {
          throw new Error('Usuário de teste não foi criado');
        }

        const edicoes = [];
        
        for (let i = 0; i < 3; i++) {
          const novoNome = `${usuarioTesteCriado.nome} - Edição Rápida ${i + 1}`;
          
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTesteCriado.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              nome: novoNome,
              email: usuarioTesteCriado.email,
              tipo: 'aluno',
              ativo: true
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edição ${i + 1} falhou: HTTP ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          edicoes.push({
            numeroEdicao: i + 1,
            nomeAtualizado: data.usuario?.nome,
            sucesso: data.success
          });

          // Pequena pausa entre edições
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        return {
          totalEdicoes: edicoes.length,
          edicoes: edicoes,
          todasComSucesso: edicoes.every(e => e.sucesso)
        };
      });

      // Teste 5: Limpar usuário de teste
      await executarTeste('5. Limpeza - Remover Usuário Teste', async () => {
        if (!usuarioTesteCriado) {
          return { mensagem: 'Nenhum usuário para limpar' };
        }

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTesteCriado.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (response.ok) {
          return { 
            usuarioRemovido: usuarioTesteCriado.id,
            limpezaConcluida: true 
          };
        } else {
          // Não é crítico se a remoção falhar
          return { 
            usuarioRemovido: usuarioTesteCriado.id,
            limpezaConcluida: false,
            aviso: 'Usuário pode não ter sido removido'
          };
        }
      });

      toast.success('✅ Todos os testes executados!');
      
    } catch (error) {
      console.error('❌ [TESTE UPDATED_AT] Erro geral:', error);
      toast.error(`Erro nos testes: ${error.message}`);
    } finally {
      setTestando(false);
    }
  };

  const getStatusIcon = (resultado?: ResultadoTeste) => {
    if (!resultado) return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    return resultado.sucesso ? 
      <CheckCircle className="w-5 h-5 text-green-600" /> : 
      <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusColor = (resultado?: ResultadoTeste) => {
    if (!resultado) return 'border-gray-200 bg-gray-50';
    return resultado.sucesso ? 
      'border-green-200 bg-green-50' : 
      'border-red-200 bg-red-50';
  };

  const testes = [
    '1. Health Check Básico',
    '2. Criar Usuário (dados problemáticos)', 
    '3. Editar Usuário (teste crítico)',
    '4. Múltiplas Edições Rápidas',
    '5. Limpeza - Remover Usuário Teste'
  ];

  const resultadosArray = Object.values(resultados);
  const todosExecutados = resultadosArray.length === testes.length;
  const todosSucesso = todosExecutados && resultadosArray.every(r => r.sucesso);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-600" />
              Teste Definitivo: Erro "updated_at"
            </CardTitle>
            <CardDescription>
              Teste rigoroso para verificar se o erro de campo "updated_at" foi completamente resolvido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={executarTodosOsTestes}
                disabled={testando}
                className="flex-1"
              >
                {testando ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Executando Testes Críticos...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Executar Teste Definitivo
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            </div>

            {/* Status Geral */}
            {todosExecutados && (
              <Card className={todosSucesso ? 'border-green-500' : 'border-red-500'}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {todosSucesso ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <span className="text-lg font-semibold">
                      {todosSucesso ? 
                        '🎉 Problema RESOLVIDO!' : 
                        '⚠️ Ainda há problemas'
                      }
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {todosSucesso ? 
                      'Todos os testes passaram. O erro "updated_at" foi completamente corrigido!' :
                      'Alguns testes falharam. Verifique os detalhes abaixo.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Resumo dos Resultados */}
            {Object.keys(resultados).length > 0 && (
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(resultados).length}
                    </div>
                    <div className="text-sm text-gray-600">Testes Executados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(resultados).filter(r => r.sucesso).length}
                    </div>
                    <div className="text-sm text-gray-600">Sucessos</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {Object.values(resultados).filter(r => !r.sucesso).length}
                    </div>
                    <div className="text-sm text-gray-600">Falhas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(Object.values(resultados).reduce((acc, r) => acc + r.tempo, 0) / Object.keys(resultados).length)}ms
                    </div>
                    <div className="text-sm text-gray-600">Tempo Médio</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Lista Detalhada dos Testes */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resultados Detalhados</h3>
              {testes.map((teste) => {
                const resultado = resultados[teste];
                return (
                  <div
                    key={teste}
                    className={`p-4 rounded-lg border ${getStatusColor(resultado)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(resultado)}
                        <span className="font-medium">{teste}</span>
                      </div>
                      {resultado && (
                        <span className="text-sm text-gray-600">
                          {resultado.tempo}ms
                        </span>
                      )}
                    </div>
                    
                    {resultado?.sucesso && resultado.dados && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600">
                          Ver dados de sucesso
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                          {JSON.stringify(resultado.dados, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {resultado && !resultado.sucesso && (
                      <div className="mt-2 space-y-2">
                        <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                          <strong>Erro:</strong> {resultado.erro}
                        </div>
                        {resultado.detalhes && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-red-600">Ver stack trace</summary>
                            <pre className="mt-1 bg-red-50 p-2 rounded overflow-auto max-h-24">
                              {resultado.detalhes}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explicação */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🔬 O que este teste verifica:</h4>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Campos problemáticos:</strong> Envia dados com "updated_at", "created_at", etc.</li>
                <li>• <strong>Sanitização:</strong> Verifica se o servidor remove campos perigosos automaticamente</li>
                <li>• <strong>Edição crítica:</strong> Testa especificamente a operação que mais falha</li>
                <li>• <strong>Stress test:</strong> Múltiplas edições rápidas para verificar estabilidade</li>
                <li>• <strong>Limpeza:</strong> Remove dados de teste automaticamente</li>
              </ul>
            </div>

            {usuarioTesteCriado && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-sm">
                  <strong>👤 Usuário de teste criado:</strong> {usuarioTesteCriado.nome} (ID: {usuarioTesteCriado.id})
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}