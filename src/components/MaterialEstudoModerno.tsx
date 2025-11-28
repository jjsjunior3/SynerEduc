import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { PDFViewerModerno } from "./PDFViewerModerno";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Menu,
  X,
  Book,
  CheckCircle,
  FileText,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/supabaseClient";
import { EstatisticasEstudo } from "./EstatisticasEstudo";
import { ConquistasEstudante } from "./ConquistasEstudante";

// Interface ajustada para aceitar Professor como Objeto ou String
interface Disciplina {
  id: string;
  nome: string;
  professor: string | { id: string; nome: string }; // <--- Correção aqui
  cor?: string;
}

interface MaterialPDF {
  id: string;
  bimestre: number;
  titulo: string;
  descricao: string | null;
  pdf_url: string;
  progresso: number;
  concluido: boolean;
}

interface Props {
  disciplina: Disciplina;
  onVoltar: () => void;
}

export function MaterialEstudoModerno({ disciplina, onVoltar }: Props) {
  const { usuario } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [bimestres, setBimestres] = useState<MaterialPDF[]>([]);
  const [bimestreSelecionado, setBimestreSelecionado] = useState<MaterialPDF | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper para pegar o nome do professor com segurança
  const getNomeProfessor = () => {
    if (!disciplina.professor) return "Não atribuído";
    if (typeof disciplina.professor === "string") return disciplina.professor;
    return disciplina.professor.nome;
  };

  // Detectar mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setSidebarAberta(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Carregar materiais da disciplina
  useEffect(() => {
    if (usuario?.id && disciplina.id) {
      carregarMateriais();
    }
  }, [usuario?.id, disciplina.id]);

  async function carregarMateriais() {
    setLoading(true);
    setError(null);

    try {
      // CORREÇÃO: Buscando da tabela nova 'pdfs_conteudista'
      const { data, error } = await supabase
        .from("pdfs_conteudista")
        .select(`
          id, 
          bimestre, 
          titulo, 
          descricao, 
          arquivo_url
        `)
        .eq("disciplina_id", disciplina.id)
        // .eq("serie", usuario?.serie) // Opcional: filtrar por série se necessário
        .order("bimestre", { ascending: true });

      if (error) throw error;

      // Mapear resultado
      const mapped: MaterialPDF[] = (data || []).map((m: any) => ({
        id: m.id,
        bimestre: m.bimestre,
        titulo: m.titulo,
        descricao: m.descricao,
        pdf_url: m.arquivo_url, // Mapeando arquivo_url para pdf_url
        progresso: 0, // Placeholder enquanto não reconectamos o progresso
        concluido: false,
      }));

      setBimestres(mapped);

      if (mapped.length === 0) {
        setError("Nenhum material disponível para esta disciplina.");
      }

    } catch (err: any) {
      console.error("Erro ao carregar materiais:", err.message);
      setError("Erro ao carregar materiais de estudo.");
    } finally {
      setLoading(false);
    }
  }

  // Marcar conclusão (Simplificado)
  async function handleMarcarConcluido() {
    if (!bimestreSelecionado || !usuario?.id) return;

    setBimestres((prev) =>
      prev.map((bm) =>
        bm.id === bimestreSelecionado.id ? { ...bm, progresso: 100, concluido: true } : bm
      )
    );
    toast.success("Material marcado como concluído!");
  }

  const progressoGeral =
    bimestres.length > 0
      ? bimestres.reduce((acc, b) => acc + b.progresso, 0) / bimestres.length
      : 0;

  const bimestresCompletos = bimestres.filter((b) => b.concluido).length;

  return (
    <div
      className={`min-h-screen transition-colors ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-white"
      }`}
    >
      {/* Header */}
      <div
        className={`border-b ${
          darkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Esquerda */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onVoltar}
              className={darkMode ? "text-gray-300 hover:text-white" : ""}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1
                className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {disciplina.nome}
              </h1>
              <p
                className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {/* CORREÇÃO: Usando a função segura para exibir o nome */}
                Professor(a): {getNomeProfessor()}
              </p>
            </div>
          </div>

          {/* Direita */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span
                className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Progresso geral
              </span>
              <div className="flex items-center gap-2">
                <Progress value={progressoGeral} className="w-28" />
                <span
                  className={`text-sm font-medium ${
                    progressoGeral >= 100
                      ? "text-green-500"
                      : "text-blue-600"
                  }`}
                >
                  {Math.round(progressoGeral)}%
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
              className={darkMode ? "text-gray-300 hover:text-white" : ""}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex h-full">
        {/* Sidebar */}
        <div
          className={`${
            isMobile
              ? "fixed inset-y-0 left-0 z-50 w-72 shadow-lg transform transition-transform"
              : "relative w-80"
          } ${
            !sidebarAberta && isMobile ? "-translate-x-full" : "translate-x-0"
          } ${darkMode ? "bg-gray-800" : "bg-white"} border-r ${
            darkMode ? "border-gray-700" : "border-gray-200"
          } flex flex-col`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h3
              className={`font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              <Book className="inline w-4 h-4 mr-2 text-blue-500" />
              Material de Estudo
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarAberta(!sidebarAberta)}
              className={darkMode ? "text-gray-300" : ""}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <p
                className={`text-center ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Carregando materiais...
              </p>
            ) : error ? (
              <Card className="p-4 text-center bg-gray-50 border-dashed">
                <CardContent className="pt-6 text-gray-500 text-sm">
                  {error}
                </CardContent>
              </Card>
            ) : (
              bimestres.map((bim, idx) => (
                <motion.div
                  key={bim.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card
                    onClick={() => setBimestreSelecionado(bim)}
                    className={`cursor-pointer hover:shadow-lg transition-all ${
                      bimestreSelecionado?.id === bim.id 
                        ? "border-blue-500 ring-1 ring-blue-200 bg-blue-50" 
                        : "border-gray-200"
                    } ${
                      bim.concluido
                        ? "border-green-400"
                        : ""
                    }`}
                  >
                    <CardContent className="p-4 flex justify-between items-start">
                      <div>
                        <h4
                          className={`font-medium text-sm ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {bim.bimestre}º Bimestre
                        </h4>
                        <p
                          className={`text-xs mt-1 font-semibold ${
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {bim.titulo}
                        </p>
                      </div>
                      {bim.concluido ? (
                        <CheckCircle className="text-green-500 w-5 h-5" />
                      ) : (
                        <FileText className={`w-5 h-5 ${bimestreSelecionado?.id === bim.id ? "text-blue-600" : "text-gray-400"}`} />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Área principal */}
        <div className="flex-1 flex flex-col bg-gray-100">
          {bimestreSelecionado ? (
            <PDFViewerModerno
              bimestre={{
                id: bimestreSelecionado.id,
                nome: bimestreSelecionado.titulo,
                descricao: bimestreSelecionado.descricao || "",
                pdfUrl: bimestreSelecionado.pdf_url,
                progresso: bimestreSelecionado.progresso,
                concluido: bimestreSelecionado.concluido,
              }}
              disciplina={disciplina}
              onMarcarConcluido={handleMarcarConcluido}
              darkMode={darkMode}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-500 p-8">
              <div className="bg-white p-8 rounded-full shadow-sm mb-4">
                <Book className="w-12 h-12 text-blue-200" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Pronto para estudar?</h3>
              <p className="text-sm text-gray-500 mt-2">Selecione um bimestre na barra lateral para visualizar o material.</p>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas e conquistas */}
      <div className="p-6 grid md:grid-cols-2 gap-6">
        <EstatisticasEstudo
          tempoEstudoHoje={0}
          metaDiariaMinutos={60}
          sequenciaDias={0}
          bimestresCompletos={bimestresCompletos}
          tempoMedioSemanal={0}
          darkMode={darkMode}
        />
        <ConquistasEstudante
          bimestresCompletos={bimestresCompletos}
          tempoEstudo={0}
          disciplinasCompletas={Math.floor(progressoGeral / 100)}
          darkMode={darkMode}
        />
      </div>

      {/* Botão flutuante Mobile */}
      {isMobile && !sidebarAberta && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 left-6 z-40"
        >
          <Button
            onClick={() => setSidebarAberta(true)}
            className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
