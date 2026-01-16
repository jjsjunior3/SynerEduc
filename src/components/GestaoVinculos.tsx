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
  XCircle, // Ícone para desvincular
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
  segmento?: string | null;
}

interface Serie {
  id: string;
  nome: string;
  nivel: string | null;
}

interface Vinculo {
  id: string;
  professorId: string;
  professorNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  serieId: string;
  serieNome: string;
}

type SegmentoCodigo = "" | "fundamental1" | "fundamental2" | "medio";

const ANO_ATUAL = new Date().getFullYear();

/** Label curto exibido junto ao nome da disciplina */
function labelSegmentoDisciplina(seg?: string | null): string {
  if (!seg) return "";
  const s = seg.toLowerCase();

  if (
    s.includes("fundamental i") ||
    s.includes("fundamental 1") ||
    s.includes("fund. i") ||
    s.includes("fund 1")
  ) {
    return "Fundamental I";
  }

  if (
    s.includes("fundamental ii") ||
    s.includes("fundamental 2") ||
    s.includes("fund. ii") ||
    s.includes("fund 2")
  ) {
    return "Fundamental II";
  }

  if (s.includes("medio") || s.includes("médio")) {
    return "Médio";
  }

  return seg;
}

function labelSegmentoSelect(seg: SegmentoCodigo): string {
  if (seg === "fundamental1") return "Fundamental I";
  if (seg === "fundamental2") return "Fundamental II";
  if (seg === "medio") return "Ensino Médio";
  return "Todos os segmentos";
}

export function GestaoVinculos({ onVoltar }: GestaoVinculosProps) {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);

  const [professorSelecionado, setProfessorSelecionado] = useState("");
  const [segmentoSelecionado, setSegmentoSelecionado] =
    useState<SegmentoCodigo>("");
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [seriesSelecionadas, setSeriesSelecionadas] = useState<string[]>([]);

  const [filtro, setFiltro] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // --------- CARREGAR DADOS ---------

  async function carregarProfessores() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, nome, tipo")
        .in("tipo", ["professor", "professor_conteudista"])
        .order("nome", { ascending: true });

      if (error) throw error;

      const mapped: Professor[] =
        data?.map((u: any) => ({
          id: u.id,
          nome: u.nome || "Professor sem nome",
        })) ?? [];

      setProfessores(mapped);
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

      const mapped: Disciplina[] =
        data?.map((d: any) => ({
          id: d.id,
          nome: d.nome || "Disciplina sem nome",
          segmento: d.segmento ?? null,
        })) ?? [];

      setDisciplinas(mapped);
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
        .select("id, nome, nivel")
        .order("nome", { ascending: true });

      if (error) throw error;

      const mapped: Serie[] =
        data?.map((s: any) => ({
          id: s.id,
          nome: s.nome || "Série sem nome",
          nivel: s.nivel || null,
        })) ?? [];

      setSeries(mapped);
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
          `
          id,
          professor_id,
          disciplina_id,
          serie_id,
          users:professor_id ( id, nome ),
          disciplinas:disciplina_id ( id, nome ),
          series:serie_id ( id, nome )
        `
        )
        .order("id", { ascending: true });

      if (error) throw error;

      const mapped: Vinculo[] =
        data?.map((v: any) => ({
          id: v.id,
          professorId: v.professor_id,
          professorNome: v.users?.nome || "Professor",
          disciplinaId: v.disciplina_id,
          disciplinaNome: v.disciplinas?.nome || "Disciplina",
          serieId: v.serie_id,
          serieNome: v.series?.nome || "Série",
        })) ?? [];

      setVinculos(mapped);
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

  // --------- HELPERS / FILTROS ---------

  const disciplinasFiltradas = disciplinas.filter((d) => {
    if (!segmentoSelecionado) return true;
    if (!d.segmento) return false;

    const segDisc = d.segmento.toLowerCase();

    if (segmentoSelecionado === "fundamental1") {
      return (
        segDisc.includes("fundamental i") ||
        segDisc.includes("fundamental 1") ||
        segDisc.includes("fund. i") ||
        segDisc.includes("fund 1")
      );
    }

    if (segmentoSelecionado === "fundamental2") {
      return (
        segDisc.includes("fundamental ii") ||
        segDisc.includes("fundamental 2") ||
        segDisc.includes("fund. ii") ||
        segDisc.includes("fund 2")
      );
    }

    if (segmentoSelecionado === "medio") {
      return segDisc.includes("medio") || segDisc.includes("médio");
    }

    return true;
  });

  const seriesFiltradas = series.filter((s) => {
    if (!segmentoSelecionado) return true;

    const nivel = (s.nivel || "").toLowerCase().trim();

    if (!nivel) {
      // se nivel não está preenchido, não filtra por segmento
      return true;
    }

    if (segmentoSelecionado === "medio") {
      return nivel.includes("med") || nivel === "medio";
    }

    if (
      segmentoSelecionado === "fundamental1" ||
      segmentoSelecionado === "fundamental2"
    ) {
      return nivel.includes("fund") || nivel === "fundamental";
    }

    return true;
  });

  const vinculosFiltrados = vinculos.filter((v) => {
    if (!filtro) return true;
    const termo = filtro.toLowerCase();
    return (
      v.professorNome.toLowerCase().includes(termo) ||
      v.disciplinaNome.toLowerCase().includes(termo) ||
      v.serieNome.toLowerCase().includes(termo)
    );
  });

  const vinculosPorProfessor = (profId: string) =>
    vinculos.filter((v) => v.professorId === profId);

  const toggleSerieSelecionada = (serieId: string) => {
    setSeriesSelecionadas((prev) =>
      prev.includes(serieId)
        ? prev.filter((id) => id !== serieId)
        : [...prev, serieId]
    );
  };

  // --------- AÇÕES ---------

  const adicionarVinculo = async () => {
    if (!professorSelecionado) {
      toast.error("Selecione um professor");
      return;
    }
    if (!disciplinaSelecionada) {
      toast.error("Selecione uma disciplina");
      return;
    }
    if (seriesSelecionadas.length === 0) {
      toast.error("Selecione pelo menos uma série");
      return;
    }

    try {
      const inserts: {
        professor_id: string;
        disciplina_id: string;
        serie_id: string;
        ano_letivo?: number;
      }[] = [];

      for (const serieId of seriesSelecionadas) {
        const jaExiste = vinculos.some(
          (v) =>
            v.professorId === professorSelecionado &&
            v.disciplinaId === disciplinaSelecionada &&
            v.serieId === serieId
        );
        if (jaExiste) continue;

        inserts.push({
          professor_id: professorSelecionado,
          disciplina_id: disciplinaSelecionada,
          serie_id: serieId,
          ano_letivo: ANO_ATUAL,
        });
      }

      if (inserts.length === 0) {
        toast.error("Todos os vínculos selecionados já existem.");
        return;
      }

      const { error } = await supabase
        .from("professores_disciplinas_series")
        .insert(inserts);

      if (error) throw error;

      toast.success("Vínculo(s) criado(s) com sucesso!");

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

  // Nova função para remover TODOS os vínculos de um professor
  const removerTodosVinculosDoProfessor = async (professorId: string, professorNome: string) => {
    if (!confirm(`Deseja realmente desvincular o professor ${professorNome} de TODAS as suas disciplinas e séries?`)) return;

    try {
      const { error } = await supabase
        .from("professores_disciplinas_series")
        .delete()
        .eq("professor_id", professorId);

      if (error) throw error;

      setVinculos((prev) => prev.filter((v) => v.professorId !== professorId));
      toast.success(`Todos os vínculos de ${professorNome} foram removidos com sucesso!`);
    } catch (e: any) {
      console.error("[GestaoVinculos] Erro ao remover todos os vínculos do professor:", e.message);
      toast.error("Erro ao remover todos os vínculos do professor");
    }
  };

  // --------- RENDER ---------

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onVoltar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onVoltar}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestão de Vínculos
            </h1>
            <p className="text-gray-600 mt-2">
              Vincule professores às disciplinas e séries que lecionam
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-4 py-2">
            <Link2 className="w-4 h-4 mr-2" />
            {vinculos.length} vínculo(s) ativo(s)
          </Badge>
        </div>
      </div>

      {/* Formulário */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Criar Novo Vínculo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Professor */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Professor
              </label>
              <select
                value={professorSelecionado}
                onChange={(e) => setProfessorSelecionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione o professor</option>
                {professores.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Segmento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Segmento
              </label>
              <select
                value={segmentoSelecionado}
                onChange={(e) =>
                  setSegmentoSelecionado(e.target.value as SegmentoCodigo)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="fundamental1">Ensino Fundamental I</option>
                <option value="fundamental2">Ensino Fundamental II</option>
                <option value="medio">Ensino Médio</option>
              </select>
            </div>

            {/* Disciplina */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Disciplina
              </label>
              <select
                value={disciplinaSelecionada}
                onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione a disciplina</option>
                {disciplinasFiltradas.map((disc) => {
                  const segLabel = labelSegmentoDisciplina(disc.segmento);
                  return (
                    <option key={disc.id} value={disc.id}>
                      {disc.nome}
                      {segLabel ? ` (${segLabel})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Séries (múltiplas) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Séries ({labelSegmentoSelect(segmentoSelecionado)})
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1 bg-white">
                {seriesFiltradas.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Nenhuma série cadastrada. Cadastre em Gestão Escolar.
                  </p>
                ) : (
                  seriesFiltradas.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={seriesSelecionadas.includes(s.id)}
                        onChange={() => toggleSerieSelecionada(s.id)}
                      />
                      <span>{s.nome}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={adicionarVinculo}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={carregando}
            >
              <Check className="w-4 h-4 mr-2" />
              Criar Vínculo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de vínculos (escondida até pesquisar) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-gray-600" />
              Vínculos Ativos
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar vínculos (digite o nome do professor)..."
                  value={filtro}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFiltro(value);
                    setMostrarLista(!!value); // mostra a lista só quando tiver texto
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {mostrarLista && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFiltro("");
                    setMostrarLista(false);
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {mostrarLista && (
          <CardContent className="pt-0">
            <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
              {vinculosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {filtro
                      ? "Nenhum vínculo encontrado para esse professor"
                      : "Nenhum vínculo cadastrado ainda"}
                  </p>
                </div>
              ) : (
                vinculosFiltrados.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {v.professorNome}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <Badge variant="outline" className="bg-white">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {v.disciplinaNome}
                          </Badge>
                          <Badge variant="outline" className="bg-white">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {v.serieNome}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerVinculo(v.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* Resumo por Professor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            Resumo por Professor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {professores.map((prof) => {
              const vps = vinculosPorProfessor(prof.id);
              // AQUI ESTÁ A ALTERAÇÃO: Só renderiza o card se houver vínculos
              if (vps.length === 0) return null; 

              return (
                <Card key={prof.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {prof.nome}
                      </h4>
                      {vps.length > 0 && ( // O botão "Desvincular Tudo" só aparece se houver vínculos
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerTodosVinculosDoProfessor(prof.id, prof.nome)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                          title={`Desvincular ${prof.nome} de todas as disciplinas/séries`}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Desvincular Tudo
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {vps.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          Nenhum vínculo ativo.
                        </p>
                      ) : (
                        vps.map((v) => (
                          <div
                            key={v.id}
                            className="text-sm text-gray-600 flex items-center gap-2"
                          >
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            {v.disciplinaNome} - {v.serieNome}
                          </div>
                        ))
                      )}
                    </div>
                    {vps.length > 0 && (
                      <Badge variant="secondary" className="mt-3">
                        {vps.length} vínculo(s)
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
