import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { 
  Plus, 
  Search, 
  Play, 
  Upload, 
  Edit2, 
  Trash2, 
  Clock, 
  Eye,
  Calendar,
  User,
  Video,
  FileVideo,
  PlayCircle,
  Target,
  Pause
} from 'lucide-react';

interface VideoAula {
  id: string;
  titulo: string;
  disciplina: string;
  serie: string;
  bimestre: string;
  unidade: string;
  topico: string;
  descricao: string;
  duracao: string;
  thumbnail: string;
  videoUrl: string;
  dataCreated: string;
  autor: string;
  status: 'ativo' | 'processando' | 'rascunho' | 'erro';
  visualizacoes: number;
  progresso: number; // Para upload/processamento
}

export function GestaoVideos() {
  const [videos, setVideos] = useState<VideoAula[]>([
    {
      id: '1',
      titulo: 'Funções Quadráticas - Teoria e Prática',
      disciplina: 'Matemática',
      serie: '1ª série - Ensino Médio',
      bimestre: '2º Bimestre',
      unidade: 'Unidade 3',
      topico: 'Função Quadrática',
      descricao: 'Videoaula completa sobre funções quadráticas, incluindo gráficos e exercícios práticos',
      duracao: '45:30',
      thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300&h=200&fit=crop',
      videoUrl: 'https://example.com/video1.mp4',
      dataCreated: '2024-01-15',
      autor: 'Prof. Helena Conteudista',
      status: 'ativo',
      visualizacoes: 234,
      progresso: 100
    },
    {
      id: '2',
      titulo: 'Reações Químicas Inorgânicas',
      disciplina: 'Química',
      serie: '2ª série - Ensino Médio',
      bimestre: '1º Bimestre',
      unidade: 'Unidade 1',
      topico: 'Reações Químicas',
      descricao: 'Demonstração prática de diferentes tipos de reações químicas inorgânicas',
      duracao: '32:15',
      thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=300&h=200&fit=crop',
      videoUrl: 'https://example.com/video2.mp4',
      dataCreated: '2024-01-18',
      autor: 'Prof. Helena Conteudista',
      status: 'processando',
      visualizacoes: 0,
      progresso: 65
    }
  ]);

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [videoEditando, setVideoEditando] = useState<VideoAula | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Formulário para novo vídeo
  const [novoVideo, setNovoVideo] = useState({
    titulo: '',
    disciplina: '',
    serie: '',
    bimestre: '',
    unidade: '',
    topico: '',
    descricao: '',
    status: 'rascunho' as const,
    arquivo: null as File | null
  });

  const disciplinas = [
    'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
    'Física', 'Química', 'Biologia', 'Inglês', 'Educação Física',
    'Artes', 'Filosofia', 'Sociologia'
  ];

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

  const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

  const videosFiltrados = videos.filter(video => {
    const matchTexto = video.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      video.topico.toLowerCase().includes(filtroTexto.toLowerCase());
    const matchDisciplina = !filtroDisciplina || filtroDisciplina === 'todas' || video.disciplina === filtroDisciplina;
    const matchStatus = !filtroStatus || filtroStatus === 'todos' || video.status === filtroStatus;
    
    return matchTexto && matchDisciplina && matchStatus;
  });

  const handleSalvarVideo = async () => {
    if (!novoVideo.arquivo && !videoEditando) {
      alert('Por favor, selecione um arquivo de vídeo');
      return;
    }

    setIsUploading(true);
    
    // Simular upload
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadProgress(0);
          
          if (videoEditando) {
            // Editar vídeo existente
            setVideos(videos.map(v => 
              v.id === videoEditando.id ? { 
                ...videoEditando, 
                titulo: novoVideo.titulo,
                disciplina: novoVideo.disciplina,
                serie: novoVideo.serie,
                bimestre: novoVideo.bimestre,
                unidade: novoVideo.unidade,
                topico: novoVideo.topico,
                descricao: novoVideo.descricao,
                status: novoVideo.status
              } : v
            ));
          } else {
            // Criar novo vídeo
            const novoId = (videos.length + 1).toString();
            setVideos([...videos, {
              ...novoVideo,
              id: novoId,
              duracao: '00:00', // Será atualizado após processamento
              thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300&h=200&fit=crop',
              videoUrl: '',
              dataCreated: new Date().toISOString().split('T')[0],
              autor: 'Prof. Helena Conteudista',
              visualizacoes: 0,
              progresso: 0,
              status: 'processando',
              arquivo: undefined
            }]);
          }
          
          setIsDialogOpen(false);
          setVideoEditando(null);
          resetForm();
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const resetForm = () => {
    setNovoVideo({
      titulo: '',
      disciplina: '',
      serie: '',
      bimestre: '',
      unidade: '',
      topico: '',
      descricao: '',
      status: 'rascunho',
      arquivo: null
    });
  };

  const handleEditarVideo = (video: VideoAula) => {
    setVideoEditando(video);
    setNovoVideo({
      titulo: video.titulo,
      disciplina: video.disciplina,
      serie: video.serie,
      bimestre: video.bimestre,
      unidade: video.unidade,
      topico: video.topico,
      descricao: video.descricao,
      status: video.status,
      arquivo: null
    });
    setIsDialogOpen(true);
  };

  const handleExcluirVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'processando': return 'bg-blue-100 text-blue-800';
      case 'rascunho': return 'bg-yellow-100 text-yellow-800';
      case 'erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativo': return <PlayCircle className="w-4 h-4" />;
      case 'processando': return <Upload className="w-4 h-4" />;
      case 'rascunho': return <Pause className="w-4 h-4" />;
      case 'erro': return <Video className="w-4 h-4" />;
      default: return <FileVideo className="w-4 h-4" />;
    }
  };

  const formatDuration = (duration: string) => {
    const [minutes, seconds] = duration.split(':');
    return `${minutes}min ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestão de Vídeos</h3>
          <p className="text-sm text-gray-600">
            Gerencie videoaulas e conteúdo audiovisual
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Videoaula
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {videoEditando ? 'Editar Videoaula' : 'Upload de Nova Videoaula'}
              </DialogTitle>
              <DialogDescription>
                Faça upload e configure sua videoaula
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Upload de arquivo */}
              {!videoEditando && (
                <div className="space-y-2">
                  <Label htmlFor="arquivo">Arquivo de Vídeo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      id="arquivo"
                      accept="video/*"
                      onChange={(e) => setNovoVideo({...novoVideo, arquivo: e.target.files?.[0] || null})}
                      className="hidden"
                    />
                    <label htmlFor="arquivo" className="cursor-pointer">
                      <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <div className="text-sm text-gray-600">
                        {novoVideo.arquivo ? (
                          <span className="text-green-600 font-medium">
                            {novoVideo.arquivo.name}
                          </span>
                        ) : (
                          <>
                            <span className="font-medium">Clique para selecionar</span> ou arraste um arquivo de vídeo
                            <br />
                            <span className="text-xs">MP4, AVI, MOV (máx. 2GB)</span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Barra de progresso durante upload */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fazendo upload...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título da Videoaula</Label>
                  <Input
                    id="titulo"
                    value={novoVideo.titulo}
                    onChange={(e) => setNovoVideo({...novoVideo, titulo: e.target.value})}
                    placeholder="Ex: Funções Quadráticas"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="disciplina">Disciplina</Label>
                  <Select value={novoVideo.disciplina} onValueChange={(value) => setNovoVideo({...novoVideo, disciplina: value})}>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serie">Série</Label>
                  <Select value={novoVideo.serie} onValueChange={(value) => setNovoVideo({...novoVideo, serie: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Série" />
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
                  <Label htmlFor="bimestre">Bimestre</Label>
                  <Select value={novoVideo.bimestre} onValueChange={(value) => setNovoVideo({...novoVideo, bimestre: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      {bimestres.map(bimestre => (
                        <SelectItem key={bimestre} value={bimestre}>
                          {bimestre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade</Label>
                  <Input
                    id="unidade"
                    value={novoVideo.unidade}
                    onChange={(e) => setNovoVideo({...novoVideo, unidade: e.target.value})}
                    placeholder="Ex: Unidade 1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topico">Tópico</Label>
                <Input
                  id="topico"
                  value={novoVideo.topico}
                  onChange={(e) => setNovoVideo({...novoVideo, topico: e.target.value})}
                  placeholder="Ex: Função Quadrática"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={novoVideo.descricao}
                  onChange={(e) => setNovoVideo({...novoVideo, descricao: e.target.value})}
                  placeholder="Descreva o conteúdo da videoaula..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="status"
                  checked={novoVideo.status === 'ativo'}
                  onCheckedChange={(checked) => setNovoVideo({...novoVideo, status: checked ? 'ativo' : 'rascunho'})}
                />
                <Label htmlFor="status">Publicar após processamento</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSalvarVideo} 
                  className="flex-1"
                  disabled={isUploading || (!novoVideo.arquivo && !videoEditando)}
                >
                  {isUploading ? 'Fazendo Upload...' : videoEditando ? 'Salvar Alterações' : 'Fazer Upload'}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por título ou tópico..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="pl-10"
              />
            </div>
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
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Vídeos */}
      <div className="grid gap-6">
        {videosFiltrados.map((video) => (
          <Card key={video.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={video.titulo}
                    className="w-48 h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {video.duracao}
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{video.titulo}</h4>
                      <p className="text-sm text-gray-600">
                        {video.disciplina} • {video.serie} • {video.bimestre}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditarVideo(video)}
                        className="gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExcluirVideo(video.id)}
                        className="gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{video.descricao}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="gap-1">
                      <Target className="w-3 h-3" />
                      {video.unidade}
                    </Badge>
                    <Badge variant="outline">{video.topico}</Badge>
                    <Badge className={`gap-1 ${getStatusColor(video.status)}`}>
                      {getStatusIcon(video.status)}
                      {video.status}
                    </Badge>
                  </div>

                  {/* Barra de progresso para vídeos em processamento */}
                  {video.status === 'processando' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Processando vídeo...</span>
                        <span>{video.progresso}%</span>
                      </div>
                      <Progress value={video.progresso} className="w-full h-2" />
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(video.dataCreated).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {video.autor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(video.duracao)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.visualizacoes} visualizações
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {videosFiltrados.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma videoaula encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                Não há videoaulas que correspondam aos filtros aplicados.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Primeira Videoaula
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}