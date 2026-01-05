// FILE NAME: DisciplinaProfessor.tsx
// FILE CONTENT:
import { useState, useEffect, useCallback } from "react";
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
  Loader2,
  PanelLeftClose, // ✅ NOVO: Ícone para fechar sidebar
  PanelLeftOpen,  // ✅ NOVO: Ícone para abrir sidebar
  Download,       // ✅ NOVO: Ícone para download
  ZoomIn,         // ✅ NOVO: Ícone para zoom in
  ZoomOut,        // ✅ NOVO: Ícone para zoom out
  RotateCcw,      // ✅ NOVO: Ícone para resetar zoom
  Maximize,       // ✅ NOVO: Ícone para tela cheia
  Minimize        // ✅ NOVO: Ícone para sair da tela cheia
} from "lucide-react";
// Componentes das Abas
import { PDFViewerProfessor } from "./PDFViewerProfessor";
import { AtividadesProfessor } from "./AtividadesProfessor";
import { FrequenciaProfessor } from "./FrequenciaProfessor";
import { ForumProfessor } from "./ForumProfessor";
import { AulasAoVivoProfessor } from "./AulasAoVivoProfessor";
import { AgendaProfessor } from "./AgendaProfessor";

// Interface para os dados do bimestre (para o PDFViewerProfessor)
interface BimestreData {
  numero: number;
  nome: string;
  descricao: string;
  pdfUrl?: string;
}

// ✅ ATUALIZADO: Removendo 'turma' das props
interface DisciplinaProfessorProps {
  disciplina: { id: string; nome: string; cor: string };
  serie: { id: string; nome: string }; // Mantém o objeto completo da série
  onVoltar: () => void;
}

// ✅ ATUALIZADO: Removendo 'turma' do parâmetro da função
export function DisciplinaProfessor({ disciplina, serie, onVoltar }: DisciplinaProfessorProps) {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState("conteudo");
  const [loading, setLoading] = useState(false);
  const [bimestres, setBimestres] = useState<BimestreData[]>([]);
  const [bimestreSelecionado, setBimestreSelecionado] = useState<BimestreData | null>(null);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(true); // Estado para controlar a abertura da sidebar

  // Função para buscar os PDFs de conteúdo
  const buscarConteudos = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Adicionar verificação para serie.nome
      if (!serie || !serie.nome) {
        console.warn("🔍 Não é possível buscar PDFs: Nome da série não definido.");
        setBimestres([]);
        setLoading(false);
        return;
      }

      // Tenta buscar pelo nome exato da série primeiro
      let { data: conteudos, error } = await supabase
        .from('pdfs_conteudista')
        .select('*')
        .eq('disciplina', disciplina.nome)
        .eq('serie', serie.nome) // Busca exata
        .order('bimestre', { ascending: true });

      // Se não encontrar com o nome exato, tenta com um termo mais flexível
      if (error || !conteudos || conteudos.length === 0) {
        console.log(`DIAGNÓSTICO DE BUSCA: Não encontrado com '${serie.nome}'. Tentando termo flexível.`);
        // Tenta pegar o primeiro termo da série (ex: "1ª série - Ensino Médio" -> "1ª")
        const termoCurto = serie.nome.split(' ')[0];
        if (termoCurto && termoCurto !== serie.nome) { // Evita buscar pelo mesmo termo se já for curto
          let { data: conteudosFlex, error: errorFlex } = await supabase
            .from('pdfs_conteudista')
            .select('*')
            .eq('disciplina', disciplina.nome)
            .ilike('serie', `%${termoCurto}%`) // Busca flexível
            .order('bimestre', { ascending: true });

          if (errorFlex) throw errorFlex;
          conteudos = conteudosFlex;
        }
      }

      if (error) throw error;

      const bimestresComPDF: BimestreData[] = [];
      for (let i = 1; i <= 4; i++) {
        const conteudoSalvo = conteudos?.find(c => c.bimestre === i || c.bimestre_numero === i);
        let pdfUrl: string | undefined;

        if (conteudoSalvo?.url) {
          // Se a URL já for completa (http/https), usa ela diretamente
          if (conteudoSalvo.url.startsWith("http")) {
            pdfUrl = conteudoSalvo.url;
          } else {
            // Caso contrário, constrói a URL do storage
            const { data: publicUrlData } = supabase.storage
              .from('pdfs-conteudista') // Nome do seu bucket
              .getPublicUrl(conteudoSalvo.url);
            pdfUrl = publicUrlData?.publicUrl;
          }
        }

        bimestresComPDF.push({
          numero: i,
          nome: `${i}º Bimestre`,
          descricao: `Material didático do ${i}º bimestre`,
          pdfUrl: pdfUrl
        });
      }
      setBimestres(bimestresComPDF);
    } catch (error) {
      console.error("Erro ao carregar conteúdos:", error);
      setBimestres([]);
    } finally {
      setLoading(false);
    }
  }, [disciplina.nome, serie]); // Dependência 'serie' inteira para re-executar se o objeto mudar

  useEffect(() => {
    if (abaAtiva === "conteudo") {
      buscarConteudos();
    }
  }, [abaAtiva, buscarConteudos]); // Adicionado buscarConteudos como dependência

  const handleAbrirConteudo = (bimestre: BimestreData) => {
    setBimestreSelecionado(bimestre);
    setMostrarConteudo(true);
  };

  const handleFecharConteudo = () => {
    setMostrarConteudo(false);
    setBimestreSelecionado(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* HEADER DA DISCIPLINA */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onVoltar} className="text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-800">{disciplina.nome}</h1>
            <p className="text-sm text-gray-500">{serie.nome}</p> {/* Exibe o nome da série */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botões de ação globais da disciplina, se houver */}
        </div>
      </div>

      {/* NAVEGAÇÃO POR ABAS */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setAbaAtiva("conteudo")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === "conteudo"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Conteúdo
            </button>
            <button
              onClick={() => setAbaAtiva("atividades")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === "atividades"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Atividades
            </button>
            <button
              onClick={() => setAbaAtiva("frequencia")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === "frequencia"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Frequência
            </button>
            <button
              onClick={() => setAbaAtiva("agenda")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === "agenda"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setAbaAtiva("aulas-vivo")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === "aulas-vivo"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Aulas ao Vivo
            </button>
            <button
              onClick={() => setAbaAtiva("forum")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === "forum"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Fórum
            </button>
          </nav>
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="flex-1 overflow-hidden flex">
        {/* 1. CONTEÚDO */}
        {abaAtiva === "conteudo" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar de Bimestres */}
            <div
              className={`flex-shrink-0 bg-white border-r transition-all duration-300 ease-in-out ${
                sidebarAberta ? "w-64" : "w-0 overflow-hidden"
              }`}
            >
              <div className="p-4 flex flex-col h-full">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bimestres</h3>
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : bimestres.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Nenhum bimestre encontrado.
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {bimestres.map((bimestre) => (
                      <Card
                        key={bimestre.numero}
                        onClick={() => handleAbrirConteudo(bimestre)}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${
                          bimestreSelecionado?.numero === bimestre.numero
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-gray-200"
                        }`}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{bimestre.nome}</h4>
                            <p className="text-xs text-gray-500">{bimestre.descricao}</p>
                          </div>
                          {bimestre.pdfUrl && (
                            <Badge className="bg-green-100 text-green-700">PDF</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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
            {/* ✅ ATUALIZADO: Removendo 'turma' */}
            <FrequenciaProfessor disciplina={disciplina} serie={serie} />
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
