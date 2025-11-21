import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  FileText, 
  Image, 
  Download,
  Eye,
  Calendar,
  User,
  BookOpen,
  Target,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Conteudo {
  id: string;
  titulo: string;
  disciplina: string;
  serie: string;
  bimestre: string;
  unidade: string;
  topico: string;
  tipo: 'texto' | 'pdf' | 'imagem' | 'slide';
  descricao: string;
  dataCreated: string;
  autor: string;
  status: 'ativo' | 'rascunho' | 'arquivado';
  downloads: number;
  visualizacoes: number;
}

export function GestaoConteudo() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [conteudoEditando, setConteudoEditando] = useState<Conteudo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { usuario } = useAuth();

  // Formulário para novo conteúdo
  const [novoConteudo, setNovoConteudo] = useState({
    titulo: '',
    disciplina: '',
    serie: '',
    bimestre: '',
    unidade: '',
    topico: '',
    tipo: 'pdf' as const,
    descricao: '',
    status: 'rascunho' as const
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

  const conteudosFiltrados = conteudos.filter(conteudo => {
    const matchTexto = conteudo.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      conteudo.topico.toLowerCase().includes(filtroTexto.toLowerCase());
    const matchDisciplina = !filtroDisciplina || filtroDisciplina === 'todas' || conteudo.disciplina === filtroDisciplina;
    const matchStatus = !filtroStatus || filtroStatus === 'todos' || conteudo.status === filtroStatus;
    
    return matchTexto && matchDisciplina && matchStatus;
  });

  const handleSalvarConteudo = () => {
    if (conteudoEditando) {
      // Editar conteúdo existente
      setConteudos(conteudos.map(c => 
        c.id === conteudoEditando.id ? { ...conteudoEditando, ...novoConteudo } : c
      ));
    } else {
      // Criar novo conteúdo
      const novoId = (conteudos.length + 1).toString();
      setConteudos([...conteudos, {
        ...novoConteudo,
        id: novoId,
        dataCreated: new Date().toISOString().split('T')[0],
        autor: 'Prof. Helena Conteudista',
        downloads: 0,
        visualizacoes: 0
      }]);
    }
    
    setIsDialogOpen(false);
    setConteudoEditando(null);
    setNovoConteudo({
      titulo: '',
      disciplina: '',
      serie: '',
      bimestre: '',
      unidade: '',
      topico: '',
      tipo: 'pdf',
      descricao: '',
      status: 'rascunho'
    });
  };

  const handleEditarConteudo = (conteudo: Conteudo) => {
    setConteudoEditando(conteudo);
    setNovoConteudo({
      titulo: conteudo.titulo,
      disciplina: conteudo.disciplina,
      serie: conteudo.serie,
      bimestre: conteudo.bimestre,
      unidade: conteudo.unidade,
      topico: conteudo.topico,
      tipo: conteudo.tipo,
      descricao: conteudo.descricao,
      status: conteudo.status
    });
    setIsDialogOpen(true);
  };

  const handleExcluirConteudo = (id: string) => {
    setConteudos(conteudos.filter(c => c.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'rascunho': return 'bg-yellow-100 text-yellow-800';
      case 'arquivado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'imagem': return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    carregarConteudos();
  }, [usuario?.id]);

  const carregarConteudos = async () => {
    if (!usuario?.id) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudos/conteudista/${usuario.id}`, {
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestão de Conteúdos</h3>
          <p className="text-sm text-gray-600">
            Gerencie materiais didáticos, PDFs e recursos educacionais
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {conteudoEditando ? 'Editar Conteúdo' : 'Adicionar Novo Conteúdo'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do material didático
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={novoConteudo.titulo}
                    onChange={(e) => setNovoConteudo({...novoConteudo, titulo: e.target.value})}
                    placeholder="Ex: Introdução à Álgebra"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="disciplina">Disciplina</Label>
                  <Select value={novoConteudo.disciplina} onValueChange={(value) => setNovoConteudo({...novoConteudo, disciplina: value})}>
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
                  <Select value={novoConteudo.serie} onValueChange={(value) => setNovoConteudo({...novoConteudo, serie: value})}>
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
                  <Select value={novoConteudo.bimestre} onValueChange={(value) => setNovoConteudo({...novoConteudo, bimestre: value})}>
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
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={novoConteudo.tipo} onValueChange={(value: 'texto' | 'pdf' | 'imagem' | 'slide') => setNovoConteudo({...novoConteudo, tipo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="texto">Texto</SelectItem>
                      <SelectItem value="imagem">Imagem</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade</Label>
                  <Input
                    id="unidade"
                    value={novoConteudo.unidade}
                    onChange={(e) => setNovoConteudo({...novoConteudo, unidade: e.target.value})}
                    placeholder="Ex: Unidade 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topico">Tópico</Label>
                  <Input
                    id="topico"
                    value={novoConteudo.topico}
                    onChange={(e) => setNovoConteudo({...novoConteudo, topico: e.target.value})}
                    placeholder="Ex: Matrizes e Determinantes"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={novoConteudo.descricao}
                  onChange={(e) => setNovoConteudo({...novoConteudo, descricao: e.target.value})}
                  placeholder="Descreva o conteúdo do material..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="status"
                  checked={novoConteudo.status === 'ativo'}
                  onCheckedChange={(checked) => setNovoConteudo({...novoConteudo, status: checked ? 'ativo' : 'rascunho'})}
                />
                <Label htmlFor="status">Publicar imediatamente</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSalvarConteudo} className="flex-1">
                  {conteudoEditando ? 'Salvar Alterações' : 'Criar Conteúdo'}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conteúdos */}
      <div className="grid gap-4">
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
        ) : conteudosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {conteudos.length === 0 ? 'Nenhum conteúdo cadastrado' : 'Nenhum conteúdo encontrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {conteudos.length === 0 
                  ? 'Comece criando seu primeiro material didático.'
                  : 'Não há conteúdos que correspondam aos filtros aplicados.'
                }
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                {conteudos.length === 0 ? 'Criar Primeiro Conteúdo' : 'Adicionar Novo Conteúdo'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          conteudosFiltrados.map((conteudo) => (
            <Card key={conteudo.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getTipoIcon(conteudo.tipo)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{conteudo.titulo}</h4>
                        <p className="text-sm text-gray-600">
                          {conteudo.disciplina} • {conteudo.serie} • {conteudo.bimestre}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 mb-2">{conteudo.descricao}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Target className="w-3 h-3" />
                          {conteudo.unidade}
                        </Badge>
                        <Badge variant="outline">{conteudo.topico}</Badge>
                        <Badge className={getStatusColor(conteudo.status)}>
                          {conteudo.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(conteudo.dataCreated).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {conteudo.autor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {conteudo.downloads} downloads
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {conteudo.visualizacoes} visualizações
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditarConteudo(conteudo)}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExcluirConteudo(conteudo.id)}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}