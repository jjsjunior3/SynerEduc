// src/components/BoletinsGerais.tsx
/**
 * Boletins Gerais - Coordenação
 * Visualizar notas de todos os alunos por série, turma, disciplina e bimestre.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Search, Download, Eye, Filter, Loader2, AlertCircle, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { toast } from 'sonner';

interface BoletinsGeraisProps {
  onVoltar: () => void;
}

interface Aluno {
  id: string;
  nome: string;
  email: string;
  serie: string;
}

interface Nota {
  id: string;
  user_id: string;
  disciplina_id: string;
  bimestre: number;
  av1: number | null;
  av2: number | null;
  recuperacao: number | null;
  media: number | null;
  media_final: number | null;
  frequencia: number | null;
  faltas: number | null;
  status_final: string | null;
  disciplina: { nome: string } | null;
}

interface BoletimAluno {
  aluno: Aluno;
  notas: Nota[];
  mediaGeral: number;
  totalFaltas: number;
  situacao: 'aprovado' | 'recuperacao' | 'reprovado';
}

export default function BoletinsGerais({ onVoltar }: BoletinsGeraisProps) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [series, setSeries] = useState<string[]>([]);
  const [disciplinas, setDisciplinas] = useState<{ id: string; nome: string }[]>([]);
  const [filtroSerie, setFiltroSerie] = useState('todas');
  const [filtroDisciplina, setFiltroDisciplina] = useState('todas');
  const [filtroBimestre, setFiltroBimestre] = useState('todos');
  const [busca, setBusca] = useState('');

  // Dados
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [boletins, setBoletins] = useState<BoletimAluno[]>([]);

  // Estatísticas
  const [mediaGeral, setMediaGeral] = useState(0);
  const [aprovados, setAprovados] = useState(0);
  const [recuperacao, setRecuperacao] = useState(0);
  const [reprovados, setReprovados] = useState(0);

  // ========================================
  // 1️⃣ CARREGAR SÉRIES E DISCIPLINAS
  // ========================================
  useEffect(() => {
    carregarFiltros();
  }, []);

  async function carregarFiltros() {
    try {
      // Buscar séries únicas
      const { data: seriesData, error: seriesError } = await supabase
        .from('users')
        .select('serie')
        .eq('tipo', 'aluno')
        .not('serie', 'is', null);

      if (seriesError) throw seriesError;

      const seriesUnicas = Array.from(new Set(seriesData?.map(item => item.serie) || []));
      setSeries(['todas', ...seriesUnicas.sort()]);

      // Buscar disciplinas
      const { data: disciplinasData, error: disciplinasError } = await supabase
        .from('disciplinas')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (disciplinasError) throw disciplinasError;

      setDisciplinas(disciplinasData || []);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  }

  // ========================================
  // 2️⃣ CARREGAR ALUNOS E NOTAS
  // ========================================
  useEffect(() => {
    carregarDados();
  }, [filtroSerie, filtroDisciplina, filtroBimestre]);

  async function carregarDados() {
    setCarregando(true);
    setErro(null);

    try {
      // BUSCAR ALUNOS
      let queryAlunos = supabase
        .from('users')
        .select('id, nome, email, serie')
        .eq('tipo', 'aluno')
        .order('nome', { ascending: true });

      if (filtroSerie !== 'todas') {
        queryAlunos = queryAlunos.eq('serie', filtroSerie);
      }

      const { data: alunosData, error: alunosError } = await queryAlunos;
      if (alunosError) throw alunosError;

      setAlunos(alunosData || []);

      // BUSCAR NOTAS
      const alunosIds = alunosData?.map(a => a.id) || [];

      if (alunosIds.length === 0) {
        setNotas([]);
        setBoletins([]);
        setCarregando(false);
        return;
      }

      let queryNotas = supabase
        .from('notas')
        .select(`
          *,
          disciplina:disciplinas!disciplina_id(nome)
        `)
        .in('user_id', alunosIds);

      if (filtroDisciplina !== 'todas') {
        queryNotas = queryNotas.eq('disciplina_id', filtroDisciplina);
      }

      if (filtroBimestre !== 'todos') {
        queryNotas = queryNotas.eq('bimestre', parseInt(filtroBimestre));
      }

      const { data: notasData, error: notasError } = await queryNotas;
      if (notasError) throw notasError;

      setNotas(notasData || []);

      // GERAR BOLETINS
      gerarBoletins(alunosData || [], notasData || []);

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.message || 'Erro ao carregar boletins');
    } finally {
      setCarregando(false);
    }
  }

  // ========================================
  // 3️⃣ GERAR BOLETINS E ESTATÍSTICAS
  // ========================================
  function gerarBoletins(alunosData: Aluno[], notasData: Nota[]) {
    const boletinsGerados: BoletimAluno[] = alunosData.map(aluno => {
      const notasAluno = notasData.filter(n => n.user_id === aluno.id);

      // Calcular média geral (usando media_final se disponível, senão media)
      const somaMedias = notasAluno.reduce((acc, n) => {
        const notaFinal = n.media_final ?? n.media ?? 0;
        return acc + notaFinal;
      }, 0);

      const mediaGeral = notasAluno.length > 0 ? somaMedias / notasAluno.length : 0;

      // Calcular total de faltas
      const totalFaltas = notasAluno.reduce((acc, n) => acc + (n.faltas ?? 0), 0);

      // Determinar situação
      let situacao: 'aprovado' | 'recuperacao' | 'reprovado';
      if (mediaGeral >= 7) {
        situacao = 'aprovado';
      } else if (mediaGeral >= 5) {
        situacao = 'recuperacao';
      } else {
        situacao = 'reprovado';
      }

      return {
        aluno,
        notas: notasAluno,
        mediaGeral,
        totalFaltas,
        situacao
      };
    });

    setBoletins(boletinsGerados);

    // CALCULAR ESTATÍSTICAS
    const boletinsComNotas = boletinsGerados.filter(b => b.notas.length > 0);
    const somaMedias = boletinsComNotas.reduce((acc, b) => acc + b.mediaGeral, 0);
    const mediaGeralCalc = boletinsComNotas.length > 0 ? somaMedias / boletinsComNotas.length : 0;

    setMediaGeral(mediaGeralCalc);
    setAprovados(boletinsComNotas.filter(b => b.situacao === 'aprovado').length);
    setRecuperacao(boletinsComNotas.filter(b => b.situacao === 'recuperacao').length);
    setReprovados(boletinsComNotas.filter(b => b.situacao === 'reprovado').length);
  }

  // ========================================
  // 4️⃣ FILTRAR BOLETINS POR BUSCA
  // ========================================
  const boletinsFiltrados = boletins.filter(b =>
    b.aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
    b.aluno.email?.toLowerCase().includes(busca.toLowerCase())
  );

  // ========================================
  // 5️⃣ FUNÇÕES AUXILIARES
  // ========================================
  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'bg-green-100 text-green-700';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-700';
      case 'reprovado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMediaColor = (media: number) => {
    if (media >= 7) return 'text-green-600';
    if (media >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  function exportarPDF() {
    toast.info('Função de exportar PDF será implementada em breve');
  }

  function visualizarBoletim(alunoId: string) {
    toast.info('Visualização detalhada será implementada em breve');
  }

  // ========================================
  // 6️⃣ RENDERIZAÇÃO
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Boletins Gerais</h1>
            <p className="text-sm text-gray-600">Visualizar notas de todos os alunos por série, turma, disciplina e bimestre</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ESTATÍSTICAS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Alunos</p>
                    <p className="text-2xl font-bold text-gray-900">{alunos.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Média Geral</p>
                    <p className="text-2xl font-bold text-gray-900">{mediaGeral.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Aprovados</p>
                    <p className="text-2xl font-bold text-green-600">{aprovados}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recuperação</p>
                    <p className="text-2xl font-bold text-yellow-600">{recuperacao}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FILTROS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Aluno</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Nome ou email..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map(serie => (
                        <SelectItem key={serie} value={serie}>
                          {serie === 'todas' ? 'Todas as Séries' : serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Disciplina</label>
                  <Select value={filtroDisciplina} onValueChange={setFiltroDisciplina}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Disciplinas</SelectItem>
                      {disciplinas.map(disc => (
                        <SelectItem key={disc.id} value={disc.id}>
                          {disc.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bimestre</label>
                  <Select value={filtroBimestre} onValueChange={setFiltroBimestre}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Bimestres</SelectItem>
                      <SelectItem value="1">1º Bimestre</SelectItem>
                      <SelectItem value="2">2º Bimestre</SelectItem>
                      <SelectItem value="3">3º Bimestre</SelectItem>
                      <SelectItem value="4">4º Bimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={exportarPDF} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LOADING */}
          {carregando && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Carregando boletins...</span>
            </div>
          )}

          {/* ERRO */}
          {erro && !carregando && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Erro ao carregar boletins</h3>
                  <p className="text-sm text-red-700 mt-1">{erro}</p>
                  <Button variant="outline" size="sm" onClick={carregarDados} className="mt-3">
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* LISTA DE BOLETINS */}
          {!carregando && !erro && (
            <div className="space-y-4">
              {boletinsFiltrados.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum boletim encontrado</h3>
                    <p className="text-gray-600">
                      Ajuste os filtros ou aguarde o lançamento de notas pelos professores.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                boletinsFiltrados.map((boletim) => (
                  <Card key={boletim.aluno.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">{boletim.aluno.nome}</h3>
                          <p className="text-sm text-gray-600">
                            {boletim.aluno.serie} • {boletim.aluno.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Média Geral</p>
                            <p className={`text-2xl font-bold ${getMediaColor(boletim.mediaGeral)}`}>
                              {boletim.mediaGeral.toFixed(1)}
                            </p>
                          </div>
                          <Badge className={getSituacaoColor(boletim.situacao)}>
                            {boletim.situacao}
                          </Badge>
                        </div>
                      </div>

                      {/* Disciplinas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {boletim.notas.map((nota) => (
                          <div key={nota.id} className="border rounded-lg p-3">
                            <h4 className="font-medium text-sm mb-2">
                              {nota.disciplina?.nome || 'Disciplina'}
                            </h4>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Bimestre:</span>
                                <span className="font-medium">{nota.bimestre}º</span>
                              </div>
                              {nota.av1 !== null && (
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>AV1:</span>
                                  <span className="font-medium">{nota.av1.toFixed(2)}</span>
                                </div>
                              )}
                              {nota.av2 !== null && (
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>AV2:</span>
                                  <span className="font-medium">{nota.av2.toFixed(2)}</span>
                                </div>
                              )}
                              {nota.recuperacao !== null && (
                                <div className="flex justify-between text-xs text-orange-600">
                                  <span>Recuperação:</span>
                                  <span className="font-medium">{nota.recuperacao.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-sm font-medium">Média:</span>
                                <span className={`text-sm font-bold ${getMediaColor(nota.media_final ?? nota.media ?? 0)}`}>
                                  {(nota.media_final ?? nota.media ?? 0).toFixed(1)}
                                </span>
                              </div>
                              {nota.faltas !== null && (
                                <div className="text-xs text-gray-500">
                                  Faltas: {nota.faltas}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Total de Faltas: <span className="font-medium">{boletim.totalFaltas}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => visualizarBoletim(boletim.aluno.id)}>
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button variant="outline" size="sm" onClick={exportarPDF}>
                            <Download className="w-4 h-4 mr-1" />
                            Baixar PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
