import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  UserPlus,
  Trash2,
  Search,
  Link2,
  Users,
  GraduationCap,
  BookOpen,
  AlertCircle,
  Check,
  ArrowLeft,
  XCircle,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";

interface GestaoVinculosProps {
  onVoltar?: () => void;
}

interface Professor {
  id: string;
  nome: string;
}

interface Disciplina {
  id: string;
  nome: string;
  segmento: "ead" | "presencial" | null;
}

interface Serie {
  id: string;
  nome: string;
  nivel: string | null;
  segmento: "ead" | "presencial" | null;
}

interface Vinculo {
  id: string;
  professorId: string;
  professorNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  serieId: string;
  serieNome: string;
  segmento: "ead" | "presencial" | null;
}

type SegmentoFiltro = "" | "ead" | "presencial";

const ANO_ATUAL = new Date().getFullYear();

// ─── helpers ────────────────────────────────────────────────────────

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

// Select padronizado com dark mode
const selectClass =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground " +
  "focus:ring-2 focus:ring-ring focus:border-transparent text-sm";

// ────────────────────────────────────────────────────────────────────

export function GestaoVinculos({ onVoltar }: GestaoVinculosProps) {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);

  const [professorSelecionado, setProfessorSelecionado] = useState("");
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<SegmentoFiltro>("");
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [seriesSelecionadas, setSeriesSelecionadas] = useState<string[]>([]);

  const [filtro, setFiltro] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // ─── CARREGAR DADOS ────────────────────────────────────────────────

  async function carregarProfessores() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, nome, tipo")
        .in("tipo", ["professor", "professor_conteudista"])
        .order("nome", { ascending: true });
      if (error) throw error;
      setProfessores(
        (data || []).map((u: any) => ({ id: u.id, nome: u.nome || "Professor sem nome" }))
      );
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao carregar professores:", e.message);
      toast.error("Erro ao carregar professores");
      setProfessores([]);
    }
  }

  async function carregarDisciplinas() {
    try {
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome, segmento")
        .order("nome", { ascending: true });
      if (error) throw error;
      setDisciplinas(
        (data || []).map((d: any) => ({
          id: d.id,
          nome: d.nome || "Disciplina sem nome",
          segmento:
            d.segmento === "ead" || d.segmento === "presencial"
              ? d.segmento
              : null,
        }))
      );
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao carregar disciplinas:", e.message);
      toast.error("Erro ao carregar disciplinas");
      setDisciplinas([]);
    }
  }

  async function carregarSeries() {
    try {
      const { data, error } = await supabase
        .from("series")
        .select("id, nome, nivel, segmento")
        .order("nome", { ascending: true });
      if (error) throw error;
      setSeries(
        (data || []).map((s: any) => ({
          id: s.id,
          nome: s.nome || "Série sem nome",
          nivel: s.nivel || null,
          segmento:
            s.segmento === "ead" || s.segmento === "presencial"
              ? s.segmento
              : null,
        }))
      );
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao carregar séries:", e.message);
      toast.error("Erro ao carregar séries");
      setSeries([]);
    }
  }

  async function carregarVinculos() {
    try {
      const { data, error } = await supabase
        .from("professores_disciplinas_series")
        .select(
          `id, professor_id, disciplina_id, serie_id, segmento,
           users:professor_id ( id, nome ),
           disciplinas:disciplina_id ( id, nome ),
           series:serie_id ( id, nome )`
        )
        .order("id", { ascending: true });
      if (error) throw error;
      setVinculos(
        (data || []).map((v: any) => ({
          id: v.id,
          professorId: v.professor_id,
          professorNome: v.users?.nome || "Professor",
          disciplinaId: v.disciplina_id,
          disciplinaNome: v.disciplinas?.nome || "Disciplina",
          serieId: v.serie_id,
          serieNome: v.series?.nome || "Série",
          segmento:
            v.segmento === "ead" || v.segmento === "presencial"
              ? v.segmento
              : null,
        }))
      );
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao carregar vínculos:", e.message);
      toast.error("Erro ao carregar vínculos");
      setVinculos([]);
    }
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([
      carregarProfessores(),
      carregarDisciplinas(),
      carregarSeries(),
      carregarVinculos(),
    ]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // ─── FILTROS ────────────────────────────────────────────────────────

  // Ao trocar segmento, limpa disciplina e séries selecionadas
  const handleSegmentoChange = (seg: SegmentoFiltro) => {
    setSegmentoSelecionado(seg);
    setDisciplinaSelecionada("");
    setSeriesSelecionadas([]);
  };

  const disciplinasFiltradas = disciplinas.filter((d) => {
    if (!segmentoSelecionado) return true;
    return d.segmento === segmentoSelecionado;
  });

  const seriesFiltradas = series.filter((s) => {
    if (!segmentoSelecionado) return true;
    return s.segmento === segmentoSelecionado;
  });

  const vinculosFiltrados = vinculos.filter((v) => {
    if (!filtro) return true;
    const t = filtro.toLowerCase();
    return (
      v.professorNome.toLowerCase().includes(t) ||
      v.disciplinaNome.toLowerCase().includes(t) ||
      v.serieNome.toLowerCase().includes(t)
    );
  });

  const vinculosPorProfessor = (profId: string) =>
    vinculos.filter((v) => v.professorId === profId);

  const toggleSerie = (id: string) =>
    setSeriesSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ─── AÇÕES ──────────────────────────────────────────────────────────

  const adicionarVinculo = async () => {
    if (!professorSelecionado) { toast.error("Selecione um professor"); return; }
    if (!disciplinaSelecionada) { toast.error("Selecione uma disciplina"); return; }
    if (seriesSelecionadas.length === 0) { toast.error("Selecione pelo menos uma série"); return; }

    try {
      const inserts = seriesSelecionadas
        .filter(
          (serieId) =>
            !vinculos.some(
              (v) =>
                v.professorId === professorSelecionado &&
                v.disciplinaId === disciplinaSelecionada &&
                v.serieId === serieId
            )
        )
        .map((serieId) => ({
          professor_id: professorSelecionado,
          disciplina_id: disciplinaSelecionada,
          serie_id: serieId,
          ano_letivo: ANO_ATUAL,
          segmento: segmentoSelecionado || null,
        }));

      if (inserts.length === 0) {
        toast.error("Todos os vínculos selecionados já existem.");
        return;
      }

      const { error } = await supabase
        .from("professores_disciplinas_series")
        .insert(inserts);
      if (error) throw error;

      toast.success(`${inserts.length} vínculo(s) criado(s) com sucesso!`);
      setProfessorSelecionado("");
      setDisciplinaSelecionada("");
      setSegmentoSelecionado("");
      setSeriesSelecionadas([]);
      await carregarVinculos();
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao criar vínculo:", e.message);
      toast.error("Erro ao criar vínculo");
    }
  };

  const removerVinculo = async (id: string) => {
    if (!confirm("Deseja realmente excluir este vínculo?")) return;
    try {
      const { error } = await supabase
        .from("professores_disciplinas_series")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setVinculos((prev) => prev.filter((v) => v.id !== id));
      toast.success("Vínculo removido com sucesso!");
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao remover vínculo:", e.message);
      toast.error("Erro ao remover vínculo");
    }
  };

  const removerTodosVinculosDoProfessor = async (
    professorId: string,
    professorNome: string
  ) => {
    if (
      !confirm(
        `Deseja desvincular ${professorNome} de TODAS as disciplinas e séries?`
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("professores_disciplinas_series")
        .delete()
        .eq("professor_id", professorId);
      if (error) throw error;
      setVinculos((prev) => prev.filter((v) => v.professorId !== professorId));
      toast.success(`Todos os vínculos de ${professorNome} removidos!`);
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao remover vínculos:", e.message);
      toast.error("Erro ao remover vínculos");
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────

  const professoresComVinculo = professores.filter(
    (p) => vinculosPorProfessor(p.id).length > 0
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onVoltar && (
            <Button variant="ghost" size="sm" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Vínculos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Vincule professores às disciplinas e séries que lecionam
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1.5 gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          {vinculos.length} vínculo(s) ativo(s)
        </Badge>
      </div>

      {/* ══ Formulário ══ */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-4 h-4 text-primary" />
            Criar Novo Vínculo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Linha 1: Professor + Segmento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Professor */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Professor *
              </label>
              <select
                value={professorSelecionado}
                onChange={(e) => setProfessorSelecionado(e.target.value)}
                className={selectClass}
              >
                <option value="">Selecione o professor</option>
                {professores.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Segmento EAD / Presencial */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                Segmento *
              </label>
              <select
                value={segmentoSelecionado}
                onChange={(e) => handleSegmentoChange(e.target.value as SegmentoFiltro)}
                className={selectClass}
              >
                <option value="">Selecione o segmento</option>
                <option value="ead">EAD</option>
                <option value="presencial">Presencial</option>
              </select>
            </div>
          </div>

          {/* Linha 2: Disciplina + Séries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Disciplina */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Disciplina *
                {segmentoSelecionado && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium border ${badgeSegmento(segmentoSelecionado)}`}>
                    {labelSegmento(segmentoSelecionado)}
                  </span>
                )}
              </label>
              <select
                value={disciplinaSelecionada}
                onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                className={selectClass}
                disabled={!segmentoSelecionado}
              >
                <option value="">
                  {segmentoSelecionado
                    ? "Selecione a disciplina"
                    : "Selecione o segmento primeiro"}
                </option>
                {disciplinasFiltradas.map((disc) => (
                  <option key={disc.id} value={disc.id}>
                    {disc.nome}
                  </option>
                ))}
              </select>
              {segmentoSelecionado && disciplinasFiltradas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma disciplina cadastrada para este segmento.
                </p>
              )}
            </div>

            {/* Séries (múltiplas) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Séries *
                {seriesSelecionadas.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium">
                    {seriesSelecionadas.length} selecionada(s)
                  </span>
                )}
              </label>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-background">
                {!segmentoSelecionado ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Selecione o segmento primeiro.
                  </p>
                ) : seriesFiltradas.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Nenhuma série cadastrada para este segmento.
                  </p>
                ) : (
                  seriesFiltradas.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 hover:bg-muted transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={seriesSelecionadas.includes(s.id)}
                        onChange={() => toggleSerie(s.id)}
                        className="accent-primary"
                      />
                      <span className="text-foreground">{s.nome}</span>
                      {s.nivel && (
                        <span className="text-xs text-muted-foreground">
                          ({s.nivel})
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Botão */}
          <div className="flex justify-end">
            <Button
              onClick={adicionarVinculo}
              disabled={carregando}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Criar Vínculo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ══ Lista de Vínculos com busca ══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              Vínculos Ativos
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por professor, disciplina ou série..."
                  value={filtro}
                  onChange={(e) => {
                    setFiltro(e.target.value);
                    setMostrarLista(!!e.target.value);
                  }}
                  className="pl-9 pr-4 py-2 w-72 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                />
              </div>
              {mostrarLista && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFiltro(""); setMostrarLista(false); }}
                >
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
              ) : (
                vinculosFiltrados.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {v.professorNome}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-muted text-muted-foreground border-border">
                            <BookOpen className="w-3 h-3" />
                            {v.disciplinaNome}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-muted text-muted-foreground border-border">
                            <GraduationCap className="w-3 h-3" />
                            {v.serieNome}
                          </span>
                          {v.segmento && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeSegmento(v.segmento)}`}>
                              {labelSegmento(v.segmento)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerVinculo(v.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ══ Resumo por Professor ══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-muted-foreground" />
            Resumo por Professor
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({professoresComVinculo.length} professor(es) com vínculos)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {professoresComVinculo.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum vínculo cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {professoresComVinculo.map((prof) => {
                const vps = vinculosPorProfessor(prof.id);
                // Agrupa segmentos presentes neste professor
                const segmentos = [...new Set(vps.map((v) => v.segmento).filter(Boolean))];

                return (
                  <Card key={prof.id} className="border border-border">
                    <CardContent className="p-4">
                      {/* Header do card */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm truncate">
                            {prof.nome}
                          </h4>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {segmentos.map((seg) => (
                              <span
                                key={seg}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${badgeSegmento(seg)}`}
                              >
                                {labelSegmento(seg)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            removerTodosVinculosDoProfessor(prof.id, prof.nome)
                          }
                          className="text-destructive hover:text-destructive p-1 h-auto shrink-0"
                          title="Desvincular tudo"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Lista de vínculos */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {vps.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2 text-xs text-muted-foreground group"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <span className="truncate">
                                {v.disciplinaNome}
                                <span className="text-border mx-1">·</span>
                                {v.serieNome}
                              </span>
                            </div>
                            <button
                              onClick={() => removerVinculo(v.id)}
                              className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity shrink-0"
                              title="Remover vínculo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="mt-3 pt-2 border-t border-border">
                        <Badge variant="secondary" className="text-xs">
                          {vps.length} vínculo(s)
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}