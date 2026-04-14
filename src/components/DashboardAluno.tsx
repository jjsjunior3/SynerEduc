// src/components/DashboardAluno.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

import {
  Bell,
  BarChart3,
  Calendar,
  Clock,
  BookOpen,
  ChevronRight,
  Megaphone,
  AlertCircle,
  Info,
  Loader2,
  LogOut,
  User,
  ArrowLeft,
} from "lucide-react";

import { PerfilUsuario } from "./PerfilUsuario";
import { Notificacoes } from "./Notificacoes";
import { AgendaAluno } from "./AgendaAluno";
import HorarioEscolar from "./HorarioEscolar";
import Boletim from "./Boletim";
import { DisciplinaPage } from "./DisciplinaPage";
import { SchoolHeader } from "./SchoolHeader";

type ViewType =
  | "dashboard"
  | "atividades"
  | "boletim"
  | "agenda"
  | "horarios"
  | "disciplina";

interface DisciplinaData {
  id: string;
  nome: string;
  cor: string;
}

interface TurmaData {
  id: string;
  nome: string;
  serieId: string;
  serieNome: string;
  totalAlunos: number;
  disciplinas: DisciplinaData[];
}

interface ComunicadoData {
  id: string;
  titulo: string;
  conteudo: string;
  autorNome: string;
  dataPublicacao: string;
  tipo: "urgente" | "informativo" | "importante";
  lido: boolean;
  publico_alvo_raw: string;
}

function formatarData(dataISO: string) {
  try {
    return new Date(dataISO).toLocaleDateString("pt-BR");
  } catch {
    return dataISO;
  }
}

// ============================================================
// Header padrão
// ============================================================
function HeaderPadrao({
  usuario,
  turma,
  notificacoesNaoLidas,
  mostrarMenuUsuario,
  setMostrarMenuUsuario,
  setMostrarNotificacoes,
  setMostrarPerfil,
  logout,
}: any) {
  const avatarRef = useRef<HTMLButtonElement>(null);

  const getDropdownPos = () => {
    if (!avatarRef.current) return { top: 68, right: 16 };
    const rect = avatarRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    };
  };

  const pos = getDropdownPos();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <SchoolHeader subtitle="Painel do Aluno" />

        <div className="flex items-center gap-4">
          {/* Sino */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMostrarNotificacoes(true)}
              className="hover:bg-accent"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {notificacoesNaoLidas > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
              )}
            </Button>
          </div>

          {/* Avatar + dropdown */}
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground">{usuario?.nome}</p>
              <p className="text-xs text-muted-foreground">{turma?.serieNome || "Aluno"}</p>
            </div>

            <button
              ref={avatarRef}
              onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
              className="focus:outline-none"
            >
              <Avatar className="h-9 w-9 border-2 border-border cursor-pointer">
                <AvatarImage src={(usuario as any)?.avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  {usuario?.nome?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown via portal — fora de qualquer stacking context */}
      {mostrarMenuUsuario && createPortal(
        <>
          {/* Overlay invisível fecha ao clicar fora */}
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setMostrarMenuUsuario(false)}
          />

          {/* Menu alinhado ao avatar */}
          <div
            className="fixed w-48 rounded-xl border border-border shadow-2xl z-[99999] overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              top: pos.top,
              right: pos.right,
            }}
          >
            <button
              onClick={() => {
                setMostrarMenuUsuario(false);
                setMostrarPerfil(true);
              }}
              className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              Meu Perfil
            </button>

            <div className="h-px bg-border mx-3" />

            <button
              onClick={() => {
                setMostrarMenuUsuario(false);
                logout();
              }}
              className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </>,
        document.body
      )}
    </header>
  );
}

// ============================================================
// Barra azul padrão
// ============================================================
function BarraAzul({
  titulo,
  subtitulo,
  onVoltar,
}: {
  titulo: string;
  subtitulo?: string;
  onVoltar: () => void;
}) {
  return (
    <div className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onVoltar}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="font-semibold text-lg leading-tight">{titulo}</h1>
          {subtitulo && <p className="text-sm opacity-90">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Dashboard principal
// ============================================================
export default function DashboardAluno() {
  const { usuario, logout } = useAuth();

  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);

  const [turma, setTurma] = useState<TurmaData | null>(null);
  const [comunicados, setComunicados] = useState<ComunicadoData[]>([]);

  const [loadingTurma, setLoadingTurma] = useState(true);
  const [loadingComunicados, setLoadingComunicados] = useState(true);

  const [erroTurma, setErroTurma] = useState<string | null>(null);
  const [erroComunicados, setErroComunicados] = useState<string | null>(null);

  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<DisciplinaData | null>(null);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);

  const handleVoltar = useCallback(() => setViewAtual("dashboard"), []);

  const headerProps = {
    usuario, turma, notificacoesNaoLidas,
    mostrarMenuUsuario, setMostrarMenuUsuario,
    setMostrarNotificacoes, setMostrarPerfil, logout,
  };

  // ---- Carregar turma ----
  const carregarTurma = useCallback(async () => {
    if (!usuario?.id) return;
    setLoadingTurma(true);
    setErroTurma(null);
    try {
      const { data: aluno, error: alunoError } = await supabase
        .from("users").select("serie").eq("id", usuario.id).single();
      if (alunoError) throw alunoError;
      if (!aluno?.serie) { setErroTurma("Sua série não está definida no sistema."); return; }

      const { data: serieRow, error: serieError } = await supabase
        .from("series").select("id, nome").eq("nome", aluno.serie).single();
      if (serieError) throw serieError;
      if (!serieRow) { setErroTurma(`Série "${aluno.serie}" não encontrada.`); return; }

      const { data: turmasResult, error: turmasError } = await supabase
        .from("turmas").select("id, nome, total_alunos").eq("serie_id", serieRow.id);
      if (turmasError) throw turmasError;
      if (!turmasResult || turmasResult.length === 0) {
        setErroTurma(`Nenhuma turma encontrada para "${serieRow.nome}".`); return;
      }

      const { data: vinculos, error: vinculosError } = await supabase
        .from("professores_disciplinas_series")
        .select("disciplinas(id, nome, cor)")
        .eq("serie_id", serieRow.id);
      if (vinculosError) throw vinculosError;

      const disciplinas: DisciplinaData[] = vinculos?.flatMap((v: any) =>
        v.disciplinas ? [{ id: v.disciplinas.id, nome: v.disciplinas.nome, cor: v.disciplinas.cor || "bg-blue-500" }] : []
      ) || [];

      const disciplinasUnicas: DisciplinaData[] = [];
      const setIds = new Set<string>();
      for (const d of disciplinas) {
        if (!setIds.has(d.id)) { setIds.add(d.id); disciplinasUnicas.push(d); }
      }

      setTurma({
        id: turmasResult[0].id,
        nome: turmasResult[0].nome,
        serieId: serieRow.id,
        serieNome: serieRow.nome,
        totalAlunos: turmasResult[0].total_alunos || 0,
        disciplinas: disciplinasUnicas,
      });
    } catch (e: any) {
      setErroTurma(e?.message || "Erro ao carregar informações da sua turma.");
      setTurma(null);
    } finally {
      setLoadingTurma(false);
    }
  }, [usuario?.id]);

  useEffect(() => { if (usuario?.id) carregarTurma(); }, [usuario?.id, carregarTurma]);

  // ---- Carregar comunicados ----
  const carregarComunicados = useCallback(async () => {
    if (!usuario) return;
    setLoadingComunicados(true);
    setErroComunicados(null);
    try {
      const { data, error } = await supabase
        .from("comunicados")
        .select(`id, titulo, conteudo, criado_em, publico_alvo, importante, users!comunicados_autor_id_fkey ( nome )`)
        .order("criado_em", { ascending: false })
        .limit(20);
      if (error) throw error;

      const serieNomeAluno = (usuario.serie || "").toLowerCase();
      const filtrados = data?.filter((c: any) => {
        const publico = (c.publico_alvo || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        if (publico.length === 0) return true;
        return publico.includes("todos") || publico.includes("todos-alunos") || publico.includes("alunos") || publico.includes(serieNomeAluno);
      }) || [];

      setComunicados(filtrados.map((c: any) => ({
        id: c.id, titulo: c.titulo, conteudo: c.conteudo,
        tipo: c.importante ? "urgente" : "informativo",
        dataPublicacao: c.criado_em,
        autorNome: Array.isArray(c.users) && c.users.length > 0 ? c.users[0].nome : c.users?.nome || "Coordenação",
        lido: false, publico_alvo_raw: c.publico_alvo || "",
      })));
    } catch (e: any) {
      setErroComunicados(e?.message || "Erro ao carregar comunicados.");
      setComunicados([]);
    } finally {
      setLoadingComunicados(false);
    }
  }, [usuario]);

  useEffect(() => { if (usuario) carregarComunicados(); }, [usuario, carregarComunicados]);
  useEffect(() => { setNotificacoesNaoLidas(0); }, []);

  // ============================================================
  // VIEWS SECUNDÁRIAS
  // ============================================================

  if (viewAtual === "boletim") {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo="Boletim Escolar" subtitulo={turma?.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Boletim turma={turma} usuario={usuario} />
        </main>
        {mostrarNotificacoes && <Notificacoes onClose={() => setMostrarNotificacoes(false)} />}
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  if (viewAtual === "agenda" && turma) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo="Agenda Diária" subtitulo={turma.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AgendaAluno
            serie={{ id: turma.serieId, nome: turma.serieNome }}
            turma={{ id: turma.id, nome: turma.nome }}
            disciplinasDoAluno={turma.disciplinas}
          />
        </main>
        {mostrarNotificacoes && <Notificacoes onClose={() => setMostrarNotificacoes(false)} />}
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  if (viewAtual === "horarios") {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo="Grade Horária" subtitulo={turma?.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <HorarioEscolar turmaSelecionada={turma?.serieNome || ""} />
        </main>
        {mostrarNotificacoes && <Notificacoes onClose={() => setMostrarNotificacoes(false)} />}
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  if (viewAtual === "disciplina" && disciplinaSelecionada && turma) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo={disciplinaSelecionada.nome} subtitulo={turma.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DisciplinaPage
            disciplina={disciplinaSelecionada}
            turma={turma}
            usuario={usuario}
          />
        </main>
        {mostrarNotificacoes && <Notificacoes onClose={() => setMostrarNotificacoes(false)} />}
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  // ============================================================
  // DASHBOARD PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderPadrao {...headerProps} />

      {mostrarNotificacoes && <Notificacoes onClose={() => setMostrarNotificacoes(false)} />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Banner */}
        <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg p-8 md:p-10 overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              Olá, {usuario?.nome?.split(" ")[0]}! 👋
            </h1>
            <p className="text-blue-100 text-lg max-w-xl">
              Aqui você acompanha suas aulas, atividades e notas.
            </p>
            {turma && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white/10 text-white border border-white/20">
                  {turma.serieNome}
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white border border-white/20">
                  Turma {turma.nome}
                </Badge>
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        </section>

        {/* Acesso Rápido */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { view: "boletim" as ViewType, icon: <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />, label: "Boletim", iconBg: "bg-green-100 dark:bg-green-900/30" },
              { view: "agenda" as ViewType, icon: <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />, label: "Agenda", iconBg: "bg-purple-100 dark:bg-purple-900/30" },
              { view: "horarios" as ViewType, icon: <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />, label: "Horários", iconBg: "bg-orange-100 dark:bg-orange-900/30" },
            ].map((item) => (
              <Button
                key={item.view}
                onClick={() => setViewAtual(item.view)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 bg-card border-border hover:bg-accent transition-all shadow-sm"
              >
                <div className={`w-10 h-10 ${item.iconBg} rounded-full flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* Disciplinas + Comunicados */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              Minhas Disciplinas
            </h3>

            {loadingTurma ? (
              <div className="flex items-center justify-center p-8 bg-card rounded-lg border border-border">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-muted-foreground">Carregando disciplinas...</span>
              </div>
            ) : erroTurma ? (
              <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-400 text-sm mb-1">Erro ao carregar informações</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">{erroTurma}</p>
                  <Button variant="outline" size="sm" onClick={carregarTurma}>Tentar novamente</Button>
                </div>
              </div>
            ) : !turma || turma.disciplinas.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-lg border border-border">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {!turma ? "Nenhuma turma encontrada" : "Nenhuma disciplina cadastrada"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {!turma ? "Você ainda não está vinculado a nenhuma turma." : "Não há disciplinas vinculadas à sua série."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {turma.disciplinas.map((disc) => (
                  <div
                    key={disc.id}
                    className="group cursor-pointer bg-card border border-border rounded-lg shadow-sm hover:bg-accent hover:border-blue-500/50 transition-all p-4 flex items-center justify-between"
                    onClick={() => { setDisciplinaSelecionada(disc); setViewAtual("disciplina"); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${disc.cor}`}>
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{disc.nome}</p>
                        <p className="text-xs text-muted-foreground">{turma.serieNome} — Turma {turma.nome}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comunicados */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-muted-foreground" /> Comunicados
            </h3>

            {loadingComunicados ? (
              <div className="flex items-center justify-center p-8 bg-card rounded-lg border border-border">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-muted-foreground">Carregando...</span>
              </div>
            ) : erroComunicados ? (
              <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">{erroComunicados}</p>
                <Button variant="outline" size="sm" onClick={carregarComunicados}>Tentar novamente</Button>
              </div>
            ) : comunicados.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-lg border border-border">
                <Info className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="font-semibold text-foreground text-sm">Nenhum comunicado</p>
                <p className="text-muted-foreground text-xs mt-1">Não há comunicados recentes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comunicados.map((c) => (
                  <div
                    key={c.id}
                    className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-blue-500/40 hover:bg-accent transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {c.tipo === "urgente"
                        ? <AlertCircle className="w-4 h-4 text-red-500" />
                        : <Info className="w-4 h-4 text-blue-500" />
                      }
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium ${
                          c.tipo === "urgente"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {c.tipo === "urgente" ? "Urgente" : "Informativo"}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">{c.titulo}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{c.conteudo}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{c.autorNome}</span>
                      <span>{formatarData(c.dataPublicacao)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
    </div>
  );
}