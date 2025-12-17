import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
// Icons
import {
  Bell,
  Calendar,
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
  Inbox, // Ícone para Atividades Recebidas
  Book   // ✅ Ícone que estava faltando
} from "lucide-react";
// Sub-components
import { Notificacoes } from "./Notificacoes";
import { PerfilUsuario } from "./PerfilUsuario";
import HorarioEscolar from "./HorarioEscolar";
import { AgendamentoAulasVivo } from "./AgendamentoAulasVivo";
import { BoletimProfessor } from "./BoletimProfessor";
import { DisciplinaProfessor } from "./DisciplinaProfessor";
import { AgendaProfessor } from "./AgendaProfessor";
import { AtividadesRecebidas } from "./AtividadesRecebidas"; // ✅ Novo Componente
import { SchoolHeader } from "./SchoolHeader";

type ViewType = "dashboard" | "atividades" | "boletim" | "agenda" | "horarios" | "aulas-vivo" | "disciplina";

interface SerieTurmaResumo {
  id: string; // ID da turma ou série (chave composta)
  nomeTurma: string;
  nomeSerie: string;
  serieId: string; // ✅ NOVO: ID real da série
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

export default function DashboardProfessor() {
  const { usuario, logout } = useAuth();
  // Estados de Navegação
  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [turmas, setTurmas] = useState<SerieTurmaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Estados de Seleção
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<any>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [serieHorario, setSerieHorario] = useState<string>("");
  const [visualizarHorario, setVisualizarHorario] = useState(false);
  // Estados de Interface
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  // Dados
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    if (usuario) {
      carregarTurmasProfessor();
      carregarComunicados();
      fetchNotificacoesCount();
      // Realtime para notificações
      const channel = supabase
        .channel('public:notificacoes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${usuario.id}` },
          () => { fetchNotificacoesCount(); }
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [usuario]);

  const fetchNotificacoesCount = async () => {
    if (!usuario) return;
    const { count } = await supabase
      .from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', usuario.id)
      .eq('lida', false);
    setNotificacoesNaoLidas(count || 0);
  };

  const carregarComunicados = async () => {
    try {
      const { data, error } = await supabase
        .from('comunicados')
        .select(`*, autor:users(nome, tipo)`)
        .or(`publico_alvo.eq.todos,publico_alvo.eq.todos-professores`)
        .order('criado_em', { ascending: false })
        .limit(10);
      if (error) throw error;
      const comunicadosFormatados = data.map(c => ({
        id: c.id,
        titulo: c.titulo,
        conteudo: c.conteudo,
        importante: c.importante,
        criado_em: c.criado_em,
        remetente: c.autor?.nome || 'Coordenação',
        cargo: c.autor?.tipo || 'Administração',
        lido: false
      }));
      setComunicados(comunicadosFormatados);
    } catch (error) {
      console.error("Erro ao carregar comunicados:", error);
    }
  };

  // ✅ CORREÇÃO DA CONSULTA SQL (Usando Joins)
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

      const mapTurmas = new Map<string, SerieTurmaResumo>();
      vinculos?.forEach((v: any) => {
        const turma = v.turmas;
        const serie = v.series;
        const disc = v.disciplinas;

        if (!disc) return;

        // Chave única para agrupar por Série e Turma
        const key = turma ? `turma_${turma.id}` : `serie_${serie?.id}`;
        const nomeSerie = serie?.nome || "Série não definida";
        const nomeTurma = turma?.nome || "Única";
        const serieId = serie?.id || ""; // ✅ NOVO: Captura o ID da série

        if (!mapTurmas.has(key)) {
          mapTurmas.set(key, {
            id: key,
            nomeTurma,
            nomeSerie,
            serieId, // ✅ NOVO: Adiciona o ID da série
            ativa: turma?.ativa ?? true,
            cor: disc.cor || "bg-blue-500",
            disciplinas: []
          });
        }
        const grupo = mapTurmas.get(key)!;
        // Evita duplicatas de disciplina no mesmo grupo
        if (!grupo.disciplinas.find(d => d.id === disc.id)) {
          grupo.disciplinas.push({
            id: disc.id,
            nome: disc.nome,
            cor: disc.cor || "bg-blue-500"
          });
        }
      });
      setTurmas(Array.from(mapTurmas.values()));
    } catch (error) {
      console.error("Erro ao carregar turmas:", error);
    } finally {
      setCarregando(false);
    }
  };

  const abrirDisciplina = (disciplina: any, turma: SerieTurmaResumo) => {
    setDisciplinaSelecionada({
      ...disciplina,
      turma: turma,     // ← TURMA AQUI
      serie: turma.nomeSerie
    });
    setTurmaSelecionada(turma);
    setViewAtual("disciplina");
  };

  // --- RENDERIZAÇÃO DAS VIEWS ---
  if (viewAtual === "disciplina" && disciplinaSelecionada) {
    return (
      <DisciplinaProfessor
        disciplina={disciplinaSelecionada}
        serie={disciplinaSelecionada.serie} // ✅ Agora é um objeto {id, nome}
        turma={disciplinaSelecionada.turma}
        onVoltar={() => setViewAtual("dashboard")}
      />
    );
  }

  // ✅ NOVA VIEW: Atividades Recebidas
  if (viewAtual === "atividades") {
    return <AtividadesRecebidas onVoltar={() => setViewAtual("dashboard")} />;
  }

  // Views que precisam de seleção prévia (Boletim e Agenda)
  if (viewAtual === "boletim") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); }} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
          </Button>
          {!turmaSelecionada ? (
            <Card className="max-w-md mx-auto mt-10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <h2 className="text-xl font-bold">Lançar Notas</h2>
                  <p className="text-gray-500 text-sm">Selecione a turma para acessar o diário.</p>
                </div>
                <Select onValueChange={(val) => setTurmaSelecionada(turmas.find(t => t.id === val) || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a turma..." /></SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nomeSerie} - {t.nomeTurma}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ) : (
            <BoletimProfessor 
              disciplina={{ id: turmaSelecionada.disciplinas[0]?.id, nome: turmaSelecionada.disciplinas[0]?.nome }}
              serie={{ id: turmaSelecionada.serieId, nome: turmaSelecionada.nomeSerie }} // ✅ Passando o ID da série
              onVoltar={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); }}
            />
          )}
        </div>
      </div>
    );
  }

  if (viewAtual === "agenda") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); }} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
          </Button>
          {!turmaSelecionada ? (
            <Card className="max-w-md mx-auto mt-10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto text-purple-600 mb-2" />
                  <h2 className="text-xl font-bold">Agenda da Turma</h2>
                  <p className="text-gray-500 text-sm">Selecione a turma para ver a agenda.</p>
                </div>
                <Select onValueChange={(val) => setTurmaSelecionada(turmas.find(t => t.id === val) || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a turma..." /></SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nomeSerie} - {t.nomeTurma}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ) : (
            <AgendaProfessor 
              disciplina={{ id: turmaSelecionada.disciplinas[0]?.id, nome: turmaSelecionada.disciplinas[0]?.nome }}
              serie={{ id: turmaSelecionada.serieId, nome: turmaSelecionada.nomeSerie }} // ✅ Passando o ID da série
              onVoltar={() => { setViewAtual("dashboard"); setTurmaSelecionada(null); }}
            />
          )}
        </div>
      </div>
    );
  }

  if (viewAtual === "horarios") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => setViewAtual("dashboard")} className="mb-4">
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
                  <SelectTrigger><SelectValue placeholder="Selecione a série..." /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(turmas.map(t => t.nomeSerie))).map(serie => (
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
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          {!turmaSelecionada ? (
            <Card className="max-w-md mx-auto mt-10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto text-rose-500 mb-2" />
                  <h2 className="text-xl font-bold">Aulas ao Vivo</h2>
                </div>
                <Select onValueChange={(val) => setTurmaSelecionada(turmas.find(t => t.id === val) || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a turma..." /></SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nomeSerie} - {t.nomeTurma}</SelectItem>
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
      </div>
    );
  }

  // --- DASHBOARD PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <SchoolHeader subtitle="Painel do Professor" />
          <div className="flex items-center gap-4">
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setMostrarNotificacoes(true)}>
                <Bell className="w-5 h-5 text-gray-500" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{usuario?.nome}</p>
                <p className="text-xs text-gray-500">Professor</p>
              </div>
              <div className="relative">
                <button onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)} className="focus:outline-none">
                  <Avatar className="h-9 w-9 border-2 border-gray-100">
                    <AvatarImage src={usuario?.avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {usuario?.nome?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                {mostrarMenuUsuario && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setMostrarMenuUsuario(false);
                        setMostrarPerfil(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Meu Perfil
                    </button>
                    <div className="border-t border-gray-200 my-2" />
                    {/* Botão Sair – mesmo layout, comportamento simplificado */}
                    <button
                      onClick={() => {
                        // fecha o menu
                        setMostrarMenuUsuario(false);
                        // executa o logout do contexto (já faz signOut e redireciona para /login)
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
      {mostrarNotificacoes && (
        <Notificacoes onClose={() => setMostrarNotificacoes(false)} onUpdate={fetchNotificacoesCount} />
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Boas-vindas (Sem botão solto) */}
        <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg p-8 md:p-10 overflow-visible pointer-events-none">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Olá, {usuario?.nome?.split(' ')[0]}! 👋</h1>
            <p className="text-blue-100 text-lg max-w-xl">
              Bem-vindo ao seu painel de controle.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>
        </section>
        {/* Acesso Rápido */}
          <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Botão Lançar Notas (Boletim) */}
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
              onClick={() => setViewAtual("boletim")}
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Lançar Notas
              </span>
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
              <span className="text-sm font-medium text-gray-700">
                Meu Horário
              </span>
            </Button>
          </div>
        </section>
        {/* Minhas Turmas e Comunicados */}
        <section>
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
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">{turmas.length} Turmas</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {carregando ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                  ) : turmas.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Book className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">Nenhuma turma vinculada.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {turmas.map((turma) => (
                        <Card key={turma.id} className="border hover:border-blue-300 transition-all hover:shadow-md">
                          <CardHeader className="pb-3 bg-gray-50">
                            <div className="flex justify-between">
                              <div>
                                <CardTitle className="text-base font-bold">{turma.nomeSerie}</CardTitle>
                                <p className="text-sm text-gray-500">Turma {turma.nomeTurma}</p>
                              </div>
                              <Badge variant="outline">{turma.disciplinas.length} disc.</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              {turma.disciplinas.map((disciplina) => (
                                <button key={disciplina.id} onClick={() => abrirDisciplina(disciplina, turma)} className="w-full flex items-center justify-between p-2 rounded border hover:bg-blue-50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 ${disciplina.cor} rounded flex items-center justify-center text-white text-xs`}>
                                      <BookOpen className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm font-medium">{disciplina.nome}</span>
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
                      <div className="text-center py-8 text-gray-500">Nenhum comunicado.</div>
                    ) : (
                      comunicados.map((comunicado) => (
                        <div key={comunicado.id} className={`p-4 rounded-xl border ${comunicado.importante ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                          <div className="flex gap-3">
                            <div className="mt-1">
                              {comunicado.importante ? <AlertCircle className="w-5 h-5 text-red-600" /> : <Info className="w-5 h-5 text-blue-600" />}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-gray-900">{comunicado.titulo}</h4>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-3">{comunicado.conteudo}</p>
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                                <span>{comunicado.remetente}</span>
                                <span>•</span>
                                <span>{new Date(comunicado.criado_em).toLocaleDateString()}</span>
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
      </main>
      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
    </div>
  );
}
