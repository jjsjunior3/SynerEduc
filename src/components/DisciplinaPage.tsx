// src/components/DisciplinaPage.tsx
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

import {
  ChevronLeft,
  BookOpen,
  FileText,
  Video,
  Calendar as CalendarIcon,
  MessageSquare,
  Sun,
  Moon,
  FileText as FileTextIcon,
  Loader2,
} from "lucide-react";

import { AtividadesAluno } from "./AtividadesAluno";
import { AulasAoVivo } from "./AulasAoVivo";
import { Forum } from "./Forum";
import { PDFViewerModerno, ConteudoPdf } from "./PDFViewerModerno";

type Aba = "conteudo" | "atividades" | "aulaVivo" | "forum";

interface DisciplinaData {
  id: string;
  nome: string;
  cor: string; // Tailwind class (ex: "bg-blue-600")
}

interface TurmaData {
  id: string;
  nome: string;
  serieId: string;
  serieNome: string;
  totalAlunos: number;
  disciplinas: DisciplinaData[];
}

interface DisciplinaPageProps {
  disciplina: DisciplinaData;
  turma: TurmaData | null;
  onVoltar: () => void;
  usuario: any;
}

export function DisciplinaPage({
  disciplina,
  turma,
  onVoltar,
  usuario,
}: DisciplinaPageProps) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("conteudo");
  const [darkMode, setDarkMode] = useState(false);

  // Conteúdo / PDFs
  const [materiais, setMateriais] = useState<ConteudoPdf[]>([]);
  const [materialSelecionado, setMaterialSelecionado] =
    useState<ConteudoPdf | null>(null);
  const [loadingConteudo, setLoadingConteudo] = useState(false);
  const [erroConteudo, setErroConteudo] = useState<string | null>(null);

  if (!disciplina || !turma) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-600 text-sm">Carregando disciplina...</span>
      </div>
    );
  }

  const corDisciplina = disciplina.cor || "bg-blue-600";
  const cardBg = darkMode
    ? "bg-gray-900 text-white shadow-lg border border-gray-700"
    : "bg-white";

  const menuItens = [
    { id: "conteudo" as Aba, label: "Conteúdo", icon: BookOpen },
    { id: "atividades" as Aba, label: "Atividades", icon: FileText },
    { id: "aulaVivo" as Aba, label: "Aulas ao Vivo", icon: Video },
    { id: "forum" as Aba, label: "Fórum", icon: MessageSquare },
  ];

  // ==========================
  // CARREGAR PDFs DO CONTEÚDO
  // ==========================
  useEffect(() => {
    async function carregarMateriais() {
      if (!turma?.serieNome || !disciplina?.nome) return;

      setLoadingConteudo(true);
      setErroConteudo(null);

      try {
        const { data, error } = await supabase
          .from("pdfs_conteudista")
          .select(
            `
            id,
            url,
            nome,
            titulo,
            descricao,
            disciplina,
            serie,
            bimestre,
            autor_nome,
            created_at
          `
          )
          .eq("serie", turma.serieNome)
          .eq("disciplina", disciplina.nome)
          .order("bimestre", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;

        const mapeados: ConteudoPdf[] =
          (data || []).map((row: any) => ({
            id: row.id,
            url: row.url,
            nome: row.nome || row.titulo || "Material",
            titulo: row.titulo,
            descricao: row.descricao,
            disciplina: row.disciplina,
            serie: row.serie,
            bimestre: row.bimestre,
            autor_nome: row.autor_nome,
            created_at: row.created_at,
          })) || [];

        setMateriais(mapeados);
        // Se nenhum material selecionado ainda, seleciona o do 1º bimestre se existir,
        // senão o primeiro da lista.
        if (!materialSelecionado) {
          const doPrimeiroBimestre =
            mapeados.find((m) => m.bimestre === 1) || mapeados[0] || null;
          setMaterialSelecionado(doPrimeiroBimestre);
        }
      } catch (e: any) {
        console.error("Erro ao carregar materiais da disciplina:", e);
        setErroConteudo(
          e?.message || "Erro ao carregar materiais desta disciplina."
        );
        setMateriais([]);
        setMaterialSelecionado(null);
      } finally {
        setLoadingConteudo(false);
      }
    }

    if (abaAtiva === "conteudo") {
      carregarMateriais();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, turma?.serieNome, disciplina?.nome]);

  // Helpers para bimestres 1..4
  const bimestres = [1, 2, 3, 4];

  const getMaterialDoBimestre = (bimestre: number) =>
    materiais.find((m) => m.bimestre === bimestre) || null;

  const handleSelecionarBimestre = (bimestre: number) => {
    const mat = getMaterialDoBimestre(bimestre);
    if (mat) {
      setMaterialSelecionado(mat);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* HEADER */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={onVoltar}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 ${corDisciplina} rounded-lg flex items-center justify-center text-white`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-semibold">
                  {disciplina.nome}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {turma.serieNome} • Turma {turma.nome}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
              {usuario?.nome}
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <nav className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-1 overflow-x-auto">
            {menuItens.map((item) => {
              const Icon = item.icon;
              const isAtivo = abaAtiva === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setAbaAtiva(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all ${
                    isAtivo
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* CONTEÚDO DAS ABAS */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6">
        {/* ABA CONTEÚDO */}
        {abaAtiva === "conteudo" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Coluna dos bimestres */}
            <div className="lg:col-span-1 space-y-4">
              <Card className={cardBg}>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileTextIcon className="w-4 h-4" />
                    Conteúdos por Bimestre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingConteudo && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando materiais...
                    </div>
                  )}

                  {erroConteudo && (
                    <p className="text-xs text-red-600">{erroConteudo}</p>
                  )}

                  {!loadingConteudo &&
                    !erroConteudo &&
                    bimestres.map((bimestre) => {
                      const mat = getMaterialDoBimestre(bimestre);
                      const isAtivo = !!mat;
                      const isSelecionado =
                        materialSelecionado &&
                        materialSelecionado.bimestre === bimestre;

                      return (
                        <button
                          key={bimestre}
                          onClick={() => isAtivo && handleSelecionarBimestre(bimestre)}
                          disabled={!isAtivo}
                          className={`w-full text-left px-3 py-3 rounded-md border text-sm transition flex flex-col gap-1 ${
                            isAtivo
                              ? isSelecionado
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/60"
                              : "border-dashed border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {bimestre}º bimestre
                            </span>
                            {isAtivo && (
                              <Badge
                                className="bg-blue-100 text-blue-700 border-none text-[10px]"
                                variant="secondary"
                              >
                                Disponível
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs">
                            {isAtivo
                              ? mat?.nome || "Material disponível"
                              : "Conteúdo ainda não disponível"}
                          </span>
                        </button>
                      );
                    })}
                </CardContent>
              </Card>
            </div>

            {/* Visualizador de PDF */}
            <div className="lg:col-span-3">
              <PDFViewerModerno
                material={materialSelecionado}
                disciplina={{
                  id: disciplina.id,
                  nome: disciplina.nome,
                  professor: undefined,
                }}
                darkMode={darkMode}
                onMarcarConcluido={(id) => {
                  console.log("Marcar concluído material", id);
                  // Futuro: salvar em tabela de progresso (ex: pdfs_alunos)
                }}
                onEnviarDuvida={(id) => {
                  console.log("Dúvida sobre material", id);
                  // Futuro: abrir modal de dúvida / fórum
                }}
              />
            </div>
          </div>
        )}

        {/* ABA ATIVIDADES */}
        {abaAtiva === "atividades" && (
          <div className="p-2 md:p-4">
            <AtividadesAluno
              disciplinaId={disciplina.id}
              nomeDisciplina={disciplina.nome}
              serieNome={turma.serieNome}
            />
          </div>
        )}

        {/* ABA AULAS AO VIVO */}
        {abaAtiva === "aulaVivo" && (
          <div className="p-2 md:p-4">
            <AulasAoVivo
              onVoltar={onVoltar}
              disciplina={disciplina}
              serie={{ id: turma.serieId, nome: turma.serieNome }}
              turma={{ id: turma.id, nome: turma.nome }}
            />
          </div>
        )}

        {/* ABA FÓRUM */}
        {abaAtiva === "forum" && (
          <div className="p-2 md:p-4">
            <Forum
              onVoltar={onVoltar}
              disciplina={disciplina}
              serie={{ id: turma.serieId, nome: turma.serieNome }}
              turma={{ id: turma.id, nome: turma.nome }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
