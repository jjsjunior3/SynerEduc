import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Download,
  Eye,
  Calendar,
  Clock,
  Zap
} from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ConteudoPDF {
  id: string;
  nome: string;
  disciplina: string;
  serie: string;
  bimestre: number;
  arquivo: string;
  url: string;
  tamanho: number;
  dataUpload: string;
  autorId: string;
  autorNome: string;
  urlRenovadaEm?: string;
}

interface PDFRecarregadorProps {
  onRecarregarConcluido?: () => void;
}

export function PDFRecarregador({ onRecarregarConcluido }: PDFRecarregadorProps) {
  const [carregando, setCarregando] = useState(false);
  const [conteudos, setConteudos] = useState<ConteudoPDF[]>([]);
  const [processando, setProcessando] = useState<string[]>([]);
  const [resultados, setResultados] = useState<{
    sucesso: number;
    erros: number;
    urlsRenovadas: number;
    detalhes: string[];
  }>({
    sucesso: 0,
    erros: 0,
    urlsRenovadas: 0,
    detalhes: []
  });
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  
  const { usuario } = useAuth();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const carregarConteudos = async () => {
    if (!usuario?.id) return;

    try {
      setCarregando(true);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/conteudista/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setConteudos(data.conteudos || []);
      
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
      setResultados(prev => ({
        ...prev,
        erros: prev.erros + 1,
        detalhes: [...prev.detalhes, `Erro ao carregar lista: ${error.message}`]
      }));
    } finally {
      setCarregando(false);
    }
  };

  const renovarURL = async (conteudoId: string): Promise<boolean> => {
    try {
      setProcessando(prev => [...prev, conteudoId]);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/${conteudoId}/renovar-url`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Atualizar o conteúdo na lista local
      setConteudos(prev => prev.map(c => 
        c.id === conteudoId 
          ? { ...c, url: data.url, urlRenovadaEm: new Date().toISOString() }
          : c
      ));

      setResultados(prev => ({
        ...prev,
        urlsRenovadas: prev.urlsRenovadas + 1,
        sucesso: prev.sucesso + 1,
        detalhes: [...prev.detalhes, `✅ URL renovada: ${conteudos.find(c => c.id === conteudoId)?.nome}`]
      }));

      return true;
      
    } catch (error) {
      console.error(`Erro ao renovar URL do conteúdo ${conteudoId}:`, error);
      
      setResultados(prev => ({
        ...prev,
        erros: prev.erros + 1,
        detalhes: [...prev.detalhes, `❌ Erro ao renovar: ${conteudos.find(c => c.id === conteudoId)?.nome} - ${error.message}`]
      }));

      return false;
    } finally {
      setProcessando(prev => prev.filter(id => id !== conteudoId));
    }
  };

  const recarregarTodosPDFs = async () => {
    setCarregando(true);
    setResultados({
      sucesso: 0,
      erros: 0,
      urlsRenovadas: 0,
      detalhes: []
    });

    try {
      // Primeiro, carregar a lista atualizada
      await carregarConteudos();

      // Aguardar um momento para a lista carregar
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (conteudos.length === 0) {
        setResultados(prev => ({
          ...prev,
          detalhes: ['ℹ️ Nenhum conteúdo encontrado para recarregar']
        }));
        return;
      }

      // Renovar URLs de todos os conteúdos (processamento sequencial para evitar sobrecarga)
      for (const conteudo of conteudos) {
        await renovarURL(conteudo.id);
        // Pequena pausa entre renovações
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Callback para o componente pai
      if (onRecarregarConcluido) {
        onRecarregarConcluido();
      }

    } catch (error) {
      console.error('Erro no recarregamento:', error);
      setResultados(prev => ({
        ...prev,
        erros: prev.erros + 1,
        detalhes: [...prev.detalhes, `❌ Erro geral: ${error.message}`]
      }));
    } finally {
      setCarregando(false);
      setMostrarDetalhes(true);
    }
  };

  const recarregarPDFIndividual = async (conteudoId: string) => {
    await renovarURL(conteudoId);
  };

  const iniciarCarregamento = async () => {
    await carregarConteudos();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Recarregador de PDFs
          </CardTitle>
          <CardDescription>
            Force o recarregamento e renovação de URLs dos seus conteúdos PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={iniciarCarregamento}
              disabled={carregando}
              variant="outline"
              className="gap-2"
            >
              {carregando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Carregar Lista
            </Button>
            
            <Button 
              onClick={recarregarTodosPDFs}
              disabled={carregando || conteudos.length === 0}
              className="gap-2"
            >
              {carregando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Recarregar Todos os PDFs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados do último recarregamento */}
      {mostrarDetalhes && (resultados.sucesso > 0 || resultados.erros > 0) && (
        <Alert className={resultados.erros > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                Recarregamento concluído: {resultados.sucesso} sucessos, {resultados.erros} erros
              </p>
              {resultados.urlsRenovadas > 0 && (
                <p className="text-sm">
                  🔄 {resultados.urlsRenovadas} URLs renovadas com sucesso
                </p>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Ver detalhes</summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {resultados.detalhes.map((detalhe, index) => (
                    <div key={index} className="text-xs opacity-80">
                      {detalhe}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de conteúdos */}
      {conteudos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Seus Conteúdos PDF ({conteudos.length})
            </CardTitle>
            <CardDescription>
              Lista dos seus PDFs com opções de recarregamento individual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conteudos.map((conteudo) => (
                <div 
                  key={conteudo.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{conteudo.nome}</h4>
                      <Badge variant="outline" className="text-xs">
                        {conteudo.bimestre}º Bim
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{conteudo.disciplina} - {conteudo.serie}</p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Enviado: {formatDateTime(conteudo.dataUpload)}
                      </p>
                      {conteudo.urlRenovadaEm && (
                        <p className="flex items-center gap-1 text-green-600">
                          <Clock className="w-3 h-3" />
                          URL renovada: {formatDateTime(conteudo.urlRenovadaEm)}
                        </p>
                      )}
                      <p className="text-xs opacity-75">
                        {formatFileSize(conteudo.tamanho)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(conteudo.url, '_blank')}
                      className="gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Abrir
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => recarregarPDFIndividual(conteudo.id)}
                      disabled={processando.includes(conteudo.id)}
                      className="gap-1"
                    >
                      {processando.includes(conteudo.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Renovar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {!carregando && conteudos.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum conteúdo encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Clique em "Carregar Lista" para buscar seus PDFs ou adicione novos conteúdos.
            </p>
            <Button onClick={iniciarCarregamento} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Carregar Lista
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}