import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Bug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  User,
  BookOpen,
  FileText,
  Loader2,
  Database,
  Target,
  Search
} from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoCompleto {
  usuario: {
    id: string;
    nome: string;
    serie: string;
    tipo: string;
  };
  conteudo: {
    totalConteudos: number;
    conteudosPorSerie: { [key: string]: any };
    conteudosDoUsuario: { [key: string]: any };
  };
  disciplinas: {
    disciplinasGeradas: number;
    listaDisciplinas: any[];
  };
  resumo: {
    serieUsuario: string;
    disciplinasComConteudo: number;
    disciplinasGeradas: number;
    problema: string;
  };
}

export function DiagnosticoConteudoAluno() {
  const [diagnostico, setDiagnostico] = useState<DiagnosticoCompleto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const { usuario } = useAuth();

  const executarDiagnosticoCompleto = async () => {
    if (!usuario?.id) {
      setError('Usuário não logado');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('[DIAGNOSTICO_CONTEUDO] Iniciando diagnóstico completo para:', usuario.nome);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/diagnostico-conteudo/aluno/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro no diagnóstico');
      }

      setDiagnostico(data.diagnostico);
      console.log('[DIAGNOSTICO_CONTEUDO] Diagnóstico completo:', data.diagnostico);

    } catch (error) {
      console.error('[DIAGNOSTICO_CONTEUDO] Erro:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const voltarParaApp = () => {
    window.location.href = window.location.pathname;
  };

  useEffect(() => {
    if (usuario?.id) {
      executarDiagnosticoCompleto();
    }
  }, [usuario?.id]);

  const getStatusColor = (problema: string) => {
    if (problema === 'OK') return 'text-green-600 bg-green-50';
    if (problema.includes('Nenhuma disciplina')) return 'text-red-600 bg-red-50';
    if (problema.includes('Nenhum conteúdo')) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getStatusIcon = (problema: string) => {
    if (problema === 'OK') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (problema.includes('Nenhuma disciplina')) return <XCircle className="w-5 h-5 text-red-600" />;
    if (problema.includes('Nenhum conteúdo')) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-orange-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bug className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Diagnóstico de Conteúdo - AVA</h1>
              <p className="text-sm text-gray-600">Análise detalhada do problema de compartilhamento de PDFs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={executarDiagnosticoCompleto} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Diagnóstico
            </Button>
            <Button onClick={voltarParaApp} variant="default">
              Voltar ao App
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Executando diagnóstico completo...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>Erro no diagnóstico:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Diagnostic Results */}
        {diagnostico && !loading && (
          <div className="space-y-6">
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Status Geral do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Usuário</div>
                    <div className="font-semibold">{diagnostico.usuario.nome}</div>
                    <div className="text-xs text-gray-500">{diagnostico.usuario.serie}</div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Database className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Total Conteúdos</div>
                    <div className="font-semibold text-2xl">{diagnostico.conteudo.totalConteudos}</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Disciplinas Geradas</div>
                    <div className="font-semibold text-2xl">{diagnostico.disciplinas.disciplinasGeradas}</div>
                  </div>

                  <div className={`text-center p-4 rounded-lg ${getStatusColor(diagnostico.resumo.problema)}`}>
                    {getStatusIcon(diagnostico.resumo.problema)}
                    <div className="text-sm mt-2">Status</div>
                    <div className="font-semibold">{diagnostico.resumo.problema}</div>
                  </div>
                </div>

                {diagnostico.resumo.problema !== 'OK' && (
                  <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-700">
                      <strong>Problema Identificado:</strong> {diagnostico.resumo.problema}
                      {diagnostico.resumo.problema.includes('Nenhuma disciplina') && (
                        <div className="mt-2">
                          <strong>Solução:</strong> Verifique se há conteúdo PDF publicado para a série "{diagnostico.resumo.serieUsuario}". 
                          O sistema só mostra disciplinas que têm conteúdo real.
                        </div>
                      )}
                      {diagnostico.resumo.problema.includes('Nenhum conteúdo') && (
                        <div className="mt-2">
                          <strong>Solução:</strong> O Professor Conteudista precisa publicar PDFs para a série "{diagnostico.resumo.serieUsuario}".
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Detailed Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="disciplines">Disciplinas</TabsTrigger>
                <TabsTrigger value="raw">Dados Brutos</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo do Diagnóstico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Informações do Usuário</h4>
                        <ul className="space-y-1 text-sm">
                          <li><strong>Nome:</strong> {diagnostico.usuario.nome}</li>
                          <li><strong>Tipo:</strong> {diagnostico.usuario.tipo}</li>
                          <li><strong>Série:</strong> {diagnostico.usuario.serie}</li>
                          <li><strong>ID:</strong> {diagnostico.usuario.id}</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Estatísticas</h4>
                        <ul className="space-y-1 text-sm">
                          <li><strong>Total de conteúdos no sistema:</strong> {diagnostico.conteudo.totalConteudos}</li>
                          <li><strong>Disciplinas com conteúdo na série:</strong> {diagnostico.resumo.disciplinasComConteudo}</li>
                          <li><strong>Disciplinas geradas:</strong> {diagnostico.resumo.disciplinasGeradas}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Conteúdo Disponível</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-3">Conteúdo para a série: {diagnostico.usuario.serie}</h4>
                    {Object.keys(diagnostico.conteudo.conteudosDoUsuario).length === 0 ? (
                      <div className="text-center p-6 bg-yellow-50 rounded-lg">
                        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                        <p className="text-yellow-700 font-medium">Nenhum conteúdo encontrado para esta série</p>
                        <p className="text-sm text-yellow-600 mt-2">
                          Isso explica por que o aluno não vê disciplinas no dashboard.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(diagnostico.conteudo.conteudosDoUsuario).map(([disciplina, conteudos]) => (
                          <div key={disciplina} className="border rounded-lg p-3">
                            <h5 className="font-medium text-gray-900">{disciplina}</h5>
                            <div className="mt-2 space-y-1">
                              {Array.isArray(conteudos) ? conteudos.map((conteudo: any, index: number) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span>Bimestre {conteudo.bimestre}</span>
                                  <Badge variant="secondary">{conteudo.autorNome}</Badge>
                                </div>
                              )) : (
                                <div className="text-sm text-gray-600">Formato inesperado</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="disciplines" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Disciplinas Geradas pelo Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {diagnostico.disciplinas.listaDisciplinas.length === 0 ? (
                      <div className="text-center p-6 bg-red-50 rounded-lg">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <p className="text-red-700 font-medium">Nenhuma disciplina gerada</p>
                        <p className="text-sm text-red-600 mt-2">
                          O sistema não está gerando disciplinas porque não há conteúdo publicado.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {diagnostico.disciplinas.listaDisciplinas.map((disciplina: any) => (
                          <div key={disciplina.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{disciplina.nome}</h5>
                              <Badge variant={disciplina.temConteudo ? "default" : "secondary"}>
                                {disciplina.progresso}%
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>ID: {disciplina.id}</div>
                              <div>Bimestres: {disciplina.bimestresComConteudo}/4</div>
                              <div>Tem conteúdo: {disciplina.temConteudo ? 'Sim' : 'Não'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="raw" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados Brutos (JSON)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(diagnostico, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* No Data State */}
        {!diagnostico && !loading && !error && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Aguardando Diagnóstico</h3>
              <p className="text-gray-600 mb-4">Clique em "Atualizar Diagnóstico" para iniciar a análise.</p>
              <Button onClick={executarDiagnosticoCompleto} disabled={!usuario?.id}>
                <Bug className="w-4 h-4 mr-2" />
                Iniciar Diagnóstico
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}