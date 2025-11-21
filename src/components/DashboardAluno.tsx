// src/components/DashboardAluno.tsx
import { useState, useEffect, useCallback } from "react";
import { Card,Content } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Bell,
  GraduationCap,
  Calendar,
  MessageSquare,
  BarChart3,
  FileText,
  BookOpen,
  AlertTriangle,
  Loader2,
  Clock,
  Play,
  ChevronRight,
  Settings,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Notificacoes } from "./Notificacoes";
import { PerfilUsuario } from "./PerfilUsuario";
import { HorarioEscolar } from "./HorarioEscolar";
import { MaterialEstudoModerno } from "./MaterialEstudoModerno";
import { AtividadesAluno } from "./AtividadesAluno";
import Boletim from "./Boletim";
import { Forum } from "./Forum";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/supabaseClient";
import { toast } from "sonner";

interface DisciplinaDashboard {
  id: string;
  nome: string;
  cor: string;
  professor?: {
    id: string;
    nome: string;
  };
  progresso: number;
  nota_atual?: number;
  total_aulas: number;
  aulas_concluidas: number;
  proxima_aula?: {
    data: string;
    hora?: string | null;
    topico?: string | null;
  };
  turma_id?: string;
}

type ViewType =
  | "dashboard"
  | "material"
  | "atividades"
  | "boletim"
  | "forum"
  | "horarios";

export default function DashboardAluno() {
  const { usuario, logout } = useAuth();

  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  const [disciplinas, setDisciplinas] = useState<DisciplinaDashboard[]>([]);
  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [disciplinaSelecionada, setDisciplinaSelecionada] =
    useState<DisciplinaDashboard | null>(null);

  const [contadorNotificacoes, setContadorNotificacoes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar disciplinas reais do Supabase
  const carregarDisciplinas = useCallback(async () => {
    if (!usuario?.id) {
      setDisciplinas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErro(null);

      // 1) Buscar turmas do aluno
      const { data: turmasAluno, error: turmasError } = await supabase
        .from("alunos_turmas")
        .select(
          `
          turma_id,
          turmas (
            id,
            nome,
            serie_id
          )
        `
        )
        .eq("aluno_id", usuario.id);

      if (turmasError) throw turmasError;

      if (!turmasAluno || turmasAluno.length === 0) {
        setDisciplinas([]);
        setErro(
          "Você ainda não está matriculado em nenhuma turma. Procure a coordenação."
        );
        return;
      }

      const turmaIds = turmasAluno.map((t) => t.turma_id);

      // Extrair as séries das turmas
      const serieIds = Array.from(
        new Set(
          turmasAluno
            .map((t) => (t.turmas as any)?.serie_id)
            .filter((id) => !!id)
        )
      ) as string[];

      // 2) Buscar vínculos professor ↔ disciplina ↔ série/turma
      const { data: vinculos, error: vincError } = await supabase
        .from("professores_disciplinas_series")
        .select(
          `
          id,
          professor_id,
          disciplina_id,
          serie_id,
          turma_id,
          disciplinas (
            id,
            nome,
            cor
          ),
          professor:users!professor_id (
            id,
            nome
          )
        `
        )
        .or(
          [
            serieIds.length
              ? `serie_id.in.(${serieIds.join(",")})`
              : "serie_id.is.null",
            `turma_id.in.(${turmaIds.join(",")})`,
          ].join(",")
        );

      if (vincError) throw vincError;

      if (!vinculos || vinculos.length === 0) {
        setDisciplinas([]);
        setErro(
          "Nenhuma disciplina vinculada à sua turma/série ainda foi cadastrada."
        );
        return;
      }

      const disciplinaIds = Array.from(
        new Set(vinculos.map((v) => v.disciplina_id))
      );

      // 3) Próximas aulas para essas turmas/disciplinas
      const { data: proximasAulas } = await supabase
        .from("proximas_aulas")
        .select(
          `
          id,
          disciplina_id,
          turma_id,
          data_aula,
          hora_inicio,
          topico
        `
        )
        .in("turma_id", turmaIds)
        .in("disciplina_id", disciplinaIds)
        .gte("data_aula", new Date().toISOString())
        .order("data_aula", { ascending: true });

      const mapProximaAula = new Map<string, any>();
      (proximasAulas || []).forEach((a) => {
        const key = `${a.disciplina_id}-${a.turma_id}`;
        if (!mapProximaAula.has(key)) {
          mapProximaAula.set(key, a);
        }
      });

      // 4) Progresso do aluno por disciplina
      const { data: progresso } = await supabase
        .from("progresso_aluno_disciplina")
        .select(
          `
          disciplina_id,
          turma_id,
          progresso,
          aulas_concluidas,
          total_aulas,
          nota_atual
        `
        )
        .eq("aluno_id", usuario.id)
        .in("turma_id", turmaIds);

      const mapProgresso = new Map<string, any>();
      (progresso || []).forEach((p) => {
        const key = `${p.disciplina_id}-${p.turma_id}`;
        mapProgresso.set(key, p);
      });

      // 5) Montar disciplinas do dashboard
      const disciplinasDashboard: DisciplinaDashboard[] = vinculos.map(
        (v: any) => {
          const disciplina = v.disciplinas;
          const turmaId = v.turma_id || turmaIds[0];
          const prog = mapProgresso.get(`${disciplina.id}-${turmaId}`);
          const aula = mapProximaAula.get(`${disciplina.id}-${turmaId}`);

          return {
            id: disciplina.id,
            nome: disciplina.nome,
            cor: disciplina.cor || "bg-blue-500",
            professor: v.professor
              ? { id: v.professor.id, nome: v.professor.nome }
              : undefined,
            progresso: prog?.progresso ?? 0,
            aulas_concluidas: prog?.aulas_concluidas ?? 0,
            total_aulas: prog?.total_aulas ?? 0,
            nota_atual: prog?.nota_atual ?? undefined,
            proxima_aula: aula
              ? {
                data: aula.data_aula,
                hora: aula.hora_inicio,
                topico: aula.topico,
              }
              : undefined,
            turma_id: turmaId,
          };
        }
      );

      disciplinasDashboard.sort((a, b) => a.nome.localeCompare(b.nome));
      setDisciplinas(disciplinasDashboard);

      console.log(
        "[ALUNO] Disciplinas carregadas:",
        disciplinasDashboard.length
      );
    } catch (err: any) {
      console.error("Erro ao carregar disciplinas do aluno:", err);
      setErro(
        err?.message || "Erro ao carregar disciplinas. Tente novamente mais tarde."
      );
      setDisciplinas([]);
    } finally {
      setLoading(false);
    }
  }, [usuario?.id]);

  // Contar notificações reais
  const contarNotificacoes = useCallback(async () => {
    if (!usuario?.id) {
      setContadorNotificacoes(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("notificacoes")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", usuario.id)
        .eq("lida", false);

      if (error) throw error;
      setContadorNotificacoes(count || 0);
    } catch (err) {
      console.error("Erro ao contar notificações:", err);
      setContadorNotificacoes(0);
    }
  }, [usuario?.id]);

  // Carregar dados iniciais
  useEffect(() => {
    if (usuario?.id) {
      carregarDisciplinas();
      contarNotificacoes();
    }
  }, [usuario?.id, carregarDisciplinas, contarNotificacoes]);

  // Atualização periódica (opcional)
  useEffect(() => {
    if (!usuario?.id) return;
    const interval = setInterval(() => {
      carregarDisciplinas();
      contarNotificacoes();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [usuario?.id, carregarDisciplinas, contarNotificacoes]);

  // Navegação entre seções
  const handleClickDisciplina = (disc: DisciplinaDashboard) => {
    setDisciplinaSelecionada(disc);
    setViewAtual("material");
  };

  const voltarDashboard = () => {
    setViewAtual("dashboard");
    setDisciplinaSelecionada(null);
  };

  // Renderização condicional das views não-dashboard
  if (viewAtual === "material" && disciplinaSelecionada) {
    return (
      <MaterialEstudoModerno
        disciplina={disciplinaSelecionada}
        onVoltar={voltarDashboard}
      />
    );
  }

  if (viewAtual === "atividades") {
    return <AtividadesAluno onVoltar={voltarDashboard} />;
  }

  if (viewAtual === "letim") {
    return <Boletim onVoltar={voltarDashboard} />;
  }

  if (viewAtual === "forum") {
    return <Forum onVoltar={voltarDashboard} />;
  }

  if (viewAtual === "horarios") {
    return <HorarioEscolar onVoltar={voltarDashboard} />;
  }

  // ---------------------------------------------------
  // DASHBOARD PRINCIPAL
  // ---------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 border-b sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AVA Conexão EAD
              </h1>
              <p className="text-xs text-gray-600">Portal do Aluno</p>
            </div>
          </div>

          {/* Ações do usuário */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => setMostrarNotificacoes((v) => !v)}
            >
              <Bell className="w-5 h-5"/>
              {contadorNotificacoes > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-5 h-5 text-xs p-0 flex items-center justify-center"
                >
                  {contadorNotificacoes}
                </Badge>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarPerfil((v) => !v)}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={usuario?.avatar || undefined} />
                <AvatarFallback>
                  {usuario?.nome?.slice(0, 2).toUpperCase() || "AL"}
                </AvatarFallback>
              </Avatar>
            </Button>

            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {mostrarNotificacoes && (
          <div className="absolute right-4 top-16 w-96 z-50">
            <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
          </div>
        )}

        {mostrarPerfil && (
          <PerfilUsuario
            open={mostrarPerfil}
            onOpenChange={setMostrarPerfil}
            usuario={usuario || undefined}
            logout={logout}
          />
        )}
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Saudação */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {usuario?.nome?.split(" ")[0] || "Aluno"} 👋
          </h1>
          <p className="text-gray-600">
            Bem-vindo de volta!{" "}
            {usuario?.serie ? `Série: ${usuario.serie}` : "Série não informada."}
          </p>
        </div>

        {/* Erro, se houver */}
        {erro && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-medium">Problema ao carregar dados</p>
              <p className="mt-1">{erro}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={carregarDisciplinas}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Menu principal */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Button
            onClick={() => setViewAtual("atividades")}
            variant="outline"
            className="p-4 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200"
          >
            <FileText className="w-6 h-6 text-blue-600" />
            <span className="text-sm">Atividades</span>
          </Button>

          <Button
            onClick={() => setViewAtual("boletim")}
            variant="outline"
            className="p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200"
          >
            <BarChart3 className="w-6 h-6 text-green-600" />
            <span className="text-sm">Boletim</span>
          </Button>

          <Button
            onClick={() => setViewAtual("forum")}
            variant="outline"
            className="p-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200"
          >
            <MessageSquare class="w-6 h-6 text-purple-600" />
            <span className="text-sm">Fórum</span>
          </Button>

          <Button
            onClick={() => setViewAtual("horarios")}
            variant="outline"
            className="p-4 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-200"
          >
            <Calendar className="w-6 h-6 text-orange-600" />
            <span className="text-sm">Horários</span>
          </Button>

          <Button
            onClick={() => setMostrarPerfil(true)}
            variant="outline"
            className="p-4 flex flex-col items-center gap-2 hover:bg-gray-50 hover:border-gray-200"
          >
            <Settings className="w-6 h-6 text-gray-700" />
            <span className="text-sm">Perfil</span>
          </Button>
        </div>

        {/* Lista de disciplinas */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Minhas Disciplinas
            </h2>
            <Badge variant="secondary">
              {loading ? "Carregando..." : `${disciplinas.length} disciplinas`}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Carregando suas disciplinas...</p>
              </div>
            </div>
          ) : disciplinas.length === 0 && !erro ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">
                Nenhuma disciplina encontrada para a sua turma.
              </p>
              <p className="text-sm text-gray-500">
                Caso o problema persista, entre em contato com a coordenação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {disciplinas.map((disciplina) => (
                <Card
                  key={disciplina.id}
                  onClick={() => handleClickDisciplina(disciplina)}
                  className="group hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm cursor-pointer border-0"
                >
                  <CardContent className="p-0">
                    <div className={`h-2 ${disciplina.cor} rounded-t-lg`} />
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                            {disciplina.nome}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {disciplina.professor?.nome ||
                              "Professor não atribuído"}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Progresso</span>
                            <span className="font-medium">
                              {disciplina.progresso}%
                            </span>
                          </div>
                          <Progress
                            value={disciplina.progresso}
                            className="h-2"
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {disciplina.proxima_aula ? (
                            <>
                              <span>
                                {new Date(
                                  disciplina.proxima_aula.data
                                ).toLocaleDateString("pt-BR", {
                                  day: "numeric",
                                  month: "short",
                                })}{" "}
                                {disciplina.proxima_aula.hora || ""}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {disciplina.nota_atual != null
                                  ? disciplina.nota_atual.toFixed(1)
                                  : "N/A"}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <span>Próxima aula não definida</span>
                              <Badge
                                variant="secondary"
                                className="text-xs"
                              >
                                Aguardando
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {disciplina.aulas_concluidas}/
                            {disciplina.total_aulas} aulas
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Continuar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
