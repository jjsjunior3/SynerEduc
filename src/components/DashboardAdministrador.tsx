// src/components/DashboardAdministrador.tsx
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import {
  MessageSquare, BarChart3, UserPlus, School, FileText,
  Book, Users, Link2, Sun, Moon, TrendingUp, Activity,
  GraduationCap, BookOpen, Wifi, Clock, UserCheck, UserX,
  ChevronRight, Zap, Shield,
} from "lucide-react";
import { PerfilUsuario } from "./PerfilUsuario";
import { RelatoriosAdmin } from "./RelatoriosAdmin";
import GestaoEscola from "./GestaoEscola";
import { CadastrarUsuarioNovo } from "./CadastrarUsuarioNovo";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import logoEscola from "../assets/e339c695d5503d560f7e53d2039456d52fd95ea5.png";
import { Usuario } from "../types/auth";
import { GerenciadorUsuarios } from "./GerenciadorUsuariosFixed";
import { GestaoConteudoPDF } from "./GestaoConteudoPDF";
import ComunicadosPage from "./ComunicadosPage";
import { Forum } from "./Forum";
import { GestaoVinculos } from "./GestaoVinculos";
import { supabase } from "../supabase/supabaseClient";
import { useTheme } from "../contexts/ThemeContext";

interface DashboardAdministradorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
  onDisciplinaClick?: (disciplina: any) => void;
  onBoletimClick?: () => void;
  onComunicadosClick?: () => void;
}

interface Metricas {
  // Totais gerais
  totalAlunos: number;
  totalProfessores: number;
  totalDisciplinas: number;
  totalTurmas: number;
  // Segmentado
  alunosEAD: number;
  alunosPresencial: number;
  professoresEAD: number;
  professoresPresencial: number;
  // Status
  alunosAtivos: number;
  alunosInativos: number;
  // Últimas 24h
  novosUltimas24h: number;
  // Online agora (Presence)
  onlineAgora: number;
  usuariosOnline: { id: string; nome: string; tipo: string }[];
}

type ViewType =
  | "dashboard" | "cadastrar-usuario" | "gestao" | "relatorios"
  | "admin-usuarios" | "gestao-conteudo" | "comunicados" | "forum" | "gestao-vinculos";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const tipoLabel: Record<string, string> = {
  aluno: "Aluno", professor: "Professor", coordenador: "Coordenador",
  administrador: "Admin", professor_conteudista: "Conteudista",
  gestor_geral: "Gestor", secretaria: "Secretaria", financeiro: "Financeiro",
};

function BarraProgresso({ valor, total, cor }: { valor: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function PulseOnline() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function DashboardAdministrador({
  onBackToSite, usuario, logout, atualizarUsuario,
}: DashboardAdministradorProps) {
  const { theme, toggleTheme } = useTheme();
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [metricas, setMetricas] = useState<Metricas>({
    totalAlunos: 0, totalProfessores: 0, totalDisciplinas: 0, totalTurmas: 0,
    alunosEAD: 0, alunosPresencial: 0, professoresEAD: 0, professoresPresencial: 0,
    alunosAtivos: 0, alunosInativos: 0, novosUltimas24h: 0,
    onlineAgora: 0, usuariosOnline: [],
  });
  const [carregando, setCarregando] = useState(true);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const channelRef = useRef<any>(null);

  // ── Relógio ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setHoraAtual(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Carregar métricas ─────────────────────────────────────────────────────
  useEffect(() => {
    carregarMetricas();
    iniciarPresence();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  async function carregarMetricas() {
    setCarregando(true);
    try {
      const agora = new Date();
      const h24   = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalAlunos },
        { count: totalProfessores },
        { count: totalDisciplinas },
        { count: totalTurmas },
        { count: alunosEAD },
        { count: alunosPresencial },
        { count: professoresEAD },
        { count: professoresPresencial },
        { count: alunosAtivos },
        { count: alunosInativos },
        { count: novosUltimas24h },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tipo", "aluno"),
        supabase.from("users").select("*", { count: "exact", head: true }).in("tipo", ["professor", "professor_conteudista"]),
        supabase.from("disciplinas").select("*", { count: "exact", head: true }),
        supabase.from("series").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tipo", "aluno").eq("segmento", "ead"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tipo", "aluno").eq("segmento", "presencial"),
        supabase.from("users").select("*", { count: "exact", head: true }).in("tipo", ["professor", "professor_conteudista"]).eq("segmento", "ead"),
        supabase.from("users").select("*", { count: "exact", head: true }).in("tipo", ["professor", "professor_conteudista"]).eq("segmento", "presencial"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tipo", "aluno").eq("status", "ativo"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tipo", "aluno").eq("status", "inativo"),
        supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", h24),
      ]);

      setMetricas(prev => ({
        ...prev,
        totalAlunos:         totalAlunos         ?? 0,
        totalProfessores:    totalProfessores     ?? 0,
        totalDisciplinas:    totalDisciplinas     ?? 0,
        totalTurmas:         totalTurmas          ?? 0,
        alunosEAD:           alunosEAD            ?? 0,
        alunosPresencial:    alunosPresencial     ?? 0,
        professoresEAD:      professoresEAD       ?? 0,
        professoresPresencial: professoresPresencial ?? 0,
        alunosAtivos:        alunosAtivos         ?? 0,
        alunosInativos:      alunosInativos       ?? 0,
        novosUltimas24h:     novosUltimas24h      ?? 0,
      }));
    } catch (err) {
      console.error("[DashboardAdmin] Erro ao carregar métricas:", err);
    } finally {
      setCarregando(false);
    }
  }

  // ── Supabase Realtime Presence — usuários online ───────────────────────────
  async function iniciarPresence() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from("users").select("nome, tipo").eq("id", user.id).single();

      const channel = supabase.channel("presenca_global", {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const online: { id: string; nome: string; tipo: string }[] = [];
          Object.entries(state).forEach(([key, presences]: [string, any[]]) => {
            const p = presences[0];
            if (p) online.push({ id: key, nome: p.nome || "Usuário", tipo: p.tipo || "aluno" });
          });
          setMetricas(prev => ({ ...prev, onlineAgora: online.length, usuariosOnline: online }));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              nome: perfil?.nome || "Administrador",
              tipo: perfil?.tipo || "administrador",
              entrou_em: new Date().toISOString(),
            });
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error("[DashboardAdmin] Erro ao iniciar Presence:", err);
    }
  }

  // ── Menu items ────────────────────────────────────────────────────────────
  const menuItems: Array<{
    id: ViewType; title: string; description: string;
    icon: React.ReactNode; gradient: string; iconBg: string;
  }> = [
    {
      id: "cadastrar-usuario", title: "Cadastrar Usuário",
      description: "Adicionar novos usuários",
      icon: <UserPlus className="w-5 h-5" />,
      gradient: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-900/10",
      iconBg: "bg-blue-500",
    },
    {
      id: "admin-usuarios", title: "Gerenciar Usuários",
      description: "Editar e gerenciar usuários",
      icon: <Users className="w-5 h-5" />,
      gradient: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-900/10",
      iconBg: "bg-emerald-500",
    },
    {
      id: "gestao", title: "Gestão Escolar",
      description: "Disciplinas e séries",
      icon: <School className="w-5 h-5" />,
      gradient: "from-violet-500/10 to-violet-600/5 dark:from-violet-500/20 dark:to-violet-900/10",
      iconBg: "bg-violet-500",
    },
    {
      id: "gestao-conteudo", title: "Gestão de Conteúdo",
      description: "Materiais e biblioteca",
      icon: <Book className="w-5 h-5" />,
      gradient: "from-teal-500/10 to-teal-600/5 dark:from-teal-500/20 dark:to-teal-900/10",
      iconBg: "bg-teal-500",
    },
    {
      id: "relatorios", title: "Relatórios",
      description: "Gerar relatórios",
      icon: <FileText className="w-5 h-5" />,
      gradient: "from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-900/10",
      iconBg: "bg-orange-500",
    },
    {
      id: "comunicados", title: "Comunicados",
      description: "Enviar comunicados",
      icon: <MessageSquare className="w-5 h-5" />,
      gradient: "from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-900/10",
      iconBg: "bg-cyan-500",
    },
    {
      id: "forum", title: "Fórum Geral",
      description: "Moderar discussões",
      icon: <MessageSquare className="w-5 h-5" />,
      gradient: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-900/10",
      iconBg: "bg-purple-500",
    },
    {
      id: "gestao-vinculos", title: "Gestão de Vínculos",
      description: "Professores e disciplinas",
      icon: <Link2 className="w-5 h-5" />,
      gradient: "from-slate-500/10 to-slate-600/5 dark:from-slate-500/20 dark:to-slate-900/10",
      iconBg: "bg-slate-500",
    },
  ];

  const saudacao = () => {
    const h = horaAtual.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const pctAtivos = metricas.totalAlunos > 0
    ? Math.round((metricas.alunosAtivos / metricas.totalAlunos) * 100)
    : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ── */}
      <header className="bg-card border-b border-border py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoEscola} alt="Logo" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="font-semibold text-foreground text-sm leading-tight">
                  Colégio Conexão EAD Maranhense
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Painel Administrativo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Online agora — indicador no header */}
              {metricas.onlineAgora > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <PulseOnline />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    {metricas.onlineAgora} online
                  </span>
                </div>
              )}

              <button onClick={toggleTheme}
                className="p-2 rounded-full bg-secondary hover:bg-accent transition-colors border border-border"
                aria-label="Alternar tema">
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {onBackToSite && (
                <Button variant="outline" size="sm" onClick={onBackToSite} className="text-xs">
                  Voltar ao Site
                </Button>
              )}

              <Button variant="ghost" size="sm"
                className="flex items-center gap-2 px-2"
                onClick={() => setMostrarPerfil(true)}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario?.avatar} alt={usuario?.nome} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {usuario?.nome ? usuario.nome.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground hidden sm:block">
                  {usuario?.nome || "Administrador"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {mostrarPerfil && (
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil}
          usuario={usuario} logout={logout} />
      )}

      {/* ── Conteúdo ── */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">

        {viewAtual !== "dashboard" ? (
          /* ── Views internas ── */
          <>
            {viewAtual === "cadastrar-usuario" && <CadastrarUsuarioNovo onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "gestao"            && <GestaoEscola onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "relatorios"        && <RelatoriosAdmin onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "admin-usuarios"    && <GerenciadorUsuarios onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "gestao-conteudo"   && <GestaoConteudoPDF onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "comunicados"       && <ComunicadosPage onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "forum"             && <Forum onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "gestao-vinculos"   && <GestaoVinculos onVoltar={() => setViewAtual("dashboard")} />}
          </>
        ) : (
          /* ── Dashboard principal ── */
          <div className="space-y-6">

            {/* ── Saudação + hora ── */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {saudacao()}, {usuario?.nome?.split(" ")[0] || "Admin"}! 👋
                </h2>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {horaAtual.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                  {" · "}
                  {horaAtual.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={carregarMetricas}
                disabled={carregando} className="gap-2 text-xs shrink-0">
                <Activity className={`w-3.5 h-3.5 ${carregando ? "animate-pulse" : ""}`} />
                Atualizar
              </Button>
            </div>

            {/* ── Faixa de alertas rápidos ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              {/* Online agora */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/20">
                  <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-400 leading-none">
                    {metricas.onlineAgora}
                  </div>
                  <div className="text-xs text-green-600/80 dark:text-green-500 mt-0.5">Online agora</div>
                </div>
              </div>

              {/* Novos nas últimas 24h */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/20">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400 leading-none">
                    {metricas.novosUltimas24h}
                  </div>
                  <div className="text-xs text-blue-600/80 dark:text-blue-500 mt-0.5">Cadastros 24h</div>
                </div>
              </div>

              {/* Ativos */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/20">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-none">
                    {metricas.alunosAtivos}
                  </div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-0.5">Alunos ativos</div>
                </div>
              </div>

              {/* Inativos */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/20">
                  <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-400 leading-none">
                    {metricas.alunosInativos}
                  </div>
                  <div className="text-xs text-red-600/80 dark:text-red-500 mt-0.5">Alunos inativos</div>
                </div>
              </div>
            </div>

            {/* ── Métricas principais ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Alunos */}
              <Card className="border-border hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                      <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" /> Total
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{metricas.totalAlunos}</div>
                  <div className="text-sm text-muted-foreground mb-3">Alunos matriculados</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">EAD</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{metricas.alunosEAD}</span>
                    </div>
                    <BarraProgresso valor={metricas.alunosEAD} total={metricas.totalAlunos} cor="bg-blue-500" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Presencial</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">{metricas.alunosPresencial}</span>
                    </div>
                    <BarraProgresso valor={metricas.alunosPresencial} total={metricas.totalAlunos} cor="bg-indigo-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Professores */}
              <Card className="border-border hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                      <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" /> Total
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{metricas.totalProfessores}</div>
                  <div className="text-sm text-muted-foreground mb-3">Professores</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">EAD</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{metricas.professoresEAD}</span>
                    </div>
                    <BarraProgresso valor={metricas.professoresEAD} total={metricas.totalProfessores} cor="bg-emerald-500" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Presencial</span>
                      <span className="font-medium text-teal-600 dark:text-teal-400">{metricas.professoresPresencial}</span>
                    </div>
                    <BarraProgresso valor={metricas.professoresPresencial} total={metricas.totalProfessores} cor="bg-teal-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Disciplinas */}
              <Card className="border-border hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40">
                      <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Cadastradas</Badge>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{metricas.totalDisciplinas}</div>
                  <div className="text-sm text-muted-foreground mb-3">Disciplinas</div>
                  <button onClick={() => setViewAtual("gestao")}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 mt-2">
                    Ver gestão escolar <ChevronRight className="w-3 h-3" />
                  </button>
                </CardContent>
              </Card>

              {/* Ativos vs Inativos */}
              <Card className="border-border hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40">
                      <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                      {pctAtivos}% ativos
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{metricas.totalAlunos}</div>
                  <div className="text-sm text-muted-foreground mb-3">Status dos alunos</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Ativos</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{metricas.alunosAtivos}</span>
                    </div>
                    <BarraProgresso valor={metricas.alunosAtivos} total={metricas.totalAlunos} cor="bg-emerald-500" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Inativos</span>
                      <span className="font-medium text-red-500">{metricas.alunosInativos}</span>
                    </div>
                    <BarraProgresso valor={metricas.alunosInativos} total={metricas.totalAlunos} cor="bg-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Linha: Usuários online + Menu ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Usuários online agora */}
              <Card className="border-border lg:col-span-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <PulseOnline />
                      Online agora
                    </h3>
                    <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0">
                      {metricas.onlineAgora} usuário{metricas.onlineAgora !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {metricas.usuariosOnline.length === 0 ? (
                    <div className="text-center py-6">
                      <Wifi className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                      <p className="text-xs text-muted-foreground">Nenhum usuário online</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {metricas.usuariosOnline.map(u => (
                        <div key={u.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {u.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{u.nome}</p>
                            <p className="text-xs text-muted-foreground">{tipoLabel[u.tipo] || u.tipo}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resumo rápido abaixo */}
                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {metricas.novosUltimas24h}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">Cadastros<br/>24h</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {pctAtivos}%
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">Alunos<br/>ativos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Menu de módulos — 2/3 da largura */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> Módulos do Sistema
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {menuItems.map(item => (
                    <button key={item.id} onClick={() => setViewAtual(item.id)}
                      className={`group relative flex flex-col items-start gap-2 p-4 rounded-xl border border-border 
                        bg-gradient-to-br ${item.gradient}
                        hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                        transition-all duration-200 text-left cursor-pointer`}>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${item.iconBg} text-white shadow-sm`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardAdministrador;