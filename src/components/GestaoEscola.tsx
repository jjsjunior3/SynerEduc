// src/components/GestaoEscola.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  GraduationCap,
  AlertCircle,
  Monitor,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";
import { Checkbox } from "./ui/checkbox";

interface GestaoEscolaProps {
  onVoltar: () => void;
}

interface Disciplina {
  id: string;
  nome: string;
  descricao: string | null;
  segmento: "ead" | "presencial" | null; // segmento do sistema
  ativa: boolean;
}

interface Serie {
  id: string;
  nome: string;
  nivel: string;           // nível educacional: 'fundamental', 'medio', etc.
  segmento: "ead" | "presencial" | null; // segmento do sistema
  totalAlunos: number;
  ativa: boolean;
}

// ─── helpers de label ───────────────────────────────────────────────
function labelSegmento(seg: string | null) {
  if (seg === "ead") return "EAD";
  if (seg === "presencial") return "Presencial";
  return "Todos";
}

function badgeSegmento(seg: string | null) {
  if (seg === "ead")
    return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";
  if (seg === "presencial")
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700";
  return "bg-muted text-muted-foreground border-border";
}

function labelNivel(nivel: string) {
  const map: Record<string, string> = {
    fundamental: "Ens. Fundamental",
    medio: "Ens. Médio",
  };
  return map[nivel] || nivel;
}

// ────────────────────────────────────────────────────────────────────

function GestaoEscola({ onVoltar }: GestaoEscolaProps) {
  const [abaSelecionada, setAbaSelecionada] = useState<"disciplinas" | "series">("disciplinas");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Disciplina | Serie | null>(null);

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Filtros de listagem
  const [filtroDisciplina, setFiltroDisciplina] = useState<"todos" | "ead" | "presencial">("todos");
  const [filtroSerie, setFiltroSerie] = useState<"todos" | "ead" | "presencial">("todos");

  const [formDisciplina, setFormDisciplina] = useState({
    nome: "",
    descricao: "",
    segmento: "" as "ead" | "presencial" | "",
    ativa: true,
  });

  const [formSerie, setFormSerie] = useState({
    nome: "",
    nivel: "fundamental" as string,
    segmento: "" as "ead" | "presencial" | "",
    ativa: true,
  });

  // ─── CARREGAR DADOS ──────────────────────────────────────────────

  async function carregarDisciplinas() {
    try {
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome, descricao, segmento, ativa")
        .order("nome", { ascending: true });

      if (error) throw error;

      const mapeadas: Disciplina[] = (data || []).map((d: any) => ({
        id: d.id,
        nome: d.nome || "Disciplina sem nome",
        descricao: d.descricao ?? null,
        segmento: (d.segmento === "ead" || d.segmento === "presencial") ? d.segmento : null,
        ativa: d.ativa ?? true,
      }));

      setDisciplinas(mapeadas);
    } catch (e: any) {
      console.error("[GestaoEscola] Erro ao carregar disciplinas:", e.message);
      toast.error("Erro ao carregar disciplinas.");
      setDisciplinas([]);
    }
  }

  async function carregarSeries() {
    try {
      // 1. Busca séries
      const { data: seriesData, error: seriesError } = await supabase
        .from("series")
        .select("id, nome, nivel, segmento, ativa")
        .order("nome", { ascending: true });

      if (seriesError) throw seriesError;

      // 2. Busca contagem de alunos agrupada por serie (campo texto em users)
      //    Retorna: [{ serie: "1ª série", count: 12 }, ...]
      const { data: contagemData, error: contagemError } = await supabase
        .from("users")
        .select("serie")
        .eq("tipo", "aluno")
        .eq("status", "ativo")
        .not("serie", "is", null);

      if (contagemError) throw contagemError;

      // 3. Monta mapa { nomeSerie -> quantidade }
      const mapaContagem: Record<string, number> = {};
      for (const u of contagemData || []) {
        if (u.serie) {
          mapaContagem[u.serie] = (mapaContagem[u.serie] || 0) + 1;
        }
      }

      // 4. Mapeia séries com contagem real
      const mapeadas: Serie[] = (seriesData || []).map((s: any) => ({
        id: s.id,
        nome: s.nome || "Série sem nome",
        nivel: s.nivel || "fundamental",
        segmento: (s.segmento === "ead" || s.segmento === "presencial") ? s.segmento : null,
        totalAlunos: mapaContagem[s.nome] || 0,
        ativa: s.ativa ?? true,
      }));

      setSeries(mapeadas);
    } catch (e: any) {
      console.error("[GestaoEscola] Erro ao carregar séries:", e.message);
      toast.error("Erro ao carregar séries.");
      setSeries([]);
    }
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([carregarDisciplinas(), carregarSeries()]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // ─── MODAL ───────────────────────────────────────────────────────

  const resetForms = () => {
    setFormDisciplina({ nome: "", descricao: "", segmento: "", ativa: true });
    setFormSerie({ nome: "", nivel: "fundamental", segmento: "", ativa: true });
  };

  const handleAbrirModal = (tipo: "disciplina" | "serie", item?: any) => {
    if (item) {
      setEditando(item);
      if (tipo === "disciplina") {
        setFormDisciplina({
          nome: item.nome,
          descricao: item.descricao ?? "",
          segmento: item.segmento ?? "",
          ativa: item.ativa,
        });
      } else {
        setFormSerie({
          nome: item.nome,
          nivel: item.nivel ?? "fundamental",
          segmento: item.segmento ?? "",
          ativa: item.ativa,
        });
      }
    } else {
      setEditando(null);
      resetForms();
    }
    setModalAberto(true);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    resetForms();
  };

  // ─── SALVAR / EXCLUIR DISCIPLINA ──────────────────────────────────

  const handleSalvarDisciplina = async () => {
    if (!formDisciplina.nome.trim()) {
      toast.error("Preencha o nome da disciplina");
      return;
    }

    const payload: any = {
      nome: formDisciplina.nome.trim(),
      descricao: formDisciplina.descricao.trim() || null,
      segmento: formDisciplina.segmento || null,
      ativa: formDisciplina.ativa,
    };

    try {
      if (editando) {
        const { error } = await supabase
          .from("disciplinas")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
        setDisciplinas((prev) =>
          prev.map((d) => (d.id === editando.id ? { ...d, ...payload } : d))
        );
        toast.success("Disciplina atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("disciplinas")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        const nova: Disciplina = { id: data?.id || Date.now().toString(), ...payload };
        setDisciplinas((prev) => [...prev, nova]);
        toast.success("Disciplina cadastrada com sucesso!");
      }
      handleFecharModal();
    } catch (e: any) {
      console.error("[GestaoEscola] Erro ao salvar disciplina:", e.message);
      toast.error("Erro ao salvar disciplina.");
    }
  };

  const handleExcluirDisciplina = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta disciplina?")) return;
    try {
      const { error } = await supabase.from("disciplinas").delete().eq("id", id);
      if (error) throw error;
      setDisciplinas((prev) => prev.filter((d) => d.id !== id));
      toast.success("Disciplina excluída com sucesso!");
    } catch (e: any) {
      console.error("[GestaoEscola] Erro ao excluir disciplina:", e.message);
      toast.error("Erro ao excluir disciplina.");
    }
  };

  // ─── SALVAR / EXCLUIR SÉRIE ───────────────────────────────────────

  const handleSalvarSerie = async () => {
    if (!formSerie.nome.trim()) {
      toast.error("Preencha o nome da série");
      return;
    }
    if (!formSerie.segmento) {
      toast.error("Selecione o segmento (EAD ou Presencial)");
      return;
    }

    const payload: any = {
      nome: formSerie.nome.trim(),
      nivel: formSerie.nivel,
      segmento: formSerie.segmento,
      ativa: formSerie.ativa,
    };

    try {
      if (editando) {
        const { error } = await supabase
          .from("series")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
        setSeries((prev) =>
          prev.map((s) => (s.id === editando.id ? { ...s, ...payload } : s))
        );
        toast.success("Série atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("series")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        const nova: Serie = {
          id: data?.id || Date.now().toString(),
          totalAlunos: 0,
          ...payload,
        };
        setSeries((prev) => [...prev, nova]);
        toast.success("Série cadastrada com sucesso!");
      }
      handleFecharModal();
    } catch (e: any) {
      console.error("[GestaoEscola] Erro ao salvar série:", e.message);
      toast.error("Erro ao salvar série.");
    }
  };

  const handleExcluirSerie = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta série?")) return;
    try {
      const { error } = await supabase.from("series").delete().eq("id", id);
      if (error) throw error;
      setSeries((prev) => prev.filter((s) => s.id !== id));
      toast.success("Série excluída com sucesso!");
    } catch (e: any) {
      console.error("[GestaoEscola] Erro ao excluir série:", e.message);
      toast.error("Erro ao excluir série.");
    }
  };

  // ─── LISTAS FILTRADAS ─────────────────────────────────────────────

  const disciplinasFiltradas = disciplinas.filter((d) => {
    if (filtroDisciplina === "todos") return true;
    return d.segmento === filtroDisciplina;
  });

  const seriesFiltradas = series.filter((s) => {
    if (filtroSerie === "todos") return true;
    return s.segmento === filtroSerie;
  });

  // ─── CONTADORES POR SEGMENTO ──────────────────────────────────────

  const contDisciplinas = {
    todos: disciplinas.length,
    ead: disciplinas.filter((d) => d.segmento === "ead").length,
    presencial: disciplinas.filter((d) => d.segmento === "presencial").length,
  };

  const contSeries = {
    todos: series.length,
    ead: series.filter((s) => s.segmento === "ead").length,
    presencial: series.filter((s) => s.segmento === "presencial").length,
  };

  // ─── SELECT STYLE (dark mode safe) ───────────────────────────────

  const selectClass =
    "col-span-3 px-3 py-2 rounded-lg border border-border bg-background text-foreground " +
    "focus:ring-2 focus:ring-ring focus:border-transparent text-sm";

  // ─── RENDER ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={onVoltar} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Gestão Escolar</h2>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700">
            Online
          </Badge>
        </div>
      </div>

      {/* Alert Informativo */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Os dados desta tela são salvos diretamente no banco de dados (Supabase).
          Disciplinas e séries cadastradas aqui são usadas nas outras telas do sistema.
        </AlertDescription>
      </Alert>

      {/* Conteúdo Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Cadastros</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={abaSelecionada}
            onValueChange={(v) => setAbaSelecionada(v as any)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="disciplinas" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Disciplinas
              </TabsTrigger>
              <TabsTrigger value="series" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Séries
              </TabsTrigger>
            </TabsList>

            {/* ══════════════ ABA DISCIPLINAS ══════════════ */}
            <TabsContent value="disciplinas" className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap justify-between items-center gap-3">
                {/* Filtro por segmento */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
                  {(["todos", "ead", "presencial"] as const).map((seg) => (
                    <button
                      key={seg}
                      onClick={() => setFiltroDisciplina(seg)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        filtroDisciplina === seg
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {seg === "todos" ? "Todas" : seg === "ead" ? "EAD" : "Presencial"}
                      <span className="ml-1.5 text-muted-foreground">
                        ({contDisciplinas[seg]})
                      </span>
                    </button>
                  ))}
                </div>

                <Button onClick={() => handleAbrirModal("disciplina")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Disciplina
                </Button>
              </div>

              {carregando && (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              )}

              <div className="space-y-2">
                {disciplinasFiltradas.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma disciplina encontrada</p>
                    <p className="text-sm">
                      {filtroDisciplina !== "todos"
                        ? `Não há disciplinas para o segmento ${labelSegmento(filtroDisciplina)}.`
                        : 'Clique em "Adicionar" para criar a primeira disciplina.'}
                    </p>
                  </div>
                ) : (
                  disciplinasFiltradas.map((disciplina) => (
                    <div
                      key={disciplina.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{disciplina.nome}</h3>
                          {disciplina.descricao && (
                            <p className="text-sm text-muted-foreground">{disciplina.descricao}</p>
                          )}
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {disciplina.segmento && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeSegmento(disciplina.segmento)}`}
                              >
                                {disciplina.segmento === "ead" ? (
                                  <Monitor className="w-3 h-3 mr-1" />
                                ) : (
                                  <Users className="w-3 h-3 mr-1" />
                                )}
                                {labelSegmento(disciplina.segmento)}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                disciplina.ativa
                                  ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {disciplina.ativa ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirModal("disciplina", disciplina)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluirDisciplina(disciplina.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ══════════════ ABA SÉRIES ══════════════ */}
            <TabsContent value="series" className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap justify-between items-center gap-3">
                {/* Filtro por segmento */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
                  {(["todos", "ead", "presencial"] as const).map((seg) => (
                    <button
                      key={seg}
                      onClick={() => setFiltroSerie(seg)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        filtroSerie === seg
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {seg === "todos" ? "Todas" : seg === "ead" ? "EAD" : "Presencial"}
                      <span className="ml-1.5 text-muted-foreground">
                        ({contSeries[seg]})
                      </span>
                    </button>
                  ))}
                </div>

                <Button onClick={() => handleAbrirModal("serie")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Série
                </Button>
              </div>

              {carregando && (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              )}

              <div className="space-y-2">
                {seriesFiltradas.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma série encontrada</p>
                    <p className="text-sm">
                      {filtroSerie !== "todos"
                        ? `Não há séries para o segmento ${labelSegmento(filtroSerie)}.`
                        : 'Clique em "Adicionar" para criar a primeira série.'}
                    </p>
                  </div>
                ) : (
                  seriesFiltradas.map((serie) => (
                    <div
                      key={serie.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{serie.nome}</h3>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {/* Nível educacional */}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted text-muted-foreground border-border">
                              {labelNivel(serie.nivel)}
                            </span>
                            {/* Segmento */}
                            {serie.segmento && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeSegmento(serie.segmento)}`}
                              >
                                {serie.segmento === "ead" ? (
                                  <Monitor className="w-3 h-3 mr-1" />
                                ) : (
                                  <Users className="w-3 h-3 mr-1" />
                                )}
                                {labelSegmento(serie.segmento)}
                              </span>
                            )}
                            {/* Alunos */}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted text-muted-foreground border-border">
                              {serie.totalAlunos} aluno(s)
                            </span>
                            {/* Status */}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                serie.ativa
                                  ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {serie.ativa ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirModal("serie", serie)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluirSerie(serie.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ══════════════ MODAL ══════════════ */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? abaSelecionada === "disciplinas"
                  ? "Editar Disciplina"
                  : "Editar Série"
                : abaSelecionada === "disciplinas"
                ? "Nova Disciplina"
                : "Nova Série"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {abaSelecionada === "disciplinas" ? (
              /* ── Formulário Disciplina ── */
              <>
                {/* Nome */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nomeDisciplina" className="text-right text-foreground">
                    Nome *
                  </Label>
                  <Input
                    id="nomeDisciplina"
                    value={formDisciplina.nome}
                    onChange={(e) =>
                      setFormDisciplina({ ...formDisciplina, nome: e.target.value })
                    }
                    placeholder="Ex: Matemática"
                    className="col-span-3"
                  />
                </div>

                {/* Descrição */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="descricaoDisciplina" className="text-right text-foreground">
                    Descrição
                  </Label>
                  <Input
                    id="descricaoDisciplina"
                    value={formDisciplina.descricao}
                    onChange={(e) =>
                      setFormDisciplina({ ...formDisciplina, descricao: e.target.value })
                    }
                    placeholder="Opcional"
                    className="col-span-3"
                  />
                </div>

                {/* Segmento EAD / Presencial */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="segmentoDisciplina" className="text-right text-foreground">
                    Segmento *
                  </Label>
                  <select
                    id="segmentoDisciplina"
                    value={formDisciplina.segmento}
                    onChange={(e) =>
                      setFormDisciplina({
                        ...formDisciplina,
                        segmento: e.target.value as "ead" | "presencial" | "",
                      })
                    }
                    className={selectClass}
                  >
                    <option value="">Selecione o segmento</option>
                    <option value="ead">EAD</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>

                {/* Ativa */}
                <div className="flex items-center gap-2 justify-end col-span-4">
                  <Checkbox
                    id="ativaDisciplina"
                    checked={formDisciplina.ativa}
                    onCheckedChange={(checked) =>
                      setFormDisciplina({ ...formDisciplina, ativa: !!checked })
                    }
                  />
                  <label
                    htmlFor="ativaDisciplina"
                    className="text-sm font-medium text-foreground leading-none cursor-pointer"
                  >
                    Disciplina ativa
                  </label>
                </div>
              </>
            ) : (
              /* ── Formulário Série ── */
              <>
                {/* Nome */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nomeSerie" className="text-right text-foreground">
                    Nome *
                  </Label>
                  <Input
                    id="nomeSerie"
                    value={formSerie.nome}
                    onChange={(e) =>
                      setFormSerie({ ...formSerie, nome: e.target.value })
                    }
                    placeholder="Ex: 1º Ano"
                    className="col-span-3"
                  />
                </div>

                {/* Nível educacional */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nivelSerie" className="text-right text-foreground">
                    Nível *
                  </Label>
                  <select
                    id="nivelSerie"
                    value={formSerie.nivel}
                    onChange={(e) =>
                      setFormSerie({ ...formSerie, nivel: e.target.value })
                    }
                    className={selectClass}
                  >
                    <option value="fundamental">Ensino Fundamental</option>
                    <option value="medio">Ensino Médio</option>
                  </select>
                </div>

                {/* Segmento EAD / Presencial */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="segmentoSerie" className="text-right text-foreground">
                    Segmento *
                  </Label>
                  <select
                    id="segmentoSerie"
                    value={formSerie.segmento}
                    onChange={(e) =>
                      setFormSerie({
                        ...formSerie,
                        segmento: e.target.value as "ead" | "presencial" | "",
                      })
                    }
                    className={selectClass}
                  >
                    <option value="">Selecione o segmento</option>
                    <option value="ead">EAD</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>

                {/* Ativa */}
                <div className="flex items-center gap-2 justify-end col-span-4">
                  <Checkbox
                    id="ativaSerie"
                    checked={formSerie.ativa}
                    onCheckedChange={(checked) =>
                      setFormSerie({ ...formSerie, ativa: !!checked })
                    }
                  />
                  <label
                    htmlFor="ativaSerie"
                    className="text-sm font-medium text-foreground leading-none cursor-pointer"
                  >
                    Série ativa
                  </label>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleFecharModal}>
              Cancelar
            </Button>
            <Button
              onClick={
                abaSelecionada === "disciplinas"
                  ? handleSalvarDisciplina
                  : handleSalvarSerie
              }
            >
              {editando ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GestaoEscola;