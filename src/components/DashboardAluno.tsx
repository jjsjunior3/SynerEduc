// src/components/DashboardAluno.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { ChatFlutuante } from "./ai/ChatFlutuante";

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
  Paperclip,
  CheckCircle2,
} from "lucide-react";

import { PerfilUsuario } from "./PerfilUsuario";
import { Notificacoes, useNotificacoesCount } from "./Notificacoes";
import { NotificacaoBalloon } from "./NotificacaoBalloon";
import { AgendaAluno } from "./AgendaAluno";
import HorarioEscolar from "./HorarioEscolar";
import Boletim from "./Boletim";
import { DisciplinaPage } from "./DisciplinaPage";
import { SchoolHeader } from "./SchoolHeader";
import ComunicadosPage from "./ComunicadosPage";
import { useSegmento } from '../hooks/useSegmento';

type ViewType =
  | "dashboard"
  | "atividades"
  | "boletim"
  | "agenda"
  | "horarios"
  | "disciplina"
  | "comunicados";

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
  imagem_url: string | null;
}

function formatarData(dataISO: string) {
  try {
    const d = new Date(dataISO.includes('T') ? dataISO : dataISO + 'T12:00:00');
    if (isNaN(d.getTime())) return dataISO;
    return d.toLocaleDateString("pt-BR");
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
  mostrarNotificacoes,
  setMostrarNotificacoes,
  setMostrarPerfil,
  logout,
  onNavegar,
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
    <header className="bg-card border-b border-border fixed top-0 left-0 right-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <SchoolHeader subtitle="Painel do Aluno" />

        <div className="flex items-center gap-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMostrarNotificacoes((v: boolean) => !v)}
              className="hover:bg-accent"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {notificacoesNaoLidas > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
              )}
            </Button>
            {mostrarNotificacoes && (
              <Notificacoes
                onClose={() => setMostrarNotificacoes(false)}
                onNavegar={onNavegar}
              />
            )}
          </div>

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

      {mostrarMenuUsuario && createPortal(
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setMostrarMenuUsuario(false)}
          />
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
    <div className="bg-blue-600 text-white fixed top-16 left-0 right-0 z-20">
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
  const [mediaGeral, setMediaGeral] = useState<number | null>(null);
  const [mediaTurma, setMediaTurma] = useState<number | null>(null);
  const [frequenciaPercent, setFrequenciaPercent] = useState<number | null>(null);
  const [faltas30Dias, setFaltas30Dias] = useState<number>(0);

  const [loadingTurma, setLoadingTurma] = useState(true);
  const [loadingComunicados, setLoadingComunicados] = useState(true);

  const [erroTurma, setErroTurma] = useState<string | null>(null);
  const [erroComunicados, setErroComunicados] = useState<string | null>(null);

  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<DisciplinaData | null>(null);
  const { count: notificacoesNaoLidas } = useNotificacoesCount();

  const handleVoltar = useCallback(() => setViewAtual("dashboard"), []);
  const { segmento } = useSegmento();
  const headerProps = {
    usuario, turma, notificacoesNaoLidas,
    mostrarMenuUsuario, setMostrarMenuUsuario,
    mostrarNotificacoes, setMostrarNotificacoes, setMostrarPerfil, logout,
    onNavegar: (link: string) => {
      setMostrarNotificacoes(false);
      // Formato: /aluno/disciplina/{nome}/atividades
      const matchDisciplina = link.match(/\/disciplina\/([^/]+)/);
      if (matchDisciplina && turma) {
        const nomeDisciplina = decodeURIComponent(matchDisciplina[1]);
        const disc = turma.disciplinas?.find((d: any) =>
          d.nome.toLowerCase() === nomeDisciplina.toLowerCase()
        );
        if (disc) { setDisciplinaSelecionada(disc); setViewAtual('disciplina' as any); return; }
      }
      setViewAtual(link as any);
    },
  };

  // ---- Carregar turma ----
  const carregarTurma = useCallback(async () => {
    if (!usuario?.id) return;
    setLoadingTurma(true);
    setErroTurma(null);
    try {
      // 1. Busca série E segmento do aluno juntos
      const { data: aluno, error: alunoError } = await supabase
        .from("users")
        .select("serie, segmento")
        .eq("id", usuario.id)
        .single();
      if (alunoError) throw alunoError;
      if (!aluno?.serie) { setErroTurma("Sua série não está definida no sistema."); return; }

      // 2. Busca todas as séries com aquele nome — o RLS já filtra por segmento
      const { data: seriesResult, error: serieError } = await supabase
        .from("series")
        .select("id, nome, segmento")
        .eq("nome", aluno.serie);

      if (serieError) throw serieError;
      if (!seriesResult || seriesResult.length === 0) {
        setErroTurma(`Série "${aluno.serie}" não encontrada.`); return;
      }

      // Prefere série do segmento certo → NULL → qualquer uma
      const serieRow = seriesResult.find((s: any) => s.segmento === aluno.segmento)
        ?? seriesResult.find((s: any) => s.segmento === null)
        ?? seriesResult[0];

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


  // ---- Carregar comunicados ----
  const carregarComunicados = useCallback(async () => {
    if (!usuario) return;
    setLoadingComunicados(true);
    setErroComunicados(null);
    try {
      const { data, error } = await supabase
        .from("comunicados")
        .select(`id, titulo, conteudo, criado_em, publico_alvo, importante, imagem_url, users!comunicados_autor_id_fkey ( nome )`)
        .in('segmento', [segmento, 'todos'])    // ← filtro por segmento
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
        imagem_url: c.imagem_url || null,
      })));
    } catch (e: any) {
      setErroComunicados(e?.message || "Erro ao carregar comunicados.");
      setComunicados([]);
    } finally {
      setLoadingComunicados(false);
    }
  }, [usuario, segmento]);

  // ---- Carregar indicadores do aluno (média geral + frequência) ----
  const carregarIndicadoresAluno = useCallback(async () => {
    if (!usuario?.id) return;

    // ── Média Geral: buscar todas as notas do aluno e calcular média das médias por bimestre ──
    try {
      const { data: notasData } = await supabase
        .from("notas")
        .select("media")
        .eq("user_id", usuario.id)
        .not("media", "is", null);

      if (notasData && notasData.length > 0) {
        const medias = notasData.map((n: any) => Number(n.media)).filter((m: number) => !isNaN(m));
        if (medias.length > 0) {
          const soma = medias.reduce((a: number, b: number) => a + b, 0);
          setMediaGeral(Math.round((soma / medias.length) * 10) / 10);
        }
      }

      // Média da turma via função SECURITY DEFINER
      if (usuario?.serie && usuario?.segmento) {
        const { data: mtData } = await supabase
          .rpc('get_media_turma', { p_serie: usuario.serie, p_segmento: usuario.segmento });
        if (mtData !== null && mtData !== undefined) {
          setMediaTurma(Number(mtData));
        }
      }
    } catch {
      // Falha silenciosa
    }

    // ── Frequência: buscar registros dos últimos 30 dias ──
    try {
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje);
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      const dataInicio = trintaDiasAtras.toISOString().split('T')[0];

      const { data: freqData } = await supabase
        .from("frequencia_diaria")
        .select("presente")
        .eq("aluno_id", usuario.id)
        .gte("data_aula", dataInicio);

      if (freqData && freqData.length > 0) {
        const totalRegistros = freqData.length;
        const presencas = freqData.filter((f: any) => f.presente === true).length;
        const faltasCount = totalRegistros - presencas;
        const percent = Math.round((presencas / totalRegistros) * 100);

        setFrequenciaPercent(percent);
        setFaltas30Dias(faltasCount);
      }
    } catch {
      // Falha silenciosa
    }
  }, [usuario?.id]);

  // ✅ CORRETO — todos os useEffects juntos, APÓS as definições dos useCallbacks
  useEffect(() => { if (usuario?.id) carregarTurma(); },           [usuario?.id, carregarTurma]);
  useEffect(() => { if (usuario) carregarComunicados(); },         [usuario, carregarComunicados]);
  useEffect(() => { if (usuario?.id) carregarIndicadoresAluno(); },[usuario?.id, carregarIndicadoresAluno]);

  // ---- Helpers ----
  const getCorDisciplina = (cor: string) => {
    if (cor && cor.startsWith('bg-')) return cor;
    return 'bg-blue-500';
  };

  const getMediaColor = (media: number | null) => {
    if (media === null) return { text: 'text-muted-foreground', border: 'border-gray-200 dark:border-gray-700', bg: 'rgba(100,116,139,0.1)', iconBg: 'rgba(100,116,139,0.2)' };
    if (media >= 7) return { text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', bg: 'rgba(22,163,74,0.1)', iconBg: 'rgba(22,163,74,0.2)' };
    if (media >= 5) return { text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bg: 'rgba(217,119,6,0.1)', iconBg: 'rgba(217,119,6,0.2)' };
    return { text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bg: 'rgba(220,38,38,0.1)', iconBg: 'rgba(220,38,38,0.2)' };
  };

  const getFreqColor = (freq: number | null) => {
    if (freq === null) return { text: 'text-muted-foreground', border: 'border-gray-200 dark:border-gray-700', bg: 'rgba(100,116,139,0.1)', iconBg: 'rgba(100,116,139,0.2)' };
    if (freq >= 85) return { text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', bg: 'rgba(22,163,74,0.1)', iconBg: 'rgba(22,163,74,0.2)' };
    if (freq >= 75) return { text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bg: 'rgba(217,119,6,0.1)', iconBg: 'rgba(217,119,6,0.2)' };
    return { text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bg: 'rgba(220,38,38,0.1)', iconBg: 'rgba(220,38,38,0.2)' };
  };

  const getFaltasColor = (faltas: number) => {
    if (faltas === 0) return { text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', bg: 'rgba(22,163,74,0.1)', iconBg: 'rgba(22,163,74,0.2)' };
    if (faltas <= 3) return { text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bg: 'rgba(217,119,6,0.1)', iconBg: 'rgba(217,119,6,0.2)' };
    return { text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bg: 'rgba(220,38,38,0.1)', iconBg: 'rgba(220,38,38,0.2)' };
  };

  // ============================================================
  // VIEWS SECUNDÁRIAS
  // ============================================================

  if (viewAtual === "boletim") {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo="Boletim Escolar" subtitulo={turma?.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-36">
          <Boletim turma={turma} usuario={usuario} />
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  if (viewAtual === "agenda" && turma) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo="Agenda Diária" subtitulo={turma.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-36">
          <AgendaAluno
            serie={{ id: turma.serieId, nome: turma.serieNome }}
            turma={{ id: turma.id, nome: turma.nome }}
            disciplinasDoAluno={turma.disciplinas}
          />
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  if (viewAtual === "horarios") {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo="Grade Horária" subtitulo={turma?.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-36">
          <HorarioEscolar turmaSelecionada={turma?.serieNome || ""} />
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  if (viewAtual === "disciplina" && disciplinaSelecionada && turma) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo={disciplinaSelecionada.nome} subtitulo={turma.serieNome} onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-36">
          <DisciplinaPage
            disciplina={disciplinaSelecionada}
            turma={turma}
            usuario={usuario}
          />
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      </div>
    );
  }

  if (viewAtual === "comunicados") {
    return (
      <div className="min-h-screen bg-background">
        <HeaderPadrao {...headerProps} />
        <BarraAzul titulo="Comunicados" subtitulo="Avisos da escola" onVoltar={handleVoltar} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-36">
          <ComunicadosPage onVoltar={handleVoltar} />
        </main>
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

      <NotificacaoBalloon onAbrirNotificacoes={() => setMostrarNotificacoes(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 space-y-8">

        {/* ── Header contextual ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Olá, {usuario?.nome?.split(" ").filter(Boolean)[0]}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {turma && <> · <span className="font-medium">{turma.serieNome} — Turma {turma.nome}</span></>}
            </p>
          </div>
        </div>

        {/* ── Cards de resumo ── */}
        {!loadingTurma && turma && (() => {
          const mediaColors = getMediaColor(mediaGeral);
          const freqColors = getFreqColor(frequenciaPercent);
          const faltasColors = getFaltasColor(faltas30Dias);
          return (
            <section className="grid grid-cols-3 gap-4">
              {/* Média Geral */}
              <div className={`rounded-xl p-4 flex items-center gap-3 border ${mediaColors.border}`} style={{ backgroundColor: mediaColors.bg }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: mediaColors.iconBg }}>
                  <BarChart3 className={`w-5 h-5 ${mediaColors.text}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground hidden sm:block">Média Geral</p>
                  <p className={`text-2xl font-bold ${mediaColors.text}`}>
                    {mediaGeral !== null ? mediaGeral.toFixed(1) : '—'}
                  </p>
                  {mediaTurma !== null && (
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                      Turma: <span className="font-semibold text-foreground">{mediaTurma.toFixed(1)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Frequência */}
              <div className={`rounded-xl p-4 flex items-center gap-3 border ${freqColors.border}`} style={{ backgroundColor: freqColors.bg }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: freqColors.iconBg }}>
                  <CheckCircle2 className={`w-5 h-5 ${freqColors.text}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground hidden sm:block">Frequência</p>
                  <p className={`text-2xl font-bold ${freqColors.text}`}>
                    {frequenciaPercent !== null ? `${frequenciaPercent}%` : '—'}
                  </p>
                </div>
              </div>

              {/* Faltas (30 dias) */}
              <div className={`rounded-xl p-4 flex items-center gap-3 border ${faltasColors.border}`} style={{ backgroundColor: faltasColors.bg }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: faltasColors.iconBg }}>
                  <AlertCircle className={`w-5 h-5 ${faltasColors.text}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground hidden sm:block">Faltas (30 dias)</p>
                  <p className={`text-2xl font-bold ${faltasColors.text}`}>{faltas30Dias}</p>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ── Acesso Rápido (4 botões) ── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { view: "boletim" as ViewType, icon: <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />, label: "Boletim", iconBg: "bg-green-100 dark:bg-green-900/30" },
              { view: "agenda" as ViewType, icon: <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />, label: "Agenda", iconBg: "bg-purple-100 dark:bg-purple-900/30" },
              { view: "horarios" as ViewType, icon: <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />, label: "Horários", iconBg: "bg-orange-100 dark:bg-orange-900/30" },
              { view: "comunicados" as ViewType, icon: <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />, label: "Comunicados", iconBg: "bg-blue-100 dark:bg-blue-900/30" },
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

        {/* ── Disciplinas + Comunicados ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Disciplinas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                Minhas Disciplinas
              </h3>
              {turma && (
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
                  {turma.disciplinas.length} disc.
                </span>
              )}
            </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {turma.disciplinas.map((disc) => (
                  <div
                    key={disc.id}
                    className="group cursor-pointer bg-card border border-border rounded-xl shadow-sm hover:bg-accent hover:border-blue-500/50 transition-all p-4 flex items-center justify-between"
                    onClick={() => { setDisciplinaSelecionada(disc); setViewAtual("disciplina"); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${getCorDisciplina(disc.cor)}`}>
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
              /* ── Estado vazio positivo ── */
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
              /* ── Lista compacta com dots e anexos ── */
              <div className="bg-card rounded-xl p-3 border border-border divide-y divide-border">
                {comunicados.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-3.5 p-2 cursor-pointer hover:bg-accent/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onClick={() => setViewAtual("comunicados")}
                  >
                    <div className="flex gap-2.5">
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                        c.tipo === "urgente" ? "bg-red-500" : "bg-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex px-2 items-center gap-1.5 mb-0.5">
                          <p className="text-smx p-2 font-semibold text-foreground truncate">{c.titulo}</p>
                          {c.imagem_url && (
                            <span className="inline-flex p-2 items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                              <Paperclip className="w-3 h-2.5" />
                              Anexo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-1">
                          {c.conteudo}
                        </p>
                        <p className="text-[11px] py-1 text-muted-foreground/70">
                          {c.autorNome} · {formatarData(c.dataPublicacao)}
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

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />

      {/* ── Professora Sofia — Chat flutuante ── */}
      <ChatFlutuante />
    </div>
  );
}