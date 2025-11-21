import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { 
  User, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ArrowLeft,
  BookOpen,
  Users,
  Settings,
  Wrench
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoEspecificaErikaProps {
  onVoltar: () => void;
}

export function CorrecaoEspecificaErika({ onVoltar }: CorrecaoEspecificaErikaProps) {
  const [etapa, setEtapa] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [usuarioErika, setUsuarioErika] = useState<any>(null);
  const [correcaoAplicada, setCorrecaoAplicada] = useState(false);

  const etapas = [
    'Localizar professora Erika',
    'Diagnosticar dados atuais',
    'Aplicar correção específica',
    'Verificar resultado final'
  ];

  const buscarProfessoraErika = async () => {
    console.log('[CORREÇÃO_ERIKA] 🔍 Buscando professora Erika...');
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[CORREÇÃO_ERIKA] Usuários encontrados:', data.usuarios?.length);

      // Procurar por Erika (várias variações)
      const possiveisErikas = data.usuarios?.filter((u: any) => 
        u.nome?.toLowerCase().includes('erika') ||
        u.nomeUsuario?.toLowerCase().includes('erika') ||
        u.email?.toLowerCase().includes('erika')
      ) || [];

      console.log('[CORREÇÃO_ERIKA] Possíveis Erikas encontradas:', possiveisErikas.length);

      if (possiveisErikas.length === 0) {
        return {
          encontrado: false,
          erro: 'Professora Erika não encontrada no sistema',
          sugestao: 'Verifique se o usuário foi criado corretamente'
        };
      }

      if (possiveisErikas.length > 1) {
        console.log('[CORREÇÃO_ERIKA] Múltiplas Erikas encontradas:', possiveisErikas.map(e => e.nome));
      }

      // Pegar a primeira Erika encontrada (ou a que for professor)
      const erika = possiveisErikas.find((u: any) => u.tipo === 'professor') || possiveisErikas[0];
      
      console.log('[CORREÇÃO_ERIKA] Erika selecionada:', {
        id: erika.id,
        nome: erika.nome,
        tipo: erika.tipo,
        disciplinas: erika.disciplinas,
        series: erika.series,
        vinculacoesProfessor: erika.vinculacoesProfessor
      });

      return {
        encontrado: true,
        usuario: erika,
        dados: {
          id: erika.id,
          nome: erika.nome,
          nomeUsuario: erika.nomeUsuario,
          email: erika.email,
          tipo: erika.tipo,
          ativo: erika.ativo,
          disciplinas: erika.disciplinas || [],
          series: erika.series || [],
          vinculacoesProfessor: erika.vinculacoesProfessor || []
        }
      };

    } catch (error) {
      console.error('[CORREÇÃO_ERIKA] Erro ao buscar Erika:', error);
      return {
        encontrado: false,
        erro: `Erro ao buscar usuários: ${error.message}`,
        sugestao: 'Verifique a conexão com o servidor'
      };
    }
  };

  const diagnosticarDadosErika = (usuario: any) => {
    console.log('[CORREÇÃO_ERIKA] 🔬 Diagnosticando dados da Erika...');
    
    const problemas = [];
    const correcoes = [];

    // Verificar disciplinas
    if (!usuario.disciplinas || usuario.disciplinas.length === 0) {
      problemas.push('❌ Não possui disciplinas vinculadas');
      correcoes.push('Vincular disciplina "Português"');
    } else {
      console.log('[CORREÇÃO_ERIKA] ✅ Disciplinas encontradas:', usuario.disciplinas);
    }

    // Verificar séries
    if (!usuario.series || usuario.series.length === 0) {
      problemas.push('❌ Não possui séries vinculadas');
      correcoes.push('Vincular séries: 6º, 7º, 8º, 9º anos');
    } else {
      console.log('[CORREÇÃO_ERIKA] ✅ Séries encontradas:', usuario.series);
    }

    // Verificar vinculações específicas (nova arquitetura)
    if (!usuario.vinculacoesProfessor || usuario.vinculacoesProfessor.length === 0) {
      problemas.push('❌ Não possui vinculações específicas (nova arquitetura)');
      correcoes.push('Criar vinculação específica Professor → Português → [6º, 7º, 8º, 9º]');
    } else {
      console.log('[CORREÇÃO_ERIKA] ✅ Vinculações específicas encontradas:', usuario.vinculacoesProfessor);
    }

    // Verificar se tem problemas de fallback
    if (usuario.series && usuario.series.includes('5º ano')) {
      problemas.push('⚠️ Possui "5º ano" como fallback incorreto');
      correcoes.push('Remover 5º ano e manter apenas séries corretas');
    }

    return {
      problemas,
      correcoes,
      dadosAtuais: {
        disciplinas: usuario.disciplinas || [],
        series: usuario.series || [],
        vinculacoes: usuario.vinculacoesProfessor || []
      }
    };
  };

  const aplicarCorrecaoErika = async (usuario: any) => {
    console.log('[CORREÇÃO_ERIKA] 🔧 Aplicando correção específica para Erika...');
    
    try {
      // Dados corretos para a professora Erika
      const dadosCorrigidos = {
        nome: usuario.nome || 'Professora Erika',
        nomeUsuario: usuario.nomeUsuario,
        email: usuario.email,
        tipo: 'professor',
        ativo: true,
        disciplinas: ['Português'], // Disciplina específica
        series: ['6º ano', '7º ano', '8º ano', '9º ano'], // Séries corretas
        vinculacoesProfessor: [
          {
            disciplinaNome: 'Português',
            disciplinaId: 'portugues',
            seriesSelecionadas: ['6º ano', '7º ano', '8º ano', '9º ano'],
            criadoEm: new Date().toISOString()
          }
        ]
      };

      console.log('[CORREÇÃO_ERIKA] Dados de correção:', dadosCorrigidos);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosCorrigidos)
      });

      console.log('[CORREÇÃO_ERIKA] Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CORREÇÃO_ERIKA] Erro na resposta:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const resultado = await response.json();
      console.log('[CORREÇÃO_ERIKA] ✅ Correção aplicada com sucesso:', resultado);

      return {
        sucesso: true,
        usuarioAtualizado: resultado.usuario,
        message: resultado.message || 'Dados corrigidos com sucesso'
      };

    } catch (error) {
      console.error('[CORREÇÃO_ERIKA] ❌ Erro ao aplicar correção:', error);
      
      return {
        sucesso: false,
        erro: error.message,
        detalhes: 'Falha ao atualizar dados da professora Erika'
      };
    }
  };

  const verificarResultadoFinal = async (usuarioId: string) => {
    console.log('[CORREÇÃO_ERIKA] 🔍 Verificando resultado final...');
    
    try {
      // Buscar o usuário atualizado
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const data = await response.json();
      const usuarioAtualizado = data.usuarios?.find((u: any) => u.id === usuarioId);

      if (!usuarioAtualizado) {
        throw new Error('Usuário não encontrado após atualização');
      }

      console.log('[CORREÇÃO_ERIKA] Usuario após correção:', usuarioAtualizado);

      return {
        sucesso: true,
        usuario: usuarioAtualizado,
        verificacoes: {
          disciplinas: usuarioAtualizado.disciplinas || [],
          series: usuarioAtualizado.series || [],
          vinculacoes: usuarioAtualizado.vinculacoesProfessor || [],
          temPortugues: (usuarioAtualizado.disciplinas || []).includes('Português'),
          temSeriesCorretas: (usuarioAtualizado.series || []).some(s => 
            ['6º ano', '7º ano', '8º ano', '9º ano'].includes(s)
          ),
          naoTem5Ano: !(usuarioAtualizado.series || []).includes('5º ano')
        }
      };

    } catch (error) {
      console.error('[CORREÇÃO_ERIKA] Erro na verificação final:', error);
      return {
        sucesso: false,
        erro: error.message
      };
    }
  };

  const executarEtapa = async (numeroEtapa: number) => {
    setCarregando(true);
    
    try {
      switch (numeroEtapa) {
        case 0: {
          const resultado = await buscarProfessoraErika();
          setResultado(resultado);
          if (resultado.encontrado) {
            setUsuarioErika(resultado.usuario);
          }
          break;
        }
        
        case 1: {
          if (usuarioErika) {
            const diagnostico = diagnosticarDadosErika(usuarioErika);
            setResultado({ diagnostico, usuario: usuarioErika });
          }
          break;
        }
        
        case 2: {
          if (usuarioErika) {
            const resultadoCorrecao = await aplicarCorrecaoErika(usuarioErika);
            setResultado(resultadoCorrecao);
            if (resultadoCorrecao.sucesso) {
              setCorrecaoAplicada(true);
            }
          }
          break;
        }
        
        case 3: {
          if (usuarioErika && correcaoAplicada) {
            const verificacao = await verificarResultadoFinal(usuarioErika.id);
            setResultado(verificacao);
          }
          break;
        }
      }
      
      if (numeroEtapa < etapas.length - 1) {
        setEtapa(numeroEtapa + 1);
      }
      
    } catch (error) {
      console.error('[CORREÇÃO_ERIKA] Erro na etapa:', error);
      setResultado({
        sucesso: false,
        erro: error.message
      });
    } finally {
      setCarregando(false);
    }
  };

  const reiniciarProcesso = () => {
    setEtapa(0);
    setResultado(null);
    setUsuarioErika(null);
    setCorrecaoAplicada(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={onVoltar} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <User className="w-6 h-6" />
                Correção Específica - Professora Erika
              </CardTitle>
              <CardDescription>
                Diagnóstico e correção dos dados de vinculação da professora Erika
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progresso</span>
                    <span>{etapa + 1}/{etapas.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${((etapa + 1) / etapas.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Current Step */}
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {etapa + 1}
                  </div>
                  <div>
                    <div className="font-medium text-purple-800">
                      {etapas[etapa]}
                    </div>
                    {carregando && (
                      <div className="flex items-center gap-2 text-sm text-purple-600 mt-1">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processando...
                      </div>
                    )}
                  </div>
                </div>

                {/* Results */}
                {resultado && (
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                      {etapa === 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-purple-800">📍 Resultado da Busca:</h4>
                          {resultado.encontrado ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span>Professora Erika encontrada!</span>
                              </div>
                              <div className="bg-green-50 p-3 rounded border text-sm">
                                <div><strong>Nome:</strong> {resultado.dados.nome}</div>
                                <div><strong>ID:</strong> {resultado.dados.id}</div>
                                <div><strong>Tipo:</strong> {resultado.dados.tipo}</div>
                                <div><strong>Disciplinas:</strong> {resultado.dados.disciplinas.join(', ') || 'Nenhuma'}</div>
                                <div><strong>Séries:</strong> {resultado.dados.series.join(', ') || 'Nenhuma'}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{resultado.erro}</span>
                              </div>
                              <div className="bg-red-50 p-3 rounded border text-sm text-red-700">
                                <strong>Sugestão:</strong> {resultado.sugestao}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {etapa === 1 && resultado.diagnostico && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-purple-800">🔬 Diagnóstico dos Dados:</h4>
                          
                          {resultado.diagnostico.problemas.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h5 className="font-medium text-red-800 mb-2">❌ Problemas Identificados:</h5>
                              <ul className="space-y-1 text-sm text-red-700">
                                {resultado.diagnostico.problemas.map((problema: string, index: number) => (
                                  <li key={index}>{problema}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="font-medium text-blue-800 mb-2">🔧 Correções Necessárias:</h5>
                            <ul className="space-y-1 text-sm text-blue-700">
                              {resultado.diagnostico.correcoes.map((correcao: string, index: number) => (
                                <li key={index}>{correcao}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {etapa === 2 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-purple-800">🔧 Resultado da Correção:</h4>
                          {resultado.sucesso ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-green-600 mb-2">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">Correção aplicada com sucesso!</span>
                              </div>
                              <p className="text-sm text-green-700">{resultado.message}</p>
                            </div>
                          ) : (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-red-600 mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="font-medium">Falha na correção</span>
                              </div>
                              <p className="text-sm text-red-700">{resultado.erro}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {etapa === 3 && resultado.verificacoes && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-purple-800">✅ Verificação Final:</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-3 rounded-lg border ${resultado.verificacoes.temPortugues ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <BookOpen className="w-4 h-4" />
                                <span className="text-sm font-medium">Disciplina Português</span>
                              </div>
                              <Badge variant={resultado.verificacoes.temPortugues ? "default" : "destructive"}>
                                {resultado.verificacoes.temPortugues ? 'Vinculada' : 'Não vinculada'}
                              </Badge>
                            </div>

                            <div className={`p-3 rounded-lg border ${resultado.verificacoes.temSeriesCorretas ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">Séries Corretas</span>
                              </div>
                              <Badge variant={resultado.verificacoes.temSeriesCorretas ? "default" : "destructive"}>
                                {resultado.verificacoes.temSeriesCorretas ? 'Configuradas' : 'Não configuradas'}
                              </Badge>
                            </div>

                            <div className={`p-3 rounded-lg border ${resultado.verificacoes.naoTem5Ano ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Settings className="w-4 h-4" />
                                <span className="text-sm font-medium">5º Ano Removido</span>
                              </div>
                              <Badge variant={resultado.verificacoes.naoTem5Ano ? "default" : "secondary"}>
                                {resultado.verificacoes.naoTem5Ano ? 'Sim' : 'Ainda presente'}
                              </Badge>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-medium text-gray-800 mb-2">📊 Dados Atuais:</h5>
                            <div className="space-y-2 text-sm">
                              <div><strong>Disciplinas:</strong> {resultado.verificacoes.disciplinas.join(', ') || 'Nenhuma'}</div>
                              <div><strong>Séries:</strong> {resultado.verificacoes.series.join(', ') || 'Nenhuma'}</div>
                              <div><strong>Vinculações:</strong> {resultado.verificacoes.vinculacoes.length}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {etapa < etapas.length && !carregando && (
                    <Button 
                      onClick={() => executarEtapa(etapa)} 
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={etapa === 0 && resultado?.encontrado === false}
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      {etapa === 0 ? 'Buscar Erika' : 
                       etapa === 1 ? 'Diagnosticar' : 
                       etapa === 2 ? 'Aplicar Correção' : 
                       'Verificar Resultado'}
                    </Button>
                  )}
                  
                  {etapa === etapas.length - 1 && (
                    <Button onClick={reiniciarProcesso} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reiniciar Processo
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">📋 Instruções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>1. Buscar:</strong> Localiza a professora Erika no sistema
              </div>
              <div>
                <strong>2. Diagnosticar:</strong> Identifica problemas nos dados de vinculação
              </div>
              <div>
                <strong>3. Corrigir:</strong> Aplica os dados corretos (Português → 6º, 7º, 8º, 9º anos)
              </div>
              <div>
                <strong>4. Verificar:</strong> Confirma que a correção foi aplicada com sucesso
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}