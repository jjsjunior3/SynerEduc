import { Button } from './ui/button';
import { Progress } from './ui/progress';
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
  Minimize
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface Bimestre {
  id: string;
  nome: string;
  pdfUrl?: string;
  descricao?: string;
  progresso?: number;
  concluido?: boolean;
}

interface Disciplina {
  id: string;
  nome: string;
  professor: string | { id: string; nome: string };
  cor: string;
}

interface PDFViewerModernoProps {
  bimestre: Bimestre | null;
  disciplina: Disciplina;
  darkMode: boolean;
  onMarcarConcluido: () => void;
  onEnviarDuvida: () => void;
  onClose?: () => void;
}

export function PDFViewerModerno({
  bimestre,
  disciplina,
  darkMode,
  onMarcarConcluido,
  onEnviarDuvida,
}: PDFViewerModernoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfViewTime, setPdfViewTime] = useState(0);

  const totalPages = 10;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (bimestre?.pdfUrl) {
      interval = setInterval(() => {
        setPdfViewTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [bimestre?.pdfUrl]);

  useEffect(() => {
    setIsLoading(true);
  }, [bimestre?.pdfUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (bimestre?.pdfUrl) {
      const link = document.createElement('a');
      link.href = bimestre.pdfUrl;
      link.download = `${bimestre.nome}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download iniciado!", {
        description: "O arquivo PDF está sendo baixado."
      });
    }
  };

  const handleEnviarDuvida = () => {
    toast.info("💬 Envie sua dúvida", {
      description: "Sua dúvida será enviada diretamente para o professor da disciplina."
    });
    onEnviarDuvida();
  };

  const calculateProgress = () => {
    if (!bimestre?.pdfUrl) return 0;
    const estimatedTotalTime = totalPages * 60;
    const timeProgress = Math.min((pdfViewTime / estimatedTotalTime) * 100, 100);
    return bimestre.concluido ? 100 : Math.max(timeProgress, bimestre?.progresso || 0);
  };

  const currentProgress = calculateProgress();

  const getNomeProfessor = () => {
    if (!disciplina.professor) return "Não atribuído";
    if (typeof disciplina.professor === 'string') return disciplina.professor;
    return disciplina.professor.nome;
  };

  if (!bimestre) {
    return (
      <div className={`h-full flex items-center justify-center transition-colors duration-300 ${
        darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-500'
      }`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <BookOpen className={`w-20 h-20 mx-auto mb-6 ${darkMode ? 'text-gray-600' : 'text-blue-300'}`} />
          </motion.div>
          <h3 className="text-xl font-medium">Selecione um conteúdo</h3>
          <p className="mt-2 opacity-70">Escolha um bimestre na barra lateral para começar a estudar.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full ${isFullscreen ? 'fixed inset-0 z-50 h-screen' : ''} transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>

      {/* Header do Visualizador */}
      <div className={`p-4 border-b shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {bimestre.nome}
            </h1>
            <div className={`flex items-center gap-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>Prof. {getNomeProfessor()}</span>
              </div>
              {pdfViewTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Estudando há {formatTime(pdfViewTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Controles de Zoom e Tela Cheia */}
          <div className="flex items-center gap-2">
             <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(prev => Math.max(prev - 25, 50))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className={`text-sm min-w-[60px] text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(prev => Math.min(prev + 25, 200))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
          </div>
        </div>
      </div>

      {/* Área do PDF - FORÇANDO ALTURA COM STYLE */}
      <div 
        className={`relative w-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
        style={{ height: isFullscreen ? '100%' : '75vh' }} // <--- AQUI ESTÁ A GARANTIA DA ALTURA
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-inherit">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Carregando PDF...
            </span>
          </div>
        )}

        {bimestre.pdfUrl ? (
          <iframe
            src={`${bimestre.pdfUrl}#zoom=${zoom}`}
            className="w-full h-full border-none"
            title={`PDF - ${bimestre.nome}`}
            onLoad={() => setIsLoading(false)}
            allowFullScreen
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>URL do PDF não encontrada.</p>
          </div>
        )}
      </div>

      {/* Footer com Ações */}
      <div className={`border-t p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={handleEnviarDuvida}
              className="gap-2 flex-1 md:flex-none"
            >
              <MessageSquare className="w-4 h-4" />
              Dúvida
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2 flex-1 md:flex-none"
            >
              <Download className="w-4 h-4" />
              Baixar
            </Button>
          </div>

          {/* Progresso e Conclusão */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="hidden md:block text-right">
               <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Progresso estimado
               </div>
               <div className="flex items-center gap-2">
                 <Progress value={currentProgress} className="w-24 h-2" />
                 <span className="text-xs font-medium">{Math.round(currentProgress)}%</span>
               </div>
            </div>

            <Button
              onClick={onMarcarConcluido}
              className={`gap-2 text-white ${
                currentProgress >= 100 || bimestre.concluido
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {currentProgress >= 100 || bimestre.concluido ? 'Concluído!' : 'Marcar Concluído'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
