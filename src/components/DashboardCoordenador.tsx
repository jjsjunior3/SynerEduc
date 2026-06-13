// src/components/DashboardCoordenador.tsx
import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock, Loader2, Bell, Calendar, FileText, BarChart3,
  UserCheck, Send, User, LogOut, Users, BookOpen, Inbox,
  TrendingUp, AlertTriangle, AlertCircle, Activity,
  GraduationCap, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../supabase/supabaseClient';
// Sofia: apenas aluno e professor. Coordenador usa só Tia Maria José.
import { AgenteInclusao }      from './ai/AgenteInclusao';
import { FrequenciaRealtime }  from './FrequenciaRealtime';

import { Notificacoes } from './Notificacoes';
import { PerfilUsuario } from './PerfilUsuario';
import { SchoolHeader } from './SchoolHeader';
import { Usuario } from '../types/auth';

// ─── Lazy imports ─────────────────────────────────────────────────────────────
const BoletinsGerais        = lazy(() => import('./BoletinsGerais'));
const RelatorioTurma        = lazy(() => import('./RelatorioTurma'));
const FrequenciaAlunos      = lazy(() => import('./FrequenciaAluno'));
const FrequenciaProfessores = lazy(() => import('./FrequenciaProfessores'));
const EnviarComunicado      = lazy(() => import('./EnviarComunicado'));
const AgendaCoordenador     = lazy(() => import('./AgendaCoordenador'));
const AtividadesCoordenador = lazy(() => import('./AtividadesCoordenador'));
const GestaoHorarios        = lazy(() => import('./GestaoHorarios'));
const BoletimCoordenador    = lazy(() => import('./BoletimCoordenador'));

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardCoordenadorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
}

type ViewType =
  | 'dashboard' | 'boletins' | 'relatorio' | 'frequencia' | 'freq_professores'
  | 'comunicado' | 'agenda' | 'horarios' | 'atv_enviadas' | 'atv_recebidas' | 'boletim_aluno';

interface MetricasDash {
  totalAlunos: number;
  freqHojePct: number;
  profEsperadosHoje: number;
  profAtivosHoje: number;
  atividadesPendentes: number;
  alunosEmRisco: number;
  txAprovacao: number;
  freqPorSerie: { serie: string; pct: number }[];
  desempenho: { name: string; value: number; color: string }[];
  profSemRegistro: number;
  atvSemCorrecao7d: number;
}

const METRICAS_ZERO: MetricasDash = {
  totalAlunos: 0, freqHojePct: 0,
  profEsperadosHoje: 0, profAtivosHoje: 0,
  atividadesPendentes: 0, alunosEmRisco: 0, txAprovacao: 0,
  freqPorSerie: [], desempenho: [],
  profSemRegistro: 0, atvSemCorrecao7d: 0,
};

// ─── Custom Tooltip do BarChart ───────────────────────────────────────────────
function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const pct = payload[0].value as number;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-0.5">{payload[0].payload.serie}</p>
      <p style={{ color: payload[0].fill }} className="font-bold text-sm">{pct}% de presença</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardCoordenador({ onBackToSite, usuario, logout }: DashboardCoordenadorProps) {
  const { theme, toggleTheme } = useTheme();
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [viewAtual, setViewAtual] = useState<ViewType>('dashboard');
  const [metricas, setMetricas] = useState<MetricasDash>(METRICAS_ZERO);
  const [carregandoMetricas, setCarregandoMetricas] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);

  const segmento = (usuario?.segmento === 'presencial' ? 'presencial' : 'ead') as 'presencial' | 'ead';
  const labelSeg = segmento === 'presencial' ? 'Presencial' : 'EAD';

  useEffect(() => {
    if (usuario?.id) carregarMetricas();
  }, [usuario?.id, segmento]);

  // ── Carrega métricas do painel ─────────────────────────────────────────────
  async function carregarMetricas() {
    setCarregandoMetricas(true);
    try {
      const hoje      = new Date().toISOString().slice(0, 10);
      const mesInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const diasPtBR  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const diaHoje   = diasPtBR[new Date().getDay()];
      const h7d       = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Alunos do segmento — usa .eq estrito igual ao padrão do sistema
      const { data: alunos } = await supabase
        .from('users').select('id, serie')
        .eq('tipo', 'aluno')
        .eq('segmento', segmento);
      const alunoIds = (alunos || []).map((a: any) => a.id);

      // 2. Professores do segmento
      const { data: profs } = await supabase
        .from('users').select('id')
        .eq('tipo', 'professor')
        .eq('segmento', segmento);
      const profIds = (profs || []).map((p: any) => p.id);

      // 3. Queries paralelas
      const [freqHojeR, freqMesR, gradeHojeR, notasR, ativsR] = await Promise.all([
        alunoIds.length > 0
          ? supabase.from('frequencia_diaria').select('aluno_id, disciplina_id, presente')
              .in('aluno_id', alunoIds).eq('data_aula', hoje)
          : { data: [] as any[] },

        alunoIds.length > 0
          ? supabase.from('frequencia_diaria').select('aluno_id, presente')
              .in('aluno_id', alunoIds).gte('data_aula', mesInicio).lte('data_aula', hoje)
          : { data: [] as any[] },

        profIds.length > 0
          ? supabase.from('grade_horaria').select('professor_id, disciplina_id')
              .in('professor_id', profIds).eq('dia_semana', diaHoje)
          : { data: [] as any[] },

        alunoIds.length > 0
          ? supabase.from('notas').select('user_id, media').in('user_id', alunoIds).gt('media', 0)
          : { data: [] as any[] },

        profIds.length > 0
          ? supabase.from('atividades').select('id').in('professor_id', profIds)
          : { data: [] as any[] },
      ]);

      const freqHoje  = (freqHojeR.data  || []) as any[];
      const freqMes   = (freqMesR.data   || []) as any[];
      const gradeHoje = (gradeHojeR.data || []) as any[];
      const notas     = (notasR.data     || []) as any[];
      const ativIds   = ((ativsR.data    || []) as any[]).map((a: any) => a.id);

      // Atividades pendentes + sem correção há 7 dias
      let atividadesPendentes = 0;
      let atvSemCorrecao7d   = 0;
      if (ativIds.length > 0) {
        const [pendR, old7R] = await Promise.all([
          supabase.from('atividades_alunos').select('*', { count: 'exact', head: true })
            .in('atividade_id', ativIds).in('status', ['entregue', 'atrasado']),
          supabase.from('atividades_alunos').select('*', { count: 'exact', head: true })
            .in('atividade_id', ativIds).in('status', ['entregue', 'atrasado']).lt('data_entrega', h7d),
        ]);
        atividadesPendentes = pendR.count || 0;
        atvSemCorrecao7d   = old7R.count  || 0;
      }

      // ── Frequência hoje % ──
      const freqHojePct = freqHoje.length > 0
        ? Math.round((freqHoje.filter((f: any) => f.presente).length / freqHoje.length) * 100)
        : 0;

      // ── Professores ativos hoje ──
      const discProfMap = new Map<string, string>();
      gradeHoje.forEach((g: any) => discProfMap.set(g.disciplina_id, g.professor_id));
      const profEsperadosHoje = new Set(gradeHoje.map((g: any) => g.professor_id)).size;
      const profAtivosSet = new Set<string>();
      freqHoje.forEach((f: any) => { const p = discProfMap.get(f.disciplina_id); if (p) profAtivosSet.add(p); });
      const profAtivosHoje = profAtivosSet.size;

      // ── Alunos em risco (freq < 75%) ──
      const freqPA = new Map<string, { t: number; p: number }>();
      freqMes.forEach((f: any) => {
        if (!freqPA.has(f.aluno_id)) freqPA.set(f.aluno_id, { t: 0, p: 0 });
        const e = freqPA.get(f.aluno_id)!; e.t++; if (f.presente) e.p++;
      });
      const alunosEmRisco = Array.from(freqPA.values()).filter(v => v.t >= 5 && v.p / v.t < 0.75).length;

      // ── Notas / desempenho — agrupa por aluno único, faixas de desempenho atual ──
      // "Reprovado" só é válido ao final do ano (4 bimestres completos).
      // Aqui mostramos faixas de desempenho corrente: Bom / Atenção / Em Risco
      const notasPorAluno = new Map<string, number[]>();
      notas.forEach((n: any) => {
        if (!notasPorAluno.has(n.user_id)) notasPorAluno.set(n.user_id, []);
        notasPorAluno.get(n.user_id)!.push(Number(n.media));
      });

      let aprovados = 0, recuperacao = 0, reprovados = 0;
      notasPorAluno.forEach((medias) => {
        const media = medias.reduce((a, b) => a + b, 0) / medias.length;
        if (media >= 7)      aprovados++;   // Desempenho Bom  (≥ 7,0)
        else if (media >= 5) recuperacao++; // Atenção         (5,0–6,9)
        else                 reprovados++;  // Em Risco        (< 5,0) — não é veredicto final
      });
      const txAprovacao = notasPorAluno.size > 0
        ? Math.round((aprovados / notasPorAluno.size) * 100)
        : 0;

      // ── Frequência por série (gráfico) ──
      const alunoSerieMap = new Map((alunos || []).map((a: any) => [a.id, a.serie as string]));
      const freqSerie = new Map<string, { t: number; p: number }>();
      freqMes.forEach((f: any) => {
        const s = alunoSerieMap.get(f.aluno_id); if (!s) return;
        if (!freqSerie.has(s)) freqSerie.set(s, { t: 0, p: 0 });
        const e = freqSerie.get(s)!; e.t++; if (f.presente) e.p++;
      });
      const freqPorSerie = Array.from(freqSerie.entries())
        .map(([s, d]) => ({
          serie: s.replace('ª série', 'ª').replace('º ano', 'º'),
          pct: d.t > 0 ? Math.round((d.p / d.t) * 100) : 0,
        }))
        .sort((a, b) => a.serie.localeCompare(b.serie, 'pt-BR'));

      // ── Desempenho (pizza) — faixas de desempenho atual, sem veredicto final ──
      const desempenho = [
        { name: 'Bom (≥ 7,0)',     value: aprovados,   color: '#16a34a' },
        { name: 'Atenção (5–7)',   value: recuperacao,  color: '#ca8a04' },
        { name: 'Em Risco (< 5)', value: reprovados,   color: '#dc2626' },
      ].filter(d => d.value > 0);

      setMetricas({
        totalAlunos: alunoIds.length, freqHojePct,
        profEsperadosHoje, profAtivosHoje,
        atividadesPendentes, alunosEmRisco, txAprovacao,
        freqPorSerie, desempenho,
        profSemRegistro: Math.max(0, profEsperadosHoje - profAtivosHoje),
        atvSemCorrecao7d,
      });
    } catch (e) {
      console.error('Erro ao carregar métricas do dashboard:', e);
    } finally {
      setCarregandoMetricas(false);
    }
  }

  // ── Dados derivados de UI ──────────────────────────────────────────────────

  const statsCards = [
    {
      label: 'Total de Alunos', value: metricas.totalAlunos,
      icon: Users, desc: `Segmento ${labelSeg}`,
      bg: '#dbeafe', iconBg: '#2563eb', text: '#1e40af',
    },
    {
      label: 'Frequência Hoje',
      value: metricas.freqHojePct > 0 ? `${metricas.freqHojePct}%` : '—',
      icon: Activity, desc: 'Presença registrada',
      bg:     metricas.freqHojePct >= 75 ? '#dcfce7' : metricas.freqHojePct >= 60 ? '#fef9c3' : '#fee2e2',
      iconBg: metricas.freqHojePct >= 75 ? '#16a34a' : metricas.freqHojePct >= 60 ? '#ca8a04' : '#ef4444',
      text:   metricas.freqHojePct >= 75 ? '#14532d' : metricas.freqHojePct >= 60 ? '#713f12' : '#7f1d1d',
    },
    {
      label: 'Prof. Ativos Hoje',
      value: metricas.profEsperadosHoje > 0 ? `${metricas.profAtivosHoje}/${metricas.profEsperadosHoje}` : '—',
      icon: GraduationCap, desc: 'Lançaram frequência',
      bg: '#ede9fe', iconBg: '#7c3aed', text: '#4c1d95',
    },
    {
      label: 'Aguard. Correção',
      value: metricas.atividadesPendentes,
      icon: FileText, desc: 'Entregas sem correção',
      bg:     metricas.atividadesPendentes > 0 ? '#ffedd5' : '#dcfce7',
      iconBg: metricas.atividadesPendentes > 0 ? '#ea580c' : '#16a34a',
      text:   metricas.atividadesPendentes > 0 ? '#7c2d12' : '#14532d',
    },
    {
      label: 'Alunos em Risco',
      value: metricas.alunosEmRisco,
      icon: AlertTriangle, desc: 'Frequência < 75%',
      bg:     metricas.alunosEmRisco > 0 ? '#fee2e2' : '#dcfce7',
      iconBg: metricas.alunosEmRisco > 0 ? '#dc2626' : '#16a34a',
      text:   metricas.alunosEmRisco > 0 ? '#7f1d1d' : '#14532d',
    },
    {
      label: 'Desempenho Bom',
      value: metricas.totalAlunos > 0 ? `${metricas.txAprovacao}%` : '—',
      icon: TrendingUp, desc: 'Alunos com média ≥ 7,0',
      bg:     metricas.txAprovacao >= 70 ? '#dcfce7' : metricas.txAprovacao >= 50 ? '#fef9c3' : '#fee2e2',
      iconBg: metricas.txAprovacao >= 70 ? '#16a34a' : metricas.txAprovacao >= 50 ? '#ca8a04' : '#dc2626',
      text:   metricas.txAprovacao >= 70 ? '#14532d' : metricas.txAprovacao >= 50 ? '#713f12' : '#7f1d1d',
    },
  ];

  const alertas = [
    metricas.profSemRegistro > 0 ? {
      icon: AlertCircle, view: 'freq_professores' as ViewType, bg: '#fef9c3', text: '#713f12', border: '#fde047',
      msg: `${metricas.profSemRegistro} professor${metricas.profSemRegistro > 1 ? 'es' : ''} não lançaram frequência hoje`,
    } : null,
    metricas.alunosEmRisco > 0 ? {
      icon: AlertTriangle, view: 'frequencia' as ViewType, bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5',
      msg: `${metricas.alunosEmRisco} aluno${metricas.alunosEmRisco > 1 ? 's' : ''} com frequência abaixo de 75%`,
    } : null,
    metricas.atvSemCorrecao7d > 0 ? {
      icon: FileText, view: 'atv_recebidas' as ViewType, bg: '#dbeafe', text: '#1e40af', border: '#93c5fd',
      msg: `${metricas.atvSemCorrecao7d} atividade${metricas.atvSemCorrecao7d > 1 ? 's' : ''} sem correção há mais de 7 dias`,
    } : null,
  ].filter(Boolean) as { icon: any; view: ViewType; msg: string; bg: string; text: string; border: string }[];

  const menuItems = [
    { id: 'boletins',        title: 'Boletins Gerais',            description: 'Visualizar boletins de todos os alunos',          icon: FileText,   bg: '#dbeafe', iconColor: '#2563eb' },
    { id: 'relatorio',       title: 'Relatório de Turma',         description: 'Relatórios detalhados por turma ou aluno',         icon: BarChart3,  bg: '#dcfce7', iconColor: '#16a34a' },
    { id: 'frequencia',      title: 'Frequência de Alunos',       description: 'Verificar frequência e faltas dos alunos',         icon: UserCheck,  bg: '#ede9fe', iconColor: '#7c3aed' },
    { id: 'freq_professores',title: 'Frequência de Professores',  description: 'Registrar presença e horas/aula dos professores',  icon: Users,      bg: '#d1fae5', iconColor: '#059669' },
    { id: 'comunicado',      title: 'Enviar Comunicado',          description: 'Enviar mensagens para alunos e professores',       icon: Send,       bg: '#ffedd5', iconColor: '#ea580c' },
    { id: 'agenda',          title: 'Agenda dos Professores',     description: 'Acompanhar, rastrear e configurar grade horária',  icon: Calendar,   bg: '#fce7f3', iconColor: '#db2777' },
    { id: 'horarios',        title: 'Gestão de Horários',         description: 'Cadastrar e editar grade horária das turmas',      icon: Clock,      bg: '#cffafe', iconColor: '#0891b2' },
    { id: 'atv_enviadas',    title: 'Atividades Enviadas',        description: 'Acompanhar atividades publicadas pelos professores',icon: BookOpen,   bg: '#e0e7ff', iconColor: '#4f46e5' },
    { id: 'atv_recebidas',   title: 'Atividades Recebidas',       description: 'Entregas dos alunos, correções e feedbacks',       icon: Inbox,      bg: '#fef9c3', iconColor: '#ca8a04' },
    { id: 'boletim_aluno',   title: 'Imprimir Boletim do Aluno', description: 'Consultar e imprimir boletim completo do aluno',   icon: FileText,   bg: '#f0fdf4', iconColor: '#15803d' },
  ];

  const tituloPorView: Record<string, string> = {
    boletins: 'Boletins Gerais', relatorio: 'Relatório de Turma',
    frequencia: 'Frequência de Alunos', freq_professores: 'Frequência de Professores',
    comunicado: 'Enviar Comunicado', agenda: 'Agenda dos Professores',
    horarios: 'Gestão de Horários', atv_enviadas: 'Atividades Enviadas',
    atv_recebidas: 'Atividades Recebidas', boletim_aluno: 'Boletim do Aluno',
  };

  const renderConteudo = () => {
    switch (viewAtual) {
      case 'boletins':         return <BoletinsGerais onVoltar={() => setViewAtual('dashboard')} />;
      case 'relatorio':        return <RelatorioTurma onVoltar={() => setViewAtual('dashboard')} />;
      case 'frequencia':       return <FrequenciaAlunos onVoltar={() => setViewAtual('dashboard')} />;
      case 'freq_professores': return <FrequenciaProfessores onVoltar={() => setViewAtual('dashboard')} usuario={usuario} segmentoForcado={usuario?.segmento as 'ead' | 'presencial'} />;
      case 'comunicado':       return <EnviarComunicado onVoltar={() => setViewAtual('dashboard')} />;
      case 'agenda':           return <AgendaCoordenador onVoltar={() => setViewAtual('dashboard')} />;
      case 'horarios':         return <GestaoHorarios onVoltar={() => setViewAtual('dashboard')} />;
      case 'atv_enviadas':     return <AtividadesCoordenador tabInicial="enviadas" />;
      case 'atv_recebidas':    return <AtividadesCoordenador tabInicial="recebidas" />;
      case 'boletim_aluno':    return <BoletimCoordenador onVoltar={() => setViewAtual('dashboard')} />;
      default: return null;
    }
  };

  const getDropdownPos = () => {
    if (!avatarRef.current) return { top: 68, right: 16 };
    const rect = avatarRef.current.getBoundingClientRect();
    return { top: rect.bottom + 8, right: window.innerWidth - rect.right };
  };
  const pos = getDropdownPos();

  // ── Header ────────────────────────────────────────────────────────────────────
  const Header = () => (
    <header className="bg-card border-b border-border py-3 sm:py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between">
        <SchoolHeader subtitle="Painel do Coordenador" />
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}>
              <Bell className="w-5 h-5 text-muted-foreground" />
            </Button>
            {mostrarNotificacoes && (
              <div className="absolute right-0 top-12 w-80 z-50">
                <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
              </div>
            )}
          </div>
          <button ref={avatarRef} onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)} className="focus:outline-none">
            <Avatar className="w-9 h-9 border-2 border-border cursor-pointer">
              <AvatarImage src={usuario?.avatar} />
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {usuario?.nome?.slice(0, 2).toUpperCase() || 'CO'}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
      {mostrarMenuUsuario && createPortal(
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setMostrarMenuUsuario(false)} />
          <div className="fixed w-48 rounded-xl border border-border shadow-2xl z-[99999] overflow-hidden"
            style={{ backgroundColor: 'var(--card)', top: pos.top, right: pos.right }}>
            <button onClick={() => { setMostrarMenuUsuario(false); setMostrarPerfil(true); }}
              className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors">
              <User className="w-4 h-4 text-muted-foreground" /> Meu Perfil
            </button>
            <div className="h-px bg-border mx-3" />
            <button onClick={() => { setMostrarMenuUsuario(false); logout?.(); }}
              className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </>,
        document.body
      )}
    </header>
  );

  // ── Barra azul (sub-painéis) ──────────────────────────────────────────────────
  const BarraAzul = ({ titulo }: { titulo: string }) => (
    <div className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="sm" onClick={() => setViewAtual('dashboard')} className="text-white hover:bg-white/20">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Button>
        <h1 className="font-semibold text-lg">{titulo}</h1>
      </div>
    </div>
  );

  // ── Sub-painéis ───────────────────────────────────────────────────────────────
  if (viewAtual !== 'dashboard') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo={tituloPorView[viewAtual] || ''} />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
              <span className="text-muted-foreground">Carregando módulo...</span>
            </div>
          }>
            {renderConteudo()}
          </Suspense>
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  // ── Dashboard principal ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Banner ── */}
        <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg overflow-hidden">
          <div className="relative z-10 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold mb-1">
                Olá, {usuario?.nome?.split(' ')[0]}! 👋
              </h1>
              <p className="text-blue-100 text-sm sm:text-base">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}Segmento <span className="font-semibold">{labelSeg}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={carregarMetricas}
              disabled={carregandoMetricas}
              className="text-white hover:bg-white/20 border border-white/30 self-start sm:self-auto gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${carregandoMetricas ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        </section>

        {/* ── Visão Geral — 6 cards ── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            Visão Geral
            {carregandoMetricas && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-1" />}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statsCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label}
                  className="rounded-xl p-4 flex flex-col items-center text-center gap-2 transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: card.bg }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: card.iconBg }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none mb-1" style={{ color: card.text }}>
                      {carregandoMetricas ? <span className="text-lg opacity-40">…</span> : card.value}
                    </p>
                    <p className="text-[10px] font-semibold leading-tight" style={{ color: card.text }}>
                      {card.label}
                    </p>
                    <p className="text-[9px] opacity-70 mt-0.5 leading-tight" style={{ color: card.text }}>
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Alertas ── */}
        {alertas.length > 0 && (
          <section className="flex flex-col sm:flex-row gap-3">
            {alertas.map((alerta, i) => {
              const Icon = alerta.icon;
              return (
                <div key={i}
                  className="flex-1 flex items-center gap-3 rounded-xl border px-4 py-3"
                  style={{ backgroundColor: alerta.bg, borderColor: alerta.border }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" style={{ color: alerta.text }} />
                  <p className="text-xs font-medium flex-1 leading-snug" style={{ color: alerta.text }}>
                    {alerta.msg}
                  </p>
                  <button
                    onClick={() => setViewAtual(alerta.view)}
                    className="text-xs font-semibold flex-shrink-0 underline underline-offset-2"
                    style={{ color: alerta.text }}
                  >
                    Ver →
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Gráficos ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Frequência por Série */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Frequência por Série
                <span className="text-xs font-normal text-muted-foreground ml-auto">Mês atual</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {carregandoMetricas ? (
                <div className="flex items-center justify-center h-[220px]">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : metricas.freqPorSerie.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                  <Activity className="w-10 h-10 opacity-20 mb-3" />
                  <p className="text-sm">Sem dados de frequência este mês</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metricas.freqPorSerie} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="serie" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                    <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {metricas.freqPorSerie.map((entry, idx) => (
                        <Cell key={idx} fill={entry.pct >= 75 ? '#16a34a' : entry.pct >= 60 ? '#ca8a04' : '#dc2626'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Legenda de cores */}
              {metricas.freqPorSerie.length > 0 && (
                <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />≥ 75%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />60–74%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />&lt; 60%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Desempenho Geral */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Desempenho Geral
                <span className="text-xs font-normal text-muted-foreground ml-auto">Desempenho atual · média geral por aluno</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {carregandoMetricas ? (
                <div className="flex items-center justify-center h-[220px]">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : metricas.desempenho.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                  <TrendingUp className="w-10 h-10 opacity-20 mb-3" />
                  <p className="text-sm">Sem notas registradas</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={metricas.desempenho}
                        cx="50%" cy="50%"
                        innerRadius={58} outerRadius={88}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {metricas.desempenho.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [v, 'Alunos']}
                        contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legenda customizada */}
                  <div className="flex items-center justify-center gap-5 -mt-2">
                    {metricas.desempenho.map(d => (
                      <div key={d.name} className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="text-base font-bold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Faltas em Tempo Real ── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            Monitoramento de Faltas
          </h2>
          <FrequenciaRealtime />
        </section>

        {/* ── Módulos ── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-indigo-500 rounded-full" />
            Módulos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  onClick={() => setViewAtual(item.id as ViewType)}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-border bg-card"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div
                      className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.iconColor }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs leading-snug">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 hidden sm:block">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      <AgenteInclusao usuario={usuario} />
    </div>
  );
}
