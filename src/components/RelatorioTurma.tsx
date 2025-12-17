// src/components/RelatorioTurma.tsx
/**
 * Relatório de Turma - Coordenação
 * Análise detalhada do desempenho da turma por série e bimestre.
 * Gera relatórios dinâmicos baseados nas tabelas notas, users e disciplinas.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ArrowLeft, Download, TrendingUp, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RelatorioTurmaProps {
  onVoltar: () => void;
}

interface DadosDesempenho {
  disciplina: string;
  media: number;
  aprovados: number;
  reprovados: number;
  recuperacao: number;
}

interface AlunoDestaque {
  nome: string;
  media: number;
  posicao: number;
}

interface AlunoAtencao {
  nome: string;
  media: number;
  faltas: number;
  motivo: string;
}

interface EvolucaoNotas {
  bimestre: string;
  media: number;
}

// ✅ CORRIGIDO: export default function
export default function RelatorioTurma({ onVoltar }: RelatorioTurmaProps) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [series, setSeries] = useState<string[]>([]);
  const [serieSelecionada, setSerieSelecionada] = useState('todas');
  const [bimestreSelecionado, setBimestreSelecionado] = useState('1');

  // Dados do relatório
  const [dadosDesempenho, setDadosDesempenho] = useState<DadosDesempenho[]>([]);
  const [evolucaoNotas, setEvolucaoNotas] = useState<EvolucaoNotas[]>([]);
  const [alunosDestaque, setAlunosDestaque] = useState<AlunoDestaque[]>([]);
  const [alunosAtencao, setAlunosAtencao] = useState<AlunoAtencao[]>([]);

  // Estatísticas
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [mediaGeral, setMediaGeral] = useState(0);
  const [aprovados, setAprovados] = useState(0);
  const [recuperacao, setRecuperacao] = useState(0);
  const [reprovados, setReprovados] = useState(0);
  const [frequenciaMedia, setFrequenciaMedia] = useState(0);

  // ========================================
  // 1️⃣ CARREGAR SÉRIES ÚNICAS
  // ========================================
  useEffect(() => {
    carregarSeries();
  }, []);

  async function carregarSeries() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('serie')
        .eq('tipo', 'aluno')
        .not('serie', 'is', null);

      if (error) throw error;

      const seriesUnicas = Array.from(new Set(data?.map(item => item.serie) || []));
      setSeries(['todas', ...seriesUnicas.sort()]);
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
    }
  }

  // ========================================
  // 2️⃣ CARREGAR DADOS DO RELATÓRIO
  // ========================================
  useEffect(() => {
    carregarRelatorio();
  }, [serieSelecionada, bimestreSelecionado]);

  async function carregarRelatorio() {
    setCarregando(true);
    setErro(null);

    try {
      // BUSCAR ALUNOS DA SÉRIE SELECIONADA
      let queryAlunos = supabase
        .from('users')
        .select('id, nome, serie')
        .eq('tipo', 'aluno');

      if (serieSelecionada !== 'todas') {
        queryAlunos = queryAlunos.eq('serie', serieSelecionada);
      }

      const { data: alunosData, error: alunosError } = await queryAlunos;
      if (alunosError) throw alunosError;

      const alunosIds = alunosData?.map(a => a.id) || [];
      setTotalAlunos(alunosIds.length);

      if (alunosIds.length === 0) {
        resetarDados();
        setCarregando(false);
        return;
      }

      // BUSCAR NOTAS DO BIMESTRE
      const { data: notasData, error: notasError } = await supabase
        .from('notas')
        .select(`
          *,
          disciplina:disciplinas!disciplina_id(nome)
        `)
        .in('user_id', alunosIds)
        .eq('bimestre', parseInt(bimestreSelecionado));

      if (notasError) throw notasError;

      // GERAR ESTATÍSTICAS
      await gerarEstatisticas(alunosData || [], notasData || []);

    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      setErro(error.message || 'Erro ao carregar relatório');
    } finally {
      setCarregando(false);
    }
  }

  // ========================================
  // 3️⃣ GERAR ESTATÍSTICAS DO RELATÓRIO
  // ========================================
  async function gerarEstatisticas(alunos: any[], notas: any[]) {
    // CALCULAR DESEMPENHO POR DISCIPLINA
    const disciplinasMap = new Map<string, { notas: number[], aprovados: number, reprovados: number, recuperacao: number }>();

    notas.forEach(nota => {
      const disciplina = nota.disciplina?.nome || 'Disciplina';
      const media = nota.media_final ?? nota.media ?? 0;

      if (!disciplinasMap.has(disciplina)) {
        disciplinasMap.set(disciplina, { notas: [], aprovados: 0, reprovados: 0, recuperacao: 0 });
      }

      const disc = disciplinasMap.get(disciplina)!;
      disc.notas.push(media);

      if (media >= 7) disc.aprovados++;
      else if (media >= 5) disc.recuperacao++;
      else disc.reprovados++;
    });

    const desempenho: DadosDesempenho[] = Array.from(disciplinasMap.entries()).map(([disciplina, dados]) => ({
      disciplina,
      media: dados.notas.reduce((a, b) => a + b, 0) / dados.notas.length,
      aprovados: dados.aprovados,
      reprovados: dados.reprovados,
      recuperacao: dados.recuperacao
    }));

    setDadosDesempenho(desempenho);

    // CALCULAR MÉDIA GERAL E SITUAÇÃO DOS ALUNOS
    const alunosComMedia = alunos.map(aluno => {
      const notasAluno = notas.filter(n => n.user_id === aluno.id);
      const somaMedias = notasAluno.reduce((acc, n) => acc + (n.media_final ?? n.media ?? 0), 0);
      const media = notasAluno.length > 0 ? somaMedias / notasAluno.length : 0;
      const totalFaltas = notasAluno.reduce((acc, n) => acc + (n.faltas ?? 0), 0);

      return { ...aluno, media, totalFaltas };
    });

    // MÉDIA GERAL DA TURMA
    const somaMedias = alunosComMedia.reduce((acc, a) => acc + a.media, 0);
    const mediaGeralCalc = alunosComMedia.length > 0 ? somaMedias / alunosComMedia.length : 0;
    setMediaGeral(mediaGeralCalc);

    // SITUAÇÃO DOS ALUNOS
    const aprovadosCount = alunosComMedia.filter(a => a.media >= 7).length;
    const recuperacaoCount = alunosComMedia.filter(a => a.media >= 5 && a.media < 7).length;
    const reprovadosCount = alunosComMedia.filter(a => a.media < 5).length;

    setAprovados(aprovadosCount);
    setRecuperacao(recuperacaoCount);
    setReprovados(reprovadosCount);

    // FREQUÊNCIA MÉDIA
    const totalPresencas = notas.reduce((acc, n) => acc + (n.frequencia ?? 0), 0);
    const totalAulas = notas.length * 100; // Assumindo 100 aulas por disciplina
    const freqMedia = totalAulas > 0 ? (totalPresencas / totalAulas) * 100 : 0;
    setFrequenciaMedia(freqMedia);

    // ALUNOS DESTAQUE (TOP 3)
    const top3 = alunosComMedia
      .sort((a, b) => b.media - a.media)
      .slice(0, 3)
      .map((aluno, index) => ({
        nome: aluno.nome,
        media: aluno.media,
        posicao: index + 1
      }));
    setAlunosDestaque(top3);

    // ALUNOS QUE PRECISAM DE ATENÇÃO
    const atencao = alunosComMedia
      .filter(a => a.media < 6 || a.totalFaltas > 10)
      .map(aluno => ({
        nome: aluno.nome,
        media: aluno.media,
        faltas: aluno.totalFaltas,
        motivo: aluno.media < 6 && aluno.totalFaltas > 10
          ? 'Baixa frequência e notas'
          : aluno.media < 6
          ? 'Notas abaixo da média'
          : 'Baixa frequência'
      }));
    setAlunosAtencao(atencao);

    // EVOLUÇÃO DAS NOTAS (buscar todos os bimestres)
    await buscarEvolucao(alunos.map(a => a.id));
  }

  // ========================================
  // 4️⃣ BUSCAR EVOLUÇÃO DAS NOTAS
  // ========================================
  async function buscarEvolucao(alunosIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('bimestre, media, media_final')
        .in('user_id', alunosIds);

      if (error) throw error;

      const bimestresMap = new Map<number, number[]>();

      data?.forEach(nota => {
        const bim = nota.bimestre;
        const media = nota.media_final ?? nota.media ?? 0;

        if (!bimestresMap.has(bim)) {
          bimestresMap.set(bim, []);
        }
        bimestresMap.get(bim)!.push(media);
      });

      const evolucao: EvolucaoNotas[] = [1, 2, 3, 4].map(bim => {
        const notas = bimestresMap.get(bim) || [];
        const media = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
        return { bimestre: `${bim}º Bim`, media };
      });

      setEvolucaoNotas(evolucao);
    } catch (error) {
      console.error('Erro ao buscar evolução:', error);
    }
  }

  // ========================================
  // 5️⃣ FUNÇÕES AUXILIARES
  // ========================================
  function resetarDados() {
    setDadosDesempenho([]);
    setEvolucaoNotas([]);
    setAlunosDestaque([]);
    setAlunosAtencao([]);
    setTotalAlunos(0);
    setMediaGeral(0);
    setAprovados(0);
    setRecuperacao(0);
    setReprovados(0);
    setFrequenciaMedia(0);
  }

  // ========================================
  // 6️⃣ FUNÇÃO DE GERAR PDF
  // ========================================
  async function handleGerarRelatorio() {
    try {
      toast.loading('Gerando relatório em PDF...');

      const doc = new jsPDF();

      // ✅ CARREGAR LOGO DA ESCOLA
      const logo = new Image();
      logo.src = '/logo-colegio-conexao.png';

      await new Promise((resolve) => {
        logo.onload = resolve;
      });

      // ✅ CABEÇALHO COM LOGO
      doc.addImage(logo, 'PNG', 14, 10, 30, 30);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('COLÉGIO CONEXÃO', 50, 20);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório de Desempenho da Turma', 50, 28);
      doc.setFontSize(10);
      doc.text(`Série: ${serieSelecionada === 'todas' ? 'Todas as Séries' : serieSelecionada}`, 50, 35);
      doc.text(`Bimestre: ${bimestreSelecionado}º`, 50, 40);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 35);

      // Linha separadora
      doc.setDrawColor(0, 0, 255);
      doc.setLineWidth(0.5);
      doc.line(14, 45, 196, 45);

      let yPos = 55;

      // ✅ ESTATÍSTICAS GERAIS
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Estatísticas Gerais', 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Alunos: ${totalAlunos}`, 14, yPos);
      doc.text(`Média Geral: ${mediaGeral.toFixed(1)}`, 70, yPos);
      doc.text(`Frequência Média: ${frequenciaMedia.toFixed(0)}%`, 126, yPos);
      yPos += 7;

      doc.text(`Aprovados: ${aprovados}`, 14, yPos);
      doc.text(`Recuperação: ${recuperacao}`, 70, yPos);
      doc.text(`Reprovados: ${reprovados}`, 126, yPos);
      yPos += 15;

      // ✅ DESEMPENHO POR DISCIPLINA
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Desempenho por Disciplina', 14, yPos);
      yPos += 5;

      if (dadosDesempenho.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Disciplina', 'Média', 'Aprovados', 'Recuperação', 'Reprovados', 'Taxa Aprov.']],
          body: dadosDesempenho.map(d => {
            const total = d.aprovados + d.recuperacao + d.reprovados;
            const taxa = total > 0 ? ((d.aprovados / total) * 100).toFixed(0) + '%' : '0%';
            return [
              d.disciplina,
              d.media.toFixed(1),
              d.aprovados.toString(),
              d.recuperacao.toString(),
              d.reprovados.toString(),
              taxa
            ];
          }),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // ✅ ALUNOS DESTAQUE
      if (alunosDestaque.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Alunos Destaque', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Posição', 'Nome', 'Média']],
          body: alunosDestaque.map(a => [
            a.posicao.toString() + 'º',
            a.nome,
            a.media.toFixed(1)
          ]),
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // ✅ ALUNOS QUE PRECISAM DE ATENÇÃO
      if (alunosAtencao.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Alunos que Precisam de Atenção', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Nome', 'Média', 'Faltas', 'Motivo']],
          body: alunosAtencao.map(a => [
            a.nome,
            a.media.toFixed(1),
            a.faltas.toString(),
            a.motivo
          ]),
          theme: 'grid',
          headStyles: { fillColor: [234, 179, 8] },
        });
      }

      // ✅ RODAPÉ
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // ✅ SALVAR PDF
      const nomeArquivo = `relatorio-turma-${serieSelecionada}-${bimestreSelecionado}bim-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    }
  }

  // ========================================
  // 7️⃣ RENDERIZAÇÃO
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
            <h1 className="font-semibold text-gray-900">Relatório de Turma</h1>
            <p className="text-sm text-gray-600">Análise detalhada do desempenho da turma</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Série</label>
                  <Select value={serieSelecionada} onValueChange={setSerieSelecionada}>
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

                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Bimestre</label>
                  <Select value={bimestreSelecionado} onValueChange={setBimestreSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1º Bimestre</SelectItem>
                      <SelectItem value="2">2º Bimestre</SelectItem>
                      <SelectItem value="3">3º Bimestre</SelectItem>
                      <SelectItem value="4">4º Bimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={handleGerarRelatorio} disabled={carregando}>
                    <Download className="w-4 h-4 mr-2" />
                    Gerar PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LOADING */}
          {carregando && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Carregando relatório...</span>
            </div>
          )}

          {/* ERRO */}
          {erro && !carregando && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Erro ao carregar relatório</h3>
                  <p className="text-sm text-red-700 mt-1">{erro}</p>
                  <Button variant="outline" size="sm" onClick={carregarRelatorio} className="mt-3">
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CONTEÚDO DO RELATÓRIO */}
          {!carregando && !erro && (
            <>
              {/* Estatísticas Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalAlunos}</div>
                    <div className="text-sm text-gray-600">Total de Alunos</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{mediaGeral.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Média Geral</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{aprovados}</div>
                    <div className="text-sm text-gray-600">Aprovados</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{recuperacao}</div>
                    <div className="text-sm text-gray-600">Recuperação</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{frequenciaMedia.toFixed(0)}%</div>
                    <div className="text-sm text-gray-600">Freq. Média</div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Desempenho por Disciplina */}
                <Card>
                  <CardHeader>
                    <CardTitle>Desempenho por Disciplina</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dadosDesempenho.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dadosDesempenho}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="disciplina" angle={-45} textAnchor="end" height={80} />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Bar dataKey="media" fill="#3b82f6" name="Média" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-gray-500 py-12">Sem dados de desempenho</p>
                    )}
                  </CardContent>
                </Card>

                {/* Evolução das Notas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Evolução das Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {evolucaoNotas.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={evolucaoNotas}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bimestre" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="media" stroke="#10b981" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-gray-500 py-12">Sem dados de evolução</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Destaques e Alertas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alunos Destaque */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Alunos Destaque
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alunosDestaque.length > 0 ? (
                      <div className="space-y-3">
                        {alunosDestaque.map((aluno, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                                {aluno.posicao}
                              </div>
                              <div>
                                <p className="font-medium">{aluno.nome}</p>
                                <p className="text-sm text-gray-600">Média: {aluno.media.toFixed(1)}</p>
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-700">Excelente</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">Sem alunos de destaque</p>
                    )}
                  </CardContent>
                </Card>

                {/* Alunos que Precisam de Atenção */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      Alunos que Precisam de Atenção
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alunosAtencao.length > 0 ? (
                      <div className="space-y-3">
                        {alunosAtencao.map((aluno, index) => (
                          <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium">{aluno.nome}</p>
                              <Badge className="bg-yellow-100 text-yellow-700">Atenção</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Média: {aluno.media.toFixed(1)} • Faltas: {aluno.faltas}
                            </p>
                            <p className="text-xs text-gray-500">{aluno.motivo}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">Sem alunos que precisam de atenção</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detalhamento por Disciplina */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Disciplina</CardTitle>
                </CardHeader>
                <CardContent>
                  {dadosDesempenho.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Disciplina</th>
                            <th className="text-center py-2">Média</th>
                            <th className="text-center py-2">Aprovados</th>
                            <th className="text-center py-2">Recuperação</th>
                            <th className="text-center py-2">Reprovados</th>
                            <th className="text-center py-2">Taxa Aprovação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dadosDesempenho.map((disciplina, index) => {
                            const total = disciplina.aprovados + disciplina.recuperacao + disciplina.reprovados;
                            const taxaAprovacao = total > 0 ? (disciplina.aprovados / total) * 100 : 0;

                            return (
                              <tr key={index} className="border-b">
                                <td className="py-3 font-medium">{disciplina.disciplina}</td>
                                <td className="text-center">
                                  <span className={`font-bold ${
                                    disciplina.media >= 7 ? 'text-green-600' :
                                    disciplina.media >= 5 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {disciplina.media.toFixed(1)}
                                  </span>
                                </td>
                                <td className="text-center text-green-600">{disciplina.aprovados}</td>
                                <td className="text-center text-yellow-600">{disciplina.recuperacao}</td>
                                <td className="text-center text-red-600">{disciplina.reprovados}</td>
                                <td className="text-center">{taxaAprovacao.toFixed(0)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-12">Sem dados de disciplinas</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
