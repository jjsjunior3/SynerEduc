// src/components/GestaoEscola.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft, Plus, Edit2, Trash2, BookOpen, GraduationCap,
  AlertCircle, Monitor, Users, LayoutGrid,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";
import { Checkbox } from "./ui/checkbox";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface GestaoEscolaProps {
  onVoltar: () => void;
  segmentoForcado?: "ead" | "presencial";
}

interface Disciplina {
  id: string;
  nome: string;
  nivel: NivelDisciplina | null;
  segmento: "ead" | "presencial" | null;
  ativa: boolean;
}

interface Serie {
  id: string;
  nome: string;
  nivel: NivelSerie;
  segmento: "ead" | "presencial" | null;
  turno: string | null; // turno da turma vinculada (só presencial)
  totalAlunos: number;
  ativa: boolean;
}

type NivelDisciplina = "Fundamental I" | "Fundamental II" | "Ensino Médio";
type NivelSerie      = "fundamental" | "medio";
type Turno           = "matutino" | "vespertino" | "noturno";

const NIVEIS_DISCIPLINA: NivelDisciplina[] = ["Fundamental I", "Fundamental II", "Ensino Médio"];
const NIVEIS_SERIE: { value: NivelSerie; label: string }[] = [
  { value: "fundamental", label: "Ensino Fundamental" },
  { value: "medio",       label: "Ensino Médio" },
];
const TURNOS: { value: Turno; label: string }[] = [
  { value: "matutino",   label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
  { value: "noturno",    label: "Noturno" },
];

const ANO_ATUAL = new Date().getFullYear();

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function badgeNivelDisciplina(nivel: NivelDisciplina | null) {
  if (nivel === "Fundamental I")  return "bg-sky-100    text-sky-800    border-sky-300    dark:bg-sky-900/40    dark:text-sky-300    dark:border-sky-700";
  if (nivel === "Fundamental II") return "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700";
  if (nivel === "Ensino Médio")   return "bg-amber-100  text-amber-800  border-amber-300  dark:bg-amber-900/40  dark:text-amber-300  dark:border-amber-700";
  return "bg-muted text-muted-foreground border-border";
}

function badgeNivelSerie(nivel: NivelSerie) {
  if (nivel === "fundamental") return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700";
  if (nivel === "medio")       return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700";
  return "bg-muted text-muted-foreground border-border";
}

const selectClass =
  "col-span-3 px-3 py-2 rounded-lg border border-border bg-background text-foreground " +
  "focus:ring-2 focus:ring-ring focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed";

function StatCard({ label, value, color, active, onClick }: {
  label: string; value: number; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex-1 min-w-0 rounded-xl border p-3 text-left transition-all duration-150 ${
        active ? `${color} shadow-sm ring-2 ring-offset-1 ring-current/30` : "border-border bg-card hover:bg-muted/60"
      }`}>
      <p className={`text-2xl font-bold ${active ? "" : "text-foreground"}`}>{value}</p>
      <p className={`text-xs font-medium mt-0.5 ${active ? "" : "text-muted-foreground"}`}>{label}</p>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
function GestaoEscola({ onVoltar, segmentoForcado }: GestaoEscolaProps) {
  const [abaSelecionada, setAbaSelecionada] = useState<"disciplinas" | "series">("disciplinas");
  const [modalAberto, setModalAberto]       = useState(false);
  const [editando, setEditando]             = useState<Disciplina | Serie | null>(null);
  const [disciplinas, setDisciplinas]       = useState<Disciplina[]>([]);
  const [series, setSeries]                 = useState<Serie[]>([]);
  const [carregando, setCarregando]         = useState(false);

  const [filtroNivelDisc, setFiltroNivelDisc]   = useState<NivelDisciplina | "todos">("todos");
  const [filtroNivelSerie, setFiltroNivelSerie] = useState<NivelSerie | "todos">("todos");

  const [confirmarExcluirDisciplina, setConfirmarExcluirDisciplina] = useState<Disciplina | null>(null);
  const [confirmarExcluirSerie, setConfirmarExcluirSerie]           = useState<Serie | null>(null);

  const [formDisciplina, setFormDisciplina] = useState({
    nome: "", nivel: "" as NivelDisciplina | "",
    segmento: (segmentoForcado ?? "") as "ead" | "presencial" | "", ativa: true,
  });

  // ✅ turno adicionado ao formSerie
  const [formSerie, setFormSerie] = useState({
    nome: "", nivel: "fundamental" as NivelSerie,
    segmento: (segmentoForcado ?? "") as "ead" | "presencial" | "",
    turno: "" as Turno | "",
    ativa: true,
  });

  // ─── Loaders ────────────────────────────────────────────────────────────────
  async function carregarDisciplinas() {
    try {
      let query = supabase
        .from("disciplinas").select("id, nome, descricao, segmento, ativa")
        .order("nome", { ascending: true });
      if (segmentoForcado) query = query.eq("segmento", segmentoForcado);
      const { data, error } = await query;
      if (error) throw error;
      setDisciplinas((data || []).map((d: any) => ({
        id: d.id, nome: d.nome || "Disciplina sem nome",
        nivel: NIVEIS_DISCIPLINA.includes(d.descricao) ? d.descricao : null,
        segmento: d.segmento === "ead" || d.segmento === "presencial" ? d.segmento : null,
        ativa: d.ativa ?? true,
      })));
    } catch { toast.error("Erro ao carregar disciplinas."); setDisciplinas([]); }
  }

  async function carregarSeries() {
    try {
      let query = supabase
        .from("series").select("id, nome, nivel, segmento, ativa")
        .order("nome", { ascending: true });
      if (segmentoForcado) query = query.eq("segmento", segmentoForcado);
      const { data: seriesData, error } = await query;
      if (error) throw error;

      // Busca contagem de alunos
      const { data: contagemData } = await supabase
        .from("users").select("serie").eq("tipo", "aluno").eq("status", "ativo").not("serie", "is", null);
      const mapaContagem: Record<string, number> = {};
      for (const u of contagemData || []) {
        if (u.serie) mapaContagem[u.serie] = (mapaContagem[u.serie] || 0) + 1;
      }

      // ✅ Busca turno da turma vinculada a cada série (ano atual)
      const serieIds = (seriesData || []).map((s: any) => s.id);
      const { data: turmasData } = serieIds.length > 0
        ? await supabase.from("turmas").select("serie_id, turno").in("serie_id", serieIds).eq("ano", ANO_ATUAL)
        : { data: [] };
      const mapaTurno: Record<string, string | null> = {};
      for (const t of turmasData || []) {
        mapaTurno[t.serie_id] = t.turno ?? null;
      }

      setSeries((seriesData || []).map((s: any) => ({
        id: s.id, nome: s.nome || "Série sem nome",
        nivel: s.nivel === "medio" ? "medio" : "fundamental",
        segmento: s.segmento === "ead" || s.segmento === "presencial" ? s.segmento : null,
        turno: mapaTurno[s.id] ?? null,
        totalAlunos: mapaContagem[s.nome] || 0,
        ativa: s.ativa ?? true,
      })));
    } catch { toast.error("Erro ao carregar séries."); setSeries([]); }
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([carregarDisciplinas(), carregarSeries()]);
    setCarregando(false);
  }

  useEffect(() => { carregarTudo(); }, []);

  // ─── Modal ───────────────────────────────────────────────────────────────────
  const resetForms = () => {
    setFormDisciplina({ nome: "", nivel: "", segmento: segmentoForcado ?? "", ativa: true });
    // ✅ turno zerado no reset
    setFormSerie({ nome: "", nivel: "fundamental", segmento: segmentoForcado ?? "", turno: "", ativa: true });
  };

  const handleAbrirModal = (tipo: "disciplina" | "serie", item?: any) => {
    if (item) {
      setEditando(item);
      if (tipo === "disciplina") {
        setFormDisciplina({
          nome: item.nome, nivel: item.nivel ?? "",
          segmento: item.segmento ?? (segmentoForcado ?? ""), ativa: item.ativa,
        });
      } else {
        // ✅ turno preenchido ao editar
        setFormSerie({
          nome: item.nome, nivel: item.nivel ?? "fundamental",
          segmento: item.segmento ?? (segmentoForcado ?? ""),
          turno: (item.turno ?? "") as Turno | "",
          ativa: item.ativa,
        });
      }
    } else {
      setEditando(null);
      resetForms();
    }
    setModalAberto(true);
  };

  const handleFecharModal = () => { setModalAberto(false); setEditando(null); resetForms(); };

  // ─── Salvar Disciplina ───────────────────────────────────────────────────────
  const handleSalvarDisciplina = async () => {
    if (!formDisciplina.nome.trim()) { toast.error("Preencha o nome da disciplina"); return; }
    if (!formDisciplina.nivel)       { toast.error("Selecione o nível da disciplina"); return; }
    const payload: any = {
      nome: formDisciplina.nome.trim(), descricao: formDisciplina.nivel || null,
      segmento: formDisciplina.segmento || null, ativa: formDisciplina.ativa,
    };
    try {
      if (editando) {
        const { error } = await supabase.from("disciplinas").update(payload).eq("id", editando.id);
        if (error) throw error;
        setDisciplinas(prev => prev.map(d =>
          d.id === editando.id ? { ...d, nome: payload.nome, nivel: formDisciplina.nivel as NivelDisciplina, segmento: payload.segmento, ativa: payload.ativa } : d
        ));
        toast.success("Disciplina atualizada!");
      } else {
        const { data, error } = await supabase.from("disciplinas").insert(payload).select("id").single();
        if (error) throw error;
        setDisciplinas(prev => [...prev, { id: data?.id || Date.now().toString(), nome: payload.nome, nivel: formDisciplina.nivel as NivelDisciplina, segmento: payload.segmento, ativa: payload.ativa }]);
        toast.success("Disciplina cadastrada!");
      }
      handleFecharModal();
    } catch { toast.error("Erro ao salvar disciplina."); }
  };

  const handleExcluirDisciplina = async () => {
    if (!confirmarExcluirDisciplina) return;
    try {
      const { error } = await supabase.from("disciplinas").delete().eq("id", confirmarExcluirDisciplina.id);
      if (error) throw error;
      setDisciplinas(prev => prev.filter(d => d.id !== confirmarExcluirDisciplina.id));
      toast.success("Disciplina excluída!");
    } catch { toast.error("Erro ao excluir disciplina."); }
    finally { setConfirmarExcluirDisciplina(null); }
  };

  // ─── Salvar Série ─────────────────────────────────────────────────────────────
  const handleSalvarSerie = async () => {
    if (!formSerie.nome.trim()) { toast.error("Preencha o nome da série"); return; }
    if (!formSerie.segmento)   { toast.error("Selecione o segmento"); return; }

    // ✅ Turno obrigatório para presencial
    if (formSerie.segmento === "presencial" && !formSerie.turno) {
      toast.error("Selecione o turno para séries presenciais"); return;
    }

    const payload: any = {
      nome: formSerie.nome.trim(), nivel: formSerie.nivel,
      segmento: formSerie.segmento, ativa: formSerie.ativa,
    };

    try {
      if (editando) {
        // ── Edição ──
        const { error } = await supabase.from("series").update(payload).eq("id", editando.id);
        if (error) throw error;

        // ✅ Se presencial, atualiza a turma vinculada (cria se não existir)
        if (formSerie.segmento === "presencial") {
          const { data: turmaExistente } = await supabase
            .from("turmas").select("id")
            .eq("serie_id", editando.id).eq("ano", ANO_ATUAL).maybeSingle();

          if (turmaExistente) {
            await supabase.from("turmas").update({
              nome:     formSerie.nome.trim(),
              turno:    formSerie.turno || null,
              segmento: "presencial",
              ativa:    formSerie.ativa,
            }).eq("id", turmaExistente.id);
          } else {
            await supabase.from("turmas").insert({
              nome:     formSerie.nome.trim(),
              serie_id: editando.id,
              ano:      ANO_ATUAL,
              segmento: "presencial",
              turno:    formSerie.turno || null,
              ativa:    formSerie.ativa,
              total_alunos: 0,
            });
          }
        }

        setSeries(prev => prev.map(s =>
          s.id === editando.id
            ? { ...s, ...payload, turno: formSerie.turno || null }
            : s
        ));
        toast.success("Série atualizada!");

      } else {
        // ── Criação ──
        const { data, error } = await supabase.from("series").insert(payload).select("id").single();
        if (error) throw error;

        const novaSerieId = data?.id || Date.now().toString();

        // ✅ Auto-cria turma para segmento presencial
        if (formSerie.segmento === "presencial" && novaSerieId) {
          const { error: turmaError } = await supabase.from("turmas").insert({
            nome:         formSerie.nome.trim(),
            serie_id:     novaSerieId,
            ano:          ANO_ATUAL,
            segmento:     "presencial",
            turno:        formSerie.turno || null,
            ativa:        formSerie.ativa,
            total_alunos: 0,
          });

          if (turmaError) {
            // Série foi criada mas turma falhou — avisa sem reverter a série
            console.warn("[GestaoEscola] Turma não criada:", turmaError);
            toast.warning("Série criada, mas turma não foi gerada automaticamente. Verifique permissões.");
          }
        }

        setSeries(prev => [...prev, {
          id: novaSerieId, totalAlunos: 0,
          turno: formSerie.turno || null,
          ...payload
        }]);
        toast.success(
          formSerie.segmento === "presencial"
            ? "Série e turma criadas com sucesso!"
            : "Série cadastrada!"
        );
      }
      handleFecharModal();
    } catch { toast.error("Erro ao salvar série."); }
  };

  const handleExcluirSerie = async () => {
    if (!confirmarExcluirSerie) return;
    const { id } = confirmarExcluirSerie;
    try {
      const { error: erroTurmas } = await supabase.from("turmas").delete().eq("serie_id", id);
      if (erroTurmas) throw erroTurmas;
      const { error: erroSerie } = await supabase.from("series").delete().eq("id", id);
      if (erroSerie) throw erroSerie;
      setSeries(prev => prev.filter(s => s.id !== id));
      toast.success("Série e turmas excluídas!");
    } catch { toast.error("Erro ao excluir série."); }
    finally { setConfirmarExcluirSerie(null); }
  };

  // ─── Filtros e contagens ─────────────────────────────────────────────────────
  const disciplinasFiltradas = disciplinas.filter(d =>
    filtroNivelDisc === "todos" ? true : d.nivel === filtroNivelDisc
  );
  const seriesFiltradas = series.filter(s =>
    filtroNivelSerie === "todos" ? true : s.nivel === filtroNivelSerie
  );
  const statsDisc = {
    todos: disciplinas.length,
    "Fundamental I":  disciplinas.filter(d => d.nivel === "Fundamental I").length,
    "Fundamental II": disciplinas.filter(d => d.nivel === "Fundamental II").length,
    "Ensino Médio":   disciplinas.filter(d => d.nivel === "Ensino Médio").length,
    semNivel: disciplinas.filter(d => !d.nivel).length,
  };
  const statsSerie = {
    todos: series.length,
    fundamental: series.filter(s => s.nivel === "fundamental").length,
    medio:       series.filter(s => s.nivel === "medio").length,
    totalAlunos: series.reduce((acc, s) => acc + s.totalAlunos, 0),
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={onVoltar} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gestão Escolar</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie disciplinas e séries{segmentoForcado ? ` do segmento ${segmentoForcado}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {segmentoForcado && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${badgeSegmento(segmentoForcado)}`}>
              {segmentoForcado === "ead" ? <Monitor className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {labelSegmento(segmentoForcado)}
            </span>
          )}
          <Badge variant="outline" className="gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            {disciplinas.length} disc. · {series.length} séries
          </Badge>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Dados salvos diretamente no Supabase. Ao criar uma série presencial, a turma correspondente é gerada automaticamente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-0">
          <Tabs value={abaSelecionada} onValueChange={(v) => setAbaSelecionada(v as any)}>
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="disciplinas" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Disciplinas
                  <span className="ml-1 text-xs opacity-70">({disciplinas.length})</span>
                </TabsTrigger>
                <TabsTrigger value="series" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Séries
                  <span className="ml-1 text-xs opacity-70">({series.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── ABA DISCIPLINAS (inalterada) ── */}
            <TabsContent value="disciplinas" className="p-4 space-y-4">
              <div className="flex gap-2 sm:gap-3">
                <StatCard label="Total" value={statsDisc.todos} color="border-primary bg-primary/10 text-primary" active={filtroNivelDisc === "todos"} onClick={() => setFiltroNivelDisc("todos")} />
                <StatCard label="Fund. I" value={statsDisc["Fundamental I"]} color="border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" active={filtroNivelDisc === "Fundamental I"} onClick={() => setFiltroNivelDisc("Fundamental I")} />
                <StatCard label="Fund. II" value={statsDisc["Fundamental II"]} color="border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" active={filtroNivelDisc === "Fundamental II"} onClick={() => setFiltroNivelDisc("Fundamental II")} />
                <StatCard label="Ens. Médio" value={statsDisc["Ensino Médio"]} color="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" active={filtroNivelDisc === "Ensino Médio"} onClick={() => setFiltroNivelDisc("Ensino Médio")} />
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {filtroNivelDisc === "todos" ? `Exibindo todas as ${disciplinasFiltradas.length} disciplinas` : `${disciplinasFiltradas.length} disciplina(s) em ${filtroNivelDisc}`}
                </p>
                <Button onClick={() => handleAbrirModal("disciplina")} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Disciplina
                </Button>
              </div>
              {carregando && <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>}
              <div className="space-y-2">
                {disciplinasFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Nenhuma disciplina encontrada</p>
                    <p className="text-xs mt-1">{filtroNivelDisc !== "todos" ? `Não há disciplinas em ${filtroNivelDisc}. Clique em "Total" para ver todas.` : "Adicione a primeira disciplina acima."}</p>
                  </div>
                ) : disciplinasFiltradas.map(disc => (
                  <div key={disc.id} className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-xl bg-background hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">{disc.nome}</h3>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {disc.nivel && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeNivelDisciplina(disc.nivel)}`}>{disc.nivel}</span>}
                          {disc.segmento && !segmentoForcado && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeSegmento(disc.segmento)}`}>
                              {disc.segmento === "ead" ? <Monitor className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                              {labelSegmento(disc.segmento)}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${disc.ativa ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" : "bg-muted text-muted-foreground border-border"}`}>{disc.ativa ? "Ativa" : "Inativa"}</span>
                          {!disc.nivel && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><AlertCircle className="w-3 h-3" /> Sem nível</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleAbrirModal("disciplina", disc)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmarExcluirDisciplina(disc)} className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              {statsDisc.semNivel > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {statsDisc.semNivel} disciplina(s) sem nível definido — edite-as para corrigir.
                </div>
              )}
            </TabsContent>

            {/* ── ABA SÉRIES ── */}
            <TabsContent value="series" className="p-4 space-y-4">
              <div className="flex gap-2 sm:gap-3">
                <StatCard label="Total" value={statsSerie.todos} color="border-primary bg-primary/10 text-primary" active={filtroNivelSerie === "todos"} onClick={() => setFiltroNivelSerie("todos")} />
                <StatCard label="Fundamental" value={statsSerie.fundamental} color="border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" active={filtroNivelSerie === "fundamental"} onClick={() => setFiltroNivelSerie("fundamental")} />
                <StatCard label="Ensino Médio" value={statsSerie.medio} color="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" active={filtroNivelSerie === "medio"} onClick={() => setFiltroNivelSerie("medio")} />
                <StatCard label="Alunos ativos" value={statsSerie.totalAlunos} color="border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" active={false} onClick={() => {}} />
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {filtroNivelSerie === "todos" ? `Exibindo todas as ${seriesFiltradas.length} séries` : `${seriesFiltradas.length} série(s) — ${filtroNivelSerie === "fundamental" ? "Ens. Fundamental" : "Ens. Médio"}`}
                </p>
                <Button onClick={() => handleAbrirModal("serie")} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Série
                </Button>
              </div>
              {carregando && <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>}
              <div className="space-y-2">
                {seriesFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Nenhuma série encontrada</p>
                    <p className="text-xs mt-1">{filtroNivelSerie !== "todos" ? `Não há séries nesse nível. Clique em "Total" para ver todas.` : "Adicione a primeira série acima."}</p>
                  </div>
                ) : seriesFiltradas.map(serie => (
                  <div key={serie.id} className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-xl bg-background hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">{serie.nome}</h3>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeNivelSerie(serie.nivel)}`}>
                            {serie.nivel === "fundamental" ? "Ens. Fundamental" : "Ens. Médio"}
                          </span>
                          {serie.segmento && !segmentoForcado && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeSegmento(serie.segmento)}`}>
                              {serie.segmento === "ead" ? <Monitor className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                              {labelSegmento(serie.segmento)}
                            </span>
                          )}
                          {/* ✅ Exibe turno da turma vinculada */}
                          {serie.turno && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted text-muted-foreground border-border capitalize">
                              {serie.turno}
                            </span>
                          )}
                          {/* ✅ Alerta se presencial sem turma */}
                          {serie.segmento === "presencial" && !serie.turno && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <AlertCircle className="w-3 h-3" /> Sem turma
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted text-muted-foreground border-border">
                            {serie.totalAlunos} aluno(s)
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${serie.ativa ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" : "bg-muted text-muted-foreground border-border"}`}>
                            {serie.ativa ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleAbrirModal("serie", serie)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmarExcluirSerie(serie)} className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ══ MODAL ══ */}
      <Dialog open={modalAberto} onOpenChange={handleFecharModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? abaSelecionada === "disciplinas" ? "Editar Disciplina" : "Editar Série"
                : abaSelecionada === "disciplinas" ? "Nova Disciplina"   : "Nova Série"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">

            {/* ── Formulário Disciplina ── */}
            {abaSelecionada === "disciplinas" ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nomeDisciplina" className="text-right text-foreground">Nome *</Label>
                  <Input id="nomeDisciplina" value={formDisciplina.nome} onChange={e => setFormDisciplina({ ...formDisciplina, nome: e.target.value })} placeholder="Ex: Matemática" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nivelDisciplina" className="text-right text-foreground">Nível *</Label>
                  <select id="nivelDisciplina" value={formDisciplina.nivel} onChange={e => setFormDisciplina({ ...formDisciplina, nivel: e.target.value as NivelDisciplina | "" })} className={selectClass}>
                    <option value="">Selecione o nível</option>
                    {NIVEIS_DISCIPLINA.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="segmentoDisciplina" className="text-right text-foreground">Segmento *</Label>
                  {segmentoForcado ? (
                    <div className={`col-span-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-sm`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeSegmento(segmentoForcado)}`}>{labelSegmento(segmentoForcado)}</span>
                      <span className="text-xs text-muted-foreground">fixo</span>
                    </div>
                  ) : (
                    <select id="segmentoDisciplina" value={formDisciplina.segmento} onChange={e => setFormDisciplina({ ...formDisciplina, segmento: e.target.value as any })} className={selectClass}>
                      <option value="">Selecione o segmento</option>
                      <option value="ead">EAD</option>
                      <option value="presencial">Presencial</option>
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Checkbox id="ativaDisciplina" checked={formDisciplina.ativa} onCheckedChange={checked => setFormDisciplina({ ...formDisciplina, ativa: !!checked })} />
                  <label htmlFor="ativaDisciplina" className="text-sm font-medium text-foreground cursor-pointer">Disciplina ativa</label>
                </div>
              </>
            ) : (
            /* ── Formulário Série ── */
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nomeSerie" className="text-right text-foreground">Nome *</Label>
                <Input id="nomeSerie" value={formSerie.nome} onChange={e => setFormSerie({ ...formSerie, nome: e.target.value })} placeholder="Ex: 1º Ano" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nivelSerie" className="text-right text-foreground">Nível *</Label>
                <select id="nivelSerie" value={formSerie.nivel} onChange={e => setFormSerie({ ...formSerie, nivel: e.target.value as NivelSerie })} className={selectClass}>
                  {NIVEIS_SERIE.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segmentoSerie" className="text-right text-foreground">Segmento *</Label>
                {segmentoForcado ? (
                  <div className={`col-span-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-sm`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeSegmento(segmentoForcado)}`}>{labelSegmento(segmentoForcado)}</span>
                    <span className="text-xs text-muted-foreground">fixo</span>
                  </div>
                ) : (
                  <select id="segmentoSerie" value={formSerie.segmento} onChange={e => setFormSerie({ ...formSerie, segmento: e.target.value as any, turno: "" })} className={selectClass}>
                    <option value="">Selecione o segmento</option>
                    <option value="ead">EAD</option>
                    <option value="presencial">Presencial</option>
                  </select>
                )}
              </div>

              {/* ✅ Turno — só aparece para presencial, obrigatório */}
              {(formSerie.segmento === "presencial" || segmentoForcado === "presencial") && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="turnoSerie" className="text-right text-foreground">Turno *</Label>
                  <div className="col-span-3">
                    <div className="grid grid-cols-3 gap-2">
                      {TURNOS.map(t => (
                        <button key={t.value} type="button"
                          onClick={() => setFormSerie(p => ({ ...p, turno: t.value }))}
                          className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            formSerie.turno === t.value
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      A turma será criada automaticamente com este turno.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                <Checkbox id="ativaSerie" checked={formSerie.ativa} onCheckedChange={checked => setFormSerie({ ...formSerie, ativa: !!checked })} />
                <label htmlFor="ativaSerie" className="text-sm font-medium text-foreground cursor-pointer">Série ativa</label>
              </div>
            </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleFecharModal}>Cancelar</Button>
            <Button onClick={abaSelecionada === "disciplinas" ? handleSalvarDisciplina : handleSalvarSerie}>
              {editando ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Excluir Disciplina ── */}
      <AlertDialog
        open={!!confirmarExcluirDisciplina}
        onOpenChange={v => { if (!v) setConfirmarExcluirDisciplina(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir disciplina?</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">{confirmarExcluirDisciplina?.nome}</span> será removida permanentemente.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirDisciplina}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Excluir Série ── */}
      <AlertDialog
        open={!!confirmarExcluirSerie}
        onOpenChange={v => { if (!v) setConfirmarExcluirSerie(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir série?</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">{confirmarExcluirSerie?.nome}</span> e todas as turmas vinculadas serão removidas permanentemente.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirSerie}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir série e turmas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GestaoEscola;