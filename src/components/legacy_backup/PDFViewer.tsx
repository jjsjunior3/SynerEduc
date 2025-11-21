import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Download, 
  FileText,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { useState } from 'react';

interface Bimestre {
  id: string;
  nome: string;
  pdfUrl?: string;
  descricao?: string;
}

interface PDFViewerProps {
  bimestre: Bimestre | null;
  onClose: () => void;
  onProximo?: () => void;
  onAnterior?: () => void;
  hasProximo?: boolean;
  hasAnterior?: boolean;
}

export function PDFViewer({ 
  bimestre, 
  onClose, 
  onProximo, 
  onAnterior, 
  hasProximo, 
  hasAnterior 
}: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);

  if (!bimestre) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">Selecione um bimestre para estudar</p>
          <p className="text-sm">Escolha um bimestre da lista ao lado para visualizar o material de estudo</p>
        </div>
      </div>
    );
  }

  // URLs de exemplo para PDFs dos bimestres
  const pdfUrls = {
    'bim1': 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    'bim2': 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    'bim3': 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    'bim4': 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
  };

  const pdfUrl = bimestre.pdfUrl || pdfUrls[bimestre.id as keyof typeof pdfUrls];

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${bimestre.nome}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const resetZoom = () => {
    setZoom(100);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header do PDF */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              <Badge variant="secondary">PDF</Badge>
            </div>
            <span className="text-sm text-gray-600">Material de Estudo</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleDownload}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-gray-900">{bimestre.nome}</h1>
        {bimestre.descricao && (
          <p className="mt-1 text-sm text-gray-600">{bimestre.descricao}</p>
        )}
      </div>

      {/* Barra de Ferramentas do PDF */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
            >
              Reset
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            {bimestre.nome} - Material de Estudo
          </div>
        </div>
      </div>

      {/* Visualizador de PDF */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {pdfUrl ? (
          <div className="h-full w-full">
            <iframe
              src={`${pdfUrl}#zoom=${zoom}`}
              className="w-full h-full border-none"
              title={`PDF - ${bimestre.nome}`}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">PDF não disponível</p>
              <p className="text-sm">O material para este bimestre ainda não foi carregado</p>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-gray-600">Carregando PDF...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer com Navegação */}
      {(hasAnterior || hasProximo) && (
        <div className="border-t border-gray-200 p-6 bg-white">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={onAnterior}
              disabled={!hasAnterior}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Bimestre Anterior
            </Button>
            
            <div className="text-sm text-gray-600">
              {bimestre.nome}
            </div>
            
            <Button
              onClick={onProximo}
              disabled={!hasProximo}
              className="gap-2"
            >
              Próximo Bimestre
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}