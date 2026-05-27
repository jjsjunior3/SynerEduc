// src/components/RelatorioTurma.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import {
  Download, TrendingUp, AlertTriangle, Loader2, AlertCircle,
  Users, Target, CheckCircle2, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RelatorioTurmaProps { onVoltar: () => void; }

interface DadosDesempenho {
  disciplina: string; media: number;
  aprovados: number; reprovados: number; recuperacao: number;
}
interface AlunoDestaque { nome: string; media: number; posicao: number; frequencia: number; }
interface AlunoAtencao  { nome: string; media: number; faltas: number; frequencia: number; motivo: string; }
interface EvolucaoNotas  { bimestre: string; media: number; }

// ─── Helpers de imagem para jsPDF ────────────────────────────────────────────

/** Carrega uma imagem de URL e converte para base64 via canvas */
function carregarImagemBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Cria uma versão transparente da imagem para usar como marca d'água */
function criarWatermark(base64: string, opacidade: number): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.globalAlpha = opacidade;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64;
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function RelatorioTurma({ onVoltar }: RelatorioTurmaProps) {
  const { segmento, isPresencial } = useSegmento();

  const [carregando, setCarregando]               = useState(true);
  const [erro, setErro]                           = useState<string | null>(null);
  const [series, setSeries]                       = useState<string[]>([]);
  const [serieSelecionada, setSerieSelecionada]   = useState('todas');
  const [bimestreSelecionado, setBimestreSelecionado] = useState('1');
  const [dadosDesempenho, setDadosDesempenho]     = useState<DadosDesempenho[]>([]);
  const [evolucaoNotas, setEvolucaoNotas]         = useState<EvolucaoNotas[]>([]);
  const [alunosDestaque, setAlunosDestaque]       = useState<AlunoDestaque[]>([]);
  const [alunosAtencao, setAlunosAtencao]         = useState<AlunoAtencao[]>([]);
  const [totalAlunos, setTotalAlunos]             = useState(0);
  const [mediaGeral, setMediaGeral]               = useState(0);
  const [aprovados, setAprovados]                 = useState(0);
  const [recuperacao, setRecuperacao]             = useState(0);
  const [reprovados, setReprovados]               = useState(0);
  const [frequenciaMedia, setFrequenciaMedia]     = useState(0);

  useEffect(() => {
    async function carregarSeries() {
      try {
        const { data, error } = await supabase
          .from('users').select('serie')
          .eq('tipo', 'aluno').eq('segmento', segmento).not('serie', 'is', null);
        if (error) throw error;
        setSeries(['todas', ...Array.from(new Set(data?.map((i: any) => i.serie) || [])).sort() as string[]]);
      } catch { /* silencioso */ }
    }
    carregarSeries();
  }, [segmento]);

  useEffect(() => { carregarRelatorio(); }, [serieSelecionada, bimestreSelecionado, segmento]);

  const getBimestreDates = (bimestre: string) => {
    const year = new Date().getFullYear();
    const ranges: Record<string, { startDate: string; endDate: string }> = {
      '1': { startDate: `${year}-01-01`, endDate: `${year}-03-31` },
      '2': { startDate: `${year}-04-01`, endDate: `${year}-06-30` },
      '3': { startDate: `${year}-07-01`, endDate: `${year}-09-30` },
      '4': { startDate: `${year}-10-01`, endDate: `${year}-12-31` },
    };
    return ranges[bimestre] || { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  };

  async function carregarRelatorio() {
    setCarregando(true); setErro(null);
    try {
      let queryAlunos = supabase
        .from('users').select('id, nome, serie')
        .eq('tipo', 'aluno').eq('segmento', segmento);
      if (serieSelecionada !== 'todas') queryAlunos = queryAlunos.eq('serie', serieSelecionada);
      const { data: alunosData, error: alunosError } = await queryAlunos;
      if (alunosError) throw alunosError;

      const alunosIds = alunosData?.map((a: any) => a.id) || [];
      setTotalAlunos(alunosIds.length);
      if (!alunosIds.length) { resetarDados(); setCarregando(false); return; }

      const { data: notasData, error: notasError } = await supabase
        .from('notas').select('*, disciplina:disciplinas!disciplina_id(nome)')
        .in('user_id', alunosIds).eq('bimestre', parseInt(bimestreSelecionado));
      if (notasError) throw notasError;

      const { startDate, endDate } = getBimestreDates(bimestreSelecionado);
      const { data: freqData, error: freqError } = await supabase
        .from('frequencia_diaria').select('aluno_id, disciplina_id, presente, criado_em')
        .in('aluno_id', alunosIds).gte('criado_em', startDate).lte('criado_em', endDate);
      if (freqError) throw freqError;

      await gerarEstatisticas(alunosData || [], notasData || [], freqData || []);
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar relatório');
    } finally { setCarregando(false); }
  }

  async function gerarEstatisticas(alunos: any[], notas: any[], freqDiaria: any[]) {
    const discMap = new Map<string, { notas: number[]; aprovados: number; reprovados: number; recuperacao: number }>();
    notas.forEach(nota => {
      const disc  = nota.disciplina?.nome || 'Disciplina';
      const media = Number(nota.media_final || nota.media || 0);
      if (!discMap.has(disc)) discMap.set(disc, { notas: [], aprovados: 0, reprovados: 0, recuperacao: 0 });
      const d = discMap.get(disc)!;
      d.notas.push(media);
      if (media >= 7) d.aprovados++; else if (media >= 5) d.recuperacao++; else d.reprovados++;
    });

    setDadosDesempenho(Array.from(discMap.entries()).map(([disciplina, d]) => ({
      disciplina, aprovados: d.aprovados, reprovados: d.reprovados, recuperacao: d.recuperacao,
      media: d.notas.length > 0 ? d.notas.reduce((a, b) => a + b, 0) / d.notas.length : 0,
    })));

    const alunosComMedia = alunos.map(aluno => {
      const notasAluno = notas.filter((n: any) => n.user_id === aluno.id);
      const mediasPorDisc: Record<string, number[]> = {};
      notasAluno.forEach((n: any) => {
        const nome = n.disciplina?.nome || 'Disciplina';
        if (!mediasPorDisc[nome]) mediasPorDisc[nome] = [];
        mediasPorDisc[nome].push(Number(n.media_final || n.media || 0));
      });
      const mediasValidas = Object.values(mediasPorDisc).map(arr => arr.reduce((a, b) => a + b, 0) / arr.length);
      const mediaAluno = mediasValidas.length > 0 ? mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length : 0;
      const freqAluno  = freqDiaria.filter((f: any) => f.aluno_id === aluno.id);
      const presencas  = freqAluno.filter((f: any) => f.presente).length;
      const freq       = freqAluno.length > 0 ? (presencas / freqAluno.length) * 100 : 0;
      return { ...aluno, media: mediaAluno, totalFaltas: freqAluno.length - presencas, frequencia: freq };
    });

    const mediasValidas = alunosComMedia.map(a => a.media).filter(m => m !== null);
    setMediaGeral(mediasValidas.length > 0 ? mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length : 0);
    setAprovados(alunosComMedia.filter(a => a.media >= 7).length);
    setRecuperacao(alunosComMedia.filter(a => a.media >= 5 && a.media < 7).length);
    setReprovados(alunosComMedia.filter(a => a.media < 5).length);

    const totalFreq = freqDiaria.length;
    const totalPres = freqDiaria.filter((f: any) => f.presente).length;
    setFrequenciaMedia(totalFreq > 0 ? (totalPres / totalFreq) * 100 : 0);

    setAlunosDestaque(
      alunosComMedia.filter(a => a.media > 0).sort((a, b) => b.media - a.media).slice(0, 3)
        .map((a, i) => ({ nome: a.nome, media: a.media, posicao: i + 1, frequencia: a.frequencia }))
    );
    setAlunosAtencao(
      alunosComMedia.filter(a => a.media < 6 || a.totalFaltas > 10).map(a => ({
        nome: a.nome, media: a.media, faltas: a.totalFaltas, frequencia: a.frequencia,
        motivo: a.media < 6 && a.totalFaltas > 10
          ? 'Baixa frequência e notas'
          : a.media < 6 ? 'Notas abaixo da média' : 'Baixa frequência',
      }))
    );

    await buscarEvolucao(alunos.map(a => a.id));
  }

  async function buscarEvolucao(ids: string[]) {
    try {
      const { data, error } = await supabase.from('notas').select('bimestre, media, media_final').in('user_id', ids);
      if (error) throw error;
      const bimMap = new Map<number, number[]>();
      data?.forEach((n: any) => {
        const media = Number(n.media_final || n.media || 0);
        if (!bimMap.has(n.bimestre)) bimMap.set(n.bimestre, []);
        bimMap.get(n.bimestre)!.push(media);
      });
      setEvolucaoNotas([1, 2, 3, 4].map(b => {
        const arr = bimMap.get(b) || [];
        return { bimestre: `${b}º Bim`, media: arr.length > 0 ? arr.reduce((a, c) => a + c, 0) / arr.length : 0 };
      }));
    } catch { /* silencioso */ }
  }

  function resetarDados() {
    setDadosDesempenho([]); setEvolucaoNotas([]); setAlunosDestaque([]); setAlunosAtencao([]);
    setTotalAlunos(0); setMediaGeral(0); setAprovados(0); setRecuperacao(0); setReprovados(0); setFrequenciaMedia(0);
  }

  // ── Geração do PDF ──────────────────────────────────────────────────────────
  async function handleGerarRelatorio() {
    const toastId = toast.loading('Gerando PDF...');
    try {
      // 1. Carrega logo e cria versão watermark
      let logoBase64    = '';
      let watermarkBase64 = '';
      try {
        logoBase64      = await carregarImagemBase64('/logo-colegio-conexao.png');
        watermarkBase64 = await criarWatermark(logoBase64, 0.05); // 5% de opacidade
      } catch {
        // Se não carregar o logo, continua sem imagem
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const labelSegmento = isPresencial ? 'PRESENCIAL' : 'EAD';

      // ── Função auxiliar: adiciona watermark em uma página ──
      const adicionarWatermark = (pagina: number) => {
        if (!watermarkBase64) return;
        doc.setPage(pagina);
        const wmSize = 120; // mm
        const wmX    = (pageW - wmSize) / 2;
        const wmY    = (pageH - wmSize) / 2;
        doc.addImage(watermarkBase64, 'PNG', wmX, wmY, wmSize, wmSize);
      };

      // ── HEADER — Logo + nome da escola ──
      let headerEndY = 14;

      if (logoBase64) {
        // Logo no header: 18x18 mm, canto esquerdo
        doc.addImage(logoBase64, 'PNG', 14, 10, 18, 18);
        headerEndY = 10;
      }

      // Textos do header ao lado do logo
      const textX = logoBase64 ? 36 : 14;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216); // azul
      doc.text('Colégio Conexão Maranhense', textX, headerEndY + 6);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Sistema SynerEduc  ·  Segmento ${labelSegmento}`, textX, headerEndY + 12);

      // Linha separadora azul
      const lineY = logoBase64 ? 30 : 22;
      doc.setDrawColor(29, 78, 216);
      doc.setLineWidth(0.6);
      doc.line(14, lineY, pageW - 14, lineY);

      // Título do relatório
      let y = lineY + 8;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Relatório de Desempenho da Turma`, 14, y); y += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Série: ${serieSelecionada === 'todas' ? 'Todas' : serieSelecionada}  |  Bimestre: ${bimestreSelecionado}º  |  Data: ${new Date().toLocaleDateString('pt-BR')}`,
        14, y
      );
      y += 10;

      // Watermark na 1ª página (antes das tabelas)
      adicionarWatermark(1);

      // ── Estatísticas Gerais ──
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text('Estatísticas Gerais', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      doc.text(
        `Total: ${totalAlunos}   Média: ${mediaGeral.toFixed(1)}   Aprovados: ${aprovados}   Recuperação: ${recuperacao}   Freq: ${frequenciaMedia.toFixed(0)}%`,
        14, y
      );
      y += 10;

      // ── Desempenho por Disciplina ──
      if (dadosDesempenho.length > 0) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text('Desempenho por Disciplina', 14, y); y += 3;
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
          head: [['Disciplina', 'Média', 'Aprovados', 'Recuperação', 'Taxa']],
          body: dadosDesempenho.map(d => {
            const total = d.aprovados + d.recuperacao + d.reprovados;
            return [
              d.disciplina,
              d.media.toFixed(1),
              d.aprovados,
              d.recuperacao,
              total > 0 ? `${((d.aprovados / total) * 100).toFixed(0)}%` : '0%',
            ];
          }),
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Alunos Destaque ──
      if (alunosDestaque.length > 0) {
        if (y > pageH - 60) { doc.addPage(); adicionarWatermark(doc.getNumberOfPages()); y = 20; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text('Alunos Destaque', 14, y); y += 3;
        autoTable(doc, {
          startY: y,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          head: [['Posição', 'Nome', 'Média', 'Frequência']],
          body: alunosDestaque.map(a => [
            `${a.posicao}º`, a.nome, a.media.toFixed(1), `${a.frequencia.toFixed(0)}%`,
          ]),
          styles: { fontSize: 9 },
          columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Alunos com Atenção ──
      if (alunosAtencao.length > 0) {
        if (y > pageH - 60) { doc.addPage(); adicionarWatermark(doc.getNumberOfPages()); y = 20; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text('Alunos que Precisam de Atenção', 14, y); y += 3;
        autoTable(doc, {
          startY: y,
          theme: 'grid',
          headStyles: { fillColor: [234, 179, 8], textColor: 0, fontStyle: 'bold' },
          head: [['Nome', 'Média', 'Faltas', 'Frequência', 'Motivo']],
          body: alunosAtencao.map(a => [
            a.nome, a.media.toFixed(1), a.faltas, `${a.frequencia.toFixed(0)}%`, a.motivo,
          ]),
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
        });
      }

      // ── Watermark nas páginas adicionais + rodapé ──
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        // Watermark (já adicionada na pág 1 antes das tabelas; adiciona nas demais)
        if (i > 1) adicionarWatermark(i);

        // Rodapé
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${totalPages}  —  ${new Date().toLocaleString('pt-BR')}  —  Colégio Conexão Maranhense / SynerEduc`,
          pageW / 2,
          pageH - 8,
          { align: 'center' }
        );
      }

      toast.dismiss(toastId);
      toast.success('PDF gerado com sucesso!');
      doc.save(`relatorio-${segmento}-${serieSelecionada}-${bimestreSelecionado}bim.pdf`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Erro ao gerar PDF.');
      console.error(err);
    }
  }

  // ── Helpers visuais ──────────────────────────────────────────────────────────
  const statsCards = [
    { label: 'Total de Alunos',  value: totalAlunos,                icon: Users,       bg: '#dbeafe', iconBg: '#3b82f6', text: '#1e3a8a' },
    { label: 'Média da Turma',   value: mediaGeral.toFixed(1),      icon: Target,      bg: '#ede9fe', iconBg: '#7c3aed', text: '#4c1d95' },
    { label: 'Aprovados',        value: aprovados,                  icon: CheckCircle2,bg: '#dcfce7', iconBg: '#16a34a', text: '#14532d' },
    { label: 'Recuperação',      value: recuperacao,                icon: AlertTriangle,bg:'#fef9c3', iconBg: '#d97706', text: '#713f12' },
    { label: 'Frequência Média', value: `${frequenciaMedia.toFixed(0)}%`, icon: Activity, bg: '#fee2e2', iconBg: '#dc2626', text: '#7f1d1d' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Filtros + Botão PDF */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Filtros do Relatório</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Exibindo dados do segmento: <span className="font-semibold capitalize">{segmento}</span>
              </p>
            </div>
            <Button onClick={handleGerarRelatorio} className="gap-2">
              <Download className="w-4 h-4" /> Gerar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Série</Label>
              <Select value={serieSelecionada} onValueChange={setSerieSelecionada}>
                <SelectTrigger><SelectValue placeholder="Selecionar Série" /></SelectTrigger>
                <SelectContent>
                  {series.map(s => <SelectItem key={s} value={s}>{s === 'todas' ? 'Todas as Séries' : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Bimestre</Label>
              <Select value={bimestreSelecionado} onValueChange={setBimestreSelecionado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['1','2','3','4'].map(b => <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {carregando && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-muted-foreground">Analisando dados da turma...</p>
        </div>
      )}

      {!carregando && erro && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <p className="font-semibold text-red-700 dark:text-red-400 mb-1">Ocorreu um erro</p>
          <p className="text-sm text-red-600 dark:text-red-500 mb-4">{erro}</p>
          <Button onClick={carregarRelatorio}>Tentar Novamente</Button>
        </div>
      )}

      {!carregando && !erro && (
        <div className="space-y-8">

          {/* Cards de estatísticas */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            {statsCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl p-5 flex flex-col items-center text-center gap-3"
                  style={{ backgroundColor: card.bg }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                    <Icon style={{ width: 20, height: 20, color: '#fff' }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: card.text }}>{card.label}</p>
                    <p className="text-3xl font-bold" style={{ color: card.text }}>{card.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base text-foreground">Desempenho por Disciplina</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {dadosDesempenho.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosDesempenho} margin={{ top: 5, right: 5, left: -20, bottom: 45 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="disciplina" angle={-45} textAnchor="end" height={60} interval={0}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                        formatter={(v: number) => [v.toFixed(1), 'Média']} />
                      <Bar dataKey="media" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Sem dados</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base text-foreground">Evolução Anual da Turma</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {evolucaoNotas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={evolucaoNotas} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="bimestre" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                        formatter={(v: number) => [v.toFixed(1), 'Média']} />
                      <Area type="monotone" dataKey="media" stroke="#10b981" strokeWidth={3}
                        fillOpacity={1} fill="url(#colorEv)" activeDot={{ r: 6, fill: '#10b981' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Sem dados</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Destaques + Atenção */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" /> Destaques da Turma
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {alunosDestaque.length > 0 ? (
                  <div className="divide-y divide-border">
                    {alunosDestaque.map((aluno, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: '#16a34a' }}>{aluno.posicao}º</div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{aluno.nome}</p>
                            <p className="text-xs text-muted-foreground">Freq: {aluno.frequencia.toFixed(0)}%</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold px-3 py-1.5 rounded-full"
                          style={{ backgroundColor: '#dcfce7', color: '#14532d' }}>
                          {aluno.media.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum destaque no momento</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Atenção Necessária
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {alunosAtencao.length > 0 ? (
                  <div className="divide-y divide-border">
                    {alunosAtencao.map((aluno, i) => (
                      <div key={i} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold text-foreground text-sm">{aluno.nome}</p>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full ml-3 flex-shrink-0"
                            style={{ backgroundColor: '#fef9c3', color: '#713f12' }}>Alerta</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#7f1d1d' }}>Média: {aluno.media.toFixed(1)}</span>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Faltas: {aluno.faltas}</span>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Freq: {aluno.frequencia.toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          {aluno.motivo}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum aluno precisando de atenção</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela detalhada */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base text-foreground">Detalhamento por Disciplina</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dadosDesempenho.length > 0 ? (
                <div className="overflow-x-auto p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-3 px-5 font-semibold text-foreground">Disciplina</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Média</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Aprovados</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Recuperação</th>
                        <th className="text-center py-3 px-5 font-semibold text-foreground">Taxa de Aprovação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dadosDesempenho.map((d, i) => {
                        const total = d.aprovados + d.recuperacao + d.reprovados;
                        const taxa  = total > 0 ? (d.aprovados / total) * 100 : 0;
                        const mediaStyle = d.media >= 7
                          ? { bg: '#dcfce7', text: '#14532d' }
                          : d.media >= 5 ? { bg: '#fef9c3', text: '#713f12' } : { bg: '#fee2e2', text: '#7f1d1d' };
                        return (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-5 font-medium text-foreground">{d.disciplina}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-sm font-bold px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: mediaStyle.bg, color: mediaStyle.text }}>
                                {d.media.toFixed(1)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center font-semibold text-green-600 dark:text-green-400">{d.aprovados}</td>
                            <td className="py-4 px-4 text-center font-semibold text-amber-600 dark:text-amber-400">{d.recuperacao}</td>
                            <td className="py-4 px-5 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <span className="font-semibold text-foreground w-10 text-right text-sm">{taxa.toFixed(0)}%</span>
                                <div className="w-20 h-2.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${taxa}%`, backgroundColor: taxa >= 70 ? '#16a34a' : taxa >= 40 ? '#d97706' : '#dc2626' }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10 text-sm">Sem dados de disciplinas</p>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}