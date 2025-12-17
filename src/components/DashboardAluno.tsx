// src/components/DashboardAluno.tsx
/**
 * Dashboard do Aluno
 * -------------------------------------------------------------
 * Este componente é o painel principal para o aluno, exibindo:
 * - Informações do perfil.
 * - Acesso rápido a funcionalidades como Atividades Recebidas, Boletim, Agenda e Horários.
 * - Lista de turmas e disciplinas.
 * - Toggle para Modo Escuro (REMOVIDO, pois não há ThemeContext separado).
 *
 * O Fórum será acessado dentro da tela de Disciplina.
 *
 * CORREÇÕES:
 * - Ajuste na função carregarTurmasEDisciplinasDoAluno para buscar serieId real.
 * - Ajuste na função handleDisciplinaClick para passar props disciplina, serie e turma
 *   no formato correto para DisciplinaPage.
 * - Ajuste na passagem de props para os componentes de acesso rápido.
 * - REMOVIDAS todas as referências a ThemeContext e Dark Mode.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext"; // ✅ Caminho corrigido para AuthContext

/* UI components */
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

/* Ícones */
import {
  Bell,
  User,
  LogOut,
  ClipboardList,
  FileText, // Ícone para Atividades Recebidas
  BarChart3,
  Video,
  Calendar, // Ícone para Agenda
  Clock,
  BookOpen,
  Users,
  ChevronRight,
  Megaphone,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  // Sun, // REMOVIDO
  // Moon, // REMOVIDO
  Book,
} from "lucide-react";

/* Sub‑componentes que o painel abre */
import { Notificacoes } from "./Notificacoes"; // Se houver um Notificacoes para aluno
import { PerfilUsuario } from "./PerfilUsuario"; // Se houver um PerfilUsuario para aluno
import HorarioEscolar from "./HorarioEscolar"; // Componente de Horário (pode ser compartilhado)
import Boletim from "./Boletim"; // ✅ Boletim.tsx para aluno
import { AtividadesAluno } from "./AtividadesAluno";
import { AgendaAluno } from "./AgendaAluno"; // ✅ NOVO: Componente para Agenda do Aluno
import { DisciplinaPage } from "./DisciplinaPage"; // ✅ NOVO: Componente para Disciplina do Aluno

/* Logo e fallback de imagem */
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logoEscola from "/logo-colegio-conexao.png";

/* ============================================================= */
/* ====================== TIPOS DE DADOS ====================== */
interface DisciplinaData {
  id: string;
  nome: string;
  cor: string;
}

interface TurmaData {
  id: string; // ID da turma (UUID)
  nome: string; // nome da turma (ex.: "A", "B")
  serieId: string; // ID real da série (UUID)
  serieNome: string; // nome da série (ex.: "1ª Série")
  totalAlunos: number;
  disciplinas: DisciplinaData[];
}

interface ComunicadoData {
  id: string;
  titulo: string;
  conteudo: string;
  autorNome: string;
  dataPublicacao: string;
  tipo: "urgente" | "importante" | "informativo";
  lido: boolean;
  publico_alvo_raw: string;
}

/* ============================================================= */

type ViewType =
  | "dashboard"
  | "atividades" // Atividades Recebidas
  | "boletim"
  | "agenda" // Nova view para Agenda
  | "horarios"
  | "disciplina"; // Para quando o aluno clica em uma disciplina específica

export default function DashboardAluno() {
  const { usuario, logout } = useAuth();
  // const { theme, toggleTheme } = useTheme(); // REMOVIDO

  /* ------------------- ESTADO DE TELA ------------------- */
  const [telaAtual, setTelaAtual] = useState<ViewType>("dashboard");

  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<{
    id: string;
    nome: string;
    cor?: string;
    turma: { id: string; nome: string };
    serie: { id: string; nome: string };
    totalAlunos: number;
  } | null>(null);

  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);

  /* ------------------- DADOS ------------------- */
  const [turmasDoAluno, setTurmasDoAluno] = useState<TurmaData[]>([]);
  const [comunicadosDoAluno, setComunicadosDoAluno] = useState<ComunicadoData[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingComunicados, setLoadingComunicados] = useState(true);
  const [erroTurmas, setErroTurmas] = useState<string | null>(null);
  const [erroComunicados, setErroComunicados] = useState<string | null>(null);

  /* ============================================================= */
  /* ==================== 1️⃣ CARREGAR TURMAS E DISCIPLINAS DO ALUNO ==================== */
  const carregarTurmasEDisciplinasDoAluno = useCallback(async (alunoId: string) => {
    if (!alunoId) return;
    setLoadingTurmas(true);
    setErroTurmas(null);
    try {
      // Primeiro, obter a série e turma_id do aluno
      const { data: alunoData, error: alunoError } = await supabase
        .from("users")
        .select("serie, turma_id")
        .eq("id", alunoId)
        .single();

      if (alunoError) throw alunoError;
      if (!alunoData || !alunoData.turma_id) {
        setErroTurmas("Aluno não vinculado a uma turma.");
        setLoadingTurmas(false);
        return;
      }

      const alunoSerieNome = alunoData.serie;
      const alunoTurmaId = alunoData.turma_id;

      // Buscar informações da turma e da série
      const { data: turmaInfo, error: turmaInfoError } = await supabase
        .from("turmas")
        .select(`
          id,
          nome,
          series(id, nome)
        `)
        .eq("id", alunoTurmaId)
        .single();

      if (turmaInfoError) throw turmaInfoError;
      if (!turmaInfo) {
        setErroTurmas("Informações da turma do aluno não encontradas.");
        setLoadingTurmas(false);
        return;
      }

      const serieRealId = (turmaInfo.series as { id: string })?.id;
      const serieRealNome = (turmaInfo.series as { nome: string })?.nome;

      // Agora, buscar as disciplinas vinculadas a essa turma e série
      const { data: vinculos, error: vinculosError } = await supabase
        .from("professores_disciplinas_series") // Esta tabela vincula disciplinas a séries/turmas
        .select(`
          disciplinas ( id, nome, cor )
        `)
        .eq("turma_id", alunoTurmaId)
        .eq("serie_id", serieRealId); // Filtra também pelo ID real da série

      if (vinculosError) throw vinculosError;

      const turmaDoAluno: TurmaData = {
        id: alunoTurmaId,
        nome: turmaInfo.nome,
        serieId: serieRealId,
        serieNome: serieRealNome,
        totalAlunos: 0, // Será preenchido abaixo
        disciplinas: [],
      };

      // Contar total de alunos na turma
      const { count: totalAlunos, error: countError } = await supabase
        .from("users")
        .select("id", { count: "exact" })
        .eq("tipo", "aluno")
        .eq("turma_id", alunoTurmaId);

      if (countError) console.error("Erro ao contar alunos:", countError);
      turmaDoAluno.totalAlunos = totalAlunos || 0;

      if (vinculos) {
        for (const v of vinculos) {
          const disc = v.disciplinas;
          if (disc && !turmaDoAluno.disciplinas.find(d => d.id === disc.id)) {
            turmaDoAluno.disciplinas.push({
              id: disc.id,
              nome: disc.nome,
              cor: disc.cor || gerarCorAleatoria(),
            });
          }
        }
      }

      setTurmasDoAluno([turmaDoAluno]); // O aluno só tem uma turma principal
    } catch (err: any) {
      console.error("Erro ao carregar turmas e disciplinas do aluno:", err);
      setErroTurmas(err.message || "Erro ao carregar turmas e disciplinas.");
    } finally {
      setLoadingTurmas(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario?.id) {
      carregarTurmasEDisciplinasDoAluno(usuario.id);
    }
  }, [usuario?.id, carregarTurmasEDisciplinasDoAluno]);

  const gerarCorAleatoria = () => {
    const cores = [
      "bg-blue-500", "bg-purple-500", "bg-green-500",
      "bg-red-500", "bg-yellow-500", "bg-indigo-500",
    ];
    return cores[Math.floor(Math.random() * cores.length)];
  };

  /* ============================================================= */
  /* ==================== 2️⃣ CARREGAR COMUNICADOS ==================== */
  useEffect(() => {
    if (usuario?.id) {
      carregarComunicados();
    }
  }, [usuario?.id, turmasDoAluno]);

  async function carregarComunicados() {
    setLoadingComunicados(true);
    setErroComunicados(null);
    try {
      const { data, error } = await supabase
        .from("comunicados")
        .select(`
          id,
          titulo,
          conteudo,
          autor_id,
          publico_alvo,
          importante,
          criado_em,
          users (nome)
        `)
        .order("criado_em", { ascending: false });

      if (error) throw error;

      const comunicadosMapeados: ComunicadoData[] = data.map((c: any) => ({
        id: c.id,
        titulo: c.titulo,
        conteudo: c.conteudo,
        autorNome: (c.users as { nome: string })?.nome || "Desconhecido",
        dataPublicacao: c.criado_em,
        tipo: c.importante ? "urgente" : "informativo",
        lido: false,
        publico_alvo_raw: c.publico_alvo,
      }));

      const comunicadosFiltrados = comunicadosMapeados.filter(comunicado => {
        const publicoAlvoArray = comunicado.publico_alvo_raw?.split(',').map((s: string) => s.trim().toLowerCase()) || [];
        const alunoSerieNome = turmasDoAluno[0]?.serieNome?.toLowerCase();

        return (
          publicoAlvoArray.includes('todos') ||
          publicoAlvoArray.includes('alunos') ||
          (alunoSerieNome && publicoAlvoArray.includes(alunoSerieNome))
        );
      });

      setComunicadosDoAluno(comunicadosFiltrados);
    } catch (err: any) {
      console.error("Erro ao carregar comunicados:", err);
      setErroComunicados(err.message || "Erro ao carregar comunicados.");
    } finally {
      setLoadingComunicados(false);
    }
  }

  const formatarData = (dataString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dataString).toLocaleDateString("pt-BR", options);
  };

  /* ============================================================= */
  /* ==================== FUNÇÕES DE NAVEGAÇÃO ==================== */
  const handleDisciplinaClick = (disciplina: DisciplinaData, turma: TurmaData) => {
    setDisciplinaSelecionada({
      id: disciplina.id,
      nome: disciplina.nome,
      cor: disciplina.cor,
      turma: { id: turma.id, nome: turma.nome },
      serie: { id: turma.serieId, nome: turma.serieNome },
      totalAlunos: turma.totalAlunos,
    });
    setTelaAtual("disciplina");
  };

  const handleVoltar = () => {
    setTelaAtual("dashboard");
    setDisciplinaSelecionada(null);
  };

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
  };

  /* ============================================================= */
  /* ==================== RENDERIZAÇÃO CONDICIONAL DE TELAS ==================== */
  const alunoTurmaPrincipal = turmasDoAluno.length > 0 ? turmasDoAluno[0] : null;

  if (telaAtual === "disciplina" && disciplinaSelecionada) {
    return (
      <DisciplinaPage
        onVoltar={handleVoltar}
        disciplina={disciplinaSelecionada}
        serie={disciplinaSelecionada.serie}
        turma={disciplinaSelecionada.turma}
      />
    );
  }

  if (telaAtual === "atividades" && alunoTurmaPrincipal) {
    return (
      <AtividadesAluno
        onVoltar={handleVoltar}
        disciplina={null}
        serie={{ id: alunoTurmaPrincipal.serieId, nome: alunoTurmaPrincipal.serieNome }}
        turma={{ id: alunoTurmaPrincipal.id, nome: alunoTurmaPrincipal.nome }}
      />
    );
  }

  if (telaAtual === "boletim" && alunoTurmaPrincipal) {
    return (
      <Boletim
        onVoltar={handleVoltar}
        disciplina={null}
        serie={{ id: alunoTurmaPrincipal.serieId, nome: alunoTurmaPrincipal.serieNome }}
        turma={{ id: alunoTurmaPrincipal.id, nome: alunoTurmaPrincipal.nome }}
      />
    );
  }

  if (telaAtual === "agenda" && alunoTurmaPrincipal) {
    return (
      <AgendaAluno
        onVoltar={handleVoltar}
        disciplina={null}
        serie={{ id: alunoTurmaPrincipal.serieId, nome: alunoTurmaPrincipal.serieNome }}
        turma={{ id: alunoTurmaPrincipal.id, nome: alunoTurmaPrincipal.nome }}
      />
    );
  }

  if (telaAtual === "horarios" && alunoTurmaPrincipal) {
    return (
      <HorarioEscolar
        onVoltar={handleVoltar}
        disciplina={null}
        serie={{ id: alunoTurmaPrincipal.serieId, nome: alunoTurmaPrincipal.serieNome }}
        turma={{ id: alunoTurmaPrincipal.id, nome: alunoTurmaPrincipal.nome }}
      />
    );
  }

  /* ============================================================= */
  /* ==================== RENDERIZAÇÃO DO DASHBOARD PRINCIPAL ==================== */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300"> {/* REMOVIDO dark: classes */}
      <div className="flex flex-col">
        {/* Header Principal */}
        <header className="bg-white shadow-sm p-6 border-b"> {/* REMOVIDO dark: classes */}
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <ImageWithFallback
                src={logoEscola}
                fallbackSrc="/logo-colegio-conexao.png"
                alt="Logo da Escola"
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-blue-600">AVA Aluno</h1> {/* REMOVIDO dark: classes */}
            </div>

            <div className="flex items-center gap-4">
              {/* Botão de Notificações */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => console.log("Abrir Notificações")}
              >
                <Bell className="w-6 h-6 text-gray-600" /> {/* REMOVIDO dark: classes */}
                {comunicadosDoAluno.filter(c => !c.lido).length > 0 && (
                  <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500"></span>
                )}
              </Button>

              {/* Botão de Toggle de Tema (Dark/Light Mode) - REMOVIDO */}
              {/* <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-gray-600 dark:text-gray-300"
              >
                {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </Button> */}

              {/* Menu do Usuário */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
                >
                  <Avatar className="h-9 w-9 border-2 border-blue-500">
                    <AvatarImage src={usuario?.avatar || "https://github.com/shadcn.png"} /> {/* ✅ Usando usuario.avatar */}
                    <AvatarFallback className="bg-blue-100 text-blue-600"> {/* REMOVIDO dark: classes */}
                      {usuario?.nome ? usuario.nome.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-700 hidden md:inline"> {/* REMOVIDO dark: classes */}
                    {usuario?.nome || "Aluno"}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${mostrarMenuUsuario ? 'rotate-90' : ''}`} /> {/* REMOVIDO dark: classes */}
                </Button>
                {mostrarMenuUsuario && (
                  <Card className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-10"> {/* REMOVIDO dark: classes */}
                    <CardContent className="p-2">
                      <Button variant="ghost" className="w-full justify-start text-gray-800 hover:bg-gray-100"> {/* REMOVIDO dark: classes */}
                        <User className="mr-2 h-4 w-4" /> Perfil
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={handleLogout}> {/* REMOVIDO dark: classes */}
                        <LogOut className="mr-2 h-4 w-4" /> Sair
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal do Dashboard */}
        <main className="flex-1 p-6 bg-gray-50"> {/* REMOVIDO dark: classes */}
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Boas-vindas e Resumo */}
            <section className="bg-white p-6 rounded-lg shadow-sm"> {/* REMOVIDO dark: classes */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2"> {/* REMOVIDO dark: classes */}
                Olá, {usuario?.nome?.split(' ')[0] || "Aluno"}!
              </h2>
              <p className="text-gray-600"> {/* REMOVIDO dark: classes */}
                Bem-vindo ao seu painel. Aqui você encontra tudo sobre suas atividades, notas e horários.
              </p>
            </section>

            {/* ---------- Acesso Rápido (DashboardAluno) ---------- */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"> {/* REMOVIDO dark: classes */}
                <BookOpen className="w-5 h-5 text-gray-400" /> Acesso Rápido {/* REMOVIDO dark: classes */}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1️⃣ Atividades Recebidas (novo rótulo) */}
                <Button
                  onClick={() => setTelaAtual("atividades")}
                  variant="outline"
                  className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-blue-50 border-blue-100 shadow-sm hover:shadow-md transition-all group bg-white" // REMOVIDO dark: classes
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"> {/* REMOVIDO dark: classes */}
                    <FileText className="w-6 h-6 text-blue-600" /> {/* REMOVIDO dark: classes */}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Atividades Recebidas</span> {/* REMOVIDO dark: classes */}
                </Button>

                {/* 2️⃣ Boletim (mantido) */}
                <Button
                  onClick={() => setTelaAtual("boletim")}
                  variant="outline"
                  className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-green-50 border-green-100 shadow-sm hover:shadow-md transition-all group bg-white" // REMOVIDO dark: classes
                >
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"> {/* REMOVIDO dark: classes */}
                    <BarChart3 className="w-6 h-6 text-green-600" /> {/* REMOVIDO dark: classes */}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Boletim</span> {/* REMOVIDO dark: classes */}
                </Button>

                {/* 3️⃣ Agenda – substitui o antigo “Fórum” */}
                <Button
                  onClick={() => setTelaAtual("agenda")}
                  variant="outline"
                  className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-purple-50 border-purple-100 shadow-sm hover:shadow-md transition-all group bg-white" // REMOVIDO dark: classes
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"> {/* REMOVIDO dark: classes */}
                    <Calendar className="w-6 h-6 text-purple-600" /> {/* REMOVIDO dark: classes */}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Agenda</span> {/* REMOVIDO dark: classes */}
                </Button>

                {/* 4️⃣ Horários (mantido) */}
                <Button
                  onClick={() => setTelaAtual("horarios")}
                  variant="outline"
                  className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-orange-50 border-orange-100 shadow-sm hover:shadow-md transition-all group bg-white" // REMOVIDO dark: classes
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"> {/* REMOVIDO dark: classes */}
                    <Clock className="w-6 h-6 text-orange-600" /> {/* REMOVIDO dark: classes */}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Horários</span> {/* REMOVIDO dark: classes */}
                </Button>
              </div>
            </section>

            {/* Minhas Turmas e Disciplinas */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"> {/* REMOVIDO dark: classes */}
                <Book className="w-5 h-5 text-gray-400" /> Minhas Turmas e Disciplinas {/* REMOVIDO dark: classes */}
              </h3>
              {loadingTurmas ? (
                <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm"> {/* REMOVIDO dark: classes */}
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> {/* REMOVIDO dark: classes */}
                  <span className="ml-2 text-gray-600">Carregando suas turmas...</span> {/* REMOVIDO dark: classes */}
                </div>
              ) : erroTurmas ? (
                <Card className="border-red-200 bg-red-50"> {/* REMOVIDO dark: classes */}
                  <CardContent className="p-6 flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 mt-1" /> {/* REMOVIDO dark: classes */}
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Erro ao carregar turmas</h3> {/* REMOVIDO dark: classes */}
                      <p className="text-sm text-red-700 mb-3">{erroTurmas}</p> {/* REMOVIDO dark: classes */}
                      <Button variant="outline" size="sm" onClick={() => usuario?.id && carregarTurmasEDisciplinasDoAluno(usuario.id)}>
                        Tentar novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : turmasDoAluno.length === 0 ? (
                <Card className="p-8 text-center bg-white shadow-sm"> {/* REMOVIDO dark: classes */}
                  <CardContent>
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" /> {/* REMOVIDO dark: classes */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma turma encontrada</h3> {/* REMOVIDO dark: classes */}
                    <p className="text-gray-600"> {/* REMOVIDO dark: classes */}
                      Parece que você ainda não está vinculado a nenhuma turma.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {turmasDoAluno.map((turma) => (
                    <Card
                      key={turma.id}
                      className="group cursor-pointer hover:border-blue-300 transition-all bg-white border shadow-sm hover:shadow-md" // REMOVIDO dark: classes
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors"> {/* REMOVIDO dark: classes */}
                              {turma.serieNome}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1"> {/* REMOVIDO dark: classes */}
                              {turma.nome === "Única" ? "Turma Única" : `Turma ${turma.nome}`}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50"> {/* REMOVIDO dark: classes */}
                            <Users className="w-5 h-5 text-blue-600" /> {/* REMOVIDO dark: classes */}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2 pt-2 border-t mt-4"> {/* REMOVIDO dark: classes */}
                            {turma.disciplinas.map((disciplina) => (
                              <Badge
                                key={disciplina.id}
                                variant="secondary"
                                className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors bg-gray-100 text-gray-700" // REMOVIDO dark: classes
                                onClick={() => handleDisciplinaClick(disciplina, turma)}
                              >
                                {disciplina.nome}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Comunicados */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"> {/* REMOVIDO dark: classes */}
                <Megaphone className="w-5 h-5 text-gray-400" /> Comunicados {/* REMOVIDO dark: classes */}
              </h3>
              {loadingComunicados ? (
                <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm"> {/* REMOVIDO dark: classes */}
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> {/* REMOVIDO dark: classes */}
                  <span className="ml-2 text-gray-600">Carregando comunicados...</span> {/* REMOVIDO dark: classes */}
                </div>
              ) : erroComunicados ? (
                <Card className="border-red-200 bg-red-50"> {/* REMOVIDO dark: classes */}
                  <CardContent className="p-6 flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 mt-1" /> {/* REMOVIDO dark: classes */}
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Erro ao carregar comunicados</h3> {/* REMOVIDO dark: classes */}
                      <p className="text-sm text-red-700 mb-3">{erroComunicados}</p> {/* REMOVIDO dark: classes */}
                      <Button variant="outline" size="sm" onClick={carregarComunicados}>
                        Tentar novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : comunicadosDoAluno.length === 0 ? (
                <Card className="p-8 text-center bg-white shadow-sm"> {/* REMOVIDO dark: classes */}
                  <CardContent>
                    <Info className="w-16 h-16 mx-auto mb-4 text-gray-300" /> {/* REMOVIDO dark: classes */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum comunicado</h3> {/* REMOVIDO dark: classes */}
                    <p className="text-gray-600"> {/* REMOVIDO dark: classes */}
                      Não há comunicados recentes para você.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {comunicadosDoAluno.map((comunicado) => (
                    <Card
                      key={comunicado.id}
                      className="bg-white shadow-sm border" // REMOVIDO dark: classes
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          {comunicado.tipo === "urgente" && (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                          {comunicado.tipo === "importante" && (
                            <CheckCircle className="w-5 h-5 text-yellow-500" />
                          )}
                          {comunicado.tipo === "informativo" && (
                            <Info className="w-5 h-5 text-blue-500" />
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-xs font-medium ${
                              comunicado.tipo === "urgente"
                                ? "bg-red-100 text-red-800" // REMOVIDO dark: classes
                                : comunicado.tipo === "importante"
                                ? "bg-yellow-100 text-yellow-800" // REMOVIDO dark: classes
                                : "bg-blue-100 text-blue-800" // REMOVIDO dark: classes
                            }`}
                          >
                            {comunicado.tipo === "urgente"
                              ? "Urgente"
                              : comunicado.tipo === "importante"
                              ? "Importante"
                              : "Informativo"}
                          </Badge>
                        </div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-medium text-sm ${!comunicado.lido ? 'text-gray-900' : 'text-gray-700'}`}> {/* REMOVIDO dark: classes */}
                            {comunicado.titulo}
                          </h4>
                          {!comunicado.lido && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-3 mb-2"> {/* REMOVIDO dark: classes */}
                          {comunicado.conteudo}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500"> {/* REMOVIDO dark: classes */}
                          <span>{comunicado.autorNome}</span>
                          <span>{formatarData(comunicado.dataPublicacao)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
