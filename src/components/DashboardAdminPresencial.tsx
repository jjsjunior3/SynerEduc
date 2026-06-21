// src/components/DashboardAdminPresencial.tsx
// Dashboard com stats reais do Supabase, gráficos recharts e visual moderno
import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus, School, Users, Link2, Loader2, Bell, User, LogOut,
  GraduationCap, BookOpen, TrendingUp, BarChart3, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTheme } from '../contexts/ThemeContext';
import { Notificacoes } from './Notificacoes';
import { PerfilUsuario } from './PerfilUsuario';
import { SchoolHeader } from './SchoolHeader';
import { supabase } from '../supabase/supabaseClient';
import { Usuario } from '../types/auth';

const CadastrarUsuarioNovo = lazy(() =>
  import('./CadastrarUsuarioNovo').then(m => ({ default: m.CadastrarUsuarioNovo ?? m.default }))
);
const GerenciadorUsuarios = lazy(() =>
  import('./GerenciadorUsuariosFixed').then(m => ({ default: m.GerenciadorUsuarios ?? m.default }))
);
const GestaoEscola = lazy(() =>
  import('./GestaoEscola').then(m => ({ default: m.default ?? m.GestaoEscola }))
);
const GestaoVinculos = lazy(() =>
  import('./GestaoVinculos').then(m => ({ default: m.GestaoVinculos ?? m.default }))
);

interface DashboardAdminPresencialProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
}

type ViewType = 'dashboard' | 'cadastrar-usuario' | 'admin-usuarios' | 'gestao' | 'gestao-vinculos';

interface Stats {
  alunos: number; professores: number; coordenadores: number;
  disciplinas: number; series: number; vinculos: number;
}
interface SerieCount { serie: string; alunos: number }
interface TurnoCount { turno: string; total:  number }

const SEGMENTO_FIXO = 'presencial' as const;

const menuItems = [
  { id: 'cadastrar-usuario' as ViewType, title: 'Cadastrar Usuário',  description: 'Adicionar novos usuários presenciais', icon: UserPlus, gradient: 'from-blue-500 to-blue-600',     shadow: 'shadow-blue-200 dark:shadow-blue-900/40' },
  { id: 'admin-usuarios'    as ViewType, title: 'Gerenciar Usuários', description: 'Editar e gerenciar usuários',           icon: Users,    gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200 dark:shadow-emerald-900/40' },
  { id: 'gestao'            as ViewType, title: 'Gestão Escolar',     description: 'Disciplinas e séries presenciais',      icon: School,   gradient: 'from-violet-500 to-violet-600',   shadow: 'shadow-violet-200 dark:shadow-violet-900/40' },
  { id: 'gestao-vinculos'   as ViewType, title: 'Gestão de Vínculos', description: 'Vínculos professor → disciplina',       icon: Link2,    gradient: 'from-cyan-500 to-cyan-600',       shadow: 'shadow-cyan-200 dark:shadow-cyan-900/40' },
];

const tituloPorView: Record<string, string> = {
  'cadastrar-usuario': 'Cadastrar Usuário',
  'admin-usuarios':    'Gerenciar Usuários',
  'gestao':            'Gestão Escolar',
  'gestao-vinculos':   'Gestão de Vínculos',
};

const CORES_SERIES = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16'];
const CORES_TURNO  = ['#3b82f6','#10b981','#f59e0b'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, sub, color, loading }: {
  icon: React.ElementType; label: string; value: number; sub?: string;
  color: string; loading: boolean;
}) {
  return (
    <Card className="border-border bg-card overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            {loading
              ? <div className="h-8 w-14 rounded bg-muted animate-pulse mt-1" />
              : <p className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5 tabular-nums">{value.toLocaleString('pt-BR')}</p>
            }
            {sub && !loading && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardAdminPresencial({ usuario, logout }: DashboardAdminPresencialProps) {
  const { theme } = useTheme();
  const avatarRef = useRef<HTMLButtonElement>(null);

  const [mostrarPerfil,       setMostrarPerfil]       = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarMenuUsuario,  setMostrarMenuUsuario]  = useState(false);
  const [viewAtual,           setViewAtual]           = useState<ViewType>('dashboard');
  const [stats,               setStats]               = useState<Stats>({ alunos:0, professores:0, coordenadores:0, disciplinas:0, series:0, vinculos:0 });
  const [seriesData,          setSeriesData]          = useState<SerieCount[]>([]);
  const [turnoData,           setTurnoData]           = useState<TurnoCount[]>([]);
  const [loadingStats,        setLoadingStats]        = useState(true);
  const [ultimaAtualizacao,   setUltimaAtualizacao]   = useState<Date | null>(null);

  const carregarDados = async () => {
    setLoadingStats(true);
    try {
      const [
        { count: alunos },
        { count: professores },
        { count: coordenadores },
        { count: disciplinas },
        { count: series },
        { count: vinculos },
        { data: alunosRaw },
      ] = await Promise.all([
        supabase.from('users').select('*',{ count:'exact', head:true }).eq('tipo','aluno').eq('segmento','presencial').eq('status','ativo'),
        supabase.from('users').select('*',{ count:'exact', head:true }).eq('tipo','professor').eq('segmento','presencial'),
        supabase.from('users').select('*',{ count:'exact', head:true }).eq('tipo','coordenador').eq('segmento','presencial'),
        supabase.from('disciplinas').select('*',{ count:'exact', head:true }).eq('segmento','presencial').eq('ativa',true),
        supabase.from('series').select('*',{ count:'exact', head:true }).eq('segmento','presencial').eq('ativa',true),
        supabase.from('professores_disciplinas_series').select('*',{ count:'exact', head:true }).eq('segmento','presencial'),
        supabase.from('users').select('serie, turno').eq('tipo','aluno').eq('segmento','presencial').eq('status','ativo'),
      ]);

      setStats({ alunos: alunos??0, professores: professores??0, coordenadores: coordenadores??0, disciplinas: disciplinas??0, series: series??0, vinculos: vinculos??0 });

      const mapasSerie: Record<string,number> = {};
      const mapasTurno: Record<string,number> = {};
      for (const u of alunosRaw??[]) {
        if (u.serie) mapasSerie[u.serie] = (mapasSerie[u.serie]??0)+1;
        if (u.turno) mapasTurno[u.turno] = (mapasTurno[u.turno]??0)+1;
      }
      setSeriesData(
        Object.entries(mapasSerie)
          .map(([serie, alunos]) => ({ serie, alunos }))
          .sort((a,b) => b.alunos - a.alunos)
          .slice(0,8)
      );
      const labelTurno: Record<string,string> = { matutino:'Matutino', vespertino:'Vespertino', noturno:'Noturno' };
      setTurnoData(Object.entries(mapasTurno).map(([turno,total]) => ({ turno: labelTurno[turno]??turno, total })));
      setUltimaAtualizacao(new Date());
    } catch(e) {
      console.error('[DashboardAdminPresencial] Erro stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { if (viewAtual === 'dashboard') carregarDados(); }, [viewAtual]);

  const getDropdownPos = () => {
    if (!avatarRef.current) return { top:68, right:16 };
    const rect = avatarRef.current.getBoundingClientRect();
    return { top: rect.bottom+8, right: window.innerWidth-rect.right };
  };

  const renderConteudo = () => {
    switch (viewAtual) {
      case 'cadastrar-usuario': return <CadastrarUsuarioNovo onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      case 'admin-usuarios':    return <GerenciadorUsuarios  onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      case 'gestao':            return <GestaoEscola         onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      case 'gestao-vinculos':   return <GestaoVinculos       onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      default: return null;
    }
  };

  const pos = getDropdownPos();

  const Header = () => (
    <header className="bg-card border-b border-border py-3 sm:py-4 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between">
        <SchoolHeader subtitle="Painel Administrativo — Presencial" />
        <div className="flex items-center px-2 gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full font-medium border bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">Presencial</span>
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)} aria-label="Notificações">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </Button>
            {mostrarNotificacoes && (
              <div className="absolute right-0 top-12 w-80 z-50">
                <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
              </div>
            )}
          </div>
          <button ref={avatarRef} onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)} className="focus:outline-none" aria-label="Menu">
            <Avatar className="w-9 h-9 border-2 border-border cursor-pointer">
              <AvatarImage src={usuario?.avatar} />
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-sm font-semibold">
                {usuario?.nome?.slice(0,2).toUpperCase()||'AP'}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
      {mostrarMenuUsuario && createPortal(
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setMostrarMenuUsuario(false)} />
          <div className="fixed w-48 rounded-xl border border-border shadow-2xl z-[99999] overflow-hidden" style={{ backgroundColor:'var(--card)', top:pos.top, right:pos.right }}>
            <button onClick={() => { setMostrarMenuUsuario(false); setMostrarPerfil(true); }} className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors">
              <User className="w-4 h-4 text-muted-foreground" /> Meu Perfil
            </button>
            <div className="h-px bg-border mx-3" />
            <button onClick={() => { setMostrarMenuUsuario(false); logout?.(); }} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </>,
        document.body
      )}
    </header>
  );

  const BarraTitulo = ({ titulo }: { titulo: string }) => (
    <div className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <h1 className="font-semibold text-base sm:text-lg">{titulo}</h1>
      </div>
    </div>
  );

  if (viewAtual !== 'dashboard') {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Header />
        <BarraTitulo titulo={tituloPorView[viewAtual]||''} />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" /><span className="text-muted-foreground">Carregando...</span></div>}>
            {renderConteudo()}
          </Suspense>
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Banner */}
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl p-5 sm:p-8">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Painel Administrativo Presencial</p>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Olá, {usuario?.nome?.split(' ')[0]}! 👋</h1>
              <p className="text-blue-100/80 text-sm max-w-md">Gerencie usuários, turmas e vínculos do colégio.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {ultimaAtualizacao && (
                <p className="text-xs text-blue-300">
                  Atualizado às {ultimaAtualizacao.toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' })}
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={carregarDados} disabled={loadingStats}
                className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20 gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats?'animate-spin':''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Visão Geral — Segmento Presencial
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={GraduationCap} label="Alunos Ativos"  value={stats.alunos}        color="bg-blue-100   text-blue-600   dark:bg-blue-900/50   dark:text-blue-400"    loading={loadingStats} sub="matrículas ativas" />
            <StatCard icon={BookOpen}      label="Professores"    value={stats.professores}    color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" loading={loadingStats} sub="segmento presencial" />
            <StatCard icon={Users}         label="Coordenadores"  value={stats.coordenadores}  color="bg-violet-100  text-violet-600  dark:bg-violet-900/50  dark:text-violet-400"  loading={loadingStats} />
            <StatCard icon={BookOpen}      label="Disciplinas"    value={stats.disciplinas}    color="bg-amber-100   text-amber-600   dark:bg-amber-900/50   dark:text-amber-400"   loading={loadingStats} sub="ativas" />
            <StatCard icon={School}        label="Séries"         value={stats.series}         color="bg-cyan-100    text-cyan-600    dark:bg-cyan-900/50    dark:text-cyan-400"    loading={loadingStats} sub="cadastradas" />
            <StatCard icon={Link2}         label="Vínculos"       value={stats.vinculos}       color="bg-rose-100    text-rose-600    dark:bg-rose-900/50    dark:text-rose-400"    loading={loadingStats} sub="prof-disciplina" />
          </div>
        </section>

        {/* Skeletons gráficos */}
        {loadingStats && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 h-64 rounded-xl border border-border bg-muted/30 animate-pulse" />
            <div className="lg:col-span-2 h-64 rounded-xl border border-border bg-muted/30 animate-pulse" />
          </section>
        )}

        {/* Gráficos */}
        {!loadingStats && (seriesData.length > 0 || turnoData.length > 0) && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

            {seriesData.length > 0 && (
              <Card className="lg:col-span-3 border-border">
                <CardHeader className="pb-1 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" /> Alunos por Série
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Distribuição de alunos ativos presenciais</p>
                </CardHeader>
                <CardContent className="px-2 pb-4 pt-2">
                  <ResponsiveContainer width="100%" height={Math.max(180, seriesData.length * 38)}>
                    <BarChart data={seriesData} layout="vertical" margin={{ top:0, right:20, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize:11, fill:'var(--muted-foreground)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="serie" width={115} tick={{ fontSize:11, fill:'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill:'var(--muted)', opacity:0.4 }} />
                      <Bar dataKey="alunos" name="Alunos" radius={[0,4,4,0]} maxBarSize={20}>
                        {seriesData.map((_,i) => <Cell key={i} fill={CORES_SERIES[i%CORES_SERIES.length]} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {turnoData.length > 0 && (
              <Card className="lg:col-span-2 border-border">
                <CardHeader className="pb-1 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" /> Alunos por Turno
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Segmento presencial</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center pb-4 pt-2">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={turnoData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} dataKey="total" nameKey="turno" paddingAngle={3} stroke="none">
                        {turnoData.map((_,i) => <Cell key={i} fill={CORES_TURNO[i%CORES_TURNO.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize:11, color:'var(--muted-foreground)' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-5 mt-1">
                    {turnoData.map((t,i) => (
                      <div key={t.turno} className="text-center">
                        <p className="text-xl font-bold text-foreground tabular-nums">{t.total}</p>
                        <p className="text-[10px] font-medium" style={{ color: CORES_TURNO[i%CORES_TURNO.length] }}>{t.turno}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Estado vazio dos gráficos */}
        {!loadingStats && seriesData.length === 0 && turnoData.length === 0 && (
          <Card className="border-border border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sem dados para exibir gráficos</p>
              <p className="text-xs mt-1">Cadastre alunos presenciais para ver a distribuição por série e turno.</p>
            </CardContent>
          </Card>
        )}

        {/* Módulos */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <School className="w-3.5 h-3.5" /> Módulos de Gestão
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => setViewAtual(item.id)}
                  className="group relative text-left rounded-2xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-200`} />
                  <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md mb-3 sm:mb-4`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="relative">
                    <p className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed hidden sm:block">{item.description}</p>
                  </div>
                  <span className="absolute bottom-4 right-4 text-muted-foreground/20 group-hover:text-primary/40 transition-colors text-base leading-none hidden sm:block">→</span>
                </button>
              );
            })}
          </div>
        </section>

      </main>
      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
    </div>
  );
}

export default DashboardAdminPresencial;