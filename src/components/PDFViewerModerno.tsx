import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

import {
  Download,
  BookOpen,
  Loader2,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  MessageSquare,
  Clock,
  User,
  Maximize,
  Minimize,
} from "lucide-react";

// Representa um registro da tabela pdfs_conteudista
export interface ConteudoPdf {
  id: string;
  url: string;          // url pública do PDF
  nome: string;         // ex: "Física 1º Bimestre.pdf"
  titulo?: string | null;
  descricao?: string | null;
  disciplina: string;   // ex: "Física"
  serie: string;        // ex: "1ª série - Ensino Médio"
  bimestre?: number | null;
  autor_nome?: string | null;
  created_at?: string | null;
}

interface DisciplinaInfo {
  id: string;
  nome: string;
  professor?: string;
  cor?: string;
}

interface PDFViewerModernoProps {
  material: ConteudoPdf | null;
  disciplina: DisciplinaInfo;
  darkMode?: boolean;
  onMarcarConcluido?: (materialId: string) => void;
  onEnviarDuvida?: (materialId: string) => void;
}

export function PDFViewerModerno({
  material,
  disciplina,
  darkMode = false,
  onMarcarConcluido,
  onEnviarDuvida,
}: PDFViewerModernoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfViewTime, setPdfViewTime] = useState(0);

  const totalPagesEstimate = 10; // estimativa para cálculo de progresso

  useEffect(() => {
    let interval: any;
    if (material?.url) {
      interval = setInterval(() => {
        setPdfViewTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [material?.url]);

  useEffect(() => {
    setIsLoading(true);
    setPdfViewTime(0);
    setZoom(100);
  }, [material?.url]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    if (!material?.url) return;
    const link = document.createElement("a");
    link.href = material.url;
    link.download = material.nome || "material.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Download iniciado!", {
      description: "O arquivo PDF está sendo baixado.",
    });
  };

  const handleEnviarDuvidaClick = () => {
    if (!material) return;

    toast.info("Envie sua dúvida", {
      description: "Sua dúvida será enviada para o professor da disciplina.",
    });

    onEnviarDuvida?.(material.id);
  };

  const calculateProgress = () => {
    if (!material?.url) return 0;
    const estimatedTotalTime = totalPagesEstimate * 60; // 1 min por página
    const timeProgress = Math.min(
      (pdfViewTime / estimatedTotalTime) * 100,
      100
    );
    // por enquanto não temos progresso salvo em tabela -> usamos só o tempo
    return timeProgress;
  };

  const currentProgress = calculateProgress();

  // ESTADO VAZIO: nenhum material selecionado
  if (!material) {
    return (
      <div
        className={`h-full flex items-center justify-center transition-colors duration-300 ${
          darkMode
            ? "bg-gray-900 text-gray-300"
            : "bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-500"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <BookOpen
              className={`w-20 h-20 mx-auto mb-6 ${
                darkMode ? "text-gray-600" : "text-blue-300"
              }`}
            />
          </motion.div>
          <h3 className="text-xl font-medium">Selecione um conteúdo</h3>
          <p className="mt-2 opacity-70">
            Escolha um material na lista ao lado para começar a estudar.
          </p>
        </motion.div>
      </div>
    );
  }

  const professorNome =
    disciplina.professor || material.autor_nome || "Não atribuído";

  return (
    <div
      className={`flex flex-col w-full ${
        isFullscreen ? "fixed inset-0 z-50 h-screen" : ""
      } transition-colors duration-300 ${
        darkMode ? "bg-gray-900" : "bg-white"
      }`}
    >
      {/* HEADER DO VIEWER */}
      <div
        className={`p-4 border-b shadow-sm ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1
              className={`text-lg md:text-xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {material.nome || material.titulo}
            </h1>
            <div
              className={`flex flex-wrap items-center gap-3 text-xs md:text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              } mt-1`}
            >
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>Prof. {professorNome}</span>
              </div>
              {pdfViewTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Estudando há {formatTime(pdfViewTime)}</span>
                </div>
              )}
              {material.bimestre && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                  {material.bimestre}º bimestre
                </span>
              )}
            </div>
          </div>

          {/* Controles de zoom / tela cheia */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((prev) => Math.max(prev - 25, 50))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span
              className={`text-sm min-w-[60px] text-center ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((prev) => Math.min(prev + 25, 200))}
              disabled={zoom >= 200}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ÁREA DO PDF */}
      <div
        className={`relative w-full overflow-hidden ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
        style={{ height: isFullscreen ? "100%" : "70vh" }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-inherit">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span
              className={`ml-2 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Carregando PDF...
            </span>
          </div>
        )}

        {material.url ? (
          <iframe
            src={`${material.url}#zoom=${zoom}`}
            className="w-full h-full border-none"
            title={`PDF - ${material.nome}`}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>URL do PDF não encontrada.</p>
          </div>
        )}
      </div>

      {/* FOOTER COM AÇÕES */}
      <div
        className={`border-t p-4 ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Ações à esquerda */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={handleEnviarDuvidaClick}
              className="gap-2 flex-1 md:flex-none"
            >
              <MessageSquare className="w-4 h-4" />
              Dúvida
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2 flex-1 md:flex-none"
              disabled={!material.url}
            >
              <Download className="w-4 h-4" />
              Baixar
            </Button>
          </div>

          {/* Progresso + Marcar concluído */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="hidden md:block text-right">
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Progresso estimado
              </div>
              <div className="flex items-center gap-2">
                <Progress value={currentProgress} className="w-24 h-2" />
                <span className="text-xs font-medium">
                  {Math.round(currentProgress)}%
                </span>
              </div>
            </div>

            <Button
              onClick={() => material && onMarcarConcluido?.(material.id)}
              className={`gap-2 text-white ${
                currentProgress >= 100
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {currentProgress >= 100 ? "Concluído!" : "Marcar concluído"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
