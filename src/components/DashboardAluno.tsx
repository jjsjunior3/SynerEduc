import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "./ui/card";
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

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    if (!usuario?.id) return;

    setLoading(true);
    setErro(null);

    try {
      // 1. PEGAR A SÉRIE DO CONTEXTO
      const nomeSerieUsuario = usuario.serie;

      if (!nomeSerieUsuario) {
        throw new Error("Série não identificada no seu perfil.");
      }

      // --- CORREÇÃO AQUI ---
      // Limpar o nome da série. Se for "8º ano (Fundamental)", vira "8º ano"
      // Isso resolve a incompatibilidade com a tabela 'series'
      const termoBusca = nomeSerieUsuario.split('(')[0].trim();

      console.log(`[DASHBOARD] Buscando série: "${termoBusca}" (Original: "${nomeSerieUsuario}")`);

      // 2. BUSCAR O ID DA SÉRIE
      const { data: dadosSerie, error: serieError } = await supabase
        .from('series')
        .select('id')
        .ilike('nome', termoBusca) // Busca pelo termo limpo
        .maybeSingle();

      if (serieError) {
        console.error("[DASHBOARD] Erro ao buscar ID da série:", serieError);
      }

      const serieIdUUID = dadosSerie?.id;

      if (!serieIdUUID) {
        console.warn(`[DASHBOARD] Série "${termoBusca}" não encontrada na tabela 'series'.`);
      } else {
        console.log("[DASHBOARD] ID da Série encontrado:", serieIdUUID);
      }

      // 3. BUSCAR TURMAS
      const { data: turmasAluno } = await supabase
        .from("alunos_turmas")
        .select("turma_id")
        .eq("aluno_id", usuario.id);

      const turmaIds = turmasAluno?.map((t) => t.turma_id) || [];

      // 4. BUSCAR DISCIPLINAS
      let query = supabase
        .from("professores_disciplinas_series")
        .select(`
          id,
          disciplina_id,
          turma_id,
          serie_id,
          disciplinas ( id, nome, cor ),
          professor:users!professor_id ( id, nome )
        `);

      const condicoes = [];

      if (serieIdUUID) {
        condicoes.push(`serie_id.eq.${serieIdUUID}`);
      }

      if (turmaIds.length > 0) {
        condicoes.push(`turma_id.in.(${turmaIds.join(",")})`);
      }

      if (condicoes.length === 0) {
        // Se não achou ID nem turma, paramos aqui mas sem erro fatal
        console.warn("[DASHBOARD] Sem ID de série válido e sem turmas.");
        setDisciplinas([]);
        return; 
      }

      query = query.or(condicoes.join(","));

      const { data: vinculos, error: vincError } = await query;

      if (vincError) throw vincError;

      if (!vinculos || vinculos.length === 0) {
        setDisciplinas([]);
        return;
      }

      // 5. DADOS COMPLEMENTARES
      const disciplinaIds = Array.from(new Set(vinculos.map((v) => v.disciplina_id)));
      const idsTurmaParaQuery = turmaIds.length > 0 ? turmaIds : ['00000000-0000-0000-0000-000000000000'];

      const [resAulas, resProgresso] = await Promise.all([
        supabase
          .from("proximas_aulas")
          .select("*")
          .in("disciplina_id", disciplinaIds)
          .gte("data_aula", new Date().toISOString())
          .order("data_aula", { ascending: true }),

        supabase
          .from("progresso_aluno_disciplina")
          .select("*")
          .eq("aluno_id", usuario.id)
          .in("turma_id", idsTurmaParaQuery)
      ]);

      const mapProximaAula = new Map();
      (resAulas.data || []).forEach((a) => mapProximaAula.set(a.disciplina_id, a));

      const mapProgresso = new Map();
      (resProgresso.data || []).forEach((p) => mapProgresso.set(p.disciplina_id, p));

      // 6. MONTAR OBJETO FINAL
      const disciplinasFinais = vinculos.map((v: any) => {
        const disciplina = v.disciplinas;
        if (!disciplina) return null;

        const prog = mapProgresso.get(disciplina.id);
        const aula = mapProximaAula.get(disciplina.id);

        return {
          id: disciplina.id,
          nome: disciplina.nome,
          cor: disciplina.cor || "bg-blue-500",
          professor: v.professor ? { id: v.professor.id, nome: v.professor.nome } : undefined,
          progresso: prog?.progresso ?? 0,
          aulas_concluidas: prog?.aulas_concluidas ?? 0,
          total_aulas: prog?.total_aulas ?? 0,
          nota_atual: prog?.nota_atual,
          proxima_aula: aula ? {
            data: aula.data_aula,
            hora: aula.hora_inicio,
            topico: aula.topico,
          } : undefined,
          turma_id: v.turma_id,
        };
      }).filter(Boolean);

      const unicas = disciplinasFinais.filter((disc: any, index: number, self: any[]) =>
        index === self.findIndex((t) => t.id === disc.id)
      );

      unicas.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      setDisciplinas(unicas as DisciplinaDashboard[]);

    } catch (err: any) {
      console.error("[DASHBOARD] Erro:", err);
      setErro(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleClickDisciplina = (disc: DisciplinaDashboard) => {
    setDisciplinaSelecionada(disc);
    setViewAtual("material");
  };

  const voltarDashboard = () => {
    setViewAtual("dashboard");
    setDisciplinaSelecionada(null);
  };

  if (viewAtual === "material" && disciplinaSelecionada) {
    return <MaterialEstudoModerno disciplina={disciplinaSelecionada} onVoltar={voltarDashboard} />;
  }
  if (viewAtual === "atividades") return <AtividadesAluno onVoltar={voltarDashboard} />;
  if (viewAtual === "boletim") return <Boletim onVoltar={voltarDashboard} />;
  if (viewAtual === "forum") return <Forum onVoltar={voltarDashboard} />;
  if (viewAtual === "horarios") return <HorarioEscolar onVoltar={voltarDashboard} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 border-b sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-16">
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

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}>
              <Bell className="w-5 h-5"/>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMostrarPerfil(!mostrarPerfil)}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={usuario?.avatar || undefined} />
                <AvatarFallback>{usuario?.nome?.slice(0, 2).toUpperCase() || "AL"}</AvatarFallback>
              </Avatar>
            </Button>
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>

        {mostrarNotificacoes && (
          <div className="absolute right-4 top-16 w-96 z-50">
            <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
          </div>
        )}
        {mostrarPerfil && (
          <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario || undefined} logout={logout} />
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {usuario?.nome?.split(" ")[0] || "Aluno"} 👋
          </h1>
          <p className="text-gray-600">
            Bem-vindo de volta!{" "}
            <span className="font-medium text-blue-600">
              {usuario?.serie ? `Série: ${usuario.serie}` : "Série não identificada"}
            </span>
          </p>
        </div>

        {erro && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-medium">Atenção</p>
              <p className="mt-1">{erro}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={carregarDados}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Button onClick={() => setViewAtual("atividades")} variant="outline" className="p-4 flex flex-col items-center gap-2 h-auto hover:bg-blue-50">
            <FileText className="w-6 h-6 text-blue-600" /> <span className="text-sm">Atividades</span>
          </Button>
          <Button onClick={() => setViewAtual("boletim")} variant="outline" className="p-4 flex flex-col items-center gap-2 h-auto hover:bg-green-50">
            <BarChart3 className="w-6 h-6 text-green-600" /> <span className="text-sm">Boletim</span>
          </Button>
          <Button onClick={() => setViewAtual("forum")} variant="outline" className="p-4 flex flex-col items-center gap-2 h-auto hover:bg-purple-50">
            <MessageSquare className="w-6 h-6 text-purple-600" /> <span className="text-sm">Fórum</span>
          </Button>
          <Button onClick={() => setViewAtual("horarios")} variant="outline" className="p-4 flex flex-col items-center gap-2 h-auto hover:bg-orange-50">
            <Calendar className="w-6 h-6 text-orange-600" /> <span className="text-sm">Horários</span>
          </Button>
          <Button onClick={() => setMostrarPerfil(true)} variant="outline" className="p-4 flex flex-col items-center gap-2 h-auto hover:bg-gray-50">
            <Settings className="w-6 h-6 text-gray-700" /> <span className="text-sm">Perfil</span>
          </Button>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Minhas Disciplinas</h2>
            <Badge variant="secondary">{loading ? "..." : `${disciplinas.length} disciplinas`}</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Carregando suas disciplinas...</p>
              </div>
            </div>
          ) : disciplinas.length === 0 && !erro ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2 font-medium">Nenhuma disciplina encontrada.</p>
              <p className="text-sm text-gray-500">
                Não encontramos disciplinas para a série: <strong>{usuario?.serie || "Não identificada"}</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {disciplinas.map((disciplina) => (
                <Card
                  key={disciplina.id}
                  onClick={() => handleClickDisciplina(disciplina)}
                  className="group hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm cursor-pointer border-0 overflow-hidden"
                >
                  <div className={`h-2 ${disciplina.cor} w-full`} />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 text-lg">
                          {disciplina.nome}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {disciplina.professor?.nome || "Professor não atribuído"}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-600">Progresso</span>
                          <span className="font-medium text-blue-600">{disciplina.progresso}%</span>
                        </div>
                        <Progress value={disciplina.progresso} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <span>{disciplina.aulas_concluidas}/{disciplina.total_aulas} aulas</span>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-blue-50 hover:text-blue-600">
                          <Play className="w-3 h-3 mr-1" /> Acessar
                        </Button>
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
