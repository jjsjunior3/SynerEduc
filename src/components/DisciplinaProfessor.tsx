import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  BookOpen,
  MessageSquare,
  BarChart3,
  Video,
  Loader2,
  AlertCircle
} from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

// Importação dos componentes das abas
import { PDFViewerProfessor } from "./PDFViewerProfessor";
import { AtividadesProfessor } from "./AtividadesProfessor";
import { FrequenciaProfessor } from "./FrequenciaProfessor";
import { ForumProfessor } from "./ForumProfessor";
import { AulasAoVivoProfessor } from "./AulasAoVivoProfessor"; // ✅ Importado

interface DisciplinaProfessorProps {
  disciplina: { id: string; nome: string; cor?: string };
  serie: { id: string; nome: string };
  onVoltar: () => void;
}

interface BimestreData {
  id: string;
  numero: number;
  nome: string;
  descricao: string;
  pdfUrl?: string;
  totalAlunos: number;
  alunosVisualizaram: number;
  progresso: number;
}

export function DisciplinaProfessor({
  disciplina,
  serie,
  onVoltar
}: DisciplinaProfessorProps) {
  const [abaAtiva, setAbaAtiva] = useState<
    "conteudo" | "atividades" | "forum" | "frequencia" | "agenda" | "boletim" | "aulas-vivo"
  >("conteudo");

  const [bimestres, setBimestres] = useState<BimestreData[]>([]);
  const [loading, setLoading] = useState(true);

  const [bimestreSelecionado, setBimestreSelecionado] = useState<BimestreData | null>(null);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(true);

  /* -------------------------------------------------------------------------- */
  /*                               BUSCAR DADOS                               */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function buscarConteudos() {
      setLoading(true);
      try {
        const { data: conteudos, error } = await supabase
          .from("pdfs_conteudista")
          .select("*")
          .ilike("disciplina", `%${disciplina.nome}%`)
          .ilike("serie", `%${serie.nome}%`);

        if (error) throw error;

        const estruturaBase = [1, 2, 3, 4].map((num) => {
          const conteudoSalvo = conteudos?.find(
            (c) => c.bimestre === num || c.bimestre_numero === num
          );

          return {
            id: conteudoSalvo?.id || `vazio_${num}`,
            numero: num,
            nome: `${num}º Bimestre`,
            descricao:
              conteudoSalvo?.descricao ||
              conteudoSalvo?.nome ||
              "Nenhum material disponível.",
            pdfUrl: conteudoSalvo?.url || undefined,
            totalAlunos: 0,
            alunosVisualizaram: 0,
            progresso: 0
          };
        });

        setBimestres(estruturaBase);
      } catch (err) {
        console.error("Erro ao buscar conteúdos:", err);
      } finally {
        setLoading(false);
      }
    }

    buscarConteudos();
  }, [disciplina.nome, serie.nome]);

  /* -------------------------------------------------------------------------- */
  /*                               HANDLERS                                    */
  /* -------------------------------------------------------------------------- */
  const handleBimestreClick = (bimestre: BimestreData) => {
    setBimestreSelecionado(bimestre);
    setMostrarConteudo(true);
  };

  const handleFecharConteudo = () => {
    setMostrarConteudo(false);
    setBimestreSelecionado(null);
    setSidebarAberta(true);
  };

  /* -------------------------------------------------------------------------- */
  /*                               RENDER                                        */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* HEADER */}
      <div className={`${disciplina.cor || "bg-blue-600"} border-b transition-colors duration-300 shrink-0`}>
        <div className="px-6 py-6">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onVoltar}
              className="flex items-center gap-2 text-white hover:text-white/80 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Painel
            </Button>
          </div>

          <div className="flex justify-between items-end text-white">
            <div>
              <h1 className="text-2xl font-bold">{disciplina.nome}</h1>
              <p className="text-white/80 text-sm">{serie.nome}</p>
            </div>
            <div className="flex gap-3">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                <BookOpen className="w-4 h-4 mr-2" />
                Material Didático
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="px-6">
          <div className="flex space-x-6 overflow-x-auto">
            {[
              { id: "conteudo", label: "Conteúdo", icon: FileText },
              { id: "atividades", label: "Atividades", icon: FileText },
              { id: "frequencia", label: "Frequência", icon: BarChart3 },
              { id: "forum", label: "Fórum", icon: MessageSquare },
              { id: "aulas-vivo", label: "Aulas ao Vivo", icon: Video }
            ].map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    abaAtiva === aba.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {aba.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden relative">
        <>
          {/* ==================== ABA CONTEÚDO (Lista de Bimestres) ==================== */}
          {abaAtiva === "conteudo" && (
            <div
              className={`
                bg-gray-50 overflow-y-auto transition-all duration-300 border-r border-gray-200
                ${!mostrarConteudo ? "w-full" : sidebarAberta ? "w-1/4 min-w-[280px]" : "w-0 overflow-hidden"}
              `}
            >
              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 whitespace-nowrap">
                      Bimestres
                    </h2>
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  </div>

                  <div
                    className={`grid ${
                      mostrarConteudo ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                    } gap-4`}
                  >
                    {bimestres.map((bimestre) => (
                      <Card
                        key={bimestre.numero}
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                          bimestreSelecionado?.numero === bimestre.numero
                            ? "border-l-blue-600 ring-2 ring-blue-100"
                            : bimestre.pdfUrl
                            ? "border-l-green-500"
                            : "border-l-gray-300"
                        }`}
                        onClick={() => handleBimestreClick(bimestre)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-700">{bimestre.nome}</span>
                            {bimestre.pdfUrl ? (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 hover:bg-green-200 text-[10px]"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> PDF
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px]">
                                <AlertCircle className="w-3 h-3 mr-1" /> Vazio
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-4">{bimestre.descricao}</p>
                          <div className="space-y-1 opacity-50">
                            <Progress value={bimestre.progresso} className="h-1" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ABA CONTEÚDO (Visualizador de PDF) ==================== */}
          {abaAtiva === "conteudo" && mostrarConteudo && (
            <div className="flex-1 w-full bg-white overflow-hidden relative shadow-xl flex flex-col [&>*]:h-full">
              <PDFViewerProfessor
                bimestre={bimestreSelecionado}
                onClose={handleFecharConteudo}
                sidebarAberta={sidebarAberta}
                onToggleSidebar={() => setSidebarAberta(!sidebarAberta)}
                hasProximo={bimestreSelecionado ? bimestreSelecionado.numero < 4 : false}
                hasAnterior={bimestreSelecionado ? bimestreSelecionado.numero > 1 : false}
                onProximo={() => {
                  if (bimestreSelecionado && bimestreSelecionado.numero < 4) {
                    const prox = bimestres.find((b) => b.numero === bimestreSelecionado.numero + 1);
                    if (prox) setBimestreSelecionado(prox);
                  }
                }}
                onAnterior={() => {
                  if (bimestreSelecionado && bimestreSelecionado.numero > 1) {
                    const ant = bimestres.find((b) => b.numero === bimestreSelecionado.numero - 1);
                    if (ant) setBimestreSelecionado(ant);
                  }
                }}
              />
            </div>
          )}

          {/* ==================== ABA ATIVIDADES ==================== */}
          {abaAtiva === "atividades" && (
            <div className="flex-1 w-full bg-white overflow-y-auto">
              <AtividadesProfessor
                disciplina={disciplina}
                serie={serie}
              />
            </div>
          )}

          {/* ==================== ABA FREQUÊNCIA ==================== */}
          {abaAtiva === "frequencia" && (
            <div className="flex-1 w-full bg-white overflow-y-auto">
              <FrequenciaProfessor
                disciplina={disciplina}
                serie={serie}
              />
            </div>
          )}

          {/* ==================== ABA FÓRUM ==================== */}
          {abaAtiva === "forum" && (
            <div className="flex-1 w-full bg-white overflow-y-auto">
              <ForumProfessor
                disciplina={disciplina}
                serie={serie}
              />
            </div>
          )}

          {/* ==================== ABA AULAS AO VIVO (NOVO) ==================== */}
          {abaAtiva === "aulas-vivo" && (
            <div className="flex-1 w-full bg-white overflow-y-auto">
              <AulasAoVivoProfessor
                disciplina={disciplina}
                serie={serie}
              />
            </div>
          )}

          {/* ==================== OUTRAS ABAS (Em breve) ==================== */}
          {abaAtiva !== "conteudo" && 
           abaAtiva !== "atividades" && 
           abaAtiva !== "frequencia" && 
           abaAtiva !== "forum" && 
           abaAtiva !== "aulas-vivo" && (
            <div className="flex-1 w-full flex items-center justify-center text-center py-12 text-gray-500 bg-white">
              <div>
                <p className="text-lg">Funcionalidade da aba <strong>{abaAtiva}</strong> em desenvolvimento.</p>
                <p className="text-sm text-gray-400 mt-2">Em breve você poderá acessar este recurso.</p>
              </div>
            </div>
          )}
        </>
      </div>
    </div>
  );
}
