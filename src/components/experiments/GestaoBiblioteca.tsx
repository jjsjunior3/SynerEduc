import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  FolderPlus,
  Folder,
  FileText,
  Image,
  Video,
  Download,
  Eye,
  Calendar,
  User,
  Library,
  Move,
  Copy,
  Archive,
  Tag
} from 'lucide-react';

interface ItemBiblioteca {
  id: string;
  nome: string;
  tipo: 'pasta' | 'conteudo' | 'video' | 'imagem';
  disciplina: string;
  serie: string;
  bimestre: string;
  unidade: string;
  categoria: string;
  tags: string[];
  tamanho?: string;
  dataCreated: string;
  dataModified: string;
  autor: string;
  downloads: number;
  visualizacoes: number;
  status: 'ativo' | 'arquivado';
  pastaId?: string; // Para hierarquia
}

interface Pasta {
  id: string;
  nome: string;
  descricao: string;
  disciplina: string;
  serie: string;
  cor: string;
  itens: number;
  dataCreated: string;
}

export function GestaoBiblioteca() {
  const [pastas, setPastas] = useState<Pasta[]>([
    {
      id: '1',
      nome: 'Matemática - 1ª Série',
      descricao: 'Todos os materiais de matemática para 1ª série do ensino médio',
      disciplina: 'Matemática',
      serie: '1ª série - Ensino Médio',
      cor: 'bg-blue-100',
      itens: 24,
      dataCreated: '2024-01-10'
    },
    {
      id: '2',
      nome: 'Química Orgânica',
      descricao: 'Materiais e experimentos de química orgânica',
      disciplina: 'Química',
      serie: '3ª série - Ensino Médio',
      cor: 'bg-green-100',
      itens: 18,
      dataCreated: '2024-01-12'
    }
  ]);

  const [itens, setItens] = useState<ItemBiblioteca[]>([
    {
      id: '1',
      nome: 'Funções - Teoria Completa.pdf',
      tipo: 'conteudo',
      disciplina: 'Matemática',
      serie: '1ª série - Ensino Médio',
      bimestre: '1º Bimestre',
      unidade: 'Unidade 1',
      categoria: 'Material Teórico',
      tags: ['funções', 'teoria', 'matemática'],
      tamanho: '2.4 MB',
      dataCreated: '2024-01-15',
      dataModified: '2024-01-20',
      autor: 'Prof. Helena Conteudista',
      downloads: 45,
      visualizacoes: 128,
      status: 'ativo',
      pastaId: '1'
    },
    {
      id: '2',
      nome: 'Experimento Reações Químicas.mp4',
      tipo: 'video',
      disciplina: 'Química',
      serie: '3ª série - Ensino Médio',
      bimestre: '2º Bimestre',
      unidade: 'Unidade 3',
      categoria: 'Experimento',
      tags: ['química', 'experimento', 'reações'],
      tamanho: '156 MB',
      dataCreated: '2024-01-18',
      dataModified: '2024-01-18',
      autor: 'Prof. Helena Conteudista',
      downloads: 23,
      visualizacoes: 67,
      status: 'ativo',
      pastaId: '2'
    }
  ]);

  const [viewMode, setViewMode] = useState<'pastas' | 'itens'>('pastas');
  const [pastaAtual, setPastaAtual] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [isDialogPastaOpen, setIsDialogPastaOpen] = useState(false);
  const [isDialogItemOpen, setIsDialogItemOpen] = useState(false);

  // Formulários
  const [novaPasta, setNovaPasta] = useState({
    nome: '',
    descricao: '',
    disciplina: '',
    serie: '',
    cor: 'bg-blue-100'
  });

  const [novoItem, setNovoItem] = useState({
    nome: '',
    tipo: 'conteudo' as const,
    disciplina: '',
    serie: '',
    bimestre: '',
    unidade: '',
    categoria: '',
    tags: '',
    pastaId: ''
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

  const cores = [
    'bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-red-100',
    'bg-yellow-100', 'bg-pink-100', 'bg-indigo-100', 'bg-gray-100'
  ];

  const itensFiltrados = itens.filter(item => {
    const matchTexto = item.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                      item.tags.some(tag => tag.toLowerCase().includes(filtroTexto.toLowerCase()));
    const matchDisciplina = !filtroDisciplina || filtroDisciplina === 'todas' || item.disciplina === filtroDisciplina;
    const matchTipo = !filtroTipo || filtroTipo === 'todos' || item.tipo === filtroTipo;
    const matchPasta = !pastaAtual || item.pastaId === pastaAtual;
    
    return matchTexto && matchDisciplina && matchTipo && matchPasta;
  });

  const pastasFiltradas = pastas.filter(pasta => {
    const matchTexto = pasta.nome.toLowerCase().includes(filtroTexto.toLowerCase());
    const matchDisciplina = !filtroDisciplina || filtroDisciplina === 'todas' || pasta.disciplina === filtroDisciplina;
    
    return matchTexto && matchDisciplina;
  });

  const handleCriarPasta = () => {
    const novaId = (pastas.length + 1).toString();
    setPastas([...pastas, {
      ...novaPasta,
      id: novaId,
      itens: 0,
      dataCreated: new Date().toISOString().split('T')[0]
    }]);
    
    setIsDialogPastaOpen(false);
    setNovaPasta({
      nome: '',
      descricao: '',
      disciplina: '',
      serie: '',
      cor: 'bg-blue-100'
    });
  };

  const handleAdicionarItem = () => {
    const novoId = (itens.length + 1).toString();
    setItens([...itens, {
      ...novoItem,
      id: novoId,
      tags: novoItem.tags.split(',').map(tag => tag.trim()),
      tamanho: '1.2 MB',
      dataCreated: new Date().toISOString().split('T')[0],
      dataModified: new Date().toISOString().split('T')[0],
      autor: 'Prof. Helena Conteudista',
      downloads: 0,
      visualizacoes: 0,
      status: 'ativo',
      pastaId: novoItem.pastaId === 'sem_pasta' ? undefined : novoItem.pastaId
    }]);
    
    setIsDialogItemOpen(false);
    setNovoItem({
      nome: '',
      tipo: 'conteudo',
      disciplina: '',
      serie: '',
      bimestre: '',
      unidade: '',
      categoria: '',
      tags: '',
      pastaId: ''
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'pasta': return <Folder className="w-5 h-5" />;
      case 'conteudo': return <FileText className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'imagem': return <Image className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'pasta': return 'text-blue-600';
      case 'conteudo': return 'text-gray-600';
      case 'video': return 'text-red-600';
      case 'imagem': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Biblioteca de Conteúdo</h3>
          <p className="text-sm text-gray-600">
            Organize e gerencie todos os materiais educacionais
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogPastaOpen} onOpenChange={setIsDialogPastaOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderPlus className="w-4 h-4" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Pasta</DialogTitle>
                <DialogDescription>
                  Organize seus materiais em pastas por disciplina e série
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nomePasta">Nome da Pasta</Label>
                  <Input
                    id="nomePasta"
                    value={novaPasta.nome}
                    onChange={(e) => setNovaPasta({...novaPasta, nome: e.target.value})}
                    placeholder="Ex: Matemática - 1ª Série"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricaoPasta">Descrição</Label>
                  <Input
                    id="descricaoPasta"
                    value={novaPasta.descricao}
                    onChange={(e) => setNovaPasta({...novaPasta, descricao: e.target.value})}
                    placeholder="Breve descrição da pasta"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="disciplinaPasta">Disciplina</Label>
                    <Select value={novaPasta.disciplina} onValueChange={(value) => setNovaPasta({...novaPasta, disciplina: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Disciplina" />
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
                    <Label htmlFor="seriePasta">Série</Label>
                    <Select value={novaPasta.serie} onValueChange={(value) => setNovaPasta({...novaPasta, serie: value})}>
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
                </div>

                <div className="space-y-2">
                  <Label>Cor da Pasta</Label>
                  <div className="flex gap-2">
                    {cores.map(cor => (
                      <button
                        key={cor}
                        onClick={() => setNovaPasta({...novaPasta, cor})}
                        className={`w-8 h-8 rounded-lg ${cor} border-2 ${
                          novaPasta.cor === cor ? 'border-gray-400' : 'border-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCriarPasta} className="flex-1">
                    Criar Pasta
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogPastaOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogItemOpen} onOpenChange={setIsDialogItemOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Item à Biblioteca</DialogTitle>
                <DialogDescription>
                  Adicione um novo material à biblioteca
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeItem">Nome do Item</Label>
                    <Input
                      id="nomeItem"
                      value={novoItem.nome}
                      onChange={(e) => setNovoItem({...novoItem, nome: e.target.value})}
                      placeholder="Ex: Funções - Teoria.pdf"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoItem">Tipo</Label>
                    <Select value={novoItem.tipo} onValueChange={(value: 'conteudo' | 'video' | 'imagem') => setNovoItem({...novoItem, tipo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conteudo">Conteúdo</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="disciplinaItem">Disciplina</Label>
                    <Select value={novoItem.disciplina} onValueChange={(value) => setNovoItem({...novoItem, disciplina: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Disciplina" />
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
                    <Label htmlFor="serieItem">Série</Label>
                    <Select value={novoItem.serie} onValueChange={(value) => setNovoItem({...novoItem, serie: value})}>
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
                    <Label htmlFor="pastaItem">Pasta</Label>
                    <Select value={novoItem.pastaId} onValueChange={(value) => setNovoItem({...novoItem, pastaId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pasta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_pasta">Sem pasta</SelectItem>
                        {pastas.map(pasta => (
                          <SelectItem key={pasta.id} value={pasta.id}>
                            {pasta.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoriaItem">Categoria</Label>
                    <Input
                      id="categoriaItem"
                      value={novoItem.categoria}
                      onChange={(e) => setNovoItem({...novoItem, categoria: e.target.value})}
                      placeholder="Ex: Material Teórico"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagsItem">Tags (separadas por vírgula)</Label>
                    <Input
                      id="tagsItem"
                      value={novoItem.tags}
                      onChange={(e) => setNovoItem({...novoItem, tags: e.target.value})}
                      placeholder="Ex: funções, matemática, teoria"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAdicionarItem} className="flex-1">
                    Adicionar Item
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogItemOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navegação e Filtros */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={viewMode} onValueChange={(value: 'pastas' | 'itens') => setViewMode(value)} className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="pastas" className="gap-2">
                  <Folder className="w-4 h-4" />
                  Pastas
                </TabsTrigger>
                <TabsTrigger value="itens" className="gap-2">
                  <Library className="w-4 h-4" />
                  Todos os Itens
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                {pastaAtual && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPastaAtual(null)}
                    className="gap-2"
                  >
                    ← Voltar
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
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
              {viewMode === 'itens' && (
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="conteudo">Conteúdo</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value="pastas" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastasFiltradas.map((pasta) => (
                  <Card 
                    key={pasta.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setPastaAtual(pasta.id);
                      setViewMode('itens');
                    }}
                  >
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-lg ${pasta.cor} flex items-center justify-center mb-4`}>
                        <Folder className="w-6 h-6 text-gray-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{pasta.nome}</h4>
                      <p className="text-sm text-gray-600 mb-3">{pasta.descricao}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{pasta.itens} itens</span>
                        <span>{new Date(pasta.dataCreated).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="itens" className="mt-6">
              <div className="space-y-4">
                {itensFiltrados.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg ${getTipoColor(item.tipo)}`}>
                            {getTipoIcon(item.tipo)}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{item.nome}</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {item.disciplina} • {item.serie} • {item.categoria}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {item.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="gap-1">
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.dataCreated).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {item.autor}
                              </span>
                              <span>{item.tamanho}</span>
                              <span className="flex items-center gap-1">
                                <Download className="w-3 h-3" />
                                {item.downloads}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {item.visualizacoes}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="outline" className="gap-2">
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Move className="w-3 h-3" />
                            Mover
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2 text-red-600">
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {itensFiltrados.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Library className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum item encontrado
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Não há itens que correspondam aos filtros aplicados.
                      </p>
                      <Button onClick={() => setIsDialogItemOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Adicionar Primeiro Item
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}