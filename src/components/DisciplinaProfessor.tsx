// src/components/DisciplinaProfessor.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"; // ✅ Adicionado CardHeader e CardTitle
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
// Icons
import {
  FileText,
  MessageSquare,
  Video,
  Calendar as CalendarIcon, // ✅ Renomeado para evitar conflito
  ChevronLeft,
  Loader2,
  BookOpen, // ✅ Adicionado BookOpen
  Sun, // ✅ Adicionado Sun
  Moon, // ✅ Adicionado Moon
  FileText as FileTextIcon, // ✅ Renomeado para evitar conflito
} from "lucide-react";
// Componentes das Abas
import { PDFViewerProfessor } from "./PDFViewerProfessor";
import { AtividadesProfessor } from "./AtividadesProfessor";
import { FrequenciaProfessor } from "./FrequenciaProfessor";
import { ForumProfessor } from "./ForumProfessor";
import { AulasAoVivoProfessor } from "./AulasAoVivoProfessor";

// Interface para os dados do bimestre (para o PDFViewerProfessor)
interface BimestreData {
  numero: number;
  nome: string;
  descricao: string;
  pdfUrl?: string;
}

interface DisciplinaProfessorProps {
  disciplina: { id: string; nome: string; cor: string };
  serie: { id: string; nome: string }; // Mantém o objeto completo da série
  turma: { id: string; nome: string }; // Adicionado de volta, pois o DashboardProfessor passa
  onVoltar: () => void;
}

// ✅ Interface para materiais (ConteudoPdf) - Copiado de DisciplinaPage.tsx
interface ConteudoPdf {
  id: string;
  url: string;
  nome: string;
  titulo: string;
  descricao: string;
  disciplina: string;
  serie: string;
  bimestre: number;
  autor_nome: string;
  created_at: string;
}

// ✅ Type para Abas - Copiado de DisciplinaPage.tsx
type Aba = "conteudo" | "atividades" | "aulaVivo" | "forum" | "frequencia"; // Adicionado frequencia

export function DisciplinaProfessor({ disciplina, serie, turma, onVoltar }: DisciplinaProfessorProps) {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<Aba>("conteudo");
  const [darkMode, setDarkMode] = useState(false); // ✅ Adicionado estado para dark mode

  // Conteúdo / PDFs
  const [materiais, setMateriais] = useState<ConteudoPdf[]>([]); // ✅ Usando ConteudoPdf
  const [materialSelecionado, setMaterialSelecionado] =
    useState<ConteudoPdf | null>(null);
  const [loadingConteudo, setLoadingConteudo] = useState(false);
  const [erroConteudo, setErroConteudo] = useState<string | null>(null);

  // ✅ Adicionado tratamento para disciplina ou turma nula (igual ao aluno)
  if (!disciplina || !turma) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-600 text-sm">Carregando disciplina...</span>
      </div>
    );
  }

  const corDisciplina = disciplina.cor || "bg-blue-600";
  const cardBg = darkMode
    ? "bg-gray-900 text-white shadow-lg border border-gray-700"
    : "bg-white";

  // ✅ Menu de abas (igual ao aluno, mas com Frequência)
  const menuItens = [
    { id: "conteudo" as Aba, label: "Conteúdo", icon: BookOpen },
    { id: "atividades" as Aba, label: "Atividades", icon: FileText },
    { id: "frequencia" as Aba, label: "Frequência", icon: CalendarIcon }, // ✅ Adicionado Frequência
    { id: "aulaVivo" as Aba, label: "Aulas ao Vivo", icon: Video },
    { id: "forum" as Aba, label: "Fórum", icon: MessageSquare },
  ];

  // ==========================
  // CARREGAR PDFs DO CONTEÚDO (Adaptado de DisciplinaPage.tsx)
  // ==========================
  const buscarConteudos = useCallback(async () => {
    if (!serie?.nome || !disciplina?.nome) return;

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
        .eq("serie", serie.nome) // ✅ Usando serie.nome
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
      // Seleciona automaticamente o material do 1º bimestre (ou o primeiro da lista)
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
  }, [disciplina?.nome, serie?.nome, materialSelecionado]); // ✅ Dependências atualizadas

  useEffect(() => {
    if (abaAtiva === "conteudo") {
      buscarConteudos();
    }
  }, [abaAtiva, buscarConteudos]);

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
      className={`min-h-full flex flex-col ${ // ✅ min-h-full para ocupar o espaço disponível
        darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
      } rounded-lg shadow-md overflow-hidden`} // ✅ Adicionado bg-white, rounded-lg, shadow-md, overflow-hidden
    >
      {/* HEADER */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 md:px-6 py-3 flex items-center justify-between"> {/* ✅ max-w-full para respeitar o pai */}
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
                  {serie.nome} • Turma {turma.nome}
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
          <nav className="max-w-full mx-auto px-4 md:px-6 flex items-center gap-1 overflow-x-auto"> {/* ✅ max-w-full para respeitar o pai */}
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
      <main className="flex-1 w-full px-4 md:px-6 py-6"> {/* ✅ Removido max-w-7xl mx-auto daqui */}
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
              <PDFViewerProfessor // ✅ Usando PDFViewerProfessor
                bimestre={materialSelecionado} // ✅ Passando materialSelecionado como bimestre
                onClose={() => setMaterialSelecionado(null)} // ✅ Ajustado onClose
                sidebarAberta={true} // ✅ Mantido sidebar aberta
                onToggleSidebar={() => {}} // ✅ Função vazia
                hasProximo={materialSelecionado ? materialSelecionado.bimestre < 4 : false}
                hasAnterior={materialSelecionado ? materialSelecionado.bimestre > 1 : false}
                onProximo={() => {
                  if (materialSelecionado && materialSelecionado.bimestre < 4) {
                    const prox = materiais.find((m) => m.bimestre === materialSelecionado.bimestre + 1);
                    if (prox) setMaterialSelecionado(prox);
                  }
                }}
                onAnterior={() => {
                  if (materialSelecionado && materialSelecionado.bimestre > 1) {
                    const ant = materiais.find((m) => m.bimestre === materialSelecionado.bimestre - 1);
                    if (ant) setMaterialSelecionado(ant);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ABA ATIVIDADES */}
        {abaAtiva === "atividades" && (
          <div className="p-2 md:p-4">
            <AtividadesProfessor
              disciplina={disciplina}
              serie={serie}
            />
          </div>
        )}

        {/* ABA FREQUÊNCIA */}
        {abaAtiva === "frequencia" && (
          <div className="p-2 md:p-4">
            <FrequenciaProfessor
              disciplina={disciplina}
              serie={serie}
            />
          </div>
        )}

        {/* ABA AULAS AO VIVO */}
        {abaAtiva === "aulaVivo" && (
          <div className="p-2 md:p-4">
            <AulasAoVivoProfessor
              disciplina={disciplina}
              serie={serie}
            />
          </div>
        )}

        {/* ABA FÓRUM */}
        {abaAtiva === "forum" && (
          <div className="p-2 md:p-4">
            <ForumProfessor
              disciplina={disciplina}
              serie={serie}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default DisciplinaProfessor;
