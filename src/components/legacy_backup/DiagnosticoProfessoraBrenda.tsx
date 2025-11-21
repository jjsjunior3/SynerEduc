import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, X, User, GraduationCap, BookOpen } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoProfessoraBrendaProps {
  onVoltar: () => void;
}

export function DiagnosticoProfessoraBrenda({ onVoltar }: DiagnosticoProfessoraBrendaProps) {
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [executando, setExecutando] = useState(false);
  const [professoraBrenda, setProfessoraBrenda] = useState<any>(null);

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
      // 1. Buscar a professora Brenda Camilli
      console.log('[DIAGNÓSTICO BRENDA] Iniciando busca por Brenda Camilli...');
      
      const etapa1 = {
        nome: '1. Localizar Professora Brenda Camilli',
        status: 'executando',
        detalhes: null,
        erro: null
      };
      
      try {
        const usuariosResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!usuariosResponse.ok) {
          throw new Error(`Erro ${usuariosResponse.status}: ${usuariosResponse.statusText}`);
        }

        const usuariosData = await usuariosResponse.json();
        console.log('[DIAGNÓSTICO BRENDA] Resposta da API usuarios:', usuariosData);

        const brenda = usuariosData.usuarios?.find(u => 
          u.nome && u.nome.toLowerCase().includes('brenda') && u.nome.toLowerCase().includes('camilli')
        );

        if (!brenda) {
          etapa1.status = 'erro';
          etapa1.erro = 'Professora Brenda Camilli não encontrada na lista de usuários';
          etapa1.detalhes = {
            totalUsuarios: usuariosData.usuarios?.length || 0,
            professores: usuariosData.usuarios?.filter(u => u.tipo === 'professor').length || 0,
            nomesProfessores: usuariosData.usuarios?.filter(u => u.tipo === 'professor').map(u => u.nome) || []
          };
        } else {
          etapa1.status = 'sucesso';
          etapa1.detalhes = {
            id: brenda.id,
            nome: brenda.nome,
            email: brenda.email,
            tipo: brenda.tipo,
            series: brenda.series,
            disciplinas: brenda.disciplinas,
            ativo: brenda.ativo
          };
          setProfessoraBrenda(brenda);
        }

        resultados.etapas.push(etapa1);
        if (etapa1.status === 'sucesso') resultados.resumo.sucessos++;
        else resultados.resumo.erros++;

        // 2. Se encontrou Brenda, testar acesso às disciplinas/séries
        if (brenda) {
          const etapa2 = {
            nome: '2. Testar Rota de Disciplinas/Séries',
            status: 'executando',
            detalhes: null,
            erro: null
          };

          try {
            console.log('[DIAGNÓSTICO BRENDA] Testando rota de disciplinas para Brenda:', brenda.id);
            
            const disciplinasResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${brenda.id}/disciplinas`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              }
            });

            if (!disciplinasResponse.ok) {
              const errorText = await disciplinasResponse.text();
              throw new Error(`Erro ${disciplinasResponse.status}: ${errorText}`);
            }

            const disciplinasData = await disciplinasResponse.json();
            console.log('[DIAGNÓSTICO BRENDA] Resposta da rota disciplinas:', disciplinasData);

            etapa2.status = 'sucesso';
            etapa2.detalhes = {
              sucesso: disciplinasData.success,
              totalSeries: disciplinasData.seriesComDisciplinas?.length || 0,
              series: disciplinasData.seriesComDisciplinas?.map(s => ({
                nome: s.nome,
                totalAlunos: s.totalAlunos,
                disciplinas: s.disciplinas
              })) || [],
              disciplinas: disciplinasData.disciplinas?.map(d => d.nome) || [],
              dadosProfessor: disciplinasData.professor
            };

            resultados.etapas.push(etapa2);
            resultados.resumo.sucessos++;

            // 3. Verificar especificamente as séries do Ensino Médio
            const etapa3 = {
              nome: '3. Verificar Séries do Ensino Médio',
              status: 'executando',
              detalhes: null,
              erro: null
            };

            const seriesEnsinoMedio = ['1º ano', '2º ano', '3º ano'];
            const seriesRetornadas = disciplinasData.seriesComDisciplinas || [];
            const seriesEnsinoMedioEncontradas = seriesRetornadas.filter(s => 
              seriesEnsinoMedio.includes(s.nome)
            );

            if (seriesEnsinoMedioEncontradas.length === 0) {
              etapa3.status = 'warning';
              etapa3.erro = 'Nenhuma série do Ensino Médio encontrada para a professora Brenda';
              etapa3.detalhes = {
                seriesEsperadas: seriesEnsinoMedio,
                seriesEncontradas: seriesRetornadas.map(s => s.nome),
                seriesDaProfessora: brenda.series || [],
                possiveisCausas: [
                  'Campo "series" da professora não inclui Ensino Médio',
                  'Dados da professora não foram atualizados',
                  'Erro na lógica de filtragem das séries'
                ]
              };
              resultados.resumo.warnings++;
            } else {
              etapa3.status = 'sucesso';
              etapa3.detalhes = {
                seriesEncontradas: seriesEnsinoMedioEncontradas.map(s => ({
                  nome: s.nome,
                  totalAlunos: s.totalAlunos,
                  disciplinas: s.disciplinas
                })),
                total: seriesEnsinoMedioEncontradas.length
              };
              resultados.resumo.sucessos++;
            }

            resultados.etapas.push(etapa3);

          } catch (error) {
            console.error('[DIAGNÓSTICO BRENDA] Erro na etapa 2:', error);
            etapa2.status = 'erro';
            etapa2.erro = error.message;
            resultados.etapas.push(etapa2);
            resultados.resumo.erros++;
          }
        }

      } catch (error) {
        console.error('[DIAGNÓSTICO BRENDA] Erro na etapa 1:', error);
        etapa1.status = 'erro';
        etapa1.erro = error.message;
        resultados.etapas.push(etapa1);
        resultados.resumo.erros++;
      }

    } catch (error) {
      console.error('[DIAGNÓSTICO BRENDA] Erro geral:', error);
      resultados.etapas.push({
        nome: 'Erro Geral',
        status: 'erro',
        erro: error.message,
        detalhes: null
      });
      resultados.resumo.erros++;
    }

    console.log('[DIAGNÓSTICO BRENDA] Resultados finais:', resultados);
    setDiagnostico(resultados);
    setExecutando(false);
  };

  const corrigirProblema = async () => {
    if (!professoraBrenda) {
      alert('Primeiro execute o diagnóstico para identificar a professora Brenda');
      return;
    }

    try {
      // Atualizar os dados da professora para incluir as séries do Ensino Médio
      const dadosAtualizados = {
        ...professoraBrenda,
        series: [
          '5º ano', '6º ano', '7º ano', '8º ano', '9º ano', // Fundamental
          '1º ano', '2º ano', '3º ano' // Médio
        ],
        disciplinas: professoraBrenda.disciplinas || ['Ciências', 'Biologia', 'Física', 'Química']
      };

      console.log('[CORREÇÃO BRENDA] Atualizando dados da professora:', dadosAtualizados);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${professoraBrenda.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosAtualizados)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[CORREÇÃO BRENDA] Resultado da atualização:', result);

      alert('Dados da professora Brenda Camilli atualizados com sucesso! Execute o diagnóstico novamente para verificar.');
      
    } catch (error) {
      console.error('[CORREÇÃO BRENDA] Erro:', error);
      alert(`Erro ao corrigir: ${error.message}`);
    }
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
              <User className="w-6 h-6 text-blue-600" />
              Diagnóstico - Professora Brenda Camilli
            </h1>
            <p className="text-gray-600 mt-1">
              Investigar problema com turmas do Ensino Médio não aparecendo
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
                <GraduationCap className="w-4 h-4" />
                Executar Diagnóstico
              </>
            )}
          </Button>

          {professoraBrenda && (
            <Button 
              onClick={corrigirProblema}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Corrigir Problema
            </Button>
          )}
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
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(etapa.detalhes, null, 2)}
                      </pre>
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
                Este diagnóstico irá verificar especificamente o problema da professora Brenda Camilli 
                não conseguir visualizar as turmas do Ensino Médio (1º, 2º e 3º ano).
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Etapas do diagnóstico:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Localizar professora:</strong> Buscar Brenda Camilli na base de dados</li>
                  <li>• <strong>Testar rotas:</strong> Verificar se a API retorna os dados corretos</li>
                  <li>• <strong>Verificar séries:</strong> Confirmar se as séries do Ensino Médio estão incluídas</li>
                  <li>• <strong>Identificar causa:</strong> Determinar por que as turmas não aparecem</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Possíveis causas:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Campo "series" da professora não inclui Ensino Médio</li>
                  <li>• Erro na rota que retorna disciplinas/séries</li>
                  <li>• Problema de filtragem no backend</li>
                  <li>• Dados inconsistentes no banco</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}