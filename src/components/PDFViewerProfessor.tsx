// src/components/PDFViewerProfessor.tsx
import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  FileText,
  Loader2
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner"; // Adicionado toast
import { Progress } from "./ui/progress"; // Adicionado Progress

// ✅ ATUALIZADO: Interface BimestreData mais simples, focada no que é passado
interface BimestreData {
  numero: number;
  nome: string;
  descricao: string;
  pdfUrl?: string;
  id?: string; // Adicionado id para consistência, se necessário para ações
  autor_nome?: string; // Adicionado para exibir o nome do professor
}

interface PDFViewerProfessorProps {
  bimestre: BimestreData | null;
  onClose: () => void;
  onProximo: () => void;
  onAnterior: () => void;
  hasProximo: boolean;
  hasAnterior: boolean;
  sidebarAberta?: boolean;
  onToggleSidebar?: () => void;
  onUploadPDF?: (file: File) => void; // Mantido, se for usar
  onRemoverPDF?: () => void; // Mantido, se for usar
  // Removido onEditarDescricao, onMarcarConcluido, onEnviarDuvida, darkMode, disciplina
  // pois não são usados ou não são relevantes para o contexto do professor visualizando o próprio material
}

export function PDFViewerProfessor({
  bimestre,
  onClose,
  onProximo,
  onAnterior,
  hasProximo,
  hasAnterior,
  sidebarAberta = true,
  onToggleSidebar,
  onUploadPDF,
  onRemoverPDF
}: PDFViewerProfessorProps) {
  const [isLoadingPdf, setIsLoadingPdf] = useState(true); // ✅ Renomeado para evitar conflito
  const [zoom, setZoom] = useState(75); // ✅ Zoom inicial 75%
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Resetar estado ao mudar de bimestre
  useEffect(() => {
    setIsLoadingPdf(true); // ✅ Usando isLoadingPdf
    setZoom(75); // Resetar zoom para 75% ao carregar novo PDF
  }, [bimestre?.pdfUrl]);

  // Função para lidar com o download
  const handleDownload = () => {
    if (!bimestre?.pdfUrl) {
      toast.error("Erro", { description: "URL do PDF não disponível para download." });
      return;
    }
    const link = document.createElement("a");
    link.href = bimestre.pdfUrl;
    link.download = bimestre.nome || "material.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Download iniciado!", {
      description: "O arquivo PDF está sendo baixado.",
    });
  };

  // Função para alternar tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Erro ao tentar tela cheia: ${err.message}`);
        toast.error("Erro ao entrar em tela cheia", { description: err.message });
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setZoom(75);

  // ESTADO VAZIO: nenhum material selecionado
  if (!bimestre) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-100">
        <div className="bg-gray-200 p-6 rounded-full mb-4">
          <FileText className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-600">Nenhum bimestre selecionado</h3>
        <p className="text-sm max-w-xs mt-2">
          Selecione um bimestre na barra lateral para visualizar o conteúdo.
        </p>
      </div>
    );
  }

  return (
    // ✅ Container principal com position relative
    <div ref={containerRef} className="relative h-full w-full flex flex-col bg-white overflow-hidden">

      {/* ========== HEADER ========== */}
      <div className="border-b border-gray-200 p-3 bg-white flex items-center justify-between shadow-sm z-10 h-16 shrink-0">
        <div className="flex items-center gap-3">
          {onToggleSidebar && !isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              title={sidebarAberta ? "Recolher menu" : "Expandir menu"}
              className="text-gray-500 hover:bg-gray-100"
            >
              {sidebarAberta ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </Button>
          )}

          <div className="flex flex-col justify-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 leading-tight">
              <FileText className="w-5 h-5 text-blue-600" />
              {bimestre.nome}
            </h2>
            <p className="text-xs text-gray-500 hidden sm:block leading-tight">{bimestre.descricao}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={isFullscreen ? toggleFullscreen : onClose}
            className="text-red-500 hover:bg-red-50 hover:text-red-600 md:hidden"
          >
            <X className="w-4 h-4 mr-1" /> Fechar
          </Button>

          {bimestre.pdfUrl && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex h-8"
                onClick={handleDownload} // Usar handleDownload
              >
                <Download className="w-4 h-4 mr-2" /> Baixar
              </Button>
              {onRemoverPDF && (
                <Button variant="destructive" size="sm" className="h-8" onClick={onRemoverPDF}>
                  Remover
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========== TOOLBAR ========== */}
      {bimestre.pdfUrl && (
        <div className="border-b border-gray-200 p-2 bg-gray-50 flex items-center justify-between px-4 h-12 shrink-0">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} title="Diminuir Zoom">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} title="Aumentar Zoom">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetZoom} className="text-xs ml-1 h-8">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-gray-600 h-8">
            {isFullscreen ? (
              <><Minimize className="w-4 h-4 mr-2" /> Sair da Tela Cheia</>
            ) : (
              <><Maximize className="w-4 h-4 mr-2" /> Tela Cheia</>
            )}
          </Button>
        </div>
      )}

      {/* ========== ÁREA DO PDF ========== */}
      <div className="flex-1 min-h-0 w-full bg-gray-200 overflow-hidden relative">
        {bimestre.pdfUrl ? (
          <>
            <iframe
              src={`${bimestre.pdfUrl}#zoom=${zoom}&view=FitH`}
              className="w-full h-full border-none block"
              style={{ display: 'block' }}
              title={`PDF - ${bimestre.nome}`}
              onLoad={() => setIsLoadingPdf(false)} // ✅ Usando setIsLoadingPdf
            />

            {isLoadingPdf && ( // ✅ Usando isLoadingPdf
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-gray-600 font-medium">Carregando documento...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-100">
            <div className="bg-gray-200 p-6 rounded-full mb-4">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-600">Nenhum PDF disponível</h3>
            <p className="text-sm max-w-xs mt-2">
              Este bimestre ainda não possui material didático cadastrado.
            </p>
            {onUploadPDF && (
              <Button className="mt-6" variant="outline">
                Fazer Upload
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ========== FOOTER - ABSOLUTO SOBRE O PDF ========== */}
      {(hasAnterior || hasProximo) && !isFullscreen && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2 flex justify-between items-center shadow-lg z-30 h-12">
          <Button
            variant="outline"
            size="sm"
            onClick={onAnterior}
            disabled={!hasAnterior}
            className={`${!hasAnterior ? "invisible" : ""} h-8`}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>

          <span className="text-xs font-medium text-gray-600 hidden sm:inline">
            Navegação entre Bimestres
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={onProximo}
            disabled={!hasProximo}
            className={`${!hasProximo ? "invisible" : ""} h-8`}
          >
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
