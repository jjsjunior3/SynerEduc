import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  Eye,
  Calendar,
  BookOpen,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter
} from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ConteudoPDF {
  id: string;
  nome: string;
  disciplina: string;
  serie: string;
  bimestre: number;
  arquivo: string; // Nome do arquivo
  url: string; // URL para download/visualização
  tamanho: number; // Tamanho em bytes
  dataUpload: string;
  autorId: string;
  autorNome: string;
}

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  fileName: string;
}

export function GestaoConteudoPDF() {
  const [conteudos, setConteudos] = useState<ConteudoPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    fileName: ''
  });
  const { usuario } = useAuth();

  // Filtros
  const [filtroSerie, setFiltroSerie] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [filtroBimestre, setFiltroBimestre] = useState('');

  // Upload dialog
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    serie: '',
    disciplina: '',
    bimestre: '',
    arquivo: null as File | null
  });

  const series = [
    '5º ano - Ensino Fundamental',
    '6º ano - Ensino Fundamental', 
    '7º ano - Ensino Fundamental',
    '8º ano - Ensino Fundamental',
    '9º ano - Ensino Fundamental',
    '1ª série - Ensino Médio',
    '2ª série - Ensino Médio',
    '3ª série - Ensino Médio'
  ];

  const disciplinas = [
    'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
    'Física', 'Química', 'Biologia', 'Inglês', 'Educação Física',
    'Artes', 'Filosofia', 'Sociologia'
  ];

  const bimestres = [1, 2, 3, 4];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Por favor, selecione apenas arquivos PDF.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert('O arquivo deve ter no máximo 50MB.');
        return;
      }
      setUploadData(prev => ({ ...prev, arquivo: file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadData.arquivo || !uploadData.serie || !uploadData.disciplina || !uploadData.bimestre) {
      alert('Por favor, preencha todos os campos e selecione um arquivo.');
      return;
    }

    try {
      console.log('[GESTAO_PDF] Iniciando upload...', {
        arquivo: uploadData.arquivo.name,
        serie: uploadData.serie,
        disciplina: uploadData.disciplina,
        bimestre: uploadData.bimestre,
        autorId: usuario?.id
      });

      setUploadProgress({
        isUploading: true,
        progress: 10,
        fileName: uploadData.arquivo.name
      });

      // Criar FormData para upload
      const formData = new FormData();
      formData.append('arquivo', uploadData.arquivo);
      formData.append('serie', uploadData.serie);
      formData.append('disciplina', uploadData.disciplina);
      formData.append('bimestre', uploadData.bimestre);
      formData.append('autorId', usuario?.id || '');
      formData.append('autorNome', usuario?.nome || '');

      setUploadProgress(prev => ({ ...prev, progress: 30 }));

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData
      });

      setUploadProgress(prev => ({ ...prev, progress: 70 }));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GESTAO_PDF] Erro no upload:', errorText);
        
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // Se não conseguiu fazer parse do JSON, usar texto bruto
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[GESTAO_PDF] Upload concluído:', result);
      
      setUploadProgress(prev => ({ ...prev, progress: 100 }));
      
      // Aguardar um pouco para mostrar 100%
      setTimeout(() => {
        setUploadProgress({
          isUploading: false,
          progress: 0,
          fileName: ''
        });
        setIsUploadDialogOpen(false);
        setUploadData({
          serie: '',
          disciplina: '',
          bimestre: '',
          arquivo: null
        });
        alert(`✅ PDF "${uploadData.arquivo?.name}" enviado com sucesso para ${uploadData.serie} - ${uploadData.disciplina} - ${uploadData.bimestre}º Bimestre!`);
        carregarConteudos(); // Recarregar lista
      }, 1000);

    } catch (error) {
      console.error('[GESTAO_PDF] Erro ao fazer upload:', error);
      
      let errorMessage = 'Erro ao fazer upload do arquivo. ';
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Verifique sua conexão com a internet e tente novamente.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      alert(errorMessage);
      
      setUploadProgress({
        isUploading: false,
        progress: 0,
        fileName: ''
      });
    }
  };

  const handleExcluir = async (conteudo: ConteudoPDF) => {
    try {
      setLoading(true);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/${conteudo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      carregarConteudos(); // Recarregar lista
      
    } catch (error) {
      console.error('Erro ao excluir conteúdo:', error);
      setError('Erro ao excluir conteúdo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const carregarConteudos = async () => {
    if (!usuario?.id) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/conteudista/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setConteudos([]);
          return;
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setConteudos(data.conteudos || []);
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
      setError('Erro ao carregar conteúdos. Tente novamente mais tarde.');
      setConteudos([]);
    } finally {
      setLoading(false);
    }
  };

  const renovarURL = async (conteudoId: string) => {
    try {
      console.log(`[GESTAO_PDF] Renovando URL para conteúdo: ${conteudoId}`);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/${conteudoId}/renovar-url`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GESTAO_PDF] Erro na renovação de URL:`, errorText);
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[GESTAO_PDF] URL renovada com sucesso:`, data);
      
      // Atualizar a URL na lista local
      setConteudos(prev => prev.map(c => 
        c.id === conteudoId 
          ? { ...c, url: data.url, urlRenovadaEm: new Date().toISOString() }
          : c
      ));

      alert('URL renovada com sucesso! O PDF pode ser acessado normalmente agora.');
      return data.url;
    } catch (error) {
      console.error('[GESTAO_PDF] Erro ao renovar URL:', error);
      alert(`Erro ao renovar URL: ${error.message}`);
      throw error;
    }
  };

  useEffect(() => {
    carregarConteudos();
  }, [usuario?.id]);

  // Filtrar conteúdos
  const conteudosFiltrados = conteudos.filter(conteudo => {
    const matchSerie = !filtroSerie || filtroSerie === 'todas' || conteudo.serie === filtroSerie;
    const matchDisciplina = !filtroDisciplina || filtroDisciplina === 'todas' || conteudo.disciplina === filtroDisciplina;
    const matchBimestre = !filtroBimestre || filtroBimestre === 'todos' || conteudo.bimestre.toString() === filtroBimestre;
    
    return matchSerie && matchDisciplina && matchBimestre;
  });

  // Agrupar por série e disciplina para exibição organizada
  const conteudosAgrupados = conteudosFiltrados.reduce((acc, conteudo) => {
    const chave = `${conteudo.serie}-${conteudo.disciplina}`;
    if (!acc[chave]) {
      acc[chave] = {
        serie: conteudo.serie,
        disciplina: conteudo.disciplina,
        conteudos: []
      };
    }
    acc[chave].conteudos.push(conteudo);
    return acc;
  }, {} as Record<string, { serie: string; disciplina: string; conteudos: ConteudoPDF[] }>);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestão de Conteúdo por Bimestres</h3>
          <p className="text-sm text-gray-600">
            Gerencie arquivos PDF organizados por série, disciplina e bimestre
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={carregarConteudos}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Recarregar
          </Button>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Conteúdo PDF</DialogTitle>
                <DialogDescription>
                  Selecione a série, disciplina, bimestre e faça upload do arquivo PDF
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="serie">Série</Label>
                  <Select value={uploadData.serie} onValueChange={(value) => setUploadData(prev => ({ ...prev, serie: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map(serie => (
                        <SelectItem key={serie} value={serie}>
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disciplina">Disciplina</Label>
                  <Select value={uploadData.disciplina} onValueChange={(value) => setUploadData(prev => ({ ...prev, disciplina: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a disciplina" />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplinas.map(disciplina => (
                        <SelectItem key={disciplina} value={disciplina}>
                          {disciplina}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bimestre">Bimestre</Label>
                  <Select value={uploadData.bimestre} onValueChange={(value) => setUploadData(prev => ({ ...prev, bimestre: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o bimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      {bimestres.map(bimestre => (
                        <SelectItem key={bimestre} value={bimestre.toString()}>
                          {bimestre}º Bimestre
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arquivo">Arquivo PDF</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {uploadData.arquivo && (
                    <p className="text-sm text-gray-600">
                      Arquivo selecionado: {uploadData.arquivo.name} ({formatFileSize(uploadData.arquivo.size)})
                    </p>
                  )}
                </div>

                {uploadProgress.isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Enviando {uploadProgress.fileName}...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{uploadProgress.progress}%</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploadProgress.isUploading}
                    className="flex-1"
                  >
                    {uploadProgress.isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Enviar PDF
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsUploadDialogOpen(false)}
                    disabled={uploadProgress.isUploading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filtroSerie} onValueChange={setFiltroSerie}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as séries</SelectItem>
                {series.map(serie => (
                  <SelectItem key={serie} value={serie}>
                    {serie}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroDisciplina} onValueChange={setFiltroDisciplina}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as disciplinas</SelectItem>
                {disciplinas.map(disciplina => (
                  <SelectItem key={disciplina} value={disciplina}>
                    {disciplina}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroBimestre} onValueChange={setFiltroBimestre}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filtrar por bimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os bimestres</SelectItem>
                {bimestres.map(bimestre => (
                  <SelectItem key={bimestre} value={bimestre.toString()}>
                    {bimestre}º Bimestre
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conteúdos */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-600">Carregando conteúdos...</span>
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarConteudos}
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : Object.keys(conteudosAgrupados).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {conteudos.length === 0 ? 'Nenhum conteúdo cadastrado' : 'Nenhum conteúdo encontrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {conteudos.length === 0 
                  ? 'Comece fazendo upload do seu primeiro PDF.'
                  : 'Não há conteúdos que correspondam aos filtros aplicados.'
                }
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                {conteudos.length === 0 ? 'Adicionar Primeiro PDF' : 'Adicionar Novo PDF'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.values(conteudosAgrupados).map((grupo) => (
            <Card key={`${grupo.serie}-${grupo.disciplina}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {grupo.disciplina} - {grupo.serie}
                </CardTitle>
                <CardDescription>
                  {grupo.conteudos.length} PDF{grupo.conteudos.length !== 1 ? 's' : ''} disponível{grupo.conteudos.length !== 1 ? 'is' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {bimestres.map(bimestre => {
                    const conteudo = grupo.conteudos.find(c => c.bimestre === bimestre);
                    return (
                      <Card key={bimestre} className={`${conteudo ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{bimestre}º Bimestre</h4>
                            {conteudo ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                          </div>
                          
                          {conteudo ? (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {conteudo.nome}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(conteudo.tamanho)}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(conteudo.dataUpload).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(conteudo.url, '_blank')}
                                    className="flex-1 gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Ver
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => renovarURL(conteudo.id)}
                                    className="flex-1 gap-1 text-blue-600 hover:text-blue-700"
                                    title="Renovar URL do PDF"
                                  >
                                    <Download className="w-3 h-3" />
                                    Renovar
                                  </Button>
                                </div>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="w-full text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o conteúdo "{conteudo.nome}"? 
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleExcluir(conteudo)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-500">
                                Nenhum conteúdo adicionado
                              </p>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setUploadData({
                                    serie: grupo.serie,
                                    disciplina: grupo.disciplina,
                                    bimestre: bimestre.toString(),
                                    arquivo: null
                                  });
                                  setIsUploadDialogOpen(true);
                                }}
                                className="w-full gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Adicionar
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}