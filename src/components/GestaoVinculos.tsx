// src/components/GestaoVinculos.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import {
  UserPlus, Trash2, Search, Link2, Users, GraduationCap,
  BookOpen, AlertCircle, Check, ArrowLeft, XCircle, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface GestaoVinculosProps {
  onVoltar?: () => void;
  /** Quando informado, trava o segmento e filtra todos os dados por ele */
  segmentoForcado?: "ead" | "presencial";
}

interface Professor  { id: string; nome: string; }
interface Disciplina { id: string; nome: string; descricao: string | null; segmento: "ead" | "presencial" | null; }
interface Serie      { id: string; nome: string; nivel: string | null;     segmento: "ead" | "presencial" | null; }
interface Vinculo    {
  id: string; professorId: string; professorNome: string;
  disciplinaId: string; disciplinaNome: string;
  serieId: string; serieNome: string;
  segmento: "ead" | "presencial" | null;
}

const ANO_ATUAL = new Date().getFullYear();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function badgeSegmento(seg: string | null) {
  if (seg === "ead")
    return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";
  if (seg === "presencial")
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700";
  return "bg-muted text-muted-foreground border-border";
}
function labelSegmento(seg: string | null) {
  if (seg === "ead") return "EAD";
  if (seg === "presencial") return "Presencial";
  return "";
}

const selectClass =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground " +
  "focus:ring-2 focus:ring-ring focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed";

// ─── Componente principal ─────────────────────────────────────────────────────
export function GestaoVinculos({ onVoltar, segmentoForcado }: GestaoVinculosProps) {
  const segmentoFixo = segmentoForcado ?? null; // null = admin geral (sem restrição)

  const [professores, setProfessores] = useState<Professor[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [series, setSeries]           = useState<Serie[]>([]);
  const [vinculos, setVinculos]       = useState<Vinculo[]>([]);

  // Formulário — fluxo: Professor → Série → Disciplina(s)
  const [professorSelecionado, setProfessorSelecionado] = useState("");
  const [serieSelecionada, setSerieSelecionada]         = useState(""); // Bug 6 fix: série ANTES da disciplina
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<string[]>([]);

  const [filtro, setFiltro]             = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const [carregando, setCarregando]     = useState(false);
  const [confirmVinculo, setConfirmVinculo] = useState<string | null>(null);
  const [confirmTodos, setConfirmTodos]     = useState<{ id: string; nome: string } | null>(null);

  const [filtroResumo, setFiltroResumo] = useState<"todos" | "ead" | "presencial">(
    segmentoFixo ?? "todos"
  );

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  async function carregarProfessores() {
    try {
      // Bug 5 fix: quando há segmentoForcado, filtra professores do mesmo segmento
      let query = supabase
        .from("users")
        .select("id, nome, tipo, segmento")
        .in("tipo", ["professor", "professor_conteudista"])
        .order("nome", { ascending: true });

      if (segmentoFixo) {
        query = query.eq("segmento", segmentoFixo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProfessores((data || []).map((u: any) => ({ id: u.id, nome: u.nome || "Professor sem nome" })));
    } catch { toast.error("Erro ao carregar professores"); setProfessores([]); }
  }

  async function carregarDisciplinas() {
    try {
      // Bug 6 fix: busca disciplinas já filtradas pelo segmento (evita duplicatas EAD+Presencial)
      let query = supabase
        .from("disciplinas")
        .select("id, nome, descricao, segmento")
        .order("nome", { ascending: true });

      if (segmentoFixo) {
        query = query.eq("segmento", segmentoFixo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDisciplinas((data || []).map((d: any) => ({
        id: d.id,
        nome: d.nome || "Disciplina sem nome",
        descricao: d.descricao ?? null,
        segmento: d.segmento === "ead" || d.segmento === "presencial" ? d.segmento : null,
      })));
    } catch { toast.error("Erro ao carregar disciplinas"); setDisciplinas([]); }
  }

  async function carregarSeries() {
    try {
      let query = supabase
        .from("series")
        .select("id, nome, nivel, segmento")
        .order("nome", { ascending: true });

      if (segmentoFixo) {
        query = query.eq("segmento", segmentoFixo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSeries((data || []).map((s: any) => ({
        id: s.id,
        nome: s.nome || "Série sem nome",
        nivel: s.nivel || null,
        segmento: s.segmento === "ead" || s.segmento === "presencial" ? s.segmento : null,
      })));
    } catch { toast.error("Erro ao carregar séries"); setSeries([]); }
  }

  async function carregarVinculos() {
    try {
      let query = supabase
        .from("professores_disciplinas_series")
        .select(`id, professor_id, disciplina_id, serie_id, segmento,
                 users:professor_id ( id, nome ),
                 disciplinas:disciplina_id ( id, nome ),
                 series:serie_id ( id, nome )`)
        .order("id", { ascending: true });

      // Bug 5 fix: vínculos exibidos também filtrados por segmento
      if (segmentoFixo) {
        query = query.eq("segmento", segmentoFixo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVinculos((data || []).map((v: any) => ({
        id: v.id, professorId: v.professor_id,
        professorNome: v.users?.nome || "Professor",
        disciplinaId: v.disciplina_id, disciplinaNome: v.disciplinas?.nome || "Disciplina",
        serieId: v.serie_id, serieNome: v.series?.nome || "Série",
        segmento: v.segmento === "ead" || v.segmento === "presencial" ? v.segmento : null,
      })));
    } catch { toast.error("Erro ao carregar vínculos"); setVinculos([]); }
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([carregarProfessores(), carregarDisciplinas(), carregarSeries(), carregarVinculos()]);
    setCarregando(false);
  }

  useEffect(() => { carregarTudo(); }, []);

  // ─── Helpers de formulário ───────────────────────────────────────────────────

  // Bug 6 fix: disciplinas filtradas pela série selecionada (segmento já veio filtrado do banco)
  // Como não há vínculo direto série→disciplina na tabela disciplinas, filtramos apenas por segmento.
  // A série serve como pré-requisito de seleção — o admin presencial vê só disciplinas presenciais.
  const disciplinasFiltradas = disciplinas; // já filtradas no carregarDisciplinas()

  const seriesFiltradas = series; // já filtradas no carregarSeries()

  const vinculosFiltrados = vinculos.filter(v => {
    if (!filtro) return true;
    const t = filtro.toLowerCase();
    return v.professorNome.toLowerCase().includes(t) ||
           v.disciplinaNome.toLowerCase().includes(t) ||
           v.serieNome.toLowerCase().includes(t);
  });

  const vinculosPorProfessor = (profId: string) =>
    vinculos.filter(v => v.professorId === profId);

  const toggleDisciplina = (id: string) =>
    setDisciplinasSelecionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const resetFormulario = () => {
    setProfessorSelecionado("");
    setSerieSelecionada("");
    setDisciplinasSelecionadas([]);
  };

  // ─── Ações ───────────────────────────────────────────────────────────────────
  const adicionarVinculo = async () => {
    if (!professorSelecionado)        { toast.error("Selecione um professor"); return; }
    if (!serieSelecionada)            { toast.error("Selecione uma série"); return; }
    if (disciplinasSelecionadas.length === 0) { toast.error("Selecione pelo menos uma disciplina"); return; }

    // Bug 5 fix: segmento sempre vem do segmentoForcado; nunca permite EAD quando admin presencial
    const segmentoParaSalvar = segmentoFixo ?? null;

    try {
      const inserts = disciplinasSelecionadas
        .filter(discId => !vinculos.some(v =>
          v.professorId === professorSelecionado &&
          v.disciplinaId === discId &&
          v.serieId === serieSelecionada
        ))
        .map(discId => ({
          professor_id: professorSelecionado,
          disciplina_id: discId,
          serie_id: serieSelecionada,
          ano_letivo: ANO_ATUAL,
          segmento: segmentoParaSalvar,
        }));

      if (inserts.length === 0) { toast.error("Todos os vínculos selecionados já existem."); return; }

      const { error } = await supabase.from("professores_disciplinas_series").insert(inserts);
      if (error) throw error;

      toast.success(`${inserts.length} vínculo(s) criado(s) com sucesso!`);
      resetFormulario();
      await carregarVinculos();
    } catch { toast.error("Erro ao criar vínculo"); }
  };

  const removerVinculo = (id: string) => {
    setConfirmVinculo(id);
  };

  const removerTodosVinculosDoProfessor = (professorId: string, professorNome: string) => {
    setConfirmTodos({ id: professorId, nome: professorNome });
  };

  // ─── Dados do resumo ─────────────────────────────────────────────────────────
  const professoresComVinculo = professores.filter(p => {
    const vps = vinculosPorProfessor(p.id);
    if (vps.length === 0) return false;
    if (filtroResumo === "todos") return true;
    return vps.some(v => v.segmento === filtroResumo);
  });

  const totalEAD        = professores.filter(p => vinculosPorProfessor(p.id).some(v => v.segmento === "ead")).length;
  const totalPresencial = professores.filter(p => vinculosPorProfessor(p.id).some(v => v.segmento === "presencial")).length;
  const totalTodos      = professores.filter(p => vinculosPorProfessor(p.id).length > 0).length;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {onVoltar && (
            <Button variant="ghost" size="sm" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Vínculos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Vincule professores às disciplinas e séries que lecionam
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {segmentoFixo && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${badgeSegmento(segmentoFixo)}`}>
              <Lock className="w-3 h-3" />
              Segmento: {labelSegmento(segmentoFixo)}
            </span>
          )}
          <Badge variant="secondary" className="px-3 py-1.5 gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            {vinculos.length} vínculo(s) ativo(s)
          </Badge>
        </div>
      </div>

      {/* ══ Formulário — Bug 6 fix: fluxo Professor → Série → Disciplina ══ */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-4 h-4 text-primary" /> Criar Novo Vínculo
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ordem: selecione o professor → escolha a série → marque as disciplinas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Linha 1: Professor + Segmento (fixo quando admin presencial) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Professor *
              </label>
              <select
                value={professorSelecionado}
                onChange={e => { setProfessorSelecionado(e.target.value); setSerieSelecionada(""); setDisciplinasSelecionadas([]); }}
                className={selectClass}
              >
                <option value="">Selecione o professor</option>
                {professores.map(prof => (
                  <option key={prof.id} value={prof.id}>{prof.nome}</option>
                ))}
              </select>
              {professores.length === 0 && !carregando && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Nenhum professor{segmentoFixo ? ` ${labelSegmento(segmentoFixo)}` : ""} cadastrado.
                </p>
              )}
            </div>

            {/* Bug 5 fix: campo Segmento travado quando segmentoForcado */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Segmento
              </label>
              {segmentoFixo ? (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-sm text-foreground`}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeSegmento(segmentoFixo)}`}>
                    {labelSegmento(segmentoFixo)}
                  </span>
                  <span className="text-xs text-muted-foreground">fixo — não editável</span>
                </div>
              ) : (
                // Admin geral: pode escolher segmento (não usado no admin presencial)
                <div className="px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
                  Definido automaticamente pela série selecionada
                </div>
              )}
            </div>
          </div>

          {/* Linha 2: Série (primeiro!) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Série *
            </label>
            <select
              value={serieSelecionada}
              onChange={e => { setSerieSelecionada(e.target.value); setDisciplinasSelecionadas([]); }}
              disabled={!professorSelecionado}
              className={selectClass}
            >
              <option value="">
                {professorSelecionado ? "Selecione a série" : "Selecione o professor primeiro"}
              </option>
              {seriesFiltradas.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome}{s.nivel ? ` (${s.nivel})` : ""}
                </option>
              ))}
            </select>
            {professorSelecionado && seriesFiltradas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma série{segmentoFixo ? ` ${labelSegmento(segmentoFixo)}` : ""} cadastrada.
                Cadastre séries em Gestão Escolar primeiro.
              </p>
            )}
          </div>

          {/* Linha 3: Disciplinas com checkbox — Bug 6 fix: só depois de selecionar série, mostra descrição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Disciplinas *
              {disciplinasSelecionadas.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium">
                  {disciplinasSelecionadas.length} selecionada(s)
                </span>
              )}
            </label>
            <div className="border border-border rounded-lg bg-background overflow-hidden">
              {!serieSelecionada ? (
                <p className="text-xs text-muted-foreground p-3">
                  Selecione uma série primeiro para ver as disciplinas disponíveis.
                </p>
              ) : disciplinasFiltradas.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">
                  Nenhuma disciplina{segmentoFixo ? ` ${labelSegmento(segmentoFixo)}` : ""} cadastrada.
                  Cadastre disciplinas em Gestão Escolar primeiro.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-border">
                  {disciplinasFiltradas.map(d => {
                    const jaVinculada = vinculos.some(v =>
                      v.professorId === professorSelecionado &&
                      v.disciplinaId === d.id &&
                      v.serieId === serieSelecionada
                    );
                    return (
                      <label
                        key={d.id}
                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/60 ${
                          jaVinculada ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={disciplinasSelecionadas.includes(d.id)}
                          disabled={jaVinculada}
                          onChange={() => !jaVinculada && toggleDisciplina(d.id)}
                          className="accent-primary mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{d.nome}</span>
                          {/* Bug 6 fix: descrição visível para diferenciar ex. "Matemática – Fundamental 1" */}
                          {d.descricao && (
                            <span className="block text-xs text-muted-foreground truncate">{d.descricao}</span>
                          )}
                          {jaVinculada && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">já vinculada</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={adicionarVinculo} disabled={carregando} className="gap-2">
              <Check className="w-4 h-4" /> Criar Vínculo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ══ Lista de Vínculos com busca ══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="w-4 h-4 text-muted-foreground" /> Vínculos Ativos
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar professor, disciplina ou série..."
                  value={filtro}
                  onChange={e => { setFiltro(e.target.value); setMostrarLista(!!e.target.value); }}
                  className="pl-9 pr-4 py-2 w-full sm:w-72 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
              {mostrarLista && (
                <Button variant="ghost" size="sm" onClick={() => { setFiltro(""); setMostrarLista(false); }}>
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {mostrarLista && (
          <CardContent className="pt-0">
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {vinculosFiltrados.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum vínculo encontrado para "{filtro}"</p>
                </div>
              ) : vinculosFiltrados.map(v => (
                <div key={v.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{v.professorNome}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-muted text-muted-foreground border-border">
                          <BookOpen className="w-3 h-3" />{v.disciplinaNome}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-muted text-muted-foreground border-border">
                          <GraduationCap className="w-3 h-3" />{v.serieNome}
                        </span>
                        {v.segmento && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeSegmento(v.segmento)}`}>
                            {labelSegmento(v.segmento)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removerVinculo(v.id)}
                    className="text-destructive hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ══ Resumo por Professor ══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-muted-foreground" />
              Resumo por Professor
              <span className="text-sm font-normal text-muted-foreground">
                ({professoresComVinculo.length} professor{professoresComVinculo.length !== 1 ? "es" : ""})
              </span>
            </CardTitle>

            {/* Filtro de segmento — botões ocultos quando segmentoForcado (só faz sentido para admin geral) */}
            {!segmentoFixo && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
                {(["todos", "ead", "presencial"] as const).map(seg => (
                  <button
                    key={seg}
                    onClick={() => setFiltroResumo(seg)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filtroResumo === seg
                        ? seg === "ead" ? "bg-blue-600 text-white shadow-sm"
                          : seg === "presencial" ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {seg === "todos" ? "Todos" : seg === "ead" ? "EAD" : "Presencial"}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      filtroResumo === seg && seg !== "todos"
                        ? "bg-white/20 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}>
                      {seg === "todos" ? totalTodos : seg === "ead" ? totalEAD : totalPresencial}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {professoresComVinculo.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>
                {filtroResumo === "todos"
                  ? "Nenhum vínculo cadastrado ainda."
                  : `Nenhum professor com vínculos ${filtroResumo === "ead" ? "EAD" : "Presencial"}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {professoresComVinculo.map(prof => {
                const todosVps = vinculosPorProfessor(prof.id);
                const vps = filtroResumo === "todos"
                  ? todosVps
                  : todosVps.filter(v => v.segmento === filtroResumo);
                const segmentos = [...new Set(todosVps.map(v => v.segmento).filter(Boolean))];

                return (
                  <Card key={prof.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm truncate">{prof.nome}</h4>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {segmentos.map(seg => (
                              <span key={seg}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${badgeSegmento(seg)}`}>
                                {labelSegmento(seg)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm"
                          onClick={() => removerTodosVinculosDoProfessor(prof.id, prof.nome)}
                          className="text-destructive hover:text-destructive p-1 h-auto shrink-0"
                          title="Desvincular tudo">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {vps.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            Sem vínculos {filtroResumo === "ead" ? "EAD" : "Presencial"}.
                          </p>
                        ) : vps.map(v => (
                          <div key={v.id}
                            className="flex items-center justify-between gap-2 text-xs text-muted-foreground group">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                v.segmento === "ead" ? "bg-blue-500"
                                  : v.segmento === "presencial" ? "bg-emerald-500"
                                  : "bg-primary"
                              }`} />
                              <span className="truncate">
                                {v.disciplinaNome}
                                <span className="text-border mx-1">·</span>
                                {v.serieNome}
                              </span>
                            </div>
                            <button onClick={() => removerVinculo(v.id)}
                              className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity shrink-0"
                              title="Remover vínculo">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {vps.length} de {todosVps.length} vínculo(s)
                        </Badge>
                        {filtroResumo !== "todos" && todosVps.length !== vps.length && (
                          <span className="text-xs text-muted-foreground">
                            +{todosVps.length - vps.length} outro(s) segmento
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação — remover vínculo individual */}
      <AlertDialog open={!!confirmVinculo} onOpenChange={() => setConfirmVinculo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este vínculo?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">Esta ação não pode ser desfeita.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmVinculo) return;
                try {
                  const { error } = await supabase.from("professores_disciplinas_series").delete().eq("id", confirmVinculo);
                  if (error) throw error;
                  setVinculos(prev => prev.filter(v => v.id !== confirmVinculo));
                  toast.success("Vínculo removido!");
                } catch { toast.error("Erro ao remover vínculo"); }
                setConfirmVinculo(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação — remover TODOS os vínculos do professor */}
      <AlertDialog open={!!confirmTodos} onOpenChange={() => setConfirmTodos(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular {confirmTodos?.nome}?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">
            Todos os vínculos deste professor serão removidos. Esta ação não pode ser desfeita.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmTodos) return;
                try {
                  let query = supabase.from("professores_disciplinas_series").delete().eq("professor_id", confirmTodos.id);
                  if (segmentoFixo) query = query.eq("segmento", segmentoFixo);
                  const { error } = await query;
                  if (error) throw error;
                  setVinculos(prev => prev.filter(v => v.professorId !== confirmTodos.id));
                  toast.success(`Todos os vínculos de ${confirmTodos.nome} removidos!`);
                } catch { toast.error("Erro ao remover vínculos"); }
                setConfirmTodos(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Desvincular Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}