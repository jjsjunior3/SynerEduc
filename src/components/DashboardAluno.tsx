// src/components/DashboardAluno.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

import {
  Bell,
  FileText,
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
  Users,
  ArrowLeft,
} from "lucide-react";

import { PerfilUsuario } from "./PerfilUsuario";
import { Notificacoes } from "./Notificacoes";
import { AtividadesAluno } from "./AtividadesAluno";
import { AgendaAluno } from "./AgendaAluno"; // Importa o componente AgendaAluno
import HorarioEscolar from "./HorarioEscolar";
import Boletim from "./Boletim";
import {DisciplinaPage} from "./DisciplinaPage";
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

export default function DashboardAluno() {
  const { usuario, logout } = useAuth();

  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);

  const [turma, setTurma] = useState<TurmaData | null>(null); // Estado para a turma do aluno
  const [comunicados, setComunicados] = useState<ComunicadoData[]>([]);

  const [loadingTurma, setLoadingTurma] = useState(true);
  const [loadingComunicados, setLoadingComunicados] = useState(true);

  const [erroTurma, setErroTurma] = useState<string | null>(null);
  const [erroComunicados, setErroComunicados] = useState<string | null>(null);

  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<
    DisciplinaData | null
  >(null);

  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);

  // ✅ FUNÇÃO handleVoltar DEFINIDA
  const handleVoltar = useCallback(() => { // Usar useCallback para otimização
    setViewAtual("dashboard");
  }, []);

  // ========================================================
  // CARREGAR TURMA + DISCIPLINAS DO ALUNO
  // ========================================================
  const carregarTurma = useCallback(async () => {
    if (!usuario?.id) return;

    setLoadingTurma(true);
    setErroTurma(null);

    try {
      // 1. Buscar série textual do aluno em users.serie
      const { data: aluno, error: alunoError } = await supabase
        .from("users")
        .select("serie")
        .eq("id", usuario.id)
        .single();

      if (alunoError) throw alunoError;

      if (!aluno?.serie) {
        setErroTurma("Sua série não está definida no sistema.");
        setTurma(null);
        return;
      }

      const serieNomeAluno: string = aluno.serie;

      // 2. Buscar registro da série real em 'series' usando o nome
      const { data: serieRow, error: serieError } = await supabase
        .from("series")
        .select("id, nome")
        .eq("nome", serieNomeAluno)
        .single();

      if (serieError) throw serieError;

      if (!serieRow) {
        setErroTurma(`Série "${serieNomeAluno}" não encontrada.`);
        setTurma(null);
        return;
      }

      // 3. Buscar turma(s) pela série_id (no seu caso existe 1 turma por série)
      const { data: turmasResult, error: turmasError } = await supabase
        .from("turmas")
        .select("id, nome, total_alunos")
        .eq("serie_id", serieRow.id);

      if (turmasError) throw turmasError;

      if (!turmasResult || turmasResult.length === 0) {
        setErroTurma(
          `Nenhuma turma encontrada para a série "${serieRow.nome}".`
        );
        setTurma(null);
        return;
      }

      const turmaRow = turmasResult[0];

      // 4. Buscar disciplinas APENAS pela série_id (SEM filtrar turma_id)
      const { data: vinculos, error: vinculosError } = await supabase
        .from("professores_disciplinas_series")
        .select("disciplinas(id, nome, cor)")
        .eq("serie_id", serieRow.id);

      if (vinculosError) throw vinculosError;

      const disciplinas: DisciplinaData[] =
        vinculos?.flatMap((v: any) =>
          v.disciplinas
            ? [
                {
                  id: v.disciplinas.id,
                  nome: v.disciplinas.nome,
                  cor: v.disciplinas.cor || "bg-blue-500",
                },
              ]
            : []
        ) || [];

      // remover duplicadas por id
      const disciplinasUnicas: DisciplinaData[] = [];
      const setIds = new Set<string>();
      for (const d of disciplinas) {
        if (!setIds.has(d.id)) {
          setIds.add(d.id);
          disciplinasUnicas.push(d);
        }
      }

      setTurma({
        id: turmaRow.id,
        nome: turmaRow.nome,
        serieId: serieRow.id,
        serieNome: serieRow.nome,
        totalAlunos: turmaRow.total_alunos || 0,
        disciplinas: disciplinasUnicas,
      });
    } catch (e: any) {
      console.error("Erro ao carregar dados da turma do aluno:", e);
      setErroTurma(
        e?.message || "Erro ao carregar informações da sua turma/série."
      );
      setTurma(null);
    } finally {
      setLoadingTurma(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    if (usuario?.id) {
      carregarTurma();
    }
  }, [usuario?.id, carregarTurma]);

  // ========================================================
  // COMUNICADOS – usando colunas reais da tabela
  // ========================================================
  const carregarComunicados = useCallback(async () => {
    if (!usuario) return;

    setLoadingComunicados(true);
    setErroComunicados(null);

    try {
      const { data, error } = await supabase
        .from("comunicados")
        .select(
          `
          id,
          titulo,
          conteudo,
          criado_em,
          publico_alvo,
          importante,
          users!comunicados_autor_id_fkey ( nome )
        `
        )
        .order("criado_em", { ascending: false })
        .limit(20);

      if (error) throw error;

      const serieNomeAluno = (usuario.serie || "").toLowerCase();

      const filtrados =
        data?.filter((c: any) => {
          const publico = (c.publico_alvo || "")
            .split(",")
            .map((s: string) => s.trim().toLowerCase())
            .filter(Boolean);

          if (publico.length === 0) return true;

          return (
            publico.includes("todos") ||
            publico.includes("todos-alunos") ||
            publico.includes("alunos") ||
            publico.includes(serieNomeAluno)
          );
        }) || [];

      const comunicadosFormatados: ComunicadoData[] = filtrados.map(
        (c: any) => ({
          id: c.id,
          titulo: c.titulo,
          conteudo: c.conteudo,
          tipo: c.importante ? "urgente" : "informativo",
          dataPublicacao: c.criado_em,
          autorNome:
            Array.isArray(c.users) && c.users.length > 0
              ? c.users[0].nome
              : c.users?.nome || "Coordenação",
          lido: false,
          publico_alvo_raw: c.publico_alvo || "",
        })
      );

      setComunicados(comunicadosFormatados);
    } catch (e: any) {
      console.error("Erro ao carregar comunicados (aluno):", e);
      setErroComunicados(
        e?.message || "Erro ao carregar comunicados para você."
      );
      setComunicados([]);
    } finally {
      setLoadingComunicados(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      carregarComunicados();
    }
  }, [usuario, carregarComunicados]);

  useEffect(() => {
    setNotificacoesNaoLidas(0);
  }, []);

  // ========================================================
  // VIEWS SECUNDÁRIAS
  // ========================================================

  if (viewAtual === "boletim") {
    return (
      <Boletim
        onVoltar={handleVoltar} // ✅ Usando handleVoltar
        turma={turma}
        usuario={usuario}
      />
    );
  }

  // ✅ AGENDA DO ALUNO: Simplificada para usar a série/turma do aluno logado
  if (viewAtual === "agenda" && turma) { // Só renderiza se a turma do aluno já estiver carregada
    return (
      <AgendaAluno
        onVoltar={handleVoltar} // ✅ Usando handleVoltar
        serie={{ id: turma.serieId, nome: turma.serieNome }}
        turma={{ id: turma.id, nome: turma.nome }}
        disciplinasDoAluno={turma.disciplinas} // ✅ ESSENCIAL: Passa as disciplinas do aluno
      />
    );
  }

  if (viewAtual === "horarios") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <SchoolHeader subtitle="Painel do Aluno" />
            <Button
              variant="ghost"
              onClick={handleVoltar} // ✅ Usando handleVoltar
              className="text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao painel
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <HorarioEscolar turmaSelecionada={turma?.serieNome || ""} />
        </main>
      </div>
    );
  }

  if (viewAtual === "disciplina" && disciplinaSelecionada && turma) {
    return (
      <DisciplinaPage
        disciplina={disciplinaSelecionada}
        turma={turma}
        onVoltar={handleVoltar} // ✅ Usando handleVoltar
        usuario={usuario}
      />
    );
  }

  // ========================================================
  // DASHBOARD PRINCIPAL
  // ========================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header igual ao do professor, mas com subtitle de aluno */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <SchoolHeader subtitle="Painel do Aluno" />

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMostrarNotificacoes(true)}
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {usuario?.nome}
                </p>
                <p className="text-xs text-gray-500">
                  {turma?.serieNome || "Aluno"}
                </p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
                  className="focus:outline-none"
                >
                  <Avatar className="h-9 w-9 border-2 border-gray-100">
                    <AvatarImage src={(usuario as any)?.avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {usuario?.nome?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {mostrarMenuUsuario && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[9999]">
                    <button
                      onClick={() => {
                        setMostrarMenuUsuario(false);
                        setMostrarPerfil(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Meu Perfil
                    </button>
                    <div className="border-t border-gray-200 my-2" />
                    <button
                      onClick={() => {
                        setMostrarMenuUsuario(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notificações iguais às do professor */}
      {mostrarNotificacoes && (
        <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
      )}

      {/* Body com mesma estrutura do professor */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Faixa azul de boas-vindas */}
        <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg p-8 md:p-10 overflow-visible pointer-events-none">
          <div className="relative z-10 pointer-events-auto">
            <h1 className="text-3xl font-bold mb-2">
              Olá, {usuario?.nome?.split(" ")[0]}! 👋
            </h1>
            <p className="text-blue-100 text-lg max-w-xl">
              Aqui você acompanha suas aulas, atividades e notas.
            </p>
            {turma && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="bg-white/10 text-white border border-white/20"
                >
                  {turma.serieNome}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-white/10 text-white border border-white/20"
                >
                  Turma {turma.nome}
                </Badge>
              </div>
            )}
          </div>

          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        </section>

        {/* Acesso Rápido (como no professor) */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            Acesso Rápido
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Boletim */}
            <Button
              onClick={() => setViewAtual("boletim")}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50 transition-all"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Boletim
              </span>
            </Button>

            {/* Agenda */}
            <Button
              onClick={() => setViewAtual("agenda")}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:bg-purple-50 transition-all"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Agenda
              </span>
            </Button>

            {/* Horários */}
            <Button
              onClick={() => setViewAtual("horarios")}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:border-orange-500 hover:bg-orange-50 transition-all"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Horários
              </span>
            </Button>
          </div>
        </section>

        {/* Minhas Disciplinas + Comunicados (grid 2x1 igual professor) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Minhas Disciplinas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-400" />
                Minhas Disciplinas
              </h3>
            </div>

            {loadingTurma ? (
              <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">
                  Carregando suas disciplinas...
                </span>
              </div>
            ) : erroTurma ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Erro ao carregar suas informações
                    </h3>
                    <p className="text-sm text-red-700 mb-3">{erroTurma}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={carregarTurma}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : !turma ? (
              <Card className="p-8 text-center bg-white shadow-sm">
                <CardContent>
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma turma encontrada
                  </h3>
                  <p className="text-gray-600">
                    Parece que você ainda não está vinculado a nenhuma turma.
                  </p>
                </CardContent>
              </Card>
            ) : turma.disciplinas.length === 0 ? (
              <Card className="p-8 text-center bg-white shadow-sm">
                <CardContent>
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma disciplina cadastrada
                  </h3>
                  <p className="text-gray-600">
                    Ainda não há disciplinas vinculadas à sua série no sistema.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {turma.disciplinas.map((disc) => (
                  <Card
                    key={disc.id}
                    className="group cursor-pointer hover:border-blue-300 transition-all bg-white border shadow-sm hover:shadow-md"
                    onClick={() => {
                      setDisciplinaSelecionada(disc);
                      setViewAtual("disciplina");
                    }}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${disc.cor}`}
                        >
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{disc.nome}</p>
                          <p className="text-xs text-gray-500">
                            {turma.serieNome} — Turma {turma.nome}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Comunicados */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-gray-400" /> Comunicados
            </h3>

            {loadingComunicados ? (
              <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">
                  Carregando comunicados...
                </span>
              </div>
            ) : erroComunicados ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Erro ao carregar comunicados
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                      {erroComunicados}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={carregarComunicados}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : comunicados.length === 0 ? (
              <Card className="p-8 text-center bg-white shadow-sm">
                <CardContent>
                  <Info className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum comunicado
                  </h3>
                  <p className="text-gray-600">
                    Não há comunicados recentes para você.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {comunicados.map((c) => (
                  <Card
                    key={c.id}
                    className="bg-white shadow-sm border overflow-hidden"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {c.tipo === "urgente" && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        {c.tipo === "informativo" && (
                          <Info className="w-4 h-4 text-blue-500" />
                        )}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-medium ${
                            c.tipo === "urgente"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {c.tipo === "urgente"
                            ? "Urgente"
                            : "Informativo"}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-1">
                        {c.titulo}
                      </h4>
                      <p className="text-xs text-gray-700 line-clamp-3 mb-2">
                        {c.conteudo}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>{c.autorNome}</span>
                        <span>{formatarData(c.dataPublicacao)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modais */}
      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
    </div>
  );
}
