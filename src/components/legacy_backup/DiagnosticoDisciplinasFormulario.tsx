import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, X, RefreshCw, BookOpen, Database, Users } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoDisciplinasFormularioProps {
  onVoltar: () => void;
}

export function DiagnosticoDisciplinasFormulario({ onVoltar }: DiagnosticoDisciplinasFormularioProps) {
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [executando, setExecutando] = useState(false);

  const executarDiagnostico = async () => {
    setExecutando(true);
    setDiagnostico(null);
    
    const resultados = {
      etapas: [],
      resumo: {
        sucessos: 0,
        erros: 0,
        warnings: 0
      }
    };

    try {
      // 1. Testar conexão com a API de disciplinas
      console.log('[DIAGNÓSTICO DISCIPLINAS] Iniciando teste de conexão...');
      
      const etapa1 = {
        nome: '1. Conexão com API de Disciplinas',
        status: 'executando',
        detalhes: null,
        erro: null
      };
      
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/disciplinas`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[DIAGNÓSTICO DISCIPLINAS] Resposta da API:', response.status);

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[DIAGNÓSTICO DISCIPLINAS] Dados recebidos:', data);

        etapa1.status = 'sucesso';
        etapa1.detalhes = {
          status: response.status,
          dadosRecebidos: data,
          tempropriedadeDisciplinas: !!data.disciplinas,
          isArray: Array.isArray(data) || Array.isArray(data.disciplinas),
          totalDisciplinas: Array.isArray(data.disciplinas) ? data.disciplinas.length : 
                           Array.isArray(data) ? data.length : 0
        };

        resultados.etapas.push(etapa1);
        resultados.resumo.sucessos++;

        // 2. Verificar formato dos dados
        const etapa2 = {
          nome: '2. Verificar Formato dos Dados',
          status: 'executando',
          detalhes: null,
          erro: null
        };

        try {
          let disciplinasArray = [];
          
          if (data.success && Array.isArray(data.disciplinas)) {
            disciplinasArray = data.disciplinas;
          } else if (Array.isArray(data)) {
            disciplinasArray = data;
          }

          const disciplinasValidas = disciplinasArray.filter(d => d && d.nome && d.nome.trim());
          const disciplinasAtivas = disciplinasValidas.filter(d => d.ativa !== false);
          const nomesDisciplinas = disciplinasAtivas.map(d => d.nome).sort();

          etapa2.status = 'sucesso';
          etapa2.detalhes = {
            totalBruto: disciplinasArray.length,
            totalValidas: disciplinasValidas.length,
            totalAtivas: disciplinasAtivas.length,
            nomes: nomesDisciplinas,
            exemploDisciplina: disciplinasValidas[0] || null,
            estruturaEsperada: {
              nome: 'string (obrigatório)',
              descricao: 'string (opcional)',
              ativa: 'boolean (default: true)',
              cargaHoraria: 'number (opcional)',
              series: 'array (opcional)'
            }
          };

          resultados.etapas.push(etapa2);
          resultados.resumo.sucessos++;

          // 3. Verificar qualidade dos dados
          const etapa3 = {
            nome: '3. Qualidade dos Dados',
            status: 'executando',
            detalhes: null,
            erro: null
          };

          const problemasEncontrados = [];
          const disciplinasSemNome = disciplinasArray.filter(d => !d.nome || !d.nome.trim());
          const disciplinasInativas = disciplinasArray.filter(d => d.ativa === false);
          const nomesDuplicados = nomesDisciplinas.filter((nome, index) => 
            nomesDisciplinas.indexOf(nome) !== index
          );

          if (disciplinasSemNome.length > 0) {
            problemasEncontrados.push(`${disciplinasSemNome.length} disciplina(s) sem nome`);
          }

          if (disciplinasInativas.length > 0) {
            problemasEncontrados.push(`${disciplinasInativas.length} disciplina(s) inativa(s)`);
          }

          if (nomesDuplicados.length > 0) {
            problemasEncontrados.push(`${nomesDuplicados.length} nome(s) duplicado(s)`);
          }

          if (problemasEncontrados.length === 0) {
            etapa3.status = 'sucesso';
            etapa3.detalhes = {
              qualidade: 'Excelente',
              problemas: 'Nenhum problema encontrado',
              disciplinasUsaveis: nomesDisciplinas.length,
              sugestoes: [
                'Dados estão em bom formato',
                'Nomes únicos e válidos', 
                'Pronto para uso no formulário'
              ]
            };
            resultados.resumo.sucessos++;
          } else {
            etapa3.status = 'warning';
            etapa3.detalhes = {
              qualidade: 'Com problemas',
              problemas: problemasEncontrados,
              disciplinasUsaveis: nomesDisciplinas.length,
              sugestoes: [
                'Verificar disciplinas sem nome na Gestão Escolar',
                'Considerar reativar disciplinas se necessário',
                'Remover duplicatas se existirem'
              ]
            };
            resultados.resumo.warnings++;
          }

          resultados.etapas.push(etapa3);

        } catch (error) {
          console.error('[DIAGNÓSTICO DISCIPLINAS] Erro na etapa 2:', error);
          etapa2.status = 'erro';
          etapa2.erro = error.message;
          resultados.etapas.push(etapa2);
          resultados.resumo.erros++;
        }

      } catch (error) {
        console.error('[DIAGNÓSTICO DISCIPLINAS] Erro na etapa 1:', error);
        etapa1.status = 'erro';
        etapa1.erro = error.message;
        etapa1.detalhes = {
          possiveisCausas: [
            'Servidor offline ou indisponível',
            'Rota /admin/disciplinas não implementada',
            'Problema de autenticação',
            'Erro na configuração do Supabase'
          ]
        };
        resultados.etapas.push(etapa1);
        resultados.resumo.erros++;
      }

    } catch (error) {
      console.error('[DIAGNÓSTICO DISCIPLINAS] Erro geral:', error);
      resultados.etapas.push({
        nome: 'Erro Geral',
        status: 'erro',
        erro: error.message,
        detalhes: null
      });
      resultados.resumo.erros++;
    }

    console.log('[DIAGNÓSTICO DISCIPLINAS] Resultados finais:', resultados);
    setDiagnostico(resultados);
    setExecutando(false);
  };

  const testarFormulario = () => {
    // Abrir formulário de cadastro em nova aba para teste
    window.open('?mode=admin', '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'erro':
        return <X className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso':
        return 'bg-green-50 border-green-200';
      case 'erro':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Diagnóstico - Disciplinas no Formulário
            </h1>
            <p className="text-gray-600 mt-1">
              Verificar se disciplinas da gestão escolar aparecem no formulário de cadastro
            </p>
          </div>
          <Button variant="outline" onClick={onVoltar}>
            ← Voltar
          </Button>
        </div>

        {/* Controles */}
        <div className="mb-6 flex gap-4">
          <Button 
            onClick={executarDiagnostico}
            disabled={executando}
            className="flex items-center gap-2"
          >
            {executando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Executar Diagnóstico
              </>
            )}
          </Button>

          <Button 
            onClick={testarFormulario}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Testar Formulário
          </Button>
        </div>

        {/* Resultados */}
        {diagnostico && (
          <div className="space-y-6">
            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Resumo do Diagnóstico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{diagnostico.resumo.sucessos}</div>
                    <div className="text-sm text-gray-600">Sucessos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{diagnostico.resumo.erros}</div>
                    <div className="text-sm text-gray-600">Erros</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{diagnostico.resumo.warnings}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etapas */}
            {diagnostico.etapas.map((etapa, index) => (
              <Card key={index} className={`border-l-4 ${getStatusColor(etapa.status)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(etapa.status)}
                      {etapa.nome}
                    </span>
                    <Badge variant={etapa.status === 'sucesso' ? 'default' : etapa.status === 'erro' ? 'destructive' : 'secondary'}>
                      {etapa.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {etapa.erro && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded text-red-700 text-sm">
                      <strong>Erro:</strong> {etapa.erro}
                    </div>
                  )}
                  
                  {etapa.detalhes && (
                    <div className="space-y-3">
                      {etapa.detalhes.nomes && (
                        <div>
                          <h4 className="font-semibold mb-2">Disciplinas encontradas:</h4>
                          <div className="flex flex-wrap gap-1">
                            {etapa.detalhes.nomes.map((nome, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {nome}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                          Ver detalhes técnicos
                        </summary>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto mt-2">
                          {JSON.stringify(etapa.detalhes, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instruções */}
        {!diagnostico && (
          <Card>
            <CardHeader>
              <CardTitle>🔍 Sobre este Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Este diagnóstico irá verificar se as disciplinas criadas na Gestão Escolar 
                estão sendo carregadas corretamente no formulário de cadastro de professores.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Etapas do diagnóstico:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Conexão API:</strong> Testar se a rota /admin/disciplinas funciona</li>
                  <li>• <strong>Formato dados:</strong> Verificar se os dados estão no formato correto</li>
                  <li>• <strong>Qualidade:</strong> Analisar se há problemas nos dados</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Problema relatado:</h4>
                <p className="text-sm">
                  "Ao cadastrar um professor no usuário administrador, não tem a lista completa 
                  das disciplinas criadas em gestão escolar"
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Solução implementada:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Modificado CadastrarUsuario.tsx para carregar disciplinas da API</li>
                  <li>• Adicionado botão "Atualizar" para recarregar disciplinas</li>
                  <li>• Implementado fallback para disciplinas padrão em caso de erro</li>
                  <li>• Adicionado indicadores de carregamento e status</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}