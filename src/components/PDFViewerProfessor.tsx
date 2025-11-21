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
  Upload,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { useState } from 'react';

interface BimestrePDF {
  id: string;
  nome: string;
  pdfUrl?: string;
  descricao?: string;
  totalAlunos?: number;
  alunosVisualizaram?: number;
}

interface PDFViewerProfessorProps {
  bimestre: BimestrePDF | null;
  onClose: () => void;
  onProximo?: () => void;
  onAnterior?: () => void;
  hasProximo?: boolean;
  hasAnterior?: boolean;
  onUploadPDF?: (bimestreId: string, file: File) => void;
  onEditarDescricao?: (bimestreId: string, descricao: string) => void;
  onRemoverPDF?: (bimestreId: string) => void;
}

export function PDFViewerProfessor({ 
  bimestre, 
  onClose, 
  onProximo, 
  onAnterior, 
  hasProximo, 
  hasAnterior,
  onUploadPDF,
  onEditarDescricao,
  onRemoverPDF
}: PDFViewerProfessorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [editandoDescricao, setEditandoDescricao] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState('');

  if (!bimestre) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">Selecione um bimestre para gerenciar</p>
          <p className="text-sm">Escolha um bimestre da lista ao lado para visualizar ou enviar o material de estudo</p>
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf' && onUploadPDF) {
      onUploadPDF(bimestre.id, file);
    }
  };

  const handleSalvarDescricao = () => {
    if (onEditarDescricao && novaDescricao.trim()) {
      onEditarDescricao(bimestre.id, novaDescricao.trim());
      setEditandoDescricao(false);
      setNovaDescricao('');
    }
  };

  const handleEditarDescricao = () => {
    setNovaDescricao(bimestre.descricao || '');
    setEditandoDescricao(true);
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

  const progressoVisualizacao = bimestre.totalAlunos && bimestre.alunosVisualizaram 
    ? Math.round((bimestre.alunosVisualizaram / bimestre.totalAlunos) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header do PDF Professor */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              <Badge variant="secondary">PDF</Badge>
            </div>
            <span className="text-sm text-gray-600">Material de Estudo</span>
            {bimestre.totalAlunos && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  {bimestre.alunosVisualizaram || 0}/{bimestre.totalAlunos} alunos visualizaram ({progressoVisualizacao}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pdfUrl ? (
              <>
                <Button 
                  onClick={handleDownload}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                {onRemoverPDF && (
                  <Button 
                    onClick={() => onRemoverPDF(bimestre.id)}
                    size="sm"
                    variant="outline"
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload">
                  <Button 
                    as="span"
                    size="sm"
                    className="gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Enviar PDF
                  </Button>
                </label>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <h1 className="text-xl font-semibold text-gray-900">{bimestre.nome}</h1>
          {editandoDescricao ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                placeholder="Descrição do bimestre..."
              />
              <Button size="sm" onClick={handleSalvarDescricao}>
                Salvar
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setEditandoDescricao(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-600">
                {bimestre.descricao || 'Nenhuma descrição adicionada'}
              </p>
              {onEditarDescricao && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleEditarDescricao}
                  className="gap-1 h-6 px-2"
                >
                  <Edit className="w-3 h-3" />
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Barra de Ferramentas do PDF */}
      {pdfUrl && (
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
      )}

      {/* Visualizador de PDF ou Estado Vazio */}
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
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Nenhum PDF carregado</p>
              <p className="text-sm mb-4">Faça upload do material de estudo para este bimestre</p>
              <div className="flex items-center gap-2 justify-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload-center"
                />
                <label htmlFor="pdf-upload-center">
                  <Button 
                    as="span"
                    className="gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Selecionar PDF
                  </Button>
                </label>
              </div>
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