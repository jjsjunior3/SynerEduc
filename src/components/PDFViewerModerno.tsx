import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Download, 
  FileText,
  BookOpen,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CheckCircle,
  MessageSquare,
  Clock,
  User,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  Maximize,
  Minimize,
  AlertTriangle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { ComentariosPedagogicos } from './ComentariosPedagogicos';

interface Bimestre {
  id: string;
  nome: string;
  pdfUrl?: string;
  descricao?: string;
  progresso?: number;
}

interface Disciplina {
  id: string;
  nome: string;
  professor: string;
  cor: string;
}

interface PDFViewerModernoProps {
  bimestre: Bimestre | null;
  disciplina: Disciplina;
  darkMode: boolean;
  onMarcarConcluido: () => void;
  onEnviarDuvida: () => void;
  onClose: () => void;
}

export function PDFViewerModerno({ 
  bimestre, 
  disciplina,
  darkMode,
  onMarcarConcluido,
  onEnviarDuvida,
  onClose 
}: PDFViewerModernoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfViewTime, setPdfViewTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Timer de visualização do PDF para progresso real
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (bimestre?.pdfUrl) {
      interval = setInterval(() => {
        setPdfViewTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
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
      description: "Sua dúvida será enviada diretamente para o professor da disciplina e aparecerá no sistema de comunicados."
    });
    onEnviarDuvida();
  };

  // Calcular progresso baseado no tempo de visualização
  const calculateProgress = () => {
    if (!bimestre?.pdfUrl) return 0;
    
    // Estima 2 minutos por página como tempo adequado de leitura
    const estimatedTotalTime = totalPages > 0 ? totalPages * 120 : 600; // 10 min default
    const timeProgress = Math.min((pdfViewTime / estimatedTotalTime) * 100, 100);
    
    return Math.max(timeProgress, bimestre?.progresso || 0);
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
          
          <h3 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Selecione um material para estudar
          </h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Escolha um bimestre na lista ao lado para começar seus estudos.
          </p>
          
          {/* Cards de Dica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}
            >
              <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
              <h4 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progresso Real</h4>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Seu progresso é baseado no tempo real de estudo
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}
            >
              <HelpCircle className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              <h4 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Tire Dúvidas</h4>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Comunique-se diretamente com o professor
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!bimestre.pdfUrl) {
    return (
      <div className={`h-full flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Card className={`max-w-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <CardContent className="p-8 text-center">
            <AlertTriangle className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Material Ainda Não Disponível
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              O conteúdo para <strong>{bimestre.nome}</strong> ainda não foi publicado pelo professor.
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Você será notificado quando o material estiver disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pdfUrl = bimestre.pdfUrl;
  const currentProgress = calculateProgress();

  return (
    <div className={`h-full flex flex-col transition-colors duration-300 ${
      darkMode ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Header do PDF Viewer */}
      <div className={`border-b p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {bimestre.nome}
                </h1>
                <div className={`flex items-center gap-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Prof. {disciplina.professor}</span>
                  </div>
                  {pdfViewTime > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Estudando há {formatTime(pdfViewTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progresso e Controles */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Progresso
              </div>
              <div className="flex items-center gap-2">
                <Progress value={currentProgress} className="w-24" />
                <span className={`text-sm font-medium ${
                  currentProgress >= 100 ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {Math.round(currentProgress)}%
                </span>
              </div>
            </div>

            {/* Controles de Zoom */}
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
      </div>

      {/* Área do PDF */}
      <div className={`flex-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Carregando PDF...
            </span>
          </div>
        )}
        
        <iframe
          src={`${pdfUrl}#zoom=${zoom}`}
          className="w-full h-full border-none"
          title={`PDF - ${bimestre.nome}`}
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Footer com Ações */}
      <div className={`border-t p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleEnviarDuvida}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Enviar Dúvida ao Professor
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {currentProgress < 100 && (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Continue estudando para completar o material
              </p>
            )}
            
            <Button
              onClick={onMarcarConcluido}
              className="gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              disabled={currentProgress >= 100}
            >
              <CheckCircle className="w-4 h-4" />
              {currentProgress >= 100 ? 'Concluído!' : 'Marcar como Concluído'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}