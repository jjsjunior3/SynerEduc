// src/components/DashboardAdministrador.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import {
  MessageSquare, BarChart3, UserPlus, School, FileText,
  Book, Users, Link2, Sun, Moon, TrendingUp, Activity,
  GraduationCap, BookOpen, Wifi, Clock, UserCheck, UserX,
  ChevronRight, Zap, Shield, Brain,
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
import FrequenciaProfessores from "./FrequenciaProfessores";
import ComunicadosPage from "./ComunicadosPage";
import { GestaoVinculos } from "./GestaoVinculos";
import { MonitoramentoIA } from "./MonitoramentoIA";
import { supabase } from "../supabase/supabaseClient";
// Agentes de IA: Administrador não utiliza Sofia nem Tia Maria José
import { useTheme } from "../contexts/ThemeContext";
// ✅ Importa as funções do novo hook baseado em sessoes_ativas
import { contarOnline, listarOnline } from "../hooks/usePresence";

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
  totalAlunos: number;
  totalProfessores: number;
  totalDisciplinas: number;
  totalTurmas: number;
  alunosEAD: number;
  alunosPresencial: number;
  professoresEAD: number;
  professoresPresencial: number;
  alunosAtivos: number;
  alunosInativos: number;
  novosUltimas24h: number;
  onlineAgora: number;
  usuariosOnline: { id: string; nome: string; tipo: string }[];
}

type ViewType =
  | "dashboard" | "cadastrar-usuario" | "gestao" | "relatorios"
  | "admin-usuarios" | "gestao-conteudo" | "comunicados"
  | "gestao-vinculos" | "frequencia-professores" | "monitoramento-ia";

const tipoLabel: Record<string, string> = {
  aluno: "Aluno", professor: "Professor", coordenador: "Coordenador",
  administrador: "Admin", professor_conteudista: "Conteudista",
  gestor_geral: "Gestor", secretaria: "Secretaria", financeiro: "Financeiro",
  admin_presencial: "Admin Presencial",
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

export function DashboardAdministrador({
  onBackToSite, usuario, logout,
}: DashboardAdministradorProps) {
  const { theme, toggleTheme } = useTheme();
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [viewAtual, setViewAtual]         = useState<ViewType>("dashboard");
  const [carregando, setCarregando]       = useState(true);
  const [horaAtual, setHoraAtual]         = useState(new Date());

  const [metricas, setMetricas] = useState<Metricas>({
    totalAlunos: 0, totalProfessores: 0, totalDisciplinas: 0, totalTurmas: 0,
    alunosEAD: 0, alunosPresencial: 0, professoresEAD: 0, professoresPresencial: 0,
    alunosAtivos: 0, alunosInativos: 0, novosUltimas24h: 0,
    onlineAgora: 0, usuariosOnline: [],
  });

  // ── Relógio ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setHoraAtual(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Carregar dados ao montar e ao voltar para o dashboard ──────────────────
  useEffect(() => {
    if (viewAtual === "dashboard") carregarMetricas();
  }, [viewAtual]);

  // ── Polling de online a cada 30s enquanto no dashboard ────────────────────
  useEffect(() => {
    if (viewAtual !== "dashboard") return;

    const atualizarOnline = async () => {
      try {
        const [count, users] = await Promise.all([contarOnline(), listarOnline()]);
        setMetricas(prev => ({
          ...prev,
          onlineAgora:    count,
          usuariosOnline: users.map((u: any) => ({
            id:   u.usuario_id,
            nome: u.nome  || "Usuário",
            tipo: u.tipo  || "aluno",
          })),
        }));
      } catch {
        // Falha silenciosa — não afeta métricas principais
      }
    };

    atualizarOnline(); // imediato
    const interval = setInterval(atualizarOnline, 30_000);
    return () => clearInterval(interval);
  }, [viewAtual]);

  // ── Métricas principais (banco) ────────────────────────────────────────────
  async function carregarMetricas() {
    setCarregando(true);
    try {
      const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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
        onlineCount,
        onlineUsers,
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
        supabase.from("users").select("*", { count: "exact", head: true }).gte("criado_em", h24),
        // ✅ Online via sessoes_ativas (sem WebSocket)
        contarOnline(),
        listarOnline(),
      ]);

      setMetricas({
        totalAlunos:           totalAlunos           ?? 0,
        totalProfessores:      totalProfessores       ?? 0,
        totalDisciplinas:      totalDisciplinas       ?? 0,
        totalTurmas:           totalTurmas            ?? 0,
        alunosEAD:             alunosEAD              ?? 0,
        alunosPresencial:      alunosPresencial       ?? 0,
        professoresEAD:        professoresEAD         ?? 0,
        professoresPresencial: professoresPresencial  ?? 0,
        alunosAtivos:          alunosAtivos           ?? 0,
        alunosInativos:        alunosInativos         ?? 0,
        novosUltimas24h:       novosUltimas24h        ?? 0,
        onlineAgora:    onlineCount,
        usuariosOnline: (onlineUsers as any[]).map(u => ({
          id:   u.usuario_id,
          nome: u.nome || "Usuário",
          tipo: u.tipo || "aluno",
        })),
      });
    } catch (err) {
      console.error("[DashboardAdmin] Erro ao carregar métricas:", err);
    } finally {
      setCarregando(false);
    }
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  const menuItems: Array<{
    id: ViewType; title: string; description: string;
    icon: React.ReactNode; gradient: string; iconBg: string;
  }> = [
    { id: "cadastrar-usuario",      title: "Cadastrar Usuário",       description: "Adicionar novos usuários",      icon: <UserPlus    className="w-5 h-5" />, gradient: "from-blue-500/10   to-blue-600/5   dark:from-blue-500/20   dark:to-blue-900/10",   iconBg: "bg-blue-500" },
    { id: "admin-usuarios",         title: "Gerenciar Usuários",      description: "Editar e gerenciar usuários",   icon: <Users       className="w-5 h-5" />, gradient: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-900/10", iconBg: "bg-emerald-500" },
    { id: "gestao",                 title: "Gestão Escolar",          description: "Disciplinas e séries",          icon: <School      className="w-5 h-5" />, gradient: "from-violet-500/10  to-violet-600/5  dark:from-violet-500/20  dark:to-violet-900/10",  iconBg: "bg-violet-500" },
    { id: "gestao-conteudo",        title: "Gestão de Conteúdo",      description: "Materiais e biblioteca",        icon: <Book        className="w-5 h-5" />, gradient: "from-teal-500/10    to-teal-600/5    dark:from-teal-500/20    dark:to-teal-900/10",    iconBg: "bg-teal-500" },
    { id: "relatorios",             title: "Relatórios",              description: "Gerar relatórios",              icon: <FileText    className="w-5 h-5" />, gradient: "from-orange-500/10  to-orange-600/5  dark:from-orange-500/20  dark:to-orange-900/10",  iconBg: "bg-orange-500" },
    { id: "comunicados",            title: "Comunicados",             description: "Enviar comunicados",            icon: <MessageSquare className="w-5 h-5" />, gradient: "from-cyan-500/10  to-cyan-600/5    dark:from-cyan-500/20    dark:to-cyan-900/10",    iconBg: "bg-cyan-500" },
    { id: "gestao-vinculos",        title: "Gestão de Vínculos",      description: "Professores e disciplinas",     icon: <Link2       className="w-5 h-5" />, gradient: "from-slate-500/10   to-slate-600/5   dark:from-slate-500/20   dark:to-slate-900/10",   iconBg: "bg-slate-500" },
    { id: "frequencia-professores", title: "Frequência Professores",  description: "Controle diário de presença",   icon: <UserCheck   className="w-5 h-5" />, gradient: "from-rose-500/10    to-rose-600/5    dark:from-rose-500/20    dark:to-rose-900/10",    iconBg: "bg-rose-500" },
    { id: "monitoramento-ia",       title: "Monitoramento de IA",    description: "Tokens, latência e custos",      icon: <Brain       className="w-5 h-5" />, gradient: "from-violet-500/10  to-violet-600/5  dark:from-violet-500/20  dark:to-violet-900/10",  iconBg: "bg-violet-600" },
  ];

  const saudacao = () => {
    const h = horaAtual.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const pctAtivos = metricas.totalAlunos > 0
    ? Math.round((metricas.alunosAtivos / metricas.totalAlunos) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="bg-card border-b border-border py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoEscola} alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-semibold text-foreground text-sm leading-tight">Colégio Conexão Maranhense</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Painel Administrativo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            <Button variant="ghost" size="sm" className="flex items-center gap-2 px-2" onClick={() => setMostrarPerfil(true)}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={usuario?.avatar} alt={usuario?.nome} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {usuario?.nome ? usuario.nome.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "A"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground hidden sm:block">{usuario?.nome || "Administrador"}</span>
            </Button>
          </div>
        </div>
      </header>

      {mostrarPerfil && (
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      )}

      {/* Conteúdo */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">

        {viewAtual !== "dashboard" ? (
          <>
            {viewAtual === "cadastrar-usuario"      && <CadastrarUsuarioNovo    onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "gestao"                 && <GestaoEscola            onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "relatorios"             && <RelatoriosAdmin         onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "admin-usuarios"         && <GerenciadorUsuarios     onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "gestao-conteudo"        && <GestaoConteudoPDF       onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "comunicados"            && <ComunicadosPage         onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "gestao-vinculos"        && <GestaoVinculos          onVoltar={() => setViewAtual("dashboard")} />}
            {viewAtual === "frequencia-professores" && <FrequenciaProfessores   onVoltar={() => setViewAtual("dashboard")} usuario={usuario} />}
            {viewAtual === "monitoramento-ia"       && <MonitoramentoIA         onVoltar={() => setViewAtual("dashboard")} />}
          </>
        ) : (
          <div className="space-y-6">

            {/* Saudação */}
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

            {/* Faixa de alertas rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { count: metricas.onlineAgora,    label: "Online agora",    icon: <Wifi        className="w-4 h-4 text-green-600   dark:text-green-400"   />, border: "border-green-200   dark:border-green-800",   bg: "bg-green-50   dark:bg-green-900/20",   iconBg: "bg-green-500/20",   text: "text-green-700   dark:text-green-400"   },
                { count: metricas.novosUltimas24h, label: "Cadastros 24h",  icon: <Clock       className="w-4 h-4 text-blue-600    dark:text-blue-400"    />, border: "border-blue-200    dark:border-blue-800",    bg: "bg-blue-50    dark:bg-blue-900/20",    iconBg: "bg-blue-500/20",    text: "text-blue-700    dark:text-blue-400"    },
                { count: metricas.alunosAtivos,    label: "Alunos ativos",  icon: <UserCheck   className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-900/20", iconBg: "bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400" },
                { count: metricas.alunosInativos,  label: "Alunos inativos",icon: <UserX       className="w-4 h-4 text-red-600    dark:text-red-400"     />, border: "border-red-200    dark:border-red-800",    bg: "bg-red-50    dark:bg-red-900/20",    iconBg: "bg-red-500/20",    text: "text-red-700    dark:text-red-400"    },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border ${item.border} ${item.bg}`}>
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <div>
                    <div className={`text-lg font-bold leading-none ${item.text}`}>{item.count}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Alunos */}
              <Card className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                      <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Badge variant="secondary" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" /> Total</Badge>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{metricas.totalAlunos}</div>
                  <div className="text-sm text-muted-foreground mb-3">Alunos matriculados</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">EAD</span><span className="font-medium text-blue-600 dark:text-blue-400">{metricas.alunosEAD}</span></div>
                    <BarraProgresso valor={metricas.alunosEAD} total={metricas.totalAlunos} cor="bg-blue-500" />
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Presencial</span><span className="font-medium text-indigo-600 dark:text-indigo-400">{metricas.alunosPresencial}</span></div>
                    <BarraProgresso valor={metricas.alunosPresencial} total={metricas.totalAlunos} cor="bg-indigo-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Professores */}
              <Card className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                      <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <Badge variant="secondary" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" /> Total</Badge>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{metricas.totalProfessores}</div>
                  <div className="text-sm text-muted-foreground mb-3">Professores</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">EAD</span><span className="font-medium text-emerald-600 dark:text-emerald-400">{metricas.professoresEAD}</span></div>
                    <BarraProgresso valor={metricas.professoresEAD} total={metricas.totalProfessores} cor="bg-emerald-500" />
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Presencial</span><span className="font-medium text-teal-600 dark:text-teal-400">{metricas.professoresPresencial}</span></div>
                    <BarraProgresso valor={metricas.professoresPresencial} total={metricas.totalProfessores} cor="bg-teal-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Disciplinas */}
              <Card className="border-border hover:shadow-md transition-shadow">
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

              {/* Status alunos */}
              <Card className="border-border hover:shadow-md transition-shadow">
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
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Ativos</span><span className="font-medium text-emerald-600 dark:text-emerald-400">{metricas.alunosAtivos}</span></div>
                    <BarraProgresso valor={metricas.alunosAtivos} total={metricas.totalAlunos} cor="bg-emerald-500" />
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Inativos</span><span className="font-medium text-red-500">{metricas.alunosInativos}</span></div>
                    <BarraProgresso valor={metricas.alunosInativos} total={metricas.totalAlunos} cor="bg-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Online + Módulos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Card Online */}
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
                        <div key={u.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
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

                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base font-bold text-blue-600 dark:text-blue-400">{metricas.novosUltimas24h}</div>
                      <div className="text-xs text-muted-foreground leading-tight">Cadastros<br/>24h</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{pctAtivos}%</div>
                      <div className="text-xs text-muted-foreground leading-tight">Alunos<br/>ativos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Módulos */}
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
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight hidden sm:block">{item.description}</p>
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