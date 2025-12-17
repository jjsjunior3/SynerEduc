import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

// UI Components
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";

// Icons
import {
  FileText,
  BarChart3,
  MessageSquare,
  Video,
  Calendar,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  ChevronLeft,
  Loader2
} from "lucide-react";

// Componentes das Abas
import { PDFViewerProfessor } from "./PDFViewerProfessor";
import { AtividadesProfessor } from "./AtividadesProfessor";
import { FrequenciaProfessor } from "./FrequenciaProfessor";
import { ForumProfessor } from "./ForumProfessor";
import { AulasAoVivoProfessor } from "./AulasAoVivoProfessor";
import { AgendaProfessor } from "./AgendaProfessor";

interface DisciplinaProfessorProps {
  disciplina: { id: string; nome: string; cor: string };
  serie: { id: string; nome: string };
  turma: { id: string; nome: string };
  onVoltar: () => void;
}

// Definição das abas disponíveis
type AbaTipo = "conteudo" | "atividades" | "frequencia" | "forum" | "aulas-vivo" | "agenda";

export function DisciplinaProfessor({
  disciplina,
  serie,
  turma,
  onVoltar,
}: DisciplinaProfessorProps) {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaTipo>("conteudo");
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [loading, setLoading] = useState(false);

  // Estados para Conteúdo (Bimestres)
  const [bimestres, setBimestres] = useState<any[]>([]);
  const [bimestreSelecionado, setBimestreSelecionado] = useState<any>(null);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);

  // Carregar Bimestres (Conteúdo)
  useEffect(() => {
    if (abaAtiva === "conteudo") {
      buscarConteudos();
    }
  }, [abaAtiva, disciplina.nome, serie.nome]);

  const buscarConteudos = async () => {
    setLoading(true);
    try {
      // Tenta pegar a primeira palavra da série para uma busca mais abrangente
      // Ex: Se o painel envia "1ª Série EM", pegamos "1ª" para tentar achar "1ª série" no banco
      const nomeSerie = typeof serie === "string"
        ? serie
        : serie?.nome ?? "";

      const termoCurto = nomeSerie.split(" ")[0] || "";

      console.log("--- DIAGNÓSTICO DE BUSCA ---");
      console.log("1. Disciplina vinda do Painel:", disciplina.nome);
      console.log("2. Série vinda do Painel (Exata):", `"${serie.nome}"`);
      console.log("3. Termo flexível tentado:", `"${termoCurto}"`);

      // Busca no banco
      const { data: conteudos, error } = await supabase
        .from("pdfs_conteudista")
        .select("*")
        .ilike("disciplina", `%${disciplina.nome}%`)
        // Tenta encontrar onde a série do banco contém o nome do painel OU o termo curto
        .or(`serie.ilike.%${serie.nome}%,serie.ilike.%${termoCurto}%`);

      if (error) throw error;

      console.log("4. Resultado do Banco:", conteudos);

      const estruturaBase = [1, 2, 3, 4].map((num) => {
        const conteudoSalvo = conteudos?.find(
          (c) => c.bimestre === num || c.bimestre_numero === num
        );

        let urlCompleta = undefined;

        // Lógica para garantir URL válida
        if (conteudoSalvo?.url) {
          if (conteudoSalvo.url.startsWith("http")) {
            // Se já for link completo (como no seu print), usa direto
            urlCompleta = conteudoSalvo.url;
          } else {
            // Se for caminho relativo, gera o link público
            const { data } = supabase.storage
              .from("pdfs_conteudista")
              .getPublicUrl(conteudoSalvo.url);
            urlCompleta = data.publicUrl;
          }
        }

        return {
          id: conteudoSalvo?.id || `vazio_${num}`,
          numero: num,
          nome: `${num}º Bimestre`,
          descricao:
            conteudoSalvo?.descricao ||
            conteudoSalvo?.nome ||
            "Nenhum material disponível.",
          pdfUrl: urlCompleta,
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
  };

  const handleBimestreClick = (bimestre: any) => {
    setBimestreSelecionado(bimestre);
    setMostrarConteudo(true);
    setSidebarAberta(true);
  };

  const handleFecharConteudo = () => {
    setMostrarConteudo(false);
    setBimestreSelecionado(null);
  };

  // Configuração das Abas
  const abas = [
    { id: "conteudo", label: "Conteúdo", icon: FileText },
    { id: "atividades", label: "Atividades", icon: FileText },
    { id: "frequencia", label: "Frequência", icon: BarChart3 },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "aulas-vivo", label: "Aulas ao Vivo", icon: Video },
    { id: "forum", label: "Fórum", icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* HEADER DA DISCIPLINA */}
      <div className="bg-white border-b shadow-sm z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoltar}
                className="hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  {disciplina.nome}
                  <Badge className={`${disciplina.cor} text-white border-none`}>
                    {serie.nome} - {turma.nome}
                  </Badge>
                </h1>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO DE ABAS */}
          <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-hide">
            {abas.map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id as AbaTipo)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${
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

      {/* ÁREA PRINCIPAL (CONTEÚDO DAS ABAS) */}
      <div className="flex-1 overflow-hidden relative flex flex-col">

        {/* 1. CONTEÚDO (BIMESTRES) */}
        {abaAtiva === "conteudo" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Lista de Bimestres (Sidebar ou Full) */}
            <div
              className={`
                bg-gray-50 overflow-y-auto transition-all duration-300 border-r border-gray-200
                ${!mostrarConteudo ? "w-full" : sidebarAberta ? "w-1/4 min-w-[280px]" : "w-0 overflow-hidden"}
              `}
            >
              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Bimestres</h2>
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  </div>

                  <div className={`grid ${mostrarConteudo ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"} gap-4`}>
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
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                                <CheckCircle className="w-3 h-3 mr-1" /> PDF
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px]">
                                <AlertCircle className="w-3 h-3 mr-1" /> Vazio
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-4">{bimestre.descricao}</p>
                          <Progress value={bimestre.progresso} className="h-1" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Visualizador de PDF */}
            {mostrarConteudo && (
              <div className="flex-1 w-full bg-white overflow-hidden relative shadow-xl flex flex-col">
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
          </div>
        )}

        {/* 2. ATIVIDADES */}
        {abaAtiva === "atividades" && (
          <div className="flex-1 w-full bg-white overflow-y-auto">
            <AtividadesProfessor disciplina={disciplina} serie={serie} />
          </div>
        )}

        {/* 3. FREQUÊNCIA */}
        {abaAtiva === "frequencia" && (
          <div className="flex-1 w-full bg-white overflow-y-auto">
            <FrequenciaProfessor disciplina={disciplina} serie={serie} turma={turma} />
          </div>
        )}

        {/* 4. AGENDA */}
        {abaAtiva === "agenda" && (
          <div className="flex-1 w-full bg-white overflow-y-auto">
            <AgendaProfessor disciplina={disciplina} serie={serie} />
          </div>
        )}

        {/* 5. AULAS AO VIVO */}
        {abaAtiva === "aulas-vivo" && (
          <div className="flex-1 w-full bg-white overflow-y-auto">
            <AulasAoVivoProfessor disciplina={disciplina} serie={serie} />
          </div>
        )}

        {/* 6. FÓRUM */}
        {abaAtiva === "forum" && (
          <div className="flex-1 w-full bg-white overflow-y-auto">
            <ForumProfessor disciplina={disciplina} serie={serie} />
          </div>
        )}

      </div>
    </div>
  );
}
