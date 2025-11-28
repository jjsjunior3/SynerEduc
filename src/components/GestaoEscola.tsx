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
import { Checkbox } from "./ui/checkbox"; // Importar Checkbox

interface GestaoEscolaProps {
  onVoltar: () => void;
}

interface Disciplina {
  id: string;
  nome: string;
  descricao: string | null; // Pode ser null no banco
  segmento?: string | null;
  ativa: boolean;
}

interface Serie {
  id: string;
  nome: string;
  segmento: "fundamental" | "medio";
  totalAlunos: number; // Espera que a coluna exista
  ativa: boolean;
}

function GestaoEscola({ onVoltar }: GestaoEscolaProps) {
  const [abaSelecionada, setAbaSelecionada] = useState<
    "disciplinas" | "series"
  >("disciplinas");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Disciplina | Serie | null>(null);

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [carregando, setCarregando] = useState(false);

  const [formDisciplina, setFormDisciplina] = useState({
    nome: "",
    descricao: "", // Descrição de volta no formulário
    segmento: "" as string | null,
    ativa: true,
  });

  const [formSerie, setFormSerie] = useState({
    nome: "",
    segmento: "fundamental" as "fundamental" | "medio",
    ativa: true,
  });

  // --------- CARREGAR DADOS DO SUPABASE ---------

  async function carregarDisciplinas() {
    try {
      // DESCRICAO DE VOLTA NA SELECAO
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome, descricao, segmento, ativa")
        .order("nome", { ascending: true });

      if (error) throw error;

      const mapeadas: Disciplina[] = (data || []).map((d: any) => ({
        id: d.id,
        nome: d.nome || "Disciplina sem nome",
        descricao: d.descricao ?? null, // Pode ser null
        segmento: d.segmento ?? null,
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
      // TOTAL_ALUNOS DE VOLTA NA SELECAO
      const { data, error } = await supabase
        .from("series")
        .select("id, nome, segmento, nivel, ativa, total_alunos")
        .order("nome", { ascending: true });

      if (error) throw error;

      const mapeadas: Serie[] = (data || []).map((s: any) => ({
        id: s.id,
        nome: s.nome || "Série sem nome",
        segmento:
          (s.segmento as "fundamental" | "medio") ||
          (s.nivel === "medio" ? "medio" : "fundamental"), // Prioriza 'segmento', fallback para 'nivel'
        totalAlunos: s.total_alunos || 0, // Espera total_alunos
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

  // --------- MODAL / FORM ---------

  const handleAbrirModal = (tipo: "disciplina" | "serie", item?: any) => {
    if (item) {
      setEditando(item);
      if (tipo === "disciplina") {
        setFormDisciplina({
          nome: item.nome,
          descricao: item.descricao ?? "", // Descrição de volta
          segmento: item.segmento ?? "",
          ativa: item.ativa,
        });
      } else {
        setFormSerie({
          nome: item.nome,
          segmento: item.segmento,
          ativa: item.ativa,
        });
      }
    } else {
      setEditando(null);
      if (tipo === "disciplina") {
        setFormDisciplina({ nome: "", descricao: "", segmento: "", ativa: true }); // Descrição de volta
      } else {
        setFormSerie({
          nome: "",
          segmento: "fundamental",
          ativa: true,
        });
      }
    }
    setModalAberto(true);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setFormDisciplina({ nome: "", descricao: "", segmento: "", ativa: true }); // Descrição de volta
    setFormSerie({ nome: "", segmento: "fundamental", ativa: true });
  };

  // --------- SALVAR / EXCLUIR DISCIPLINA ---------

  const handleSalvarDisciplina = async () => {
    if (!formDisciplina.nome.trim()) {
      toast.error("Preencha o nome da disciplina");
      return;
    }

    const payload: any = {
      nome: formDisciplina.nome.trim(),
      descricao: formDisciplina.descricao.trim() || null, // Descrição de volta no payload
      segmento: formDisciplina.segmento || null,
      ativa: formDisciplina.ativa,
    };

    try {
      if (editando && "descricao" in editando) { // Verificação mais específica
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

        const nova: Disciplina = {
          id: data?.id || Date.now().toString(),
          ...payload,
        };
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
      const { error } = await supabase
        .from("disciplinas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setDisciplinas((prev) => prev.filter((d) => d.id !== id));
      toast.success("Disciplina excluída com sucesso!");
    } catch (e: any) {
      console.error("[GestaoEscola] Erro ao excluir disciplina:", e.message);
      toast.error("Erro ao excluir disciplina.");
    }
  };

  // --------- SALVAR / EXCLUIR SÉRIE ---------

  const handleSalvarSerie = async () => {
    if (!formSerie.nome.trim()) {
      toast.error("Preencha o nome da série");
      return;
    }

    const payload: any = {
      nome: formSerie.nome.trim(),
      segmento: formSerie.segmento,
      ativa: formSerie.ativa,
      // total_alunos não é incluído aqui, pois é um campo calculado ou atualizado em outro lugar
      // ou pode ser atualizado via trigger/função no banco
    };

    try {
      if (editando && "segmento" in editando) {
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
          totalAlunos: 0, // Valor padrão para nova série
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={onVoltar} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold">Gestão Escolar</h2>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
            Online
          </Badge>
        </div>
      </div>

      {/* Alert Informativo */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Os dados desta tela são salvos diretamente no banco de dados
          (Supabase). Disciplinas e séries cadastradas aqui são usadas nas
          outras telas do sistema.
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
              <TabsTrigger
                value="disciplinas"
                className="flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Disciplinas
              </TabsTrigger>
              <TabsTrigger value="series" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Séries
              </TabsTrigger>
            </TabsList>

            {/* Aba Disciplinas */}
            <TabsContent value="disciplinas" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {disciplinas.length} disciplina(s) cadastrada(s)
                </p>
                <Button
                  onClick={() => handleAbrirModal("disciplina")}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Disciplina
                </Button>
              </div>

              {carregando && (
                <p className="text-xs text-gray-500">Carregando...</p>
              )}

              <div className="space-y-3">
                {disciplinas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>Nenhuma disciplina cadastrada</p>
                    <p className="text-sm">
                      Clique em &quot;Adicionar&quot; para criar a primeira
                      disciplina
                    </p>
                  </div>
                ) : (
                  disciplinas.map((disciplina) => (
                    <div
                      key={disciplina.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{disciplina.nome}</h3>
                          {disciplina.descricao && ( // Descrição de volta na exibição
                            <p className="text-sm text-gray-500">
                              {disciplina.descricao}
                            </p>
                          )}
                          <div className="flex gap-2 mt-1">
                            {disciplina.segmento && (
                              <Badge
                                variant="outline"
                                className="text-xs text-gray-700"
                              >
                                {disciplina.segmento}
                              </Badge>
                            )}
                            <Badge
                              variant={
                                disciplina.ativa ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {disciplina.ativa ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleAbrirModal("disciplina", disciplina)
                          }
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleExcluirDisciplina(disciplina.id)
                          }
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Aba Séries */}
            <TabsContent value="series" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {series.length} série(s) cadastrada(s)
                </p>
                <Button onClick={() => handleAbrirModal("serie")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Série
                </Button>
              </div>

              {carregando && (
                <p className="text-xs text-gray-500">Carregando...</p>
              )}

              <div className="space-y-3">
                {series.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>Nenhuma série cadastrada</p>
                    <p className="text-sm">
                      Clique em &quot;Adicionar&quot; para criar a primeira
                      série
                    </p>
                  </div>
                ) : (
                  series.map((serie) => (
                    <div
                      key={serie.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-purple-500" />
                        <div>
                          <h3 className="font-medium">{serie.nome}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {serie.segmento === "fundamental" ? "Ens. Fundamental" : "Ens. Médio"}
                            </Badge>

                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {serie.totalAlunos} aluno(s)
                            </Badge>
                            <Badge
                              variant={serie.ativa ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {serie.ativa ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                          className="text-red-600 hover:text-red-700"
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

      {/* Modal de Disciplina/Série */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? abaSelecionada === "disciplinas"
                  ? "Editar Disciplina"
                  : "Editar Série"
                : abaSelecionada === "disciplinas"
                ? "Adicionar Nova Disciplina"
                : "Adicionar Nova Série"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {abaSelecionada === "disciplinas" ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nomeDisciplina" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="nomeDisciplina"
                    value={formDisciplina.nome}
                    onChange={(e) =>
                      setFormDisciplina({ ...formDisciplina, nome: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="descricaoDisciplina" className="text-right">
                    Descrição
                  </Label>
                  <Input
                    id="descricaoDisciplina"
                    value={formDisciplina.descricao}
                    onChange={(e) =>
                      setFormDisciplina({ ...formDisciplina, descricao: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="segmentoDisciplina" className="text-right">
                    Segmento
                  </Label>
                  <select
                    id="segmentoDisciplina"
                    value={formDisciplina.segmento || ""}
                    onChange={(e) =>
                      setFormDisciplina({ ...formDisciplina, segmento: e.target.value || null })
                    }
                    className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione o Segmento</option>
                    <option value="Ensino Fundamental I">Ensino Fundamental I</option>
                    <option value="Ensino Fundamental II">Ensino Fundamental II</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                    {/* Adicione outros segmentos conforme necessário */}
                  </select>
                </div>
                <div className="flex items-center space-x-2 col-span-4 justify-end">
                  <Checkbox
                    id="ativaDisciplina"
                    checked={formDisciplina.ativa}
                    onCheckedChange={(checked) =>
                      setFormDisciplina({ ...formDisciplina, ativa: !!checked })
                    }
                  />
                  <label
                    htmlFor="ativaDisciplina"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Ativa
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nomeSerie" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="nomeSerie"
                    value={formSerie.nome}
                    onChange={(e) =>
                      setFormSerie({ ...formSerie, nome: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="segmentoSerie" className="text-right">
                    Segmento
                  </Label>
                  <select
                    id="segmentoSerie"
                    value={formSerie.segmento}
                    onChange={(e) =>
                      setFormSerie({
                        ...formSerie,
                        segmento: e.target.value as "fundamental" | "medio",
                      })
                    }
                    className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="fundamental">Ensino Fundamental</option>
                    <option value="medio">Ensino Médio</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 col-span-4 justify-end">
                  <Checkbox
                    id="ativaSerie"
                    checked={formSerie.ativa}
                    onCheckedChange={(checked) =>
                      setFormSerie({ ...formSerie, ativa: !!checked })
                    }
                  />
                  <label
                    htmlFor="ativaSerie"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Ativa
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GestaoEscola;
