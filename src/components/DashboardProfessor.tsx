// src/components/DashboardProfessor.tsx
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

import {
  Bell, Calendar, ArrowLeft, FileEdit, BarChart3, Users,
  Loader2, BookOpen, Video, LogOut, Clock, Megaphone,
  AlertCircle, Info, ChevronRight, Inbox, Book, User,
  Sun, Moon, Paperclip, CheckCircle2,
} from "lucide-react";

import { Notificacoes } from "./Notificacoes";
import { PerfilUsuario } from "./PerfilUsuario";
import HorarioEscolar from "./HorarioEscolar";
import { AgendamentoAulasVivo } from "./AgendamentoAulasVivo";
import { BoletimProfessor } from "./BoletimProfessor";
import { DisciplinaProfessor } from "./DisciplinaProfessor";
import { AgendaProfessor } from "./AgendaProfessor";
import { AtividadesRecebidas } from "./AtividadesRecebidas";
import { SchoolHeader } from "./SchoolHeader";
import ComunicadosPage from "./ComunicadosPage";
import { useSegmento } from '../hooks/useSegmento';


type ViewType = "dashboard" | "atividades" | "boletim" | "agenda" | "horarios" | "aulas-vivo" | "disciplina" | "comunicados";

interface SerieTurmaResumo {
  id: string;
  nomeTurma: string;
  nomeSerie: string;
  serieId: string;
  ativa: boolean;
  cor: string;
  disciplinas: { id: string; nome: string; cor: string }[];
}

interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  importante: boolean;
  criado_em: string;
  remetente?: string;
  cargo?: string;
  imagem_url?: string | null;
}

function formatarData(dataISO: string) {
  try {
    return new Date(dataISO + 'T12:00:00').toLocaleDateString("pt-BR");
  } catch {
    return dataISO;
  }
}

export function DashboardProfessor() {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [turmas, setTurmas] = useState<SerieTurmaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [totalAtividadesEnviadas, setTotalAtividadesEnviadas] = useState(0);
  const [totalPendentesCorrecao, setTotalPendentesCorrecao] = useState(0);

  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<any>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [serieHorario, setSerieHorario] = useState<string>("");
  const [visualizarHorario, setVisualizarHorario] = useState(false);

  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const { segmento } = useSegmento();
  const avatarRef = useRef<HTMLButtonElement>(null);

  const getDropdownPos = () => {
    if (!avatarRef.current) return { top: 68, right: 16 };
    const rect = avatarRef.current.getBoundingClientRect();
    return { top: rect.bottom + 8, right: window.innerWidth - rect.right };
  };

  useEffect(() => {
    if (usuario) {
      carregarTurmasProfessor();
      carregarComunicados();
      carregarContadoresAtividades();
      fetchNotificacoesCount();

      const channel = supabase
        .channel("public:notificacoes")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notificacoes",
          filter: `user_id=eq.${usuario.id}`,
        }, () => fetchNotificacoesCount())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [usuario, segmento]);

  const fetchNotificacoesCount = async () => {
    if (!usuario) return;
    const { count } = await supabase
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", usuario.id)
      .eq("lida", false);
    setNotificacoesNaoLidas(count || 0);
  };

  const carregarComunicados = async () => {
  try {
    const { data, error } = await supabase
      .from("comunicados")
      .select(`*, autor:users!comunicados_autor_id_fkey(nome, tipo)`)
      .in('segmento', [segmento, 'todos'])   // ← filtro por segmento
      .order("criado_em", { ascending: false })
      .limit(20);
    if (error) throw error;

    const filtrados = (data || []).filter((c: any) => {
      const publico = (c.publico_alvo || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      if (publico.length === 0) return true;
      return publico.includes("todos") || publico.includes("todos-professores") || publico.includes("professores");
    });

    setComunicados(filtrados.map((c: any) => ({
      id: c.id, titulo: c.titulo, conteudo: c.conteudo,
      importante: c.importante, criado_em: c.criado_em,
      remetente: c.autor?.nome || "Coordenação",
      cargo: c.autor?.tipo || "Administração",
      imagem_url: c.imagem_url || null,
    })));
  } catch { /* silencioso */ }
};

  const carregarContadoresAtividades = async () => {
    if (!usuario?.id) return;
    try {
      // Total de atividades enviadas pelo professor
      const { count: enviadas } = await supabase
        .from("atividades")
        .select("*", { count: "exact", head: true })
        .eq("professor_id", usuario.id);
      setTotalAtividadesEnviadas(enviadas || 0);

      // Atividades pendentes de correção:
      // Buscar IDs das atividades do professor, depois contar entregas com status 'entregue'
      const { data: atividadesProf } = await supabase
        .from("atividades")
        .select("id")
        .eq("professor_id", usuario.id);

      if (atividadesProf && atividadesProf.length > 0) {
        const ids = atividadesProf.map((a: any) => a.id);
        const { count: pendentes } = await supabase
          .from("atividades_alunos")
          .select("*", { count: "exact", head: true })
          .in("atividade_id", ids)
          .eq("status", "entregue");
        setTotalPendentesCorrecao(pendentes || 0);
      } else {
        setTotalPendentesCorrecao(0);
      }
    } catch {
      setTotalAtividadesEnviadas(0);
      setTotalPendentesCorrecao(0);
    }
  };

  const carregarTurmasProfessor = async () => {
    try {
      setCarregando(true);
      const { data: vinculos, error } = await supabase
        .from("professores_disciplinas_series")
        .select(`id, turmas(id, nome, ativa), series(id, nome), disciplinas(id, nome, cor)`)
        .eq("professor_id", usuario?.id);
      if (error) throw error;

      const map = new Map<string, SerieTurmaResumo>();
      vinculos?.forEach((v: any) => {
        const turma = v.turmas;
        const serie = v.series;
        const disc = v.disciplinas;
        if (!disc) return;

        const key = turma ? `turma_${turma.id}` : `serie_${serie?.id}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            nomeTurma: turma?.nome || "Única",
            nomeSerie: serie?.nome || "Série não definida",
            serieId: serie?.id || "",
            ativa: turma?.ativa ?? true,
            cor: disc.cor || "bg-blue-500",
            disciplinas: [],
          });
        }
        const grupo = map.get(key)!;
        if (!grupo.disciplinas.find((d) => d.id === disc.id)) {
          grupo.disciplinas.push({ id: disc.id, nome: disc.nome, cor: disc.cor || "bg-blue-500" });
        }
      });
      setTurmas(Array.from(map.values()));
    } catch { /* silencioso */ } finally {
      setCarregando(false);
    }
  };

  const abrirDisciplina = (disciplina: any, turma: SerieTurmaResumo) => {
    setDisciplinaSelecionada({
      ...disciplina,
      turma: { id: turma.id, nome: turma.nomeTurma },
      serie: { id: turma.serieId, nome: turma.nomeSerie },
    });
    setTurmaSelecionada(turma);
    setViewAtual("disciplina");
  };

  const handleVoltarParaDashboard = () => {
    setViewAtual("dashboard");
    setDisciplinaSelecionada(null);
    setTurmaSelecionada(null);
    setVisualizarHorario(false);
    setSerieHorario("");
  };

  // Contadores derivados são calculados nas queries agora

  // ── Header padrão ──
  const pos = getDropdownPos();

  const Header = () => (
    <header className="bg-card border-b border-border py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <SchoolHeader subtitle="Painel do Professor" />

          <div className="flex items-center gap-3">
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}>
                <Bell className="w-5 h-5 text-muted-foreground" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
                )}
              </Button>
              {mostrarNotificacoes && (
                <div className="absolute right-0 top-12 w-80 z-50">
                  <Notificacoes onClose={() => setMostrarNotificacoes(false)} onUpdate={fetchNotificacoesCount} />
                </div>
              )}
            </div>

            <button
              ref={avatarRef}
              onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
              className="focus:outline-none"
            >
              <Avatar className="w-9 h-9 border-2 border-border cursor-pointer">
                <AvatarImage src={usuario?.avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  {usuario?.nome?.slice(0, 2).toUpperCase() || "PR"}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>

      {mostrarMenuUsuario && createPortal(
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setMostrarMenuUsuario(false)} />
          <div
            className="fixed w-48 rounded-xl border border-border shadow-2xl z-[99999] overflow-hidden"
            style={{ backgroundColor: 'var(--card)', top: pos.top, right: pos.right }}
          >
            <button
              onClick={() => { setMostrarMenuUsuario(false); setMostrarPerfil(true); }}
              className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" /> Meu Perfil
            </button>
            <div className="h-px bg-border mx-3" />
            <button
              onClick={() => { setMostrarMenuUsuario(false); logout(); }}
              className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </>,
        document.body
      )}
    </header>
  );

  // ── Barra azul padrão ──
  const BarraAzul = ({ titulo, subtitulo, onVoltar }: { titulo: string; subtitulo?: string; onVoltar: () => void }) => (
    <div className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onVoltar} className="text-white hover:bg-white/20">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div>
          <h1 className="font-semibold text-lg leading-tight">{titulo}</h1>
          {subtitulo && <p className="text-sm opacity-90">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  // ── Seletor de turma + disciplina ──
  const SeletorTurma = ({ icone, titulo, descricao }: { icone: React.ReactNode; titulo: string; descricao: string }) => (
    <Card className="max-w-md mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          {icone}
          <h2 className="text-xl font-bold text-foreground mt-2">{titulo}</h2>
          <p className="text-muted-foreground text-sm">{descricao}</p>
        </div>
        <Select onValueChange={(val) => setTurmaSelecionada(turmas.find((t) => t.id === val) || null)}>
          <SelectTrigger><SelectValue placeholder="Selecione a turma..." /></SelectTrigger>
          <SelectContent>
            {turmas.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.nomeSerie} - {t.nomeTurma}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );

  const SeletorDisciplina = ({ titulo, descricao }: { titulo: string; descricao: string }) => (
    <Card className="max-w-md mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto text-blue-600 mb-2" />
          <h2 className="text-xl font-bold text-foreground">{titulo}</h2>
          <p className="text-muted-foreground text-sm">{descricao}</p>
        </div>
        <Select onValueChange={(val) =>
          setDisciplinaSelecionada(turmaSelecionada.disciplinas.find((d: any) => d.id === val) || null)
        }>
          <SelectTrigger><SelectValue placeholder="Selecione a disciplina..." /></SelectTrigger>
          <SelectContent>
            {turmaSelecionada.disciplinas.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );

  // ── Views ──

  if (viewAtual === "disciplina" && disciplinaSelecionada) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo={disciplinaSelecionada.nome} subtitulo={disciplinaSelecionada.serie?.nome} onVoltar={handleVoltarParaDashboard} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DisciplinaProfessor
            disciplina={disciplinaSelecionada}
            serie={disciplinaSelecionada.serie}
            turma={disciplinaSelecionada.turma}
            onVoltar={handleVoltarParaDashboard}
          />
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  if (viewAtual === "atividades") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo="Atividades Recebidas" onVoltar={handleVoltarParaDashboard} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AtividadesRecebidas onVoltar={handleVoltarParaDashboard} />
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  if (viewAtual === "boletim") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo="Lançar Notas" onVoltar={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); setDisciplinaSelecionada(null); }} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!turmaSelecionada && (
            <SeletorTurma
              icone={<BarChart3 className="w-12 h-12 mx-auto text-green-600 mb-2" />}
              titulo="Lançar Notas"
              descricao="Selecione a turma para acessar o diário."
            />
          )}
          {turmaSelecionada && !disciplinaSelecionada && (
            <SeletorDisciplina titulo="Selecione a Disciplina" descricao="Para qual disciplina deseja lançar as notas?" />
          )}
          {turmaSelecionada && disciplinaSelecionada && (
            <BoletimProfessor
              disciplina={{ id: disciplinaSelecionada.id, nome: disciplinaSelecionada.nome }}
              serie={{ id: turmaSelecionada.serieId, nome: turmaSelecionada.nomeSerie }}
            />
          )}
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  if (viewAtual === "agenda") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo="Agenda Diária" onVoltar={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); setDisciplinaSelecionada(null); }} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!turmaSelecionada && (
            <SeletorTurma
              icone={<Calendar className="w-12 h-12 mx-auto text-blue-600 mb-2" />}
              titulo="Agenda de Atividades Diárias"
              descricao="Selecione a turma para gerenciar a agenda."
            />
          )}
          {turmaSelecionada && !disciplinaSelecionada && (
            <SeletorDisciplina titulo="Selecione a Disciplina" descricao="Para qual disciplina deseja gerenciar a agenda?" />
          )}
          {turmaSelecionada && disciplinaSelecionada && (
            <AgendaProfessor
              disciplina={disciplinaSelecionada}
              serie={{ id: turmaSelecionada.serieId, nome: turmaSelecionada.nomeSerie }}
              turma={{ id: turmaSelecionada.id, nome: turmaSelecionada.nomeTurma }}
              onVoltar={() => setDisciplinaSelecionada(null)}
            />
          )}
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  if (viewAtual === "horarios") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo="Grade Horária" onVoltar={() => setViewAtual("dashboard")} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!visualizarHorario ? (
            <Card className="max-w-md mx-auto mt-10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto text-orange-600 mb-2" />
                  <h2 className="text-xl font-bold text-foreground">Horário Escolar</h2>
                  <p className="text-muted-foreground text-sm">Selecione a série para visualizar</p>
                </div>
                <Select value={serieHorario} onValueChange={setSerieHorario}>
                  <SelectTrigger><SelectValue placeholder="Selecione a série..." /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(turmas.map((t) => t.nomeSerie))).map((serie) => (
                      <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" disabled={!serieHorario} onClick={() => setVisualizarHorario(true)}>
                  Visualizar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">Horário: {serieHorario}</h2>
                <Button variant="outline" onClick={() => setVisualizarHorario(false)}>Trocar Série</Button>
              </div>
              <HorarioEscolar turmaSelecionada={serieHorario} />
            </div>
          )}
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  if (viewAtual === "aulas-vivo") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo="Aulas ao Vivo" onVoltar={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); }} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!turmaSelecionada ? (
            <SeletorTurma
              icone={<Video className="w-12 h-12 mx-auto text-rose-500 mb-2" />}
              titulo="Aulas ao Vivo"
              descricao="Selecione a turma para agendar ou iniciar uma aula."
            />
          ) : (
            <AgendamentoAulasVivo
              turmaId={turmaSelecionada.id}
              nomeTurma={`${turmaSelecionada.nomeSerie} - ${turmaSelecionada.nomeTurma}`}
            />
          )}
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  if (viewAtual === "comunicados") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo="Comunicados" subtitulo="Avisos da escola" onVoltar={handleVoltarParaDashboard} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ComunicadosPage onVoltar={handleVoltarParaDashboard} />
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  // ── DASHBOARD PRINCIPAL ──
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Banner */}
        <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg p-8 md:p-10 overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Olá, {usuario?.nome?.split(" ")[0]}! 👋</h1>
            <p className="text-blue-100 text-lg max-w-xl">Bem-vindo ao seu painel de controle.</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        </section>

        {/* Cards de resumo */}
        {!carregando && (
          <section className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 flex items-center gap-3 border border-blue-200 dark:border-blue-800" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}>
                <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground hidden sm:block">Atividades Enviadas</p>                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalAtividadesEnviadas}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 flex items-center gap-3 border border-amber-200 dark:border-amber-800" style={{ backgroundColor: 'rgba(217,119,6,0.1)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(217,119,6,0.2)' }}>
                <Inbox className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground hidden sm:block">Pendentes de Correção</p>                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{totalPendentesCorrecao}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 flex items-center gap-3 border border-purple-200 dark:border-purple-800" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(124,58,237,0.2)' }}>
                <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground hidden sm:block">Comunicados</p>                
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{comunicados.length}</p>
              </div>
            </div>
          </section>
        )}

        {/* Acesso Rápido */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { view: "boletim" as ViewType, icon: <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />, label: "Lançar Notas", iconBg: "bg-green-100 dark:bg-green-900/30" },
              { view: "atividades" as ViewType, icon: <Inbox className="w-5 h-5 text-orange-600 dark:text-orange-400" />, label: "Atividades Recebidas", iconBg: "bg-orange-100 dark:bg-orange-900/30" },
              { view: "horarios" as ViewType, icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />, label: "Meu Horário", iconBg: "bg-blue-100 dark:bg-blue-900/30" },
              { view: "agenda" as ViewType, icon: <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />, label: "Agenda", iconBg: "bg-purple-100 dark:bg-purple-900/30" },
              { view: "comunicados" as ViewType, icon: <Megaphone className="w-5 h-5 text-rose-600 dark:text-rose-400" />, label: "Comunicados", iconBg: "bg-rose-100 dark:bg-rose-900/30" },
            ].map((item) => (
              <Button
                key={item.view}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 bg-card border-border hover:bg-accent transition-all shadow-sm"
                onClick={() => setViewAtual(item.view)}
              >
                <div className={`w-10 h-10 ${item.iconBg} rounded-full flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* Turmas + Comunicados */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Minhas Turmas */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Minhas Turmas
                  </CardTitle>
                  <Badge variant="secondary">{turmas.length} Turmas</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {carregando ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : turmas.length === 0 ? (
                  <div className="text-center py-12 bg-muted rounded-lg border-2 border-dashed border-border">
                    <Book className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
                    <p className="text-muted-foreground">Nenhuma turma vinculada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {turmas.map((turma) => (
                      <Card key={turma.id} className="border border-border hover:border-blue-400 transition-all hover:shadow-md">
                        <CardHeader className="pb-3 bg-muted/40 border-b border-border rounded-t-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base font-bold text-foreground">{turma.nomeSerie}</CardTitle>
                              <p className="text-sm text-muted-foreground">Turma {turma.nomeTurma}</p>
                            </div>
                            <Badge variant="secondary">{turma.disciplinas.length} disc.</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2">
                          {turma.disciplinas.map((disciplina) => (
                            <button
                              key={disciplina.id}
                              onClick={() => abrirDisciplina(disciplina, turma)}
                              className="w-full flex items-center justify-between p-2 rounded-md border border-border hover:bg-accent hover:border-blue-400 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 ${disciplina.cor} rounded flex items-center justify-center text-white`}>
                                  <BookOpen className="w-3 h-3" />
                                </div>
                                <span className="text-sm font-medium text-foreground">{disciplina.nome}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Comunicados (sidebar compacta) ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-muted-foreground" /> Comunicados
              </h3>
              {comunicados.length > 0 && (
                <button
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  onClick={() => setViewAtual("comunicados")}
                >
                  Ver todos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {comunicados.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Tudo em dia!</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nenhum comunicado novo por enquanto.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-2 border border-border divide-y divide-border">
                {comunicados.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-3.5 cursor-pointer p-2 hover:bg-accent/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onClick={() => setViewAtual("comunicados")}
                  >
                    <div className="flex gap-2.5">
                      <div className={`w-2 h-2 p-2 rounded-full mt-1.5 flex-shrink-0 ${
                        c.importante ? "bg-red-500" : "bg-blue-500"
                      }`} />
                      <div className="flex-1 px-2 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm pb-2 font-semibold text-foreground truncate">{c.titulo}</p>
                          {c.imagem_url && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                              <Paperclip className="w-2.5 h-2.5" />
                              Anexo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-1">
                          {c.conteudo}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70">
                          {c.remetente} · {formatarData(c.criado_em)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {comunicados.length > 5 && (
                  <div className="px-4 py-3 text-center">
                    <button
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={() => setViewAtual("comunicados")}
                    >
                      Ver todos os {comunicados.length} comunicados
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
    </div>
  );
}

export default DashboardProfessor;