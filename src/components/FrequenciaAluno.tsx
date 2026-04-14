// src/components/FrequenciaAluno.tsx
import { useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, AlertTriangle, CheckCircle, X, FileText, Loader2, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FrequenciaAlunosProps { onVoltar: () => void; }
type Situacao = 'regular' | 'atencao' | 'critica';

interface AlunoFrequencia {
  id: string; nome: string; serie: string; turma: string;
  totalAulas: number; presencas: number; faltas: number;
  percentualFrequencia: number; ultimasFaltas: string[]; situacao: Situacao;
}

// Padrão: mês atual
function getMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

export default function FrequenciaAlunosCoordenador({ onVoltar }: FrequenciaAlunosProps) {
  const mesAtual = getMesAtual();
  const [filtroSerie, setFiltroSerie] = useState('todas');
  const [filtroSituacao, setFiltroSituacao] = useState('todas');
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState(mesAtual.inicio);
  const [dataFim, setDataFim] = useState(mesAtual.fim);
  const [alunosCarregados, setAlunosCarregados] = useState(false);
  const [alunosFiltrados, setAlunosFiltrados] = useState<AlunoFrequencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const calcularSituacao = (pct: number): Situacao => pct >= 85 ? 'regular' : pct >= 75 ? 'atencao' : 'critica';

  const getSituacaoStyle = (s: Situacao) => {
    if (s === 'regular')  return { bg: '#dcfce7', text: '#14532d', border: '#86efac' };
    if (s === 'atencao')  return { bg: '#fef9c3', text: '#713f12', border: '#fde047' };
    return { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' };
  };

  const getSituacaoIcon = (s: Situacao) => {
    if (s === 'regular') return <CheckCircle className="w-3.5 h-3.5" />;
    if (s === 'atencao') return <AlertTriangle className="w-3.5 h-3.5" />;
    return <X className="w-3.5 h-3.5" />;
  };

  const getSituacaoTexto = (s: Situacao) => {
    if (s === 'regular') return 'Regular';
    if (s === 'atencao') return 'Atenção';
    return 'Crítica';
  };

  const getCircleColor = (pct: number) =>
    pct >= 85 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626';

  const carregarResumoPorDisciplina = async (aluno: AlunoFrequencia) => {
    const { data, error } = await supabase
      .from('frequencia_diaria').select('disciplina_id, presente').eq('aluno_id', aluno.id);
    if (error) throw error;
    if (!data?.length) return [];

    const mapa: Record<string, { totalAulas: number; presencas: number; faltas: number }> = {};
    for (const row of data) {
      if (!row.disciplina_id) continue;
      if (!mapa[row.disciplina_id]) mapa[row.disciplina_id] = { totalAulas: 0, presencas: 0, faltas: 0 };
      mapa[row.disciplina_id].totalAulas++;
      if (row.presente) mapa[row.disciplina_id].presencas++; else mapa[row.disciplina_id].faltas++;
    }

    const ids = Object.keys(mapa);
    if (!ids.length) return [];

    const { data: discData } = await supabase.from('disciplinas').select('id, nome').in('id', ids);
    const nomeMap: Record<string, string> = {};
    (discData || []).forEach((d: any) => { nomeMap[d.id] = d.nome || 'Sem nome'; });

    return Object.entries(mapa).map(([id, m]) => {
      const pct = m.totalAulas > 0 ? (m.presencas / m.totalAulas) * 100 : 0;
      return { disciplina: nomeMap[id] || id, totalAulas: m.totalAulas, presencas: m.presencas, faltas: m.faltas, percentual: Number(pct.toFixed(1)), situacao: calcularSituacao(pct) };
    }).sort((a, b) => a.disciplina.localeCompare(b.disciplina));
  };

  const buscarFrequenciaAlunos = async () => {
    if (!dataInicio || !dataFim) { setErro('Selecione as datas de início e fim.'); return; }
    if (dataInicio > dataFim) { setErro('A data de início deve ser anterior à data de fim.'); return; }

    setLoading(true); setErro(null);
    try {
      const { data: freqData, error: freqError } = await supabase
        .from('frequencia_diaria')
        .select('aluno_id, data_aula, presente')
        .gte('data_aula', dataInicio)
        .lte('data_aula', dataFim + 'T23:59:59')
        .order('data_aula');
      if (freqError) throw freqError;
      if (!freqData?.length) { setAlunosFiltrados([]); setAlunosCarregados(true); setLoading(false); return; }

      const alunoIds = Array.from(new Set(freqData.map((r: any) => r.aluno_id).filter(Boolean))) as string[];
      if (!alunoIds.length) { setAlunosFiltrados([]); setAlunosCarregados(true); setLoading(false); return; }

      let usersQuery = supabase.from('users').select('id, nome, serie').in('id', alunoIds).eq('tipo', 'aluno');
      if (busca.trim()) usersQuery = usersQuery.ilike('nome', `%${busca.trim()}%`);
      if (filtroSerie !== 'todas') usersQuery = usersQuery.eq('serie', filtroSerie);
      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;
      if (!usersData?.length) { setAlunosFiltrados([]); setAlunosCarregados(true); setLoading(false); return; }

      const mapaAlunos = new Map(usersData.map((a: any) => [a.id, a]));
      const agrupado = new Map<string, AlunoFrequencia>();

      for (const freq of freqData) {
        const aluno = mapaAlunos.get(freq.aluno_id);
        if (!aluno) continue;
        if (!agrupado.has(freq.aluno_id)) {
          agrupado.set(freq.aluno_id, { id: aluno.id, nome: aluno.nome, serie: aluno.serie ?? 'Sem série', turma: 'Sem turma', totalAulas: 0, presencas: 0, faltas: 0, percentualFrequencia: 0, ultimasFaltas: [], situacao: 'regular' });
        }
        const reg = agrupado.get(freq.aluno_id)!;
        reg.totalAulas++;
        if (freq.presente) { reg.presencas++; } else {
          reg.faltas++;
          if (freq.data_aula) reg.ultimasFaltas.push(new Date(freq.data_aula).toLocaleDateString('pt-BR'));
        }
      }

      let resultado = Array.from(agrupado.values()).map(a => {
        a.percentualFrequencia = a.totalAulas > 0 ? (a.presencas / a.totalAulas) * 100 : 0;
        a.situacao = calcularSituacao(a.percentualFrequencia);
        if (a.ultimasFaltas.length > 3) a.ultimasFaltas = a.ultimasFaltas.slice(-3);
        return a;
      });

      if (filtroSituacao !== 'todas') resultado = resultado.filter(a => a.situacao === filtroSituacao as Situacao);

      setAlunosFiltrados(resultado);
      setAlunosCarregados(true);
    } catch {
      setErro('Erro ao carregar frequência dos alunos.');
      toast.error('Erro ao carregar frequência dos alunos.');
    } finally { setLoading(false); }
  };

  const handleLimpar = () => {
    setFiltroSerie('todas'); setFiltroSituacao('todas'); setBusca('');
    setDataInicio(mesAtual.inicio); setDataFim(mesAtual.fim);
    setAlunosFiltrados([]); setAlunosCarregados(false); setErro(null);
  };

  const handleGerarPDF = async (aluno: AlunoFrequencia) => {
    try {
      const resumo = await carregarResumoPorDisciplina(aluno);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const ml = 40; let y = 40;

      doc.setFont('Helvetica', 'bold'); doc.setFontSize(16);
      doc.text('Colégio Conexão EAD', ml, y); y += 16;
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(12);
      doc.text('Relatório de Frequência de Aluno', ml, y); y += 24;

      doc.setFontSize(11);
      doc.text(`Aluno: ${aluno.nome}`, ml, y); y += 13;
      doc.text(`Série: ${aluno.serie}`, ml, y); y += 13;
      doc.text(`Total de aulas: ${aluno.totalAulas}  |  Presenças: ${aluno.presencas}  |  Faltas: ${aluno.faltas}`, ml, y); y += 13;
      doc.text(`Frequência: ${aluno.percentualFrequencia.toFixed(1)}%  |  Situação: ${getSituacaoTexto(aluno.situacao)}`, ml, y); y += 20;

      doc.setFont('Helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Frequência por Disciplina', ml, y); y += 8;

      if (!resumo.length) {
        doc.setFont('Helvetica', 'normal'); doc.setFontSize(10);
        doc.text('Nenhum registro encontrado.', ml, y);
      } else {
        autoTable(doc, {
          startY: y, head: [['Disciplina', 'Aulas', 'Presenças', 'Faltas', 'Freq. (%)', 'Situação']],
          body: resumo.map(d => [d.disciplina, d.totalAulas, d.presencas, d.faltas, d.percentual.toFixed(1), getSituacaoTexto(d.situacao)]),
          styles: { font: 'Helvetica', fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
          columnStyles: { 0: { halign: 'left' } },
          bodyStyles: { halign: 'center' },
          margin: { left: ml, right: ml },
        });
      }

      const finalY = (doc as any).lastAutoTable?.finalY || y + 30;
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, ml, finalY + 20);

      doc.save(`frequencia_${aluno.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } catch {
      toast.error('Erro ao gerar relatório PDF.');
    }
  };

  // Cards de resumo
  const totalAlunos = alunosFiltrados.length;
  const mediaFreq = totalAlunos > 0 ? alunosFiltrados.reduce((a, b) => a + b.percentualFrequencia, 0) / totalAlunos : 0;
  const regulares = alunosFiltrados.filter(a => a.situacao === 'regular').length;
  const criticos = alunosFiltrados.filter(a => a.situacao === 'critica').length;

  const statsCards = [
    { label: 'Total de Alunos', value: totalAlunos, sub: 'Com registros de frequência', bg: '#dbeafe', text: '#1e3a8a', iconColor: '#3b82f6', icon: Users },
    { label: 'Freq. Média', value: `${mediaFreq.toFixed(1)}%`, sub: 'Média geral de presença', bg: '#ede9fe', text: '#4c1d95', iconColor: '#7c3aed', icon: Activity },
    { label: 'Regulares', value: regulares, sub: 'Frequência ≥ 85%', bg: '#dcfce7', text: '#14532d', iconColor: '#16a34a', icon: CheckCircle },
    { label: 'Situação Crítica', value: criticos, sub: 'Frequência < 75%', bg: '#fee2e2', text: '#7f1d1d', iconColor: '#dc2626', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">

      {/* Cards de resumo */}
      {alunosCarregados && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl flex items-center justify-between"
                style={{ backgroundColor: card.bg, padding: '1.25rem 1.5rem' }}>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: card.text }}>{card.label}</p>
                  <p className="text-3xl font-bold mb-0.5" style={{ color: card.text }}>{card.value}</p>
                  <p className="text-xs" style={{ color: card.text, opacity: 0.7 }}>{card.sub}</p>
                </div>
                <Icon style={{ width: 32, height: 32, color: card.iconColor, opacity: 0.7 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground text-base">Filtros de Busca</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-xs p-2 text-muted-foreground">Buscar aluno</Label>
              <div className="relative">
                <Search className="w-4 h-4text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input className="pl-9" placeholder="      Nome do aluno" value={busca}
                  onChange={e => setBusca(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs p-2 text-muted-foreground">Série</Label>
              <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="6º ano">6º ano</SelectItem>
                  <SelectItem value="7º ano">7º ano</SelectItem>
                  <SelectItem value="8º ano">8º ano</SelectItem>
                  <SelectItem value="9º ano">9º ano</SelectItem>
                  <SelectItem value="1ª série">1ª série</SelectItem>
                  <SelectItem value="2ª série">2ª série</SelectItem>
                  <SelectItem value="3ª série">3ª série</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs p-2 text-muted-foreground">Situação</Label>
              <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs p-2 text-muted-foreground">Período — De</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs p-2 text-muted-foreground">Período — Até</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>

            <div className="flex items-end p-3 gap-2 md:col-span-2">
              <Button variant="outline" className="flex-1" onClick={handleLimpar}>
                Limpar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={buscarFrequenciaAlunos} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{erro}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mr-2" />
          <span className="text-muted-foreground">Carregando dados...</span>
        </div>
      )}

      {/* Lista */}
      {alunosCarregados && !loading && (
        <div className="space-y-4">
          {alunosFiltrados.length === 0 ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="p-12 text-center">
                <Search className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="font-medium text-foreground mb-2">Nenhum aluno encontrado</h3>
                <p className="text-muted-foreground text-sm mb-4">Ajuste os filtros e tente novamente.</p>
                <Button variant="outline" onClick={handleLimpar}>Limpar Filtros</Button>
              </CardContent>
            </Card>
          ) : (
            alunosFiltrados.map(aluno => {
              const estilo = getSituacaoStyle(aluno.situacao);
              const circleColor = getCircleColor(aluno.percentualFrequencia);
              const circumference = 2 * Math.PI * 45;
              const offset = circumference * (1 - aluno.percentualFrequencia / 100);

              return (
                <Card key={aluno.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">

                      {/* Info principal */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-foreground text-base">{aluno.nome}</h3>
                          <span
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
                            style={{ backgroundColor: estilo.bg, color: estilo.text, borderColor: estilo.border }}
                          >
                            {getSituacaoIcon(aluno.situacao)}
                            {getSituacaoTexto(aluno.situacao)}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Série: <span className="font-medium text-foreground">{aluno.serie}</span>
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Total: <span className="font-semibold text-foreground">{aluno.totalAulas}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Presenças: <span className="font-semibold text-green-600 dark:text-green-400">{aluno.presencas}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Faltas: <span className="font-semibold text-red-600 dark:text-red-400">{aluno.faltas}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Frequência: <span className="font-semibold text-foreground">{aluno.percentualFrequencia.toFixed(1)}%</span>
                          </span>
                        </div>

                        {aluno.ultimasFaltas.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Últimas faltas: {aluno.ultimasFaltas.join(', ')}
                          </p>
                        )}

                        <Button variant="outline" size="sm"
                          className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          onClick={() => handleGerarPDF(aluno)}>
                          <FileText className="w-4 h-4" /> Gerar Relatório PDF
                        </Button>
                      </div>

                      {/* Gráfico circular */}
                      <div className="flex items-center justify-center flex-shrink-0">
                        <div className="relative w-24 h-24">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle strokeWidth="10" stroke="var(--border)" fill="transparent" r="45" cx="50" cy="50" />
                            <circle
                              strokeWidth="10"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              strokeLinecap="round"
                              fill="transparent"
                              r="45" cx="50" cy="50"
                              style={{ stroke: circleColor, transition: 'stroke-dashoffset 0.5s' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold" style={{ color: circleColor }}>
                              {aluno.percentualFrequencia.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}