import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

// UI Components
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

// Icons
import {
  Bell,
  MessageSquare,
  Calendar,
  ArrowLeft,
  Settings,
  FileText,
  BarChart3,
  Users,
  Loader2,
  BookOpen,
  Video,
  GraduationCap,
  LogOut
} from "lucide-react";

// Sub-components
import { Notificacoes } from "./Notificacoes";
import { PerfilUsuario } from "./PerfilUsuario";
import HorarioEscolar from "./HorarioEscolar";
import { Forum } from "./Forum";
import { AgendamentoAulasVivo } from "./AgendamentoAulasVivo"; 
import { BoletimProfessor } from "./BoletimProfessor"; 
// ✅ NOVO IMPORT: Componente de Conteúdo da Disciplina
import { DisciplinaProfessor } from "./DisciplinaProfessor"; 

// ✅ Adicionado "disciplina" aos tipos de visualização
type ViewType = "dashboard" | "atividades" | "boletim" | "forum" | "horarios" | "aulas-vivo" | "disciplina";

interface SerieTurmaResumo {
  id: string;
  nomeTurma: string;
  nomeSerie: string;
  ativa: boolean;
  cor: string;
  disciplinas: { id: string; nome: string; cor: string }[];
}

export default function DashboardProfessor() {
  const { usuario, logout } = useAuth();

  // Estados de Interface
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [carregando, setCarregando] = useState(true);

  // Dados
  const [turmas, setTurmas] = useState<SerieTurmaResumo[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<SerieTurmaResumo | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);

  // Estados para o Seletor de Horário
  const [serieHorario, setSerieHorario] = useState("");
  const [visualizarHorario, setVisualizarHorario] = useState(false);

  // --- 1. BUSCA DE DADOS ---
  const carregarTurmasProfessor = useCallback(async () => {
    if (!usuario?.id) return;
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
        .eq("professor_id", usuario.id);

      if (error) throw error;

      const mapTurmas = new Map<string, SerieTurmaResumo>();

      vinculos?.forEach((v: any) => {
        const turma = v.turmas;
        const serie = v.series;
        const disc = v.disciplinas;

        if (!disc) return;

        const key = turma ? `turma_${turma.id}` : `serie_${serie?.id}`;
        const nomeSerie = serie?.nome || "Série não definida";
        const nomeTurma = turma?.nome || "Única";

        if (!mapTurmas.has(key)) {
          mapTurmas.set(key, {
            id: key,
            nomeTurma,
            nomeSerie,
            ativa: turma?.ativa ?? true,
            cor: disc.cor || "bg-blue-500",
            disciplinas: []
          });
        }

        const grupo = mapTurmas.get(key)!;
        if (!grupo.disciplinas.find(d => d.id === disc.id)) {
          grupo.disciplinas.push({
            id: disc.id,
            nome: disc.nome,
            cor: disc.cor || "bg-blue-500"
          });
        }
      });

      setTurmas(Array.from(mapTurmas.values()));
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    carregarTurmasProfessor();
  }, [carregarTurmasProfessor]);

  // --- FUNÇÃO PARA ABRIR DISCIPLINA (CONTEÚDO) ---
  const abrirDisciplina = (disciplina: { id: string; nome: string; cor: string }, turma: SerieTurmaResumo) => {
    const turmaFocada = {
      ...turma,
      disciplinas: [disciplina]
    };
    setTurmaSelecionada(turmaFocada);
    // ✅ MUDANÇA: Agora abre a view "disciplina" (Conteúdo) em vez de "boletim"
    setViewAtual("disciplina"); 
  };

  // --- RENDERIZAÇÃO DAS VIEWS ---

  if (mostrarPerfil) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Button variant="ghost" onClick={() => setMostrarPerfil(false)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <PerfilUsuario />
      </div>
    );
  }

  // ✅ NOVA VIEW: CONTEÚDO DA DISCIPLINA
  if (viewAtual === "disciplina" && turmaSelecionada) {
    return (
      // Renderiza o componente de conteúdo, passando a função de voltar
      <DisciplinaProfessor 
        disciplina={turmaSelecionada.disciplinas[0]}
        serie={{ id: turmaSelecionada.id, nome: turmaSelecionada.nomeSerie }}
        onVoltar={() => {
          setViewAtual("dashboard");
          setTurmaSelecionada(null);
        }}
      />
    );
  }

  if (viewAtual === "horarios") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => setViewAtual("dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
          </Button>

          {!visualizarHorario ? (
            <Card className="max-w-md mx-auto mt-10">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-center">Visualizar Horários</h2>
                <p className="text-center text-gray-500 text-sm">Selecione a série para ver a grade horária.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select value={serieHorario} onValueChange={setSerieHorario}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(turmas.map(t => t.nomeSerie))).map(serie => (
                        <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!serieHorario} onClick={() => setVisualizarHorario(true)}>
                  Visualizar Grade
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Horário: {serieHorario}</h2>
                <Button variant="outline" onClick={() => setVisualizarHorario(false)}>Trocar Série</Button>
              </div>
              <HorarioEscolar turmaSelecionada={serieHorario} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewAtual === "aulas-vivo") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); }} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Aulas ao Vivo</h1>
          {!turmaSelecionada ? (
            <Card className="max-w-md mx-auto mt-10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto text-rose-500 mb-2" />
                  <h2 className="text-xl font-bold">Gerenciar Aulas</h2>
                  <p className="text-gray-500 text-sm">Selecione a turma para agendar ou editar aulas.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turma / Disciplina</label>
                  <Select onValueChange={(val) => setTurmaSelecionada(turmas.find(t => t.id === val) || null)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {turmas.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nomeSerie} - {t.nomeTurma} ({t.disciplinas.map(d => d.nome).join(", ")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div>
                  <h3 className="font-bold text-gray-900">{turmaSelecionada.nomeSerie}</h3>
                  <p className="text-sm text-gray-500">Disciplina: {turmaSelecionada.disciplinas[0]?.nome}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTurmaSelecionada(null)}>Trocar Turma</Button>
              </div>
              <AgendamentoAulasVivo disciplinaId={turmaSelecionada.disciplinas[0]?.id} nomeDisciplina={turmaSelecionada.disciplinas[0]?.nome} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewAtual === "boletim") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); }} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Lançamento de Notas</h1>
          {!turmaSelecionada ? (
            <Card className="max-w-md mx-auto mt-10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <h2 className="text-xl font-bold">Selecionar Diário</h2>
                  <p className="text-gray-500 text-sm">Escolha a turma para lançar as notas.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turma / Disciplina</label>
                  <Select onValueChange={(val) => setTurmaSelecionada(turmas.find(t => t.id === val) || null)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {turmas.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nomeSerie} - {t.nomeTurma} ({t.disciplinas.map(d => d.nome).join(", ")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div>
                  <h3 className="font-bold text-gray-900">{turmaSelecionada.nomeSerie}</h3>
                  <p className="text-sm text-gray-500">Disciplina: {turmaSelecionada.disciplinas[0]?.nome}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTurmaSelecionada(null)}>Trocar Turma</Button>
              </div>

              <BoletimProfessor 
                disciplina={{ 
                  id: turmaSelecionada.disciplinas[0]?.id, 
                  nome: turmaSelecionada.disciplinas[0]?.nome 
                }}
                serie={{ 
                  id: turmaSelecionada.id, 
                  nome: turmaSelecionada.nomeSerie 
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewAtual === "atividades") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => setViewAtual("dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Gestão de Atividades</h2>
              <p className="text-gray-500">O componente de criar atividades será carregado aqui.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (viewAtual === "forum") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Button variant="ghost" onClick={() => setViewAtual("dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </Button>
        <Forum />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AVA Conexão EAD</h1>
              <p className="text-xs text-gray-500">Portal do Professor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:bg-gray-100" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}>
              <Bell className="w-5 h-5" />
              {naoLidas > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{usuario?.nome}</p>
                <p className="text-xs text-gray-500">Professor</p>
              </div>
              <Avatar className="cursor-pointer border-2 border-white shadow-sm" onClick={() => setMostrarPerfil(true)}>
                <AvatarImage src={usuario?.avatar || undefined} />
                <AvatarFallback>{usuario?.nome?.slice(0, 2).toUpperCase() || "PR"}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={logout} className="text-red-500 hover:bg-red-50 hover:text-red-600">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        {mostrarNotificacoes && (
          <div className="absolute right-4 top-16 w-96 z-50">
            <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-600 mb-2">Olá, {usuario?.nome?.toUpperCase()}! 👋</h1>
          <p className="text-gray-600">Gerencie suas turmas, notas e atividades por aqui.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Button onClick={() => setViewAtual("atividades")} variant="outline" className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-blue-50 border-blue-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
            <span className="text-sm font-medium text-gray-700">Atividades</span>
          </Button>
          <Button onClick={() => setViewAtual("boletim")} variant="outline" className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-green-50 border-green-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><BarChart3 className="w-5 h-5 text-green-600" /></div>
            <span className="text-sm font-medium text-gray-700">Lançar Notas</span>
          </Button>
          <Button onClick={() => setViewAtual("aulas-vivo")} variant="outline" className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-rose-50 border-rose-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center"><Video className="w-5 h-5 text-rose-600" /></div>
            <span className="text-sm font-medium text-gray-700">Aulas ao Vivo</span>
          </Button>
          <Button onClick={() => setViewAtual("forum")} variant="outline" className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-purple-50 border-purple-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><MessageSquare className="w-5 h-5 text-purple-600" /></div>
            <span className="text-sm font-medium text-gray-700">Fórum</span>
          </Button>
          <Button onClick={() => setViewAtual("horarios")} variant="outline" className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-orange-50 border-orange-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><Calendar className="w-5 h-5 text-orange-600" /></div>
            <span className="text-sm font-medium text-gray-700">Horários</span>
          </Button>
          <Button onClick={() => setMostrarPerfil(true)} variant="outline" className="p-6 h-auto flex flex-col items-center gap-3 hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Settings className="w-5 h-5 text-gray-600" /></div>
            <span className="text-sm font-medium text-gray-700">Perfil</span>
          </Button>
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-blue-600">Minhas Turmas</h2>
            <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">{turmas.length} turmas</Badge>
          </div>

          {carregando ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : turmas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Nenhuma turma vinculada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {turmas.map((t) => (
                <Card key={t.id} className="group hover:shadow-xl transition-all bg-white border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{t.nomeSerie}</h3>
                        <p className="text-sm text-gray-600 mt-1">{t.nomeTurma === "Única" ? "Turma Única" : `Turma ${t.nomeTurma}`}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50"><Users className="w-5 h-5 text-blue-600" /></div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 mt-4">
                        {t.disciplinas.map((d) => (
                          <Badge 
                            key={d.id} 
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            onClick={() => abrirDisciplina(d, t)}
                          >
                            {d.nome}
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
      </main>
    </div>
  );
}
