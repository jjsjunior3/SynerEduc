// src/components/PDFViewerProfessor.tsx
import { useState, useEffect } from "react";
import { Download, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface BimestreData {
  numero: number;
  nome: string;
  descricao: string;
  pdfUrl?: string;
  id?: string;
  autor_nome?: string;
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
  onUploadPDF?: (file: File) => void;
  onRemoverPDF?: () => void;
}

export function PDFViewerProfessor({
  bimestre,
  onClose,
  onProximo,
  onAnterior,
  hasProximo,
  hasAnterior,
  onRemoverPDF,
}: PDFViewerProfessorProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
  }, [bimestre?.pdfUrl]);

  const handleDownload = () => {
    if (!bimestre?.pdfUrl) { toast.error("URL do PDF não disponível."); return; }
    const link = document.createElement("a");
    link.href = bimestre.pdfUrl;
    link.download = bimestre.nome || "material.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download iniciado!");
  };

  // Estado vazio
  if (!bimestre) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center bg-card border border-border rounded-lg text-center p-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">
          Nenhum bimestre selecionado
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Selecione um bimestre na lista ao lado para visualizar o conteúdo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-card border border-border rounded-lg overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 leading-tight">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">{bimestre.nome}</span>
            </h2>
            {bimestre.descricao && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{bimestre.descricao}</p>
            )}
            {bimestre.autor_nome && (
              <p className="text-xs text-muted-foreground mt-0.5">Prof. {bimestre.autor_nome}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {bimestre.pdfUrl && (
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" /> Baixar
              </Button>
            )}
            {onRemoverPDF && (
              <Button variant="outline" size="sm" onClick={onRemoverPDF}
                className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20">
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Área do PDF — toolbar nativa do browser cuida do zoom */}
      <div className="relative w-full bg-muted" style={{ height: "70vh" }}>
        {bimestre.pdfUrl ? (
          <>
            <iframe
              src={bimestre.pdfUrl}
              className="w-full h-full border-none block"
              title={`PDF - ${bimestre.nome}`}
              onLoad={() => setIsLoading(false)}
            />
            {isLoading && (
              <div className="absolute inset-0 bg-card/80 flex items-center justify-center z-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Carregando documento...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-12 h-12 text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum PDF disponível para este bimestre.</p>
          </div>
        )}
      </div>

      {/* Navegação entre bimestres */}
      {(hasAnterior || hasProximo) && (
        <div className="border-t border-border p-3 flex justify-between items-center bg-card">
          <Button
            variant="outline" size="sm"
            onClick={onAnterior}
            disabled={!hasAnterior}
            className={!hasAnterior ? "invisible" : ""}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            Navegação entre Bimestres
          </span>

          <Button
            variant="outline" size="sm"
            onClick={onProximo}
            disabled={!hasProximo}
            className={!hasProximo ? "invisible" : ""}
          >
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}