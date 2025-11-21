// src/components/GestaoEscola.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import {
  Loader2,
  Layers,
  Users,
  BookOpen,
  Link2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface GestaoEscolaProps {
  onVoltar?: () => void;
}

/** Tipos de dados do Supabase */
interface Serie {
  id: string;
  nome: string;
  nivel: string | null;
}

interface Turma {
  id: string;
  nome: string;
  serie_id: string | null;
  serie_nome?: string | null;
}

interface Disciplina {
  id: string;
  nome: string;
  segmento: string | null;
}

interface Professor {
  id: string;
  nome: string | null;
  email: string | null;
}

interface Vinculo {
  id: string;
  professor_id: string;
  disciplina_id: string;
  serie_id: string | null;
  turma_id: string | null;
  professor_nome?: string | null;
  disciplina_nome?: string;
  serie_nome?: string | null;
  turma_nome?: string | null;
}

type Aba = "series_turmas" | "disciplinas" | "professores" | "vinculos";

const abasDisponiveis: {
  id: Aba;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
}[] = [
  {
    id: "series_turmas",
    titulo: "Séries e Turmas",
    descricao: "Organize a estrutura de séries e turmas da escola",
    icone: <Layers className="w-5 h-5 text-blue-600" />,
  },
  {
    id: "disciplinas",
    titulo: "Disciplinas",
    descricao: "Cadastre e gerencie disciplinas",
    icone: <BookOpen className="w-5 h-5 text-green-600" />,
  },
  {
    id: "professores",
    titulo: "Professores",
    descricao: "Visão geral dos professores cadastrados",
    icone: <Users className="w-5 h-5 text-purple-600" />,
  },
  {
    id: "vinculos",
    titulo: "Vínculos",
    descricao: "Relacione professores, disciplinas e turmas",
    icone: <Link2 className="w-5 h-5 text-orange-600" />,
  },
];

export default function GestaoEscola({ onVoltar }: GestaoEscolaProps) {
  const [abaAtual, setAbaAtual] = useState<Aba>("series_turmas");

  const [carregando, setCarregando] = useState(true);

  const [series, setSeries] = useState<Serie[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);

  // formulários
  const [novaSerieNome, setNovaSerieNome] = useState("");
  const [novaTurmaNome, setNovaTurmaNome] = useState("");
  const [novaTurmaSerieId, setNovaTurmaSerieId] = useState<string | undefined>(
    undefined
  );
  const [novaDisciplinaNome, setNovaDisciplinaNome] = useState("");
  const [novaDisciplinaSegmento, setNovaDisciplinaSegmento] = useState<
    string | undefined
  >(undefined);

  // formulário de vínculo
  const [vProfId, setVProfId] = useState<string | undefined>();
  const [vDiscId, setVDiscId] = useState<string | undefined>();
  const [vSerieId, setVSerieId] = useState<string | undefined>();
  const [vTurmaId, setVTurmaId] = useState<string | undefined>();

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      setCarregando(true);

      const [
        { data: seriesData, error: seriesError },
        { data: turmasData, error: turmasError },
        { data: discData, error: discError },
        { data: profsData, error: profsError },
        { data: vincData, error: vincError },
      ] = await Promise.all([
        supabase.from("series").select("*").order("nome"),
        supabase.from("turmas").select("*").order("nome"),
        supabase.from("disciplinas").select("*").order("nome"),
        supabase
          .from("users")
          .select("id, nome, email")
          .eq("tipo", "professor")
          .order("nome"),
        supabase.from("professores_disciplinas_series").select("*"),
      ]);

      console.log("[GESTAO] seriesData:", seriesData, "error:", seriesError);
      console.log("[GESTAO] turmasData:", turmasData, "error:", turmasError);
      console.log("[GESTAO] discData:", discData, "error:", discError);

      if (seriesError) throw seriesError;
      if (turmasError) throw turmasError;
      if (discError) throw discError;
      if (profsError) throw profsError;
      if (vincError) throw vincError;

      const seriesMap = new Map<string, Serie>();
      (seriesData || []).forEach((s: any) =>
        seriesMap.set(s.id, { id: s.id, nome: s.nome, nivel: s.nivel })
      );

      const turmasMap = new Map<string, Turma>();
      (turmasData || []).forEach((t: any) =>
        turmasMap.set(t.id, {
          id: t.id,
          nome: t.nome,
          serie_id: t.serie_id,
          serie_nome: t.serie_id
            ? seriesMap.get(t.serie_id)?.nome || null
            : null,
        })
      );

      const discMap = new Map<string, Disciplina>();
      (discData || []).forEach((d: any) =>
        discMap.set(d.id, {
          id: d.id,
          nome: d.nome,
          segmento: d.segmento ?? null,
        })
      );

      const profMap = new Map<string, Professor>();
      (profsData || []).forEach((p: any) =>
        profMap.set(p.id, { id: p.id, nome: p.nome, email: p.email })
      );

      const vincEnriquecidos: Vinculo[] = (vincData || []).map((v: any) => ({
        id: v.id,
        professor_id: v.professor_id,
        disciplina_id: v.disciplina_id,
        serie_id: v.serie_id,
        turma_id: v.turma_id,
        professor_nome:
          profMap.get(v.professor_id)?.nome ??
          profMap.get(v.professor_id)?.email ??
          null,
        disciplina_nome: discMap.get(v.disciplina_id)?.nome,
        serie_nome: v.serie_id
          ? seriesMap.get(v.serie_id)?.nome || null
          : null,
        turma_nome: v.turma_id
          ? turmasMap.get(v.turma_id)?.nome || null
          : null,
      }));

      setSeries(seriesData || []);
      setTurmas(Array.from(turmasMap.values()));
      setDisciplinas(
        (discData || []).map((d: any) => ({
          id: d.id,
          nome: d.nome,
          segmento: d.segmento ?? null,
        }))
      );
      setProfessores(profsData || []);
      setVinculos(vincEnriquecidos);
    } catch (error: any) {
      console.error(
        "Erro ao carregar dados da gestão escolar:",
        error.message
      );
      toast.error("Erro ao carregar dados da gestão escolar.");
    } finally {
      setCarregando(false);
    }
  }

  async function criarSerie(e: React.FormEvent) {
    e.preventDefault();
    if (!novaSerieNome.trim()) return;

    const { error } = await supabase
      .from("series")
      .insert({ nome: novaSerieNome.trim(), nivel: null });

    if (error) {
      console.error("Erro ao criar série:", error.message);
      toast.error("Não foi possível criar a série.");
      return;
    }

    toast.success("Série criada com sucesso.");
    setNovaSerieNome("");
    carregarTudo();
  }

  async function criarTurma(e: React.FormEvent) {
    e.preventDefault();
    if (!novaTurmaNome.trim()) return;

    const anoAtual = new Date().getFullYear();

    const { error } = await supabase.from("turmas").insert({
      nome: novaTurmaNome.trim(),
      serie_id: novaTurmaSerieId || null,
      ano: anoAtual,
    });

    if (error) {
      console.error("Erro ao criar turma:", error.message);
      toast.error("Não foi possível criar a turma.");
      return;
    }

    toast.success("Turma criada com sucesso.");
    setNovaTurmaNome("");
    setNovaTurmaSerieId(undefined);
    carregarTudo();
  }

  async function excluirSerie(id: string) {
    try {
      const { error } = await supabase.from("series").delete().eq("id", id);

      if (error) {
        console.error("Erro ao excluir série:", error.message);
        toast.error("Não foi possível excluir a série.");
        return;
      }

      toast.success("Série excluída com sucesso.");
      setSeries((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error("Erro inesperado ao excluir série:", err.message);
      toast.error("Erro inesperado ao excluir a série.");
    }
  }

  async function excluirDisciplina(id: string) {
    try {
      const { error } = await supabase
        .from("disciplinas")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao excluir disciplina:", error.message);
        toast.error("Não foi possível excluir a disciplina.");
        return;
      }

      toast.success("Disciplina excluída com sucesso.");
      setDisciplinas((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      console.error("Erro inesperado ao excluir disciplina:", err.message);
      toast.error("Erro inesperado ao excluir a disciplina.");
    }
  }


  async function criarDisciplina(e: React.FormEvent) {
    e.preventDefault();
    if (!novaDisciplinaNome.trim()) return;

    if (!novaDisciplinaSegmento) {
      toast.error("Selecione o segmento da disciplina.");
      return;
    }

    const nome = novaDisciplinaNome.trim();

    const { error } = await supabase.from("disciplinas").insert({
      nome,
      segmento: novaDisciplinaSegmento, // coluna TEXT que você já tem
    });

    if (error) {
      console.error("Erro ao criar disciplina:", error.message);
      toast.error("Não foi possível criar a disciplina.");
      return;
    }

    toast.success("Disciplina criada com sucesso.");
    setNovaDisciplinaNome("");
    setNovaDisciplinaSegmento(undefined);
    carregarTudo();
  }

  async function criarVinculo(e: React.FormEvent) {
    e.preventDefault();
    if (!vProfId || !vDiscId) {
      toast.error("Selecione pelo menos professor e disciplina.");
      return;
    }

    const { error } = await supabase
      .from("professores_disciplinas_series")
      .insert({
        professor_id: vProfId,
        disciplina_id: vDiscId,
        serie_id: vSerieId || null,
        turma_id: vTurmaId || null,
      });

    if (error) {
      console.error("Erro ao criar vínculo:", error.message);
      toast.error("Não foi possível criar o vínculo.");
      return;
    }

    toast.success("Vínculo criado com sucesso.");
    setVProfId(undefined);
    setVDiscId(undefined);
    setVSerieId(undefined);
    setVTurmaId(undefined);
    carregarTudo();
  }

  function renderConteudo() {
    switch (abaAtual) {
      case "series_turmas":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Séries */}
            <Card className="bg-white/90 backdrop-blur">
              <CardContent className="p-4">
                <h2 className="font-semibold mb-3 text-gray-900">Séries</h2>
                <form onSubmit={criarSerie} className="flex gap-2 mb-3">
                  <Input
                    placeholder="Nova série (ex: 6º ano)"
                    value={novaSerieNome}
                    onChange={(e) => setNovaSerieNome(e.target.value)}
                  />
                  <Button type="submit" size="sm">
                    Adicionar
                  </Button>
                </form>
                <ul className="max-h-64 overflow-auto text-sm text-gray-700 space-y-1">
                  {series.map((s) => (
                    <li
                      key={s.id}
                      className="border-b border-gray-100 py-1 flex items-center justify-between gap-2"
                    >
                      <span>{s.nome}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => excluirSerie(s.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </li>
                  ))}
                  {series.length === 0 && (
                    <li className="text-gray-500 text-xs">
                      Nenhuma série cadastrada.
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Turmas */}
            <Card className="bg-white/90 backdrop-blur">
              <CardContent className="p-4">
                <h2 className="font-semibold mb-3 text-gray-900">Turmas</h2>
                <form onSubmit={criarTurma} className="space-y-2 mb-3">
                  <Input
                    placeholder="Nova turma (ex: 6ºA)"
                    value={novaTurmaNome}
                    onChange={(e) => setNovaTurmaNome(e.target.value)}
                  />
                  <Select
                    value={novaTurmaSerieId}
                    onValueChange={(value) => setNovaTurmaSerieId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Série (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm" className="w-full">
                    Adicionar Turma
                  </Button>
                </form>
                <ul className="max-h-64 overflow-auto text-sm text-gray-700 space-y-1">
                  {turmas.map((t) => (
                    <li
                      key={t.id}
                      className="border-b border-gray-100 py-1 flex justify-between"
                    >
                      <span>
                        {t.nome}{" "}
                        {t.serie_nome && (
                          <span className="text-xs text-gray-500">
                            ({t.serie_nome})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                  {turmas.length === 0 && (
                    <li className="text-gray-500 text-xs">
                      Nenhuma turma cadastrada.
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case "disciplinas":
        return (
          <Card className="bg-white/90 backdrop-blur">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3 text-gray-900">
                Disciplinas
              </h2>
              <form
                onSubmit={criarDisciplina}
                className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-2 mb-3"
              >
                <Input
                  placeholder="Nova disciplina (ex: Matemática)"
                  value={novaDisciplinaNome}
                  onChange={(e) => setNovaDisciplinaNome(e.target.value)}
                />

                <Select
                  value={novaDisciplinaSegmento}
                  onValueChange={setNovaDisciplinaSegmento}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fundamental 1">
                      Fundamental 1
                    </SelectItem>
                    <SelectItem value="Fundamental 2">
                      Fundamental 2
                    </SelectItem>
                    <SelectItem value="Ensino Médio">
                      Ensino Médio
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button type="submit" size="sm">
                  Adicionar
                </Button>
              </form>
              <ul className="max-h-80 overflow-auto text-sm text-gray-700 space-y-1">
                {disciplinas.map((d) => (
                  <li
                    key={d.id}
                    className="border-b border-gray-100 py-1 flex items-center justify-between gap-2"
                  >
                    <span>{d.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{(d as any).segmento}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => excluirDisciplina(d.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </li>
                ))}
                {disciplinas.length === 0 && (
                  <li className="text-gray-500 text-xs">
                    Nenhuma disciplina cadastrada.
                  </li>
                )}
              </ul>

            </CardContent>
          </Card>
        );

      case "professores":
        return (
          <Card className="bg-white/90 backdrop-blur">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3 text-gray-900">
                Professores cadastrados
              </h2>
              <ul className="max-h-96 overflow-auto text-sm text-gray-700 space-y-1">
                {professores.map((p) => (
                  <li
                    key={p.id}
                    className="border-b border-gray-100 py-1 flex justify-between"
                  >
                    <span>{p.nome || p.email}</span>
                    <span className="text-xs text-gray-500">{p.email}</span>
                  </li>
                ))}
                {professores.length === 0 && (
                  <li className="text-gray-500 text-xs">
                    Nenhum professor do tipo &quot;professor&quot; cadastrado.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        );

      case "vinculos":
        return (
          <Card className="bg-white/90 backdrop-blur">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3 text-gray-900">
                Vínculos de Professores
              </h2>

              <form
                onSubmit={criarVinculo}
                className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4"
              >
                <Select value={vProfId} onValueChange={setVProfId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {professores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={vDiscId} onValueChange={setVDiscId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplinas.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nome} ({d.segmento || "Sem seg."})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={vSerieId} onValueChange={setVSerieId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Série (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={vTurmaId} onValueChange={setVTurmaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Turma (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="md:col-span-4 flex justify-end mt-2">
                  <Button type="submit" size="sm">
                    Criar Vínculo
                  </Button>
                </div>
              </form>

              <div className="max-h-80 overflow-auto text-sm text-gray-700 space-y-1">
                {vinculos.map((v) => (
                  <div
                    key={v.id}
                    className="border-b border-gray-100 py-1 flex justify-between gap-2"
                  >
                    <span>
                      <strong>{v.professor_nome}</strong> →{" "}
                      {v.disciplina_nome}
                    </span>
                    <span className="text-xs text-gray-500">
                      {v.turma_nome || v.serie_nome || "sem série/turma"}
                    </span>
                  </div>
                ))}
                {vinculos.length === 0 && (
                  <p className="text-gray-500 text-xs">
                    Nenhum vínculo cadastrado ainda.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestão Escolar</h1>
          <p className="text-sm text-gray-600">
            Administre a estrutura acadêmica: séries, turmas, disciplinas e
            vínculos de professores.
          </p>
        </div>
        {onVoltar && (
          <Button variant="outline" size="sm" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      {carregando && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando dados...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {abasDisponiveis.map((seg) => (
          <Card
            key={seg.id}
            className={`cursor-pointer transition-all ${
              abaAtual === seg.id
                ? "ring-2 ring-blue-500 bg-white"
                : "bg-white/80 hover:shadow-md"
            }`}
            onClick={() => setAbaAtual(seg.id)}
          >
            <CardContent className="p-3 flex gap-3 items-start">
              <div className="mt-1">{seg.icone}</div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {seg.titulo}
                </h3>
                <p className="text-xs text-gray-600">{seg.descricao}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {renderConteudo()}
    </div>
  );
}
