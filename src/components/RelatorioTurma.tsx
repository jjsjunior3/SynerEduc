// src/components/RelatorioTurma.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';
import { SCHOOL_CONFIG } from '../config/school';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import {
  Download, Loader2, AlertCircle, AlertTriangle,
  Users, Target, CheckCircle2, Activity, XCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RelatorioTurmaProps { onVoltar: () => void; }

interface DadosDesempenho {
  disciplina: string; media: number;
  aprovados: number; reprovados: number; recuperacao: number;
}
interface EvolucaoNotas { bimestre: string; media: number; }
interface FreqDisciplina {
  disciplina: string;
  totalAulas: number; presencas: number; faltas: number;
  percentual: number;
  situacao: 'regular' | 'atencao' | 'critica';
}

// ─── Helpers de imagem ────────────────────────────────────────────────────────

function carregarImagemBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function criarWatermark(base64: string, opacidade: number): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.globalAlpha = opacidade;
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = base64;
  });
}

function calcSituacao(pct: number): 'regular' | 'atencao' | 'critica' {
  return pct >= 85 ? 'regular' : pct >= 75 ? 'atencao' : 'critica';
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RelatorioTurma({ onVoltar }: RelatorioTurmaProps) {
  const { segmento, isPresencial } = useSegmento();

  // Filtros
  const [series, setSeries]                         = useState<string[]>([]);
  const [serieSelecionada, setSerieSelecionada]     = useState('todas');
  const [bimestreSelecionado, setBimestreSelecionado] = useState('1');
  const [alunosDisponiveis, setAlunosDisponiveis]   = useState<{ id: string; nome: string }[]>([]);
  const [alunoSelecionado, setAlunoSelecionado]     = useState('todos');

  // Estado
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  // Dados
  const [dadosDesempenho, setDadosDesempenho] = useState<DadosDesempenho[]>([]);
  const [evolucaoNotas, setEvolucaoNotas]     = useState<EvolucaoNotas[]>([]);
  const [dadosFreqDisc, setDadosFreqDisc]     = useState<FreqDisciplina[]>([]);
  const [totalAlunos, setTotalAlunos]         = useState(0);
  const [mediaGeral, setMediaGeral]           = useState(0);
  const [aprovados, setAprovados]             = useState(0);
  const [recuperacao, setRecuperacao]         = useState(0);
  const [reprovados, setReprovados]           = useState(0);
  const [frequenciaMedia, setFrequenciaMedia] = useState(0);

  // ─── Carrega lista de séries ─────────────────────────────────────────────────
  useEffect(() => {
    async function carregarSeries() {
      const { data } = await supabase
        .from('users').select('serie')
        .eq('tipo', 'aluno').eq('status', 'ativo').eq('segmento', segmento).not('serie', 'is', null);
      setSeries(['todas', ...Array.from(new Set((data || []).map((i: any) => i.serie))).sort() as string[]]);
    }
    carregarSeries();
  }, [segmento]);

  // ─── Carrega alunos da série selecionada ─────────────────────────────────────
  useEffect(() => {
    async function carregarAlunos() {
      if (serieSelecionada === 'todas') { setAlunosDisponiveis([]); return; }
      const { data } = await supabase
        .from('users').select('id, nome')
        .eq('tipo', 'aluno').eq('status', 'ativo').eq('segmento', segmento)
        .eq('serie', serieSelecionada).order('nome');
      setAlunosDisponiveis(data || []);
    }
    carregarAlunos();
  }, [serieSelecionada, segmento]);

  // ─── Dispara relatório sempre que filtros mudam ───────────────────────────────
  useEffect(() => { carregarRelatorio(); }, [serieSelecionada, bimestreSelecionado, segmento, alunoSelecionado]);

  // ─── Datas por bimestre ───────────────────────────────────────────────────────
  function getBimestreDates(b: string) {
    const year = new Date().getFullYear();
    const ranges: Record<string, { startDate: string; endDate: string }> = {
      '1': { startDate: `${year}-01-01`, endDate: `${year}-03-31` },
      '2': { startDate: `${year}-04-01`, endDate: `${year}-06-30` },
      '3': { startDate: `${year}-07-01`, endDate: `${year}-09-30` },
      '4': { startDate: `${year}-10-01`, endDate: `${year}-12-31` },
    };
    return ranges[b] || { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  // ─── Carga principal ──────────────────────────────────────────────────────────
  async function carregarRelatorio() {
    setCarregando(true); setErro(null);
    try {
      // 1. Alunos (filtrado por série e/ou aluno)
      let q = supabase.from('users').select('id, nome, serie')
        .eq('tipo', 'aluno').eq('status', 'ativo').eq('segmento', segmento);
      if (serieSelecionada !== 'todas') q = q.eq('serie', serieSelecionada);
      if (alunoSelecionado !== 'todos') q = q.eq('id', alunoSelecionado);
      const { data: alunosData, error: alunosErr } = await q;
      if (alunosErr) throw alunosErr;

      const alunosIds = (alunosData || []).map((a: any) => a.id);
      setTotalAlunos(alunosIds.length);
      if (!alunosIds.length) { resetarDados(); return; }

      // 2. Notas + Frequência em paralelo
      const { startDate, endDate } = getBimestreDates(bimestreSelecionado);
      const [notasRes, freqRes] = await Promise.all([
        supabase.from('notas')
          .select('user_id, media, media_final, bimestre, disciplina:disciplinas!disciplina_id(nome)')
          .in('user_id', alunosIds)
          .eq('bimestre', parseInt(bimestreSelecionado)),
        supabase.from('frequencia_diaria')
          .select('aluno_id, disciplina_id, presente')
          .in('aluno_id', alunosIds)
          .gte('data_aula', startDate)   // ← usa data_aula, não criado_em
          .lte('data_aula', endDate),
      ]);
      if (notasRes.error) throw notasRes.error;
      if (freqRes.error)  throw freqRes.error;

      // 3. Processa dados
      gerarEstatisticas(alunosData || [], notasRes.data || [], freqRes.data || []);
      await gerarFreqPorDisciplina(freqRes.data || []);
      buscarEvolucao(alunosIds);          // fire-and-forget (gráfico de evolução)
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar relatório');
    } finally {
      setCarregando(false);
    }
  }

  // ─── Estatísticas por disciplina e gerais ─────────────────────────────────────
  function gerarEstatisticas(alunos: any[], notas: any[], freqDiaria: any[]) {
    // Desempenho por disciplina
    const discMap = new Map<string, { notas: number[]; aprovados: number; reprovados: number; recuperacao: number }>();
    notas.forEach((n: any) => {
      const disc  = n.disciplina?.nome || 'Disciplina';
      const media = Number(n.media_final || n.media || 0);
      if (!discMap.has(disc)) discMap.set(disc, { notas: [], aprovados: 0, reprovados: 0, recuperacao: 0 });
      const d = discMap.get(disc)!;
      d.notas.push(media);
      if (media >= 7) d.aprovados++;
      else if (media >= 5) d.recuperacao++;
      else d.reprovados++;
    });
    setDadosDesempenho(
      Array.from(discMap.entries())
        .map(([disciplina, d]) => ({
          disciplina,
          media:       d.notas.length > 0 ? d.notas.reduce((a, b) => a + b, 0) / d.notas.length : 0,
          aprovados:   d.aprovados,
          recuperacao: d.recuperacao,
          reprovados:  d.reprovados,
        }))
        .sort((a, b) => a.disciplina.localeCompare(b.disciplina, 'pt-BR'))
    );

    // Mapa aluno → lista de freq (O(n), não O(n²))
    const freqMapAluno = new Map<string, any[]>();
    freqDiaria.forEach((f: any) => {
      if (!freqMapAluno.has(f.aluno_id)) freqMapAluno.set(f.aluno_id, []);
      freqMapAluno.get(f.aluno_id)!.push(f);
    });

    // Média e status por aluno
    const alunosComMedia = alunos.map((aluno: any) => {
      const notasAluno = notas.filter((n: any) => n.user_id === aluno.id);
      const mediasPorDisc: Record<string, number[]> = {};
      notasAluno.forEach((n: any) => {
        const nome = n.disciplina?.nome || 'Disciplina';
        if (!mediasPorDisc[nome]) mediasPorDisc[nome] = [];
        mediasPorDisc[nome].push(Number(n.media_final || n.media || 0));
      });
      // Exclui alunos sem notas da média (evita puxar a média para baixo artificialmente)
      const mediasValidas = Object.values(mediasPorDisc)
        .map(arr => arr.reduce((a, b) => a + b, 0) / arr.length)
        .filter(m => m > 0);
      const mediaAluno = mediasValidas.length > 0
        ? mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length
        : 0;
      const freqAluno  = freqMapAluno.get(aluno.id) || [];
      const presencas  = freqAluno.filter((f: any) => f.presente).length;
      const freq       = freqAluno.length > 0 ? (presencas / freqAluno.length) * 100 : 0;
      return { ...aluno, media: mediaAluno, frequencia: freq };
    });

    const comNotas = alunosComMedia.filter(a => a.media > 0);
    setMediaGeral(comNotas.length > 0 ? comNotas.reduce((s, a) => s + a.media, 0) / comNotas.length : 0);
    setAprovados(comNotas.filter(a => a.media >= 7).length);
    setRecuperacao(comNotas.filter(a => a.media >= 5 && a.media < 7).length);
    setReprovados(comNotas.filter(a => a.media < 5).length);

    const totalFreq = freqDiaria.length;
    const totalPres = freqDiaria.filter((f: any) => f.presente).length;
    setFrequenciaMedia(totalFreq > 0 ? (totalPres / totalFreq) * 100 : 0);
  }

  // ─── Frequência agregada por disciplina ───────────────────────────────────────
  async function gerarFreqPorDisciplina(freqData: any[]) {
    if (!freqData.length) { setDadosFreqDisc([]); return; }

    const discIds = [...new Set(freqData.map((f: any) => f.disciplina_id).filter(Boolean))];
    const { data: discData } = await supabase.from('disciplinas').select('id, nome').in('id', discIds);
    const discNomeMap = new Map((discData || []).map((d: any) => [d.id, d.nome as string]));

    const byDisc = new Map<string, { nome: string; total: number; presencas: number }>();
    freqData.forEach((f: any) => {
      if (!f.disciplina_id) return;
      const nome = discNomeMap.get(f.disciplina_id) ?? '—';
      if (!byDisc.has(f.disciplina_id)) byDisc.set(f.disciplina_id, { nome, total: 0, presencas: 0 });
      const d = byDisc.get(f.disciplina_id)!;
      d.total++;
      if (f.presente) d.presencas++;
    });

    const resultado: FreqDisciplina[] = Array.from(byDisc.values())
      .map(d => {
        const pct = d.total > 0 ? (d.presencas / d.total) * 100 : 0;
        return {
          disciplina: d.nome,
          totalAulas: d.total, presencas: d.presencas,
          faltas:     d.total - d.presencas,
          percentual: pct,
          situacao:   calcSituacao(pct),
        };
      })
      .sort((a, b) => a.disciplina.localeCompare(b.disciplina, 'pt-BR'));

    setDadosFreqDisc(resultado);
  }

  // ─── Evolução anual (todos os bimestres, fire-and-forget) ─────────────────────
  async function buscarEvolucao(ids: string[]) {
    try {
      const { data } = await supabase.from('notas')
        .select('bimestre, media, media_final').in('user_id', ids);
      const bimMap = new Map<number, number[]>();
      (data || []).forEach((n: any) => {
        const m = Number(n.media_final || n.media || 0);
        if (m <= 0) return;
        if (!bimMap.has(n.bimestre)) bimMap.set(n.bimestre, []);
        bimMap.get(n.bimestre)!.push(m);
      });
      setEvolucaoNotas([1, 2, 3, 4].map(b => {
        const arr = bimMap.get(b) || [];
        return { bimestre: `${b}º Bim`, media: arr.length > 0 ? arr.reduce((a, c) => a + c, 0) / arr.length : 0 };
      }));
    } catch { /* silencioso */ }
  }

  function resetarDados() {
    setDadosDesempenho([]); setEvolucaoNotas([]); setDadosFreqDisc([]);
    setTotalAlunos(0); setMediaGeral(0); setAprovados(0);
    setRecuperacao(0); setReprovados(0); setFrequenciaMedia(0);
  }

  // ─── Derivados ────────────────────────────────────────────────────────────────
  const modoAluno    = alunoSelecionado !== 'todos';
  const nomeAluno    = alunosDisponiveis.find(a => a.id === alunoSelecionado)?.nome ?? '';
  const labelSeg     = isPresencial ? 'PRESENCIAL' : 'EAD';
  const temDados     = dadosDesempenho.length > 0 || dadosFreqDisc.length > 0;

  // Modo aluno: aprovados/recuperação/reprovados = por disciplina; modo turma: por aluno
  const cardAprov = modoAluno ? dadosDesempenho.filter(d => d.media >= 7).length : aprovados;
  const cardRecup = modoAluno ? dadosDesempenho.filter(d => d.media >= 5 && d.media < 7).length : recuperacao;
  const cardRepro = modoAluno ? dadosDesempenho.filter(d => d.media > 0 && d.media < 5).length : reprovados;

  const statsCards = [
    { label: 'Total de Alunos',                   value: totalAlunos,                  icon: Users,        bg: '#dbeafe', iconBg: '#3b82f6', text: '#1e3a8a' },
    { label: modoAluno ? 'Média do Aluno' : 'Média da Turma', value: mediaGeral.toFixed(1), icon: Target,  bg: '#ede9fe', iconBg: '#7c3aed', text: '#4c1d95' },
    { label: modoAluno ? 'Disc. Aprovadas' : 'Aprovados',   value: cardAprov,          icon: CheckCircle2, bg: '#dcfce7', iconBg: '#16a34a', text: '#14532d' },
    { label: 'Recuperação',                        value: cardRecup,                    icon: AlertTriangle,bg: '#fef9c3', iconBg: '#d97706', text: '#713f12' },
    { label: modoAluno ? 'Disc. Reprovadas' : 'Reprovados', value: cardRepro,          icon: XCircle,      bg: '#fee2e2', iconBg: '#dc2626', text: '#7f1d1d' },
    { label: modoAluno ? 'Frequência' : 'Freq. Média',       value: `${frequenciaMedia.toFixed(0)}%`, icon: Activity, bg: '#f0fdf4', iconBg: '#059669', text: '#064e3b' },
  ];

  const situacaoStyle = {
    regular: { bg: '#dcfce7', text: '#14532d' },
    atencao: { bg: '#fef9c3', text: '#713f12' },
    critica: { bg: '#fee2e2', text: '#7f1d1d' },
  };

  // ─── PDF ──────────────────────────────────────────────────────────────────────
  async function handleGerarRelatorio() {
    const toastId = toast.loading('Gerando PDF...');
    try {
      let logoBase64 = ''; let watermarkBase64 = '';
      try {
        logoBase64      = await carregarImagemBase64(SCHOOL_CONFIG.logoUrl);
        watermarkBase64 = await criarWatermark(logoBase64, 0.05);
      } catch { /* continua sem logo */ }

      const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Estilo compacto para tabelas
      const compactStyle = {
        styles: { fontSize: 7.5, cellPadding: 1.6 },
        headStyles: { fontSize: 8, cellPadding: 2, fillColor: [29, 78, 216] as [number,number,number], textColor: 255 as number, fontStyle: 'bold' as const },
      };

      // Watermark na página 1 (relatório individual cabe em uma página)
      if (watermarkBase64) {
        const s = 120;
        doc.addImage(watermarkBase64, 'PNG', (pageW - s) / 2, (pageH - s) / 2, s, s);
      }

      // ── Header ──
      let y = 10;
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, y, 14, 14);
      const tx = logoBase64 ? 30 : 14;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(29, 78, 216);
      doc.text(SCHOOL_CONFIG.name, tx, y + 5);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(`Sistema SynerEduc  ·  Segmento ${labelSeg}`, tx, y + 10);
      doc.setDrawColor(29, 78, 216); doc.setLineWidth(0.6);
      doc.line(14, 26, pageW - 14, 26);
      y = 31;

      // ── Título ──
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text(modoAluno ? 'Relatório Individual do Aluno' : 'Relatório de Desempenho da Turma', 14, y);
      y += 5;
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(
        modoAluno
          ? `Aluno: ${nomeAluno}  |  Série: ${serieSelecionada}  |  Bimestre: ${bimestreSelecionado}º  |  Data: ${new Date().toLocaleDateString('pt-BR')}`
          : `Série: ${serieSelecionada === 'todas' ? 'Todas' : serieSelecionada}  |  Bimestre: ${bimestreSelecionado}º  |  Data: ${new Date().toLocaleDateString('pt-BR')}`,
        14, y
      );
      y += 6;

      // ── Resumo geral ──
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text('Resumo Geral', 14, y); y += 4;
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      doc.text(
        modoAluno
          ? `Média: ${mediaGeral.toFixed(1)}  |  Disc. Aprovadas: ${cardAprov}  |  Recuperação: ${cardRecup}  |  Reprovadas: ${cardRepro}  |  Freq.: ${frequenciaMedia.toFixed(0)}%`
          : `Alunos: ${totalAlunos}  |  Média: ${mediaGeral.toFixed(1)}  |  Aprovados: ${cardAprov}  |  Recuperação: ${cardRecup}  |  Reprovados: ${cardRepro}  |  Freq.: ${frequenciaMedia.toFixed(0)}%`,
        14, y
      );
      y += 6;

      // ── Notas por disciplina ──
      if (dadosDesempenho.length > 0) {
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text('Notas por Disciplina', 14, y); y += 3;
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          headStyles: { ...compactStyle.headStyles },
          head: [modoAluno
            ? ['Disciplina', 'Média', 'Situação']
            : ['Disciplina', 'Média', 'Aprovados', 'Recuperação', 'Taxa Aprov.']],
          body: dadosDesempenho.map(d => {
            if (modoAluno) {
              const sit = d.media >= 7 ? 'Aprovado' : d.media >= 5 ? 'Recuperação' : 'Reprovado';
              return [d.disciplina, d.media.toFixed(1), sit];
            }
            const total = d.aprovados + d.recuperacao + d.reprovados;
            return [d.disciplina, d.media.toFixed(1), d.aprovados, d.recuperacao, total > 0 ? `${((d.aprovados / total) * 100).toFixed(0)}%` : '—'];
          }),
          styles: { ...compactStyle.styles },
          columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      // ── Frequência por disciplina ──
      if (dadosFreqDisc.length > 0) {
        if (!modoAluno && y > pageH - 60) { doc.addPage(); y = 20; }
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text('Frequência por Disciplina', 14, y); y += 3;
        autoTable(doc, {
          startY: y,
          theme: 'grid',
          headStyles: { ...compactStyle.headStyles, fillColor: [79, 70, 229] },
          head: [['Disciplina', 'Total Aulas', 'Presenças', 'Faltas', 'Frequência', 'Situação']],
          body: dadosFreqDisc.map(d => [
            d.disciplina, d.totalAulas, d.presencas, d.faltas,
            `${d.percentual.toFixed(1)}%`,
            d.situacao === 'regular' ? 'Regular' : d.situacao === 'atencao' ? 'Atenção' : 'Crítica',
          ]),
          styles: { ...compactStyle.styles },
          columnStyles: {
            1: { halign: 'center' }, 2: { halign: 'center' },
            3: { halign: 'center' }, 4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center' },
          },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      // ── Assinatura (somente relatório individual) ──
      if (modoAluno) {
        y += 8;
        const cx = pageW / 2;
        doc.setDrawColor(51, 65, 85); doc.setLineWidth(0.3);
        doc.line(cx - 45, y, cx + 45, y);
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text('Coordenador(a) Pedagógico(a)', cx, y + 4, { align: 'center' });
      }

      // ── Rodapé em todas as páginas ──
      const totalPgs = doc.getNumberOfPages();
      for (let i = 1; i <= totalPgs; i++) {
        doc.setPage(i);
        if (i > 1 && watermarkBase64) {
          const s = 120;
          doc.addImage(watermarkBase64, 'PNG', (pageW - s) / 2, (pageH - s) / 2, s, s);
        }
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${totalPgs}  —  ${new Date().toLocaleString('pt-BR')}  —  ${SCHOOL_CONFIG.name} / SynerEduc`,
          pageW / 2, pageH - 5, { align: 'center' }
        );
      }

      toast.dismiss(toastId); toast.success('PDF gerado!');
      const fname = modoAluno
        ? `relatorio-${nomeAluno.split(' ')[0].toLowerCase()}-${bimestreSelecionado}bim.pdf`
        : `relatorio-${segmento}-${serieSelecionada}-${bimestreSelecionado}bim.pdf`;
      doc.save(fname);
    } catch {
      toast.dismiss(toastId); toast.error('Erro ao gerar PDF.');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Filtros ── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-foreground">Filtros do Relatório</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Segmento: <span className="font-semibold capitalize">{segmento}</span>
                {modoAluno && (
                  <> · <span className="font-semibold text-blue-600 dark:text-blue-400">{nomeAluno}</span></>
                )}
              </p>
            </div>
            <Button onClick={handleGerarRelatorio} className="gap-2 flex-shrink-0">
              <Download className="w-4 h-4" /> Gerar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Série */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Série</Label>
              <Select value={serieSelecionada} onValueChange={v => {
                setSerieSelecionada(v);
                setAlunoSelecionado('todos'); // reseta aluno ao trocar série
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar Série" /></SelectTrigger>
                <SelectContent>
                  {series.map(s => (
                    <SelectItem key={s} value={s}>{s === 'todas' ? 'Todas as Séries' : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aluno — só aparece quando uma série está selecionada */}
            {serieSelecionada !== 'todas' && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Aluno</Label>
                <Select value={alunoSelecionado} onValueChange={setAlunoSelecionado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Toda a Turma</SelectItem>
                    {alunosDisponiveis.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bimestre */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Bimestre</Label>
              <Select value={bimestreSelecionado} onValueChange={setBimestreSelecionado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['1','2','3','4'].map(b => (
                    <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading ── */}
      {carregando && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-muted-foreground">Analisando dados...</p>
        </div>
      )}

      {/* ── Erro ── */}
      {!carregando && erro && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <p className="font-semibold text-red-700 dark:text-red-400 mb-1">Erro ao carregar</p>
          <p className="text-sm text-red-600 dark:text-red-500 mb-4">{erro}</p>
          <Button onClick={carregarRelatorio}>Tentar Novamente</Button>
        </div>
      )}

      {/* ── Sem dados ── */}
      {!carregando && !erro && totalAlunos > 0 && !temDados && (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border">
          <AlertCircle className="w-10 h-10 text-muted-foreground opacity-30 mb-4" />
          <p className="text-muted-foreground font-medium">Nenhum dado encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Não há notas ou frequência para o {bimestreSelecionado}º bimestre
            {modoAluno ? ` de ${nomeAluno}` : ''}.
          </p>
        </div>
      )}

      {/* ── Conteúdo ── */}
      {!carregando && !erro && temDados && (
        <div className="space-y-8">

          {/* Cards de estatísticas */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {statsCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label}
                  className="rounded-xl p-4 flex flex-col items-center text-center gap-2"
                  style={{ backgroundColor: card.bg }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.iconBg }}>
                    <Icon style={{ width: 18, height: 18, color: '#fff' }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium mb-0.5 leading-tight" style={{ color: card.text }}>
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold leading-none" style={{ color: card.text }}>
                      {card.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Notas por disciplina */}
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base text-foreground">Notas por Disciplina</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {dadosDesempenho.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dadosDesempenho} margin={{ top: 5, right: 5, left: -20, bottom: 55 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="disciplina" angle={-45} textAnchor="end" height={70} interval={0}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                        formatter={(v: number) => [v.toFixed(1), 'Média']} />
                      <Bar dataKey="media" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sem notas no período</div>
                )}
              </CardContent>
            </Card>

            {/* Evolução anual */}
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base text-foreground">
                  {modoAluno ? 'Evolução Anual — Aluno' : 'Evolução Anual — Turma'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {evolucaoNotas.some(e => e.media > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={evolucaoNotas} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="bimestre" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                        formatter={(v: number) => [v.toFixed(1), 'Média']} />
                      <Area type="monotone" dataKey="media" stroke="#10b981" strokeWidth={3}
                        fillOpacity={1} fill="url(#colorEv)" activeDot={{ r: 6, fill: '#10b981' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sem dados de evolução</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Frequência por Disciplina */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                {modoAluno
                  ? `Frequência por Disciplina — ${nomeAluno.split(' ')[0]}`
                  : 'Frequência por Disciplina — Turma'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dadosFreqDisc.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-3 px-5 font-semibold text-foreground">Disciplina</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Total Aulas</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Presenças</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Faltas</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Frequência</th>
                        <th className="text-center py-3 px-5 font-semibold text-foreground">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dadosFreqDisc.map((d, i) => {
                        const sit      = situacaoStyle[d.situacao];
                        const freqClr  = d.percentual >= 85 ? '#16a34a' : d.percentual >= 75 ? '#d97706' : '#dc2626';
                        const sitLabel = d.situacao === 'regular' ? 'Regular' : d.situacao === 'atencao' ? 'Atenção' : 'Crítica';
                        return (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-5 font-medium text-foreground">{d.disciplina}</td>
                            <td className="py-4 px-4 text-center text-muted-foreground">{d.totalAulas}</td>
                            <td className="py-4 px-4 text-center font-semibold text-green-600 dark:text-green-400">{d.presencas}</td>
                            <td className="py-4 px-4 text-center font-semibold text-red-600 dark:text-red-400">{d.faltas}</td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-bold text-sm w-12 text-right" style={{ color: freqClr }}>
                                  {d.percentual.toFixed(1)}%
                                </span>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(d.percentual, 100)}%`, backgroundColor: freqClr }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: sit.bg, color: sit.text }}>
                                {sitLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10 text-sm">
                  Sem registros de frequência para este período
                </p>
              )}
            </CardContent>
          </Card>

          {/* Detalhamento — Notas por Disciplina */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base text-foreground">Detalhamento — Notas por Disciplina</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dadosDesempenho.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-3 px-5 font-semibold text-foreground">Disciplina</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Média</th>
                        {!modoAluno && <>
                          <th className="text-center py-3 px-4 font-semibold text-foreground">Aprovados</th>
                          <th className="text-center py-3 px-4 font-semibold text-foreground">Recuperação</th>
                          <th className="text-center py-3 px-5 font-semibold text-foreground">Taxa Aprovação</th>
                        </>}
                        {modoAluno && (
                          <th className="text-center py-3 px-4 font-semibold text-foreground">Situação</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dadosDesempenho.map((d, i) => {
                        const total      = d.aprovados + d.recuperacao + d.reprovados;
                        const taxa       = total > 0 ? (d.aprovados / total) * 100 : 0;
                        const mediaStyle = d.media >= 7
                          ? { bg: '#dcfce7', text: '#14532d' }
                          : d.media >= 5 ? { bg: '#fef9c3', text: '#713f12' }
                          : { bg: '#fee2e2', text: '#7f1d1d' };
                        const sitLabel = d.media >= 7 ? 'Aprovado' : d.media >= 5 ? 'Recuperação' : 'Reprovado';
                        return (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-5 font-medium text-foreground">{d.disciplina}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-sm font-bold px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: mediaStyle.bg, color: mediaStyle.text }}>
                                {d.media.toFixed(1)}
                              </span>
                            </td>
                            {!modoAluno && <>
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
                            </>}
                            {modoAluno && (
                              <td className="py-4 px-4 text-center">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                  style={{ backgroundColor: mediaStyle.bg, color: mediaStyle.text }}>
                                  {sitLabel}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10 text-sm">Sem dados de notas</p>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
