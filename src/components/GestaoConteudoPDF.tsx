import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import {
  Upload,
  Trash2,
  Eye,
  Calendar,
  BookOpen,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Plus,
  Download
} from 'lucide-react';
import { Usuario } from '../types/auth'; // Importando o tipo Usuario
import { supabase } from '../supabase/supabaseClient';

// ADICIONADO: Interface para receber o usuário via props
interface GestaoConteudoPDFProps {
  usuario?: Usuario;
}

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
}

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  fileName: string;
}

// ALTERADO: Recebendo usuario via props
export function GestaoConteudoPDF({ usuario }: GestaoConteudoPDFProps) {
  const [conteudos, setConteudos] = useState<ConteudoPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    fileName: ''
  });

  // REMOVIDO: const { usuario } = useAuth(); -> Agora usamos o que vem via props

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

    // Verificação de segurança
    if (!usuario?.id) {
      alert('Erro de sessão: Usuário não identificado. Tente fazer login novamente.');
      return;
    }

    try {
      setUploadProgress({
        isUploading: true,
        progress: 10,
        fileName: uploadData.arquivo.name
      });

      // 1. Upload para o Storage
      const fileExt = uploadData.arquivo.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${usuario.id}/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('pdfs-conteudista')
        .upload(filePath, uploadData.arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) throw storageError;

      setUploadProgress(prev => ({ ...prev, progress: 60 }));

      // 2. Obter URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('pdfs-conteudista')
        .getPublicUrl(filePath);

      // 3. Salvar metadados no Banco de Dados
      const { error: dbError } = await supabase
        .from('pdfs_conteudista')
        .insert({
          nome: uploadData.arquivo.name,
          disciplina: uploadData.disciplina,
          serie: uploadData.serie,
          bimestre: parseInt(uploadData.bimestre),
          url: publicUrl,
          arquivo: filePath,
          tamanho: uploadData.arquivo.size,
          autor_id: usuario.id,
          autor_nome: usuario.nome || 'Professor Conteudista'
        });

      if (dbError) throw dbError;

      setUploadProgress(prev => ({ ...prev, progress: 100 }));

      setTimeout(() => {
        setUploadProgress({ isUploading: false, progress: 0, fileName: '' });
        setIsUploadDialogOpen(false);
        setUploadData({ serie: '', disciplina: '', bimestre: '', arquivo: null });
        alert(`✅ PDF enviado com sucesso!`);
        carregarConteudos();
      }, 1000);

    } catch (error: any) {
      console.error('[GESTAO_PDF] Erro:', error);
      setError(error.message || 'Erro ao fazer upload.');
      alert('Erro ao enviar arquivo: ' + error.message);
      setUploadProgress({ isUploading: false, progress: 0, fileName: '' });
    }
  };

  const handleExcluir = async (conteudo: ConteudoPDF) => {
    try {
      setLoading(true);

      if (conteudo.arquivo) {
        const { error: storageError } = await supabase.storage
          .from('pdfs-conteudista')
          .remove([conteudo.arquivo]);

        if (storageError) console.warn('Erro ao deletar do storage:', storageError);
      }

      const { error: dbError } = await supabase
        .from('pdfs_conteudista')
        .delete()
        .eq('id', conteudo.id);

      if (dbError) throw dbError;

      carregarConteudos();

    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const carregarConteudos = async () => {
    if (!usuario?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('pdfs_conteudista')
        .select('*')
        .eq('autor_id', usuario.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conteudosFormatados: ConteudoPDF[] = (data || []).map(item => ({
        id: item.id,
        nome: item.nome || 'Sem título',
        disciplina: item.disciplina || 'Geral',
        serie: item.serie || 'Geral',
        bimestre: item.bimestre || 1,
        arquivo: item.arquivo,
        url: item.url,
        tamanho: item.tamanho || 0,
        dataUpload: item.created_at,
        autorId: item.autor_id,
        autorNome: item.autor_nome
      }));

      setConteudos(conteudosFormatados);
    } catch (error: any) {
      console.error('Erro ao carregar:', error);
      setError('Erro ao carregar conteúdos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarConteudos();
  }, [usuario?.id]);

  const conteudosFiltrados = conteudos.filter(conteudo => {
    const matchSerie = !filtroSerie || filtroSerie === 'todas' || conteudo.serie === filtroSerie;
    const matchDisciplina = !filtroDisciplina || filtroDisciplina === 'todas' || conteudo.disciplina === filtroDisciplina;
    const matchBimestre = !filtroBimestre || filtroBimestre === 'todos' || conteudo.bimestre.toString() === filtroBimestre;

    return matchSerie && matchDisciplina && matchBimestre;
  });

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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
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
                        <SelectItem key={serie} value={serie}>{serie}</SelectItem>
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
                        <SelectItem key={disciplina} value={disciplina}>{disciplina}</SelectItem>
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
                        <SelectItem key={bimestre} value={bimestre.toString()}>{bimestre}º Bimestre</SelectItem>
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
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploadProgress.isUploading}
                    className="flex-1"
                  >
                    {uploadProgress.isUploading ? 'Enviando...' : 'Enviar PDF'}
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
                {series.map(serie => <SelectItem key={serie} value={serie}>{serie}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroDisciplina} onValueChange={setFiltroDisciplina}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as disciplinas</SelectItem>
                {disciplinas.map(disc => <SelectItem key={disc} value={disc}>{disc}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroBimestre} onValueChange={setFiltroBimestre}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filtrar por bimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os bimestres</SelectItem>
                {bimestres.map(bi => <SelectItem key={bi} value={bi.toString()}>{bi}º Bimestre</SelectItem>)}
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
              <Button variant="outline" size="sm" onClick={carregarConteudos}>Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : Object.keys(conteudosAgrupados).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {conteudos.length === 0 ? 'Nenhum conteúdo cadastrado' : 'Nenhum conteúdo encontrado'}
              </h3>
              <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar PDF
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
                  {grupo.conteudos.length} PDF(s) disponível(is)
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
                            {conteudo ? <CheckCircle className="w-5 h-5 text-green-600" /> : <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />}
                          </div>

                          {conteudo ? (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate" title={conteudo.nome}>{conteudo.nome}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(conteudo.tamanho)}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(conteudo.dataUpload).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Button size="sm" variant="outline" onClick={() => window.open(conteudo.url, '_blank')} className="w-full gap-1">
                                  <Eye className="w-3 h-3" /> Ver
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="w-full text-red-600 hover:text-red-700">
                                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>Tem certeza que deseja excluir "{conteudo.nome}"?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleExcluir(conteudo)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-500">Vazio</p>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setUploadData({ serie: grupo.serie, disciplina: grupo.disciplina, bimestre: bimestre.toString(), arquivo: null });
                                  setIsUploadDialogOpen(true);
                                }} 
                                className="w-full gap-1"
                              >
                                <Plus className="w-3 h-3" /> Adicionar
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
