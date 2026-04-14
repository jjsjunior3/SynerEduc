import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "./ui/button";

import {
  Download,
  BookOpen,
  Loader2,
  CheckCircle,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";

export interface ConteudoPdf {
  id: string;
  url: string;
  nome: string;
  titulo?: string | null;
  descricao?: string | null;
  disciplina: string;
  serie: string;
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
  onMarcarConcluido?: (materialId: string) => void;
  onEnviarDuvida?: (materialId: string) => void;
}

export function PDFViewerModerno({
  material,
  disciplina,
  onMarcarConcluido,
  onEnviarDuvida,
}: PDFViewerModernoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfViewTime, setPdfViewTime] = useState(0);
  const [concluido, setConcluido] = useState(false);

  // Cronômetro de estudo
  useEffect(() => {
    let interval: any;
    if (material?.url) {
      interval = setInterval(() => setPdfViewTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [material?.url]);

  // Reset ao trocar material
  useEffect(() => {
    setIsLoading(true);
    setPdfViewTime(0);
    setConcluido(false);
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
    toast.success("Download iniciado!");
  };

  const handleDuvida = () => {
    if (!material) return;
    toast.info("Função em desenvolvimento", {
      description: "Em breve você poderá enviar dúvidas diretamente ao professor.",
    });
    onEnviarDuvida?.(material.id);
  };

  const handleConcluido = () => {
    if (!material) return;
    setConcluido(true);
    toast.success("Material marcado como concluído!", {
      description: `Você estudou por ${formatTime(pdfViewTime)}.`,
    });
    onMarcarConcluido?.(material.id);
  };

  // Estado vazio — nenhum material selecionado
  if (!material) {
    return (
      <div className="h-[70vh] flex items-center justify-center bg-card border border-border rounded-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <BookOpen className="w-20 h-20 mx-auto mb-6 text-blue-300 dark:text-blue-800" />
          </motion.div>
          <h3 className="text-xl font-medium text-foreground">Selecione um conteúdo</h3>
          <p className="mt-2 text-muted-foreground text-sm">
            Escolha um bimestre na lista ao lado para começar a estudar.
          </p>
        </motion.div>
      </div>
    );
  }

  const professorNome = disciplina.professor || material.autor_nome || "Não atribuído";

  return (
    <div className="flex flex-col w-full bg-card border border-border rounded-lg overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col gap-2">
          <h1 className="text-base font-bold text-foreground leading-tight">
            {material.nome || material.titulo}
          </h1>
          
        </div>
      </div>

      {/* Área do PDF — usa a toolbar nativa do browser */}
      <div className="relative w-full bg-muted" style={{ height: "70vh" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-muted-foreground text-sm">Carregando PDF...</span>
          </div>
        )}

        {material.url ? (
          <iframe
            src={material.url}
            className="w-full h-full border-none"
            title={`PDF - ${material.nome}`}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">URL do PDF não encontrada.</p>
          </div>
        )}
      </div>

      {/* Footer com ações */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuvida}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Dúvida
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
              disabled={!material.url}
            >
              <Download className="w-4 h-4" />
              Baixar
            </Button>
          </div>

          <Button
            onClick={handleConcluido}
            disabled={concluido}
            className={`gap-2 text-white ${
              concluido
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {concluido ? "Concluído!" : "Marcar concluído"}
          </Button>
        </div>
      </div>
    </div>
  );
}