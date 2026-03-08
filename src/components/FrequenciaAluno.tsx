// src/components/FrequenciaAluno.tsx
/**
 * Frequência dos Alunos - Painel do Coordenador
 * Lista vários alunos com filtros e indicadores de frequência.
 */

import { useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

// PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import {
  ArrowLeft,
  Search,
  AlertTriangle,
  CheckCircle,
  X,
  FileText,
  Printer,
  Loader2,
} from 'lucide-react';

import { toast } from 'sonner';

interface FrequenciaAlunosProps {
  onVoltar: () => void;
}

type Situacao = 'regular' | 'atencao' | 'critica';

interface AlunoFrequencia {
  id: string; // id do aluno (users.id)
  nome: string;
  serie: string; // texto da série vindo de users.serie
  turma: string; // por enquanto “Sem turma” até ligar na tabela turmas
  totalAulas: number;
  presencas: number;
  faltas: number;
  percentualFrequencia: number;
  ultimasFaltas: string[];
  situacao: Situacao;
}

export default function FrequenciaAlunosCoordenador({
  onVoltar,
}: FrequenciaAlunosProps) {
  const [filtroSerie, setFiltroSerie] = useState<string>('todas');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [alunosCarregados, setAlunosCarregados] = useState(false);
  const [alunosFiltrados, setAlunosFiltrados] = useState<AlunoFrequencia[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const getSituacaoColor = (situacao: Situacao) => {
    switch (situacao) {
      case 'regular':
        return 'bg-green-100 text-green-700';
      case 'atencao':
        return 'bg-yellow-100 text-yellow-700';
      case 'critica':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSituacaoIcon = (situacao: Situacao) => {
    switch (situacao) {
      case 'regular':
        return <CheckCircle className="w-4 h-4" />;
      case 'atencao':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critica':
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getSituacaoTexto = (situacao: Situacao) => {
    switch (situacao) {
      case 'regular':
        return 'Regular';
      case 'atencao':
        return 'Atenção';
      case 'critica':
        return 'Crítica';
      default:
        return 'Desconhecida';
    }
  };

  const calcularSituacao = (percentual: number): Situacao => {
    if (percentual >= 85) return 'regular';
    if (percentual >= 75) return 'atencao';
    return 'critica';
  };

  // ======================
  // Resumo por disciplina para o PDF (sem relacionamento direto)
  // ======================
  const carregarResumoPorDisciplina = async (aluno: AlunoFrequencia) => {
    // 1) Busca simples na frequencia_diaria
    const { data, error } = await supabase
      .from('frequencia_diaria')
      .select('disciplina_id, presente')
      .eq('aluno_id', aluno.id);

    if (error) {
      console.error('Erro ao buscar frequência por disciplina:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    type LinhaFreq = {
      disciplina_id: string | null;
      presente: boolean | null;
    };

    const linhas = data as LinhaFreq[];

    // 2) Agrupar por disciplina_id
    const mapa: Record<
      string,
      {
        disciplinaId: string;
        nome: string; // será preenchido depois
        totalAulas: number;
        presencas: number;
        faltas: number;
        percentual: number;
        situacao: Situacao;
      }
    > = {};

    for (const row of linhas) {
      if (!row.disciplina_id) continue;
      const id = row.disciplina_id;

      if (!mapa[id]) {
        mapa[id] = {
          disciplinaId: id,
          nome: '',
          totalAulas: 0,
          presencas: 0,
          faltas: 0,
          percentual: 0,
          situacao: 'regular',
        };
      }

      mapa[id].totalAulas += 1;
      if (row.presente) {
        mapa[id].presencas += 1;
      } else {
        mapa[id].faltas += 1;
      }
    }

    const disciplinaIds = Object.keys(mapa);
    if (disciplinaIds.length === 0) return [];

    // 3) Buscar nomes das disciplinas na tabela disciplinas
    const { data: disciplinasData, error: disciplinasError } = await supabase
      .from('disciplinas')
      .select('id, nome')
      .in('id', disciplinaIds);

    if (disciplinasError) {
      console.error('Erro ao buscar nomes das disciplinas:', disciplinasError);
      throw disciplinasError;
    }

    type LinhaDisc = { id: string; nome: string | null };

    for (const disc of (disciplinasData || []) as LinhaDisc[]) {
      if (!disc.id) continue;
      if (!mapa[disc.id]) continue;
      mapa[disc.id].nome = disc.nome || 'Sem nome';
    }

    // 4) Calcular percentuais e situação por disciplina
    const resultado = Object.values(mapa).map((item) => {
      const percentual =
        item.totalAulas > 0
          ? (item.presencas / item.totalAulas) * 100
          : 0;
      const situacao = calcularSituacao(percentual);

      return {
        disciplina: item.nome,
        totalAulas: item.totalAulas,
        presencas: item.presencas,
        faltas: item.faltas,
        percentual: Number(percentual.toFixed(1)),
        situacao,
      };
    });

    // Ordenar por nome da disciplina para ficar organizado no PDF
    resultado.sort((a, b) => a.disciplina.localeCompare(b.disciplina));
    return resultado;
  };


  // ======================
  // Buscar dados no Supabase (painel)
  // ======================
  const buscarFrequenciaAlunos = async () => {
    setLoading(true);
    setErro(null);

    try {
      // 1) Buscar registros de frequência apenas com dados básicos
      let freqQuery = supabase
        .from('frequencia_diaria')
        .select('aluno_id, data_aula, presente')
        .order('data_aula', { ascending: true });

      // (aqui você poderia aplicar filtros por série/data se quiser)

      const { data: freqData, error: freqError } = await freqQuery;

      if (freqError) {
        console.error('Erro ao buscar frequências:', freqError);
        throw freqError;
      }

      if (!freqData || freqData.length === 0) {
        setAlunosFiltrados([]);
        setAlunosCarregados(true);
        setLoading(false);
        return;
      }

      // 2) Pegar ids distintos de alunos
      const alunoIds = Array.from(
        new Set(freqData.map((r) => r.aluno_id).filter(Boolean)),
      ) as string[];

      if (alunoIds.length === 0) {
        setAlunosFiltrados([]);
        setAlunosCarregados(true);
        setLoading(false);
        return;
      }

      // 3) Buscar dados dos alunos na tabela users
      let usersQuery = supabase
        .from('users')
        .select('id, nome, serie, tipo')
        .in('id', alunoIds)
        .eq('tipo', 'aluno');

      if (busca.trim()) {
        usersQuery = usersQuery.ilike('nome', `%${busca.trim()}%`);
      }

      if (filtroSerie !== 'todas') {
        usersQuery = usersQuery.eq('serie', filtroSerie);
      }

      const { data: usersData, error: usersError } = await usersQuery;

      if (usersError) {
        console.error('Erro ao buscar alunos:', usersError);
        throw usersError;
      }

      if (!usersData || usersData.length === 0) {
        setAlunosFiltrados([]);
        setAlunosCarregados(true);
        setLoading(false);
        return;
      }

      // 4) Montar mapa de aluno_id -> aluno
      const mapaAlunos = new Map(usersData.map((a) => [a.id, a]));

      // 5) Agrupar frequências por aluno e calcular totais
      const agrupadoPorAluno = new Map<string, AlunoFrequencia>();

      for (const freq of freqData) {
        const aluno = mapaAlunos.get(freq.aluno_id);
        if (!aluno) continue;

        if (!agrupadoPorAluno.has(freq.aluno_id)) {
          agrupadoPorAluno.set(freq.aluno_id, {
            id: aluno.id,
            nome: aluno.nome,
            serie: aluno.serie ?? 'Sem série',
            turma: 'Sem turma',
            totalAulas: 0,
            presencas: 0,
            faltas: 0,
            percentualFrequencia: 0,
            ultimasFaltas: [],
            situacao: 'regular',
          });
        }

        const registro = agrupadoPorAluno.get(freq.aluno_id)!;
        registro.totalAulas += 1;

        if (freq.presente) {
          registro.presencas += 1;
        } else {
          registro.faltas += 1;

          if (freq.data_aula) {
            const dataStr = new Date(freq.data_aula).toLocaleDateString(
              'pt-BR',
            );
            registro.ultimasFaltas.push(dataStr);
          }
        }
      }

      const resultado = Array.from(agrupadoPorAluno.values()).map(
        (aluno) => {
          if (aluno.totalAulas > 0) {
            aluno.percentualFrequencia =
              (aluno.presencas / aluno.totalAulas) * 100;
          } else {
            aluno.percentualFrequencia = 0;
          }
          aluno.situacao = calcularSituacao(aluno.percentualFrequencia);
          if (aluno.ultimasFaltas.length > 3) {
            aluno.ultimasFaltas = aluno.ultimasFaltas.slice(-3);
          }
          return aluno;
        },
      );

      let filtrados = resultado;

      if (filtroSituacao !== 'todas') {
        filtrados = filtrados.filter(
          (a) => a.situacao === (filtroSituacao as Situacao),
        );
      }

      setAlunosFiltrados(filtrados);
      setAlunosCarregados(true);
    } catch (error) {
      console.error(error);
      setErro('Erro ao carregar frequência dos alunos.');
      toast.error('Erro ao carregar frequência dos alunos.');
    } finally {
      setLoading(false);
    }
  };

  const handleLimparFiltros = () => {
    setFiltroSerie('todas');
    setFiltroSituacao('todas');
    setBusca('');
    setAlunosFiltrados([]);
    setAlunosCarregados(false);
    setErro(null);
  };

    // ======================
  // Geração de relatório PDF do aluno (com quadro por disciplina)
  // ======================
  const handleGerarRelatorioAluno = async (aluno: AlunoFrequencia) => {
  try {
    // 1) Carregar resumo por disciplina (função já declarada acima)
    const resumoPorDisciplina = await carregarResumoPorDisciplina(aluno);

    // 2) Criar o documento
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
    });

    const marginLeft = 40;
    const marginTop = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - marginLeft * 2;

    let cursorY = marginTop;

    // =========================
    // CABEÇALHO: LOGO + TÍTULOS
    // =========================
    const logoWidth = 70;
    const logoHeight = 70;

    try {
      const logoImg = new Image();
      logoImg.src = '/logo-colegio-conexao.png'; // public/logo-colegio-conexao.png
      doc.addImage(logoImg, 'PNG', marginLeft, cursorY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('Não foi possível carregar a logo no PDF:', e);
    }

    const titleX = marginLeft + logoWidth + 15;
    const titleY = cursorY + 20;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Colégio Conexão', titleX, titleY);

    doc.setFontSize(13);
    doc.text('Relatório de Frequência de Aluno', titleX, titleY + 16);

    // Avançar cursor abaixo do logo
    cursorY = marginTop + logoHeight + 20;

    // =========================
    // DADOS DO ALUNO
    // =========================
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);

    doc.text(`Aluno: ${aluno.nome}`, marginLeft, cursorY);
    cursorY += 14;
    doc.text(`Série: ${aluno.serie}`, marginLeft, cursorY);
    cursorY += 14;
    doc.text(`Turma: ${aluno.turma || '-'}`, marginLeft, cursorY);
    cursorY += 20;

    // =========================
    // RESUMO GERAL
    // =========================
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumo Geral de Frequência', marginLeft, cursorY);
    cursorY += 14;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);

    doc.text(`Total de aulas: ${aluno.totalAulas}`, marginLeft, cursorY);
    cursorY += 12;
    doc.text(`Presenças: ${aluno.presencas}`, marginLeft, cursorY);
    cursorY += 12;
    doc.text(`Faltas: ${aluno.faltas}`, marginLeft, cursorY);
    cursorY += 12;
    doc.text(
      `Frequência geral: ${aluno.percentualFrequencia.toFixed(1)}%`,
      marginLeft,
      cursorY,
    );
    cursorY += 12;
    doc.text(
      `Situação: ${getSituacaoTexto(aluno.situacao)}`,
      marginLeft,
      cursorY,
    );
    cursorY += 22;

    // =========================
    // TEXTO EXPLICATIVO
    // =========================
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Orientações sobre frequência:', marginLeft, cursorY);
    cursorY += 16;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);

    const explicacao =
      'De acordo com a legislação vigente, o aluno deverá ter, no mínimo, 75% de presença ' +
      'nas aulas para ser considerado aprovado por frequência. Abaixo de 75%, o aluno é ' +
      'reprovado por falta, independentemente das notas obtidas nas avaliações.';

    const linhasExplicacao = doc.splitTextToSize(explicacao, contentWidth);
    doc.text(linhasExplicacao, marginLeft, cursorY);
    cursorY += linhasExplicacao.length * 12 + 18;

    // =========================
    // QUADRO POR DISCIPLINA
    // =========================
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumo de Frequência por Disciplina', marginLeft, cursorY);
    cursorY += 10;

    if (!resumoPorDisciplina || resumoPorDisciplina.length === 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        'Não há registros de frequência por disciplina para este aluno.',
        marginLeft,
        cursorY + 12,
      );
    } else {
      const head = [
        [
          'Disciplina',
          'Total de Aulas',
          'Presenças',
          'Faltas',
          'Frequência (%)',
          'Situação',
        ],
      ];

      // Aqui garantimos que a PRIMEIRA coluna é o nome da disciplina
      const body = resumoPorDisciplina.map((d) => [
        d.disciplina, // <- nome da disciplina
        String(d.totalAulas),
        String(d.presencas),
        String(d.faltas),
        d.percentual.toFixed(1),
        getSituacaoTexto(d.situacao),
      ]);

      autoTable(doc, {
        startY: cursorY + 4,
        head,
        body,
        styles: {
          font: 'Helvetica',
          fontSize: 9,
        },
        headStyles: {
          fillColor: [255, 204, 0], // amarelo
          textColor: 0,
          halign: 'center',
        },
        bodyStyles: {
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'left' }, // Disciplina alinhada à esquerda
        },
        margin: { left: marginLeft, right: marginLeft },
      });
    }

    const finalY = (doc as any).lastAutoTable?.finalY || cursorY + 30;

    // =========================
    // RODAPÉ
    // =========================
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      'Relatório gerado pelo sistema de gestão escolar do Colégio Conexão.',
      marginLeft,
      finalY + 20,
    );

    const nomeArquivo = `relatorio_frequencia_${aluno.nome
      .toLowerCase()
      .replace(/\s+/g, '_')}.pdf`;

    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar relatório individual do aluno:', error);
    toast.error(
      'Erro ao gerar relatório do aluno. Tente novamente mais tarde.',
    );
  }
};



  // ======================
  // RENDER
  // ======================
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoltar}
            className="mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Frequência dos Alunos</h1>
            <p className="text-sm text-gray-500">
              Monitoramento de presença e faltas
            </p>
          </div>
        </div>

        <Button variant="outline" className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {alunosFiltrados.length}
            </p>
            <p className="text-xs text-gray-500">
              Alunos com registros de frequência
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Frequência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {alunosFiltrados.length > 0
                ? `${(
                    alunosFiltrados.reduce(
                      (acc, a) => acc + a.percentualFrequencia,
                      0,
                    ) / alunosFiltrados.length
                  ).toFixed(1)}%`
                : '0%'}
            </p>
            <p className="text-xs text-gray-500">
              Média geral de presença dos alunos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Regulares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {alunosFiltrados.filter((a) => a.situacao === 'regular').length}
            </p>
            <p className="text-xs text-gray-500">
              Alunos com boa frequência
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Em Situação Crítica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">
              {alunosFiltrados.filter((a) => a.situacao === 'critica').length}
            </p>
            <p className="text-xs text-gray-500">
              Alunos com frequência abaixo de 75%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Filtros de Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Buscar aluno
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <Input
                className="pl-8"
                placeholder="Digite o nome do aluno"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Série</label>
            <Select
              value={filtroSerie}
              onValueChange={(value) => setFiltroSerie(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="6º ano">6º ano</SelectItem>
                <SelectItem value="7º ano">7ª ano</SelectItem>
                <SelectItem value="8º ano">8º anoe</SelectItem>
                <SelectItem value="9º ano">9º ano</SelectItem>
                <SelectItem value="1ª série">1ª série</SelectItem>
                <SelectItem value="2ª série">2ª série</SelectItem>
                <SelectItem value="3ª série">3ª série</SelectItem>
                {/* ajuste conforme suas séries */}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Situação
            </label>
            <Select
              value={filtroSituacao}
              onValueChange={(value) => setFiltroSituacao(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleLimparFiltros}
            >
              Limpar Filtros
            </Button>
            <Button
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
              onClick={buscarFrequenciaAlunos}
            >
              <Search className="w-4 h-4" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Erro */}
      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Lista de alunos */}
      {alunosCarregados && !loading && (
        <div className="space-y-4">
          {alunosFiltrados.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">
                  Nenhum aluno encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Não foram encontrados alunos com os critérios de busca
                  informados.
                </p>
                <Button variant="outline" onClick={handleLimparFiltros}>
                  Limpar Filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alunosFiltrados.map((aluno) => (
                <Card key={aluno.id} className="border border-gray-200">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {aluno.nome}
                          </h3>
                          <Badge
                            className={`${getSituacaoColor(
                              aluno.situacao,
                            )} flex items-center gap-1`}
                          >
                            {getSituacaoIcon(aluno.situacao)}
                            <span>{getSituacaoTexto(aluno.situacao)}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Série: {aluno.serie} • Turma: {aluno.turma}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total de aulas:{' '}
                          <span className="font-semibold">
                            {aluno.totalAulas}
                          </span>{' '}
                          • Presenças:{' '}
                          <span className="font-semibold text-green-600">
                            {aluno.presencas}
                          </span>{' '}
                          • Faltas:{' '}
                          <span className="font-semibold text-red-600">
                            {aluno.faltas}
                          </span>{' '}
                          • Frequência:{' '}
                          <span className="font-semibold">
                            {aluno.percentualFrequencia.toFixed(1)}%
                          </span>
                        </p>
                        {aluno.ultimasFaltas.length > 0 && (
                          <p className="text-xs text-gray-500">
                            Últimas faltas:{' '}
                            {aluno.ultimasFaltas.join(', ')}
                          </p>
                        )}

                        {/* Botão que já existia no layout */}
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 border-orange-400 text-orange-500 hover:bg-orange-50"
                            onClick={() =>
                              handleGerarRelatorioAluno(aluno)
                            }
                          >
                            <FileText className="w-4 h-4" />
                            Gerar Relatório PDF
                          </Button>
                        </div>
                      </div>

                      {/* Gráfico circular */}
                      <div className="flex items-center justify-center">
                        <div className="relative w-24 h-24">
                          <svg
                            className="w-full h-full transform -rotate-90"
                            viewBox="0 0 100 100"
                          >
                            <circle
                              className="text-gray-200"
                              strokeWidth="10"
                              stroke="currentColor"
                              fill="transparent"
                              r="45"
                              cx="50"
                              cy="50"
                            />
                            <circle
                              className="text-green-500"
                              strokeWidth="10"
                              strokeDasharray={`${2 * Math.PI * 45}`}
                              strokeDashoffset={`${
                                2 *
                                Math.PI *
                                45 *
                                (1 - aluno.percentualFrequencia / 100)
                              }`}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r="45"
                              cx="50"
                              cy="50"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className={`text-lg font-bold ${
                                aluno.percentualFrequencia >= 85
                                  ? 'text-green-600'
                                  : aluno.percentualFrequencia >= 75
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {aluno.percentualFrequencia.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Carregando dados...</span>
        </div>
      )}
    </div>
  );
}
