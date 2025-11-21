// src/components/DashboardProfessor.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Bell,
  MessageSquare,
  Calendar,
  ArrowLeft,
  ChevronDown,
  GraduationCap,
  Settings,
  AlertTriangle,
  Book,
  Loader2,
  Users,
  Wifi,
  CheckCircle,
  WifiOff,
  ChevronRight,
} from "lucide-react";
import { Notificacoes } from "./Notificacoes";
import { HorarioEscolar } from "./HorarioEscolar";
import { PerfilUsuario } from "./PerfilUsuario";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

type Conectividade = "online" | "offline" | "checking";

interface SerieTurmaResumo {
  id: string; // id da turma (ou chave sintética se só tiver série)
  nomeTurma: string; // ex: "6ºA" ou "Turma(s) não definida(s)"
  nomeSerie: string; // ex: "6º ano - EF"
  totalAlunos: number;
  ativa: boolean;
  cor: string;
  disciplinas: {
    id: string;
    nome: string;
    cor: string;
  }[];
}

type ViewType = "turmas" | "disciplinas";

export default function DashboardProfessor() {
  const { usuario, logout } = useAuth();

  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  const [conectividade, setConectividade] =
    useState<Conectividade>("checking");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [turmas, setTurmas] = useState<SerieTurmaResumo[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] =
    useState<SerieTurmaResumo | null>(null);
  const [viewAtual, setViewAtual] = useState<ViewType>("turmas");

  const [naoLidas, setNaoLidas] = useState(0);

  // Carregar turmas/disciplinas do professor
  const carregarTurmasProfessor = useCallback(async () => {
    if (!usuario?.id) {
      setCarregando(false);
      setConectividade("offline");
      return;
    }

    try {
      setCarregando(true);
      setErro(null);
      setConectividade("checking");

      // 1) Buscar vínculos do professor com JOIN em turmas, séries e disciplinas
      const { data: vinculos, error: vincError } = await supabase
        .from("professores_disciplinas_series")
        .select(
          `
          id,
          professor_id,
          disciplina_id,
          turma_id,
          serie_id,
          turmas (
            id,
            nome,
            total_alunos,
            ativa,
            serie_id
          ),
          series (
            id,
            nome
          ),
          disciplinas (
            id,
            nome,
            cor
          )
        `
        )
        .eq("professor_id", usuario.id);

      if (vincError) throw vincError;

      if (!vinculos || vinculos.length === 0) {
        setTurmas([]);
        setErro(
          "Nenhuma turma/disciplina vinculada ao seu usuário foi configurada. Procure o administrador."
        );
        setConectividade("online");
        return;
      }

      // 2) Agrupar por turma (ou, se não houver turma, por série)
      const mapTurmas = new Map<string, SerieTurmaResumo>();

      (vinculos as any[]).forEach((v) => {
        const turma = v.turmas as
          | { id: string; nome: string; total_alunos?: number | null; ativa?: boolean | null; serie_id?: string | null }
          | null;
        const serie = v.series as { id: string; nome: string } | null;
        const disc = v.disciplinas as { id: string; nome: string; cor?: string | null } | null;

        if (!disc) {
          return;
        }

        let key: string;
        let nomeTurma = "Turma(s) não definida(s)";
        let nomeSerie = "Série não definida";
        let totalAlunos = 0;
        let ativa = true;

        if (turma) {
          key = `turma_${turma.id}`;
          nomeTurma = turma.nome;
          totalAlunos = turma.total_alunos ?? 0;
          ativa = turma.ativa ?? true;
          nomeSerie = serie?.nome || nomeSerie;
        } else if (serie) {
          key = `serie_${serie.id}`;
          nomeSerie = serie.nome;
        } else {
          key = `vinc_${v.id}`;
        }

        if (!mapTurmas.has(key)) {
          mapTurmas.set(key, {
            id: key,
            nomeTurma,
            nomeSerie,
            totalAlunos,
            ativa,
            cor: disc.cor || "bg-blue-500",
            disciplinas: [],
          });
        }

        const turmaResumo = mapTurmas.get(key)!;
        if (!turmaResumo.disciplinas.some((d) => d.id === disc.id)) {
          turmaResumo.disciplinas.push({
            id: disc.id,
            nome: disc.nome,
            cor: disc.cor || "bg-blue-500",
          });
        }
      });

      const listaTurmas = Array.from(mapTurmas.values()).sort((a, b) =>
        a.nomeSerie.localeCompare(b.nomeSerie)
      );

      setTurmas(listaTurmas);
      setConectividade("online");
    } catch (err: any) {
      console.error("[PROFESSOR] Erro ao carregar turmas:", err);
      setErro(
        err?.message ||
          "Erro ao carregar suas turmas. Tente novamente mais tarde."
      );
      setTurmas([]);
      setConectividade("offline");
    } finally {
      setCarregando(false);
    }
  }, [usuario?.id]);

  // Contar notificações não lidas
  const carregarNotificacoes = useCallback(async () => {
    if (!usuario?.id) {
      setNaoLidas(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("notificacoes")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", usuario.id)
        .eq("lida", false);

      if (error) throw error;
      setNaoLidas(count || 0);
    } catch (err) {
      console.error("[PROFESSOR] Erro ao contar notificações:", err);
      setNaoLidas(0);
    }
  }, [usuario?.id]);

  useEffect(() => {
    if (usuario?.id) {
      carregarTurmasProfessor();
      carregarNotificacoes();
    }
  }, [usuario?.id, carregarTurmasProfessor, carregarNotificacoes]);

  // Handlers de navegação
  const handleTurmaClick = (t: SerieTurmaResumo) => {
    setTurmaSelecionada(t);
    setViewAtual("disciplinas");
  };

  const handleVoltar = () => {
    if (viewAtual === "disciplinas") {
      setViewAtual("turmas");
      setTurmaSelecionada(null);
    }
  };

  // Loading global
  if (carregando && !turmas.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Carregando suas turmas...</p>
        </div>
      </div>
    );
  }

  // Estado de erro sem turmas
  if (!turmas.length && erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Configuração necessária
            </h2>
            <p className="text-gray-600 mb-4">{erro}</p>
            <Badge
              variant="secondary"
              className="mb-4 flex items-center justify-center gap-1"
            >
              {conectividade === "online" ? (
                <>
                  <CheckCircle className="w-3 h-3" /> Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" /> Offline
                </>
              )}
            </Badge>
            <Button
              onClick={carregarTurmasProfessor}
              className="w-full mb-2"
            >
              Recarregar
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="w-full text-sm"
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------
  // Layout principal (mesma aparência que você já tinha)
  // ---------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {viewAtual !== "turmas" && (
            <Button variant="ghost" size="sm" onClick={handleVoltar}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          )}

          <div>
            <h1 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              {viewAtual === "turmas"
                ? "Minhas Turmas"
                : `Turma ${turmaSelecionada?.nomeTurma}`}
            </h1>
            <p className="text-xs text-gray-600">
              Professor: {usuario?.nome || usuario?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status de conexão */}
          <Badge
            variant={
              conectividade === "online" ? "default" : "secondary"
            }
            className={`flex items-center gap-1 text-xs ${
              conectividade === "online"
                ? "bg-green-100 text-green-800"
                : conectividade === "offline"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {conectividade === "online" && (
              <CheckCircle className="w-3 h-3" />
            )}
            {conectividade === "offline" && (
              <WifiOff className="w-3 h-3" />
            )}
            {conectividade === "checking" && (
              <Wifi className="w-3 h-3 animate-pulse" />
            )}
            {conectividade === "online"
              ? "Online"
              : conectividade === "offline"
              ? "Offline"
              : "Verificando"}
          </Badge>

          {/* Notificações */}
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() =>
              setMostrarNotificacoes((prev) => !prev)
            }
          >
            <Bell className="w-5 h-5" />
            {naoLidas > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500">
                {naoLidas}
              </Badge>
            )}
          </Button>

          {/* Perfil */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMostrarPerfil((prev) => !prev)}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={usuario?.avatar || undefined} />
              <AvatarFallback>
                {usuario?.nome?.slice(0, 2).toUpperCase() || "PR"}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </Button>

          <Button variant="outline" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>
      </header>

      {/* Dropdowns flutuantes */}
      {mostrarNotificacoes && (
        <div className="fixed top-16 right-4 z-50 w-96">
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

      {/* Conteúdo principal */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna principal: turmas / disciplinas */}
          <div className="lg:col-span-3">
            {viewAtual === "turmas" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {turmas.map((t) => (
                  <Card
                    key={t.id}
                    onClick={() => handleTurmaClick(t)}
                    className={`cursor-pointer hover:shadow-lg transition-all border-0 ${
                      t.ativa ? "" : "opacity-70"
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${t.cor}`}
                          >
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {t.nomeSerie}
                            </h3>
                            <p className="text-xs text-gray-600">
                              Turma {t.nomeTurma}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{t.totalAlunos} alunos</span>
                        <Badge variant="outline" className="text-xs">
                          {t.disciplinas.length} disciplinas
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {t.disciplinas.slice(0, 3).map((d) => (
                          <Badge
                            key={d.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {d.nome}
                          </Badge>
                        ))}
                        {t.disciplinas.length > 3 && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            +{t.disciplinas.length - 3}
                          </Badge>
                        )}
                      </div>

                      {!t.ativa && (
                        <p className="text-xs text-gray-500 mt-2">
                          Turma inativa
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              turmaSelecionada && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Disciplinas – {turmaSelecionada.nomeSerie} (
                        Turma {turmaSelecionada.nomeTurma})
                      </h2>
                      <p className="text-sm text-gray-600">
                        {turmaSelecionada.totalAlunos} alunos
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVoltar}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Voltar às turmas
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turmaSelecionada.disciplinas.map((d) => (
                      <Card
                        key={d.id}
                        className="hover:shadow-md transition-all border-0 cursor-pointer"
                        onClick={() =>
                          toast.info(
                            "Tela detalhada da disciplina ainda será implementada."
                          )
                        }
                      >
                        <CardContent className="p-5">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${d.cor}`}
                          >
                            <Book className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {d.nome}
                          </h3>
                          <p className="text-xs text-gray-500 mb-3">
                            Turma {turmaSelecionada.nomeTurma}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {turmaSelecionada.totalAlunos} alunos
                            </span>
                            <span className="flex items-center gap-1">
                              Ver detalhes
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Sidebar direita */}
          <aside className="space-y-4">
            {/* Status conexão */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1 text-sm font-medium">
                  <Wifi className="w-4 h-4" />
                  Status da conexão
                </div>
                <div
                  className={`flex items-center gap-2 text-xs p-2 rounded ${
                    conectividade === "online"
                      ? "bg-green-50 text-green-700"
                      : conectividade === "offline"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {conectividade === "online" && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {conectividade === "offline" && (
                    <WifiOff className="w-4 h-4" />
                  )}
                  {conectividade === "checking" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>
                    {conectividade === "online"
                      ? "Conectado"
                      : conectividade === "offline"
                      ? "Sem conexão – alguns dados podem estar desatualizados"
                      : "Verificando..."}
                  </span>
                </div>
                {conectividade === "offline" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 text-xs"
                    onClick={carregarTurmasProfessor}
                  >
                    Tentar reconectar
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Comunicados placeholder */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <MessageSquare className="w-4 h-4" />
                  Comunicados
                </div>
                <p className="text-xs text-gray-600">
                  Em breve você verá aqui comunicados da coordenação.
                </p>
              </CardContent>
            </Card>

            {/* Horário Escolar compacto */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  Horários
                </div>
                <HorarioEscolar modoCompacto />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
