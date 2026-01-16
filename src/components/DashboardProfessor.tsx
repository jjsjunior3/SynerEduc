// src/components/DashboardProfessor.tsx
import { useState, useEffect, useCallback, Suspense } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";

// Icons
import {
  Bell,
  Calendar, // Usado para Agenda
  ArrowLeft,
  FileEdit,
  BarChart3,
  Users,
  Loader2,
  BookOpen,
  Video,
  LogOut,
  Clock,
  Megaphone,
  AlertCircle,
  Info,
  ChevronRight,
  Inbox,
  Book,
  ChevronDown // ✅ CORREÇÃO: Importação do ChevronDown
} from "lucide-react";

// Sub-components
import { Notificacoes } from "./Notificacoes";
import { PerfilUsuario } from "./PerfilUsuario";
import HorarioEscolar from "./HorarioEscolar";
import { AgendamentoAulasVivo } from "./AgendamentoAulasVivo";
import { BoletimProfessor } from "./BoletimProfessor";
import { DisciplinaProfessor } from "./DisciplinaProfessor";
import { AgendaProfessor } from "./AgendaProfessor";
import { AtividadesRecebidas } from "./AtividadesRecebidas";
import { SchoolHeader } from "./SchoolHeader";

type ViewType =
  | "dashboard"
  | "atividades"
  | "boletim"
  | "agenda"
  | "horarios"
  | "aulas-vivo"
  | "disciplina";

interface SerieTurmaResumo {
  id: string; // chave única (turma ou série)
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
  lido?: boolean;
}

export function DashboardProfessor() {
  const { usuario, logout } = useAuth();

  // ---------- Navegação ----------
  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");

  // ---------- Dados ----------
  const [turmas, setTurmas] = useState<SerieTurmaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);

  // ---------- Seleções ----------
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<any>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [serieHorario, setSerieHorario] = useState<string>("");
  const [visualizarHorario, setVisualizarHorario] = useState(false);

  // ---------- UI ----------
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);

  // ---------- Carregamento inicial ----------
  useEffect(() => {
    if (usuario) {
      carregarTurmasProfessor();
      carregarComunicados();
      fetchNotificacoesCount();

      // Realtime para notificações
      const channel = supabase
        .channel("public:notificacoes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificacoes",
            filter: `user_id=eq.${usuario.id}`,
          },
          () => fetchNotificacoesCount()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [usuario]);

  // ---------- Funções auxiliares ----------
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
        .select(`*, autor:users(nome, tipo)`)
        .or(`publico_alvo.eq.todos,publico_alvo.eq.todos-professores`)
        .order("criado_em", { ascending: false })
        .limit(10);
      if (error) throw error;

      const formatados = data.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        conteudo: c.conteudo,
        importante: c.importante,
        criado_em: c.criado_em,
        remetente: c.autor?.nome || "Coordenação",
        cargo: c.autor?.tipo || "Administração",
        lido: false,
      }));
      setComunicados(formatados);
    } catch (e) {
      console.error("Erro ao carregar comunicados:", e);
    }
  };

  const carregarTurmasProfessor = async () => {
    try {
      setCarregando(true);
      const { data: vinculos, error } = await supabase
        .from("professores_disciplinas_series")
        .select(`
          id,
          turmas ( id, nome, ativa ),
          series ( id, nome ),
          disciplinas ( id, nome, cor )
        `)
        .eq("professor_id", usuario?.id);
      if (error) throw error;

      const map = new Map<string, SerieTurmaResumo>();
      vinculos?.forEach((v: any) => {
        const turma = v.turmas;
        const serie = v.series;
        const disc = v.disciplinas;

        if (!disc) return;

        const key = turma ? `turma_${turma.id}` : `serie_${serie?.id}`;
        const nomeSerie = serie?.nome || "Série não definida";
        const nomeTurma = turma?.nome || "Única";
        const serieId = serie?.id || "";

        if (!map.has(key)) {
          map.set(key, {
            id: key,
            nomeTurma,
            nomeSerie,
            serieId,
            ativa: turma?.ativa ?? true,
            cor: disc.cor || "bg-blue-500",
            disciplinas: [],
          });
        }

        const grupo = map.get(key)!;
        if (!grupo.disciplinas.find((d) => d.id === disc.id)) {
          grupo.disciplinas.push({
            id: disc.id,
            nome: disc.nome,
            cor: disc.cor || "bg-blue-500",
          });
        }
      });

      setTurmas(Array.from(map.values()));
    } catch (e) {
      console.error("Erro ao carregar turmas:", e);
    } finally {
      setCarregando(false);
    }
  };

  const abrirDisciplina = (disciplina: any, turma: SerieTurmaResumo) => {
    // ✅ DEBUG: Adicionado console.log para verificar se a função é chamada
    console.log("Abrindo disciplina:", disciplina, "para turma:", turma);
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
    setVisualizarHorario(false); // Resetar visualização de horário
    setSerieHorario(""); // Resetar série do horário
  };

  // ----------------- Layout Base para o Painel do Professor -----------------
  // Este é o wrapper principal que garante o layout consistente
  const renderLayout = (content: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Fixo do Painel do Professor - Largura Total para o fundo, conteúdo limitado */}
      <header className="bg-white border-b border-gray-200 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <SchoolHeader subtitle="Painel do Professor" />

            <div className="flex items-center gap-4">
              {/* Botão Voltar ao Site - Condicional */}
              {/* onBackToSite não está nas props do DashboardProfessor, então o botão será sempre visível e voltará para a raiz */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/")} // Adicionado para voltar ao site
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao site
              </Button>

              {/* Botão Notificações */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
              >
                <Bell className="w-5 h-5" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </Button>

              {/* Botão Perfil do Usuário */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarPerfil(true)}
                className="flex items-center gap-2"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario?.avatar} />
                  <AvatarFallback>
                    {usuario?.nome?.slice(0, 2).toUpperCase() || "PR"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Notificações Dropdown */}
          {mostrarNotificacoes && (
            <div className="absolute right-4 top-16 w-80 z-50">
              <Notificacoes
                onClose={() => setMostrarNotificacoes(false)}
                onUpdate={fetchNotificacoesCount}
              />
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo Principal - O main agora só define o padding vertical e flex-1 */}
      <main className="flex-1 py-8">
        {/* Suspense para componentes lazy-loaded */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Carregando módulo...</span>
            </div>
          }
        >
          {/* ✅ CORREÇÃO DE LAYOUT: Este div agora aplica a largura máxima e o padding lateral */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {content}
          </div>
        </Suspense>
      </main>

      {/* Perfil - Renderizar como Dialog com props corretas */}
      <PerfilUsuario
        open={mostrarPerfil}
        onOpenChange={setMostrarPerfil}
        usuario={usuario}
        logout={logout}
      />
    </div>
  );

  // ----------------- Renderização das Views -----------------
  if (viewAtual === "disciplina" && disciplinaSelecionada) {
    return renderLayout(
      <DisciplinaProfessor
        disciplina={disciplinaSelecionada}
        serie={disciplinaSelecionada.serie}
        turma={disciplinaSelecionada.turma} // Manter turma aqui, pois DisciplinaProfessor espera
        onVoltar={handleVoltarParaDashboard} // Usar handleVoltarParaDashboard para consistência
      />
    );
  }

  if (viewAtual === "atividades") {
    return renderLayout(
      <AtividadesRecebidas onVoltar={handleVoltarParaDashboard} />
    );
  }

  if (viewAtual === "boletim") {
    return renderLayout(
      // Conteúdo do BoletimProfessor ou seleção de turma
      <div className="p-6 h-full"> {/* Adicionado p-6 aqui para o conteúdo interno */}
        <Button
          variant="ghost"
          onClick={() => {
            setViewAtual("dashboard");
            setTurmaSelecionada(null);
          }}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </Button>
        {!turmaSelecionada ? (
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-green-600 mb-2" />
                <h2 className="text-xl font-bold">Lançar Notas</h2>
                <p className="text-gray-500 text-sm">
                  Selecione a turma para acessar o diário.
                </p>
              </div>
              <Select
                onValueChange={(val) =>
                  setTurmaSelecionada(turmas.find((t) => t.id === val) || null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma..." />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nomeSerie} - {t.nomeTurma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : (
          <BoletimProfessor
            disciplina={{
              id: turmaSelecionada.disciplinas[0]?.id,
              nome: turmaSelecionada.disciplinas[0]?.nome,
            }}
            serie={{
              id: turmaSelecionada.serieId,
              nome: turmaSelecionada.nomeSerie,
            }}
            onVoltar={() => {
              setViewAtual("dashboard");
              setTurmaSelecionada(null);
            }}
          />
        )}
      </div>
    );
  }

  if (viewAtual === "agenda") {
    return renderLayout(
      // Conteúdo da AgendaProfessor ou seleção de turma/disciplina
      <div className="p-6 h-full"> {/* Adicionado p-6 aqui para o conteúdo interno */}
        <Button
          variant="ghost"
          onClick={() => {
            setViewAtual("dashboard");
            setTurmaSelecionada(null);
            setDisciplinaSelecionada(null);
          }}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </Button>
        {!turmaSelecionada ? (
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto text-blue-600 mb-2" />{" "}
                {/* Ícone atualizado */}
                <h2 className="text-xl font-bold">Agenda de Atividades Diárias</h2>
                <p className="text-gray-500 text-sm">
                  Selecione a turma para gerenciar a agenda.
                </p>
              </div>
              <Select
                onValueChange={(val) =>
                  setTurmaSelecionada(turmas.find((t) => t.id === val) || null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma..." />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nomeSerie} - {t.nomeTurma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : !disciplinaSelecionada ? (
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto text-blue-600 mb-2" />
                <h2 className="text-xl font-bold">Selecione a Disciplina</h2>
                <p className="text-gray-500 text-sm">
                  Para qual disciplina você deseja gerenciar a agenda?
                </p>
              </div>
              <Select
                onValueChange={(val) =>
                  setDisciplinaSelecionada(
                    turmaSelecionada.disciplinas.find((d: any) => d.id === val) ||
                      null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina..." />
                </SelectTrigger>
                <SelectContent>
                  {turmaSelecionada.disciplinas.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : (
          <AgendaProfessor
            disciplina={disciplinaSelecionada}
            serie={{
              id: turmaSelecionada.serieId,
              nome: turmaSelecionada.nomeSerie,
            }}
            turma={{ id: turmaSelecionada.id, nome: turmaSelecionada.nomeTurma }}
            onVoltar={() => {
              setDisciplinaSelecionada(null);
            }} // Volta para seleção de disciplina
          />
        )}
      </div>
    );
  }

  if (viewAtual === "horarios") {
    return renderLayout(
      <div className="p-6 h-full"> {/* Adicionado p-6 aqui para o conteúdo interno */}
        <Button
          variant="ghost"
          onClick={() => setViewAtual("dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        {!visualizarHorario ? (
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto text-orange-600 mb-2" />
                <h2 className="text-xl font-bold">Horário Escolar</h2>
              </div>
              <Select value={serieHorario} onValueChange={setSerieHorario}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(turmas.map((t) => t.nomeSerie))).map(
                    (serie) => (
                      <SelectItem key={serie} value={serie}>
                        {serie}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={!serieHorario}
                onClick={() => setVisualizarHorario(true)}
              >
                Visualizar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Horário: {serieHorario}</h2>
              <Button variant="outline" onClick={() => setVisualizarHorario(false)}>
                Trocar Série
              </Button>
            </div>
            <HorarioEscolar turmaSelecionada={serieHorario} />
          </div>
        )}
      </div>
    );
  }

  if (viewAtual === "aulas-vivo") {
    return renderLayout(
      <div className="p-6 h-full"> {/* Adicionado p-6 aqui para o conteúdo interno */}
        <Button
          variant="ghost"
          onClick={() => {
            setViewAtual("dashboard");
            setTurmaSelecionada(null);
          }}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        {!turmaSelecionada ? (
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <Video className="w-12 h-12 mx-auto text-rose-500 mb-2" />
                <h2 className="text-xl font-bold">Aulas ao Vivo</h2>
              </div>
              <Select
                onValueChange={(val) =>
                  setTurmaSelecionada(turmas.find((t) => t.id === val) || null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma..." />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nomeSerie} - {t.nomeTurma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : (
          <AgendamentoAulasVivo
            turmaId={turmaSelecionada.id}
            nomeTurma={`${turmaSelecionada.nomeSerie} - ${turmaSelecionada.nomeTurma}`}
          />
        )}
      </div>
    );
  }

  // --- DASHBOARD PRINCIPAL ---
  return renderLayout(
    // ✅ CORREÇÃO DE LAYOUT: Adicionado p-6 diretamente ao conteúdo do dashboard
    <div className="p-6 h-full">
      {/* Boas-vindas (Sem botão solto) */}
      <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg p-8 md:p-10 overflow-visible pointer-events-none">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            Olá, {usuario?.nome?.split(" ")[0]}! 👋
          </h1>
          <p className="text-blue-100 text-lg max-w-xl">
            Bem-vindo ao seu painel de controle.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>
      </section>
      {/* Acesso Rápido */}
      <section className="mt-8">
        {" "}
        {/* Adicionado mt-8 para espaçamento */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {" "}
          {/* Alterado para 4 colunas */}
          {/* Botão Lançar Notas (Boletim) */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
            onClick={() => setViewAtual("boletim")}
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Lançar Notas</span>
          </Button>
          {/* Botão Atividades Recebidas */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
            onClick={() => setViewAtual("atividades")}
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Inbox className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Atividades Recebidas
            </span>
          </Button>
          {/* Botão Meu Horário */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
            onClick={() => setViewAtual("horarios")}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Meu Horário</span>
          </Button>
          {/* ✅ NOVO Botão Agenda */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
            onClick={() => setViewAtual("agenda")}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Agenda</span>
          </Button>
        </div>
      </section>
      {/* Minhas Turmas e Comunicados */}
      <section className="mt-8">
        {" "}
        {/* Adicionado mt-8 para espaçamento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Minhas Turmas */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="border-b bg-gray-50/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Minhas Turmas
                  </CardTitle>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {turmas.length} Turmas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {carregando ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : turmas.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Book className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Nenhuma turma vinculada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {turmas.map((turma) => (
                      <Card
                        key={turma.id}
                        className="border hover:border-blue-300 transition-all hover:shadow-md"
                      >
                        <CardHeader className="pb-3 bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <CardTitle className="text-base font-bold">
                                {turma.nomeSerie}
                              </CardTitle>
                              <p className="text-sm text-gray-500">Turma {turma.nomeTurma}</p>
                            </div>
                            <Badge variant="outline">
                              {turma.disciplinas.length} disc.
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            {turma.disciplinas.map((disciplina) => (
                              <button
                                key={disciplina.id}
                                onClick={() => abrirDisciplina(disciplina, turma)}
                                className="w-full flex items-center justify-between p-2 rounded border hover:bg-blue-50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-6 h-6 ${disciplina.cor} rounded flex items-center justify-center text-white text-xs`}
                                  >
                                    <BookOpen className="w-3 h-3" />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {disciplina.nome}
                                  </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Comunicados */}
          <div className="space-y-6">
            <Card className="h-[600px] flex flex-col border-none shadow-md bg-white">
              <CardHeader className="flex-shrink-0 border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                  <Megaphone className="w-5 h-5 text-orange-500" />
                  Comunicados
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {comunicados.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum comunicado.
                    </div>
                  ) : (
                    comunicados.map((comunicado) => (
                      <div
                        key={comunicado.id}
                        className={`p-4 rounded-xl border ${
                          comunicado.importante
                            ? "bg-red-50 border-red-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="mt-1">
                            {comunicado.importante ? (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Info className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">
                              {comunicado.titulo}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                              {comunicado.conteudo}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                              <span>{comunicado.remetente}</span>
                              <span>•</span>
                              <span>
                                {new Date(comunicado.criado_em).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

// Única exportação default no final do arquivo
export default DashboardProfessor;
