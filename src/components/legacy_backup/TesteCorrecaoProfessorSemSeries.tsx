import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  User, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ArrowLeft,
  Settings,
  BookOpen,
  Users
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteCorrecaoProfessorSemSeriesProps {
  onVoltar: () => void;
}

export function TesteCorrecaoProfessorSemSeries({ onVoltar }: TesteCorrecaoProfessorSemSeriesProps) {
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const executarTeste = async () => {
    setTestando(true);
    setResultado(null);

    try {
      console.log('[TESTE_PROFESSOR_SEM_SERIES] 🧪 Iniciando teste...');

      // 1. Buscar professora Erika
      console.log('[TESTE] 1. Buscando professora Erika...');
      const usuariosResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!usuariosResponse.ok) {
        throw new Error(`Erro ao buscar usuários: ${usuariosResponse.status}`);
      }

      const usuariosData = await usuariosResponse.json();
      const erika = usuariosData.usuarios?.find((u: any) => 
        u.nome?.toLowerCase().includes('erika') && u.tipo === 'professor'
      );

      if (!erika) {
        throw new Error('Professora Erika não encontrada');
      }

      console.log('[TESTE] ✅ Erika encontrada:', erika.id);

      // 2. Testar endpoint do dashboard do professor
      console.log('[TESTE] 2. Testando endpoint do dashboard...');
      const dashboardResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/disciplinas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          professorId: erika.id
        })
      });

      if (!dashboardResponse.ok) {
        throw new Error(`Erro no dashboard: ${dashboardResponse.status}`);
      }

      const dashboardData = await dashboardResponse.json();
      console.log('[TESTE] Dashboard response:', dashboardData);

      // 3. Analisar resultado
      const analise = {
        encontrouErika: !!erika,
        erikaId: erika.id,
        erikaNome: erika.nome,
        erikaSeries: erika.series || [],
        erikaDisciplinas: erika.disciplinas || [],
        erikaVinculacoes: erika.vinculacoesProfessor || [],
        
        dashboardSuccess: dashboardData.success,
        dashboardSeries: dashboardData.seriesComDisciplinas || [],
        dashboardConfigCompleta: dashboardData.configuracaoCompleta,
        dashboardMensagem: dashboardData.mensagem,
        
        problemas: [],
        sucessos: []
      };

      // Verificações
      if (analise.erikaSeries.length === 0 && analise.erikaVinculacoes.length === 0) {
        analise.problemas.push('❌ Erika não possui séries nem vinculações definidas');
      } else {
        analise.sucessos.push('✅ Erika possui dados de vinculação');
      }

      if (analise.dashboardSeries.length === 0) {
        analise.sucessos.push('✅ Dashboard não retorna séries falsas (comportamento correto)');
      } else {
        analise.problemas.push('⚠️ Dashboard ainda retorna séries mesmo sem vinculação correta');
      }

      if (!analise.dashboardConfigCompleta) {
        analise.sucessos.push('✅ Sistema detecta configuração incompleta');
      } else {
        analise.problemas.push('❌ Sistema não detecta problema de configuração');
      }

      if (analise.dashboardMensagem && analise.dashboardMensagem.includes('precisa')) {
        analise.sucessos.push('✅ Mensagem explicativa presente');
      }

      setResultado(analise);

    } catch (error) {
      console.error('[TESTE] Erro:', error);
      setResultado({
        erro: error.message,
        problemas: ['❌ Falha na execução do teste'],
        sucessos: []
      });
    } finally {
      setTestando(false);
    }
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
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <User className="w-6 h-6" />
                Teste: Correção Professor Sem Séries
              </CardTitle>
              <CardDescription>
                Verifica se professores sem vinculações recebem tratamento adequado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Botão de teste */}
                <Button 
                  onClick={executarTeste} 
                  disabled={testando}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {testando ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Executando Teste...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Executar Teste
                    </>
                  )}
                </Button>

                {/* Resultados */}
                {resultado && (
                  <div className="space-y-4">
                    {resultado.erro && (
                      <Alert className="border-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-red-700">
                          <strong>Erro:</strong> {resultado.erro}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Dados da Erika */}
                    {resultado.encontrouErika && (
                      <Card className="border-blue-200">
                        <CardHeader>
                          <CardTitle className="text-blue-700 text-lg">
                            📋 Dados da Professora Erika
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>ID:</strong> {resultado.erikaId}
                            </div>
                            <div>
                              <strong>Nome:</strong> {resultado.erikaNome}
                            </div>
                            <div>
                              <strong>Séries:</strong> {resultado.erikaSeries.length > 0 ? resultado.erikaSeries.join(', ') : 'Nenhuma'}
                            </div>
                            <div>
                              <strong>Disciplinas:</strong> {resultado.erikaDisciplinas.length > 0 ? resultado.erikaDisciplinas.join(', ') : 'Nenhuma'}
                            </div>
                            <div className="md:col-span-2">
                              <strong>Vinculações:</strong> {resultado.erikaVinculacoes.length > 0 ? `${resultado.erikaVinculacoes.length} vinculação(ões)` : 'Nenhuma'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Resposta do Dashboard */}
                    {resultado.dashboardSuccess && (
                      <Card className="border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-purple-700 text-lg">
                            🖥️ Resposta do Dashboard
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Séries Retornadas:</strong> {resultado.dashboardSeries.length}
                            </div>
                            <div className="flex items-center gap-2">
                              <strong>Configuração Completa:</strong> 
                              <Badge variant={resultado.dashboardConfigCompleta ? "default" : "secondary"}>
                                {resultado.dashboardConfigCompleta ? 'Sim' : 'Não'}
                              </Badge>
                            </div>
                            <div className="md:col-span-2">
                              <strong>Mensagem:</strong> 
                              <span className="ml-2 text-gray-600">{resultado.dashboardMensagem || 'Nenhuma'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Sucessos */}
                    {resultado.sucessos.length > 0 && (
                      <Card className="border-green-200">
                        <CardHeader>
                          <CardTitle className="text-green-700 text-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            ✅ Sucessos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {resultado.sucessos.map((sucesso: string, index: number) => (
                              <li key={index} className="text-green-700 text-sm">
                                {sucesso}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Problemas */}
                    {resultado.problemas.length > 0 && (
                      <Card className="border-red-200">
                        <CardHeader>
                          <CardTitle className="text-red-700 text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            ❌ Problemas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {resultado.problemas.map((problema: string, index: number) => (
                              <li key={index} className="text-red-700 text-sm">
                                {problema}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Resumo */}
                    <Card className="border-gray-200 bg-gray-50">
                      <CardHeader>
                        <CardTitle className="text-gray-700 text-lg">
                          📊 Resumo do Teste
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-green-100 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {resultado.sucessos.length}
                            </div>
                            <div className="text-sm text-green-700">Sucessos</div>
                          </div>
                          <div className="p-3 bg-red-100 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                              {resultado.problemas.length}
                            </div>
                            <div className="text-sm text-red-700">Problemas</div>
                          </div>
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {resultado.sucessos.length >= resultado.problemas.length ? '✅' : '❌'}
                            </div>
                            <div className="text-sm text-blue-700">
                              {resultado.sucessos.length >= resultado.problemas.length ? 'Aprovado' : 'Reprovado'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">📋 O que este teste verifica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>1. Professor sem vinculações:</strong> Verifica se a professora Erika não possui séries ou vinculações corretas
              </div>
              <div>
                <strong>2. Resposta do servidor:</strong> Testa se o endpoint do dashboard responde adequadamente
              </div>
              <div>
                <strong>3. Detecção de problema:</strong> Confirma se o sistema detecta a configuração incompleta
              </div>
              <div>
                <strong>4. Ausência de fallback:</strong> Verifica se não há dados falsos sendo retornados
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}