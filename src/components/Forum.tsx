import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MessageSquare, 
  Plus, 
  ThumbsUp, 
  MessageCircle, 
  Search,
  Filter,
  Clock,
  User,
  CheckCircle2,
  Pin,
  Lock,
  Upload,
  File,
  X,
  Send,
  Paperclip
} from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface Pergunta {
  id: string;
  titulo: string;
  conteudo: string;
  autor: string;
  autorAvatar?: string;
  dataPublicacao: string;
  tags: string[];
  likes: number;
  respostas: number;
  fixada?: boolean;
  resolvida?: boolean;
  topico?: string;
  privada?: boolean;
  professorDestinatario?: string;
  arquivos?: Arquivo[];
}

interface Arquivo {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
}

interface Resposta {
  id: string;
  perguntaId: string;
  conteudo: string;
  autor: string;
  autorAvatar?: string;
  dataPublicacao: string;
  likes: number;
  melhorResposta?: boolean;
}

export function Forum() {
  const [mostrarNovoTopico, setMostrarNovoTopico] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [mensagemPrivada, setMensagemPrivada] = useState(false);
  const [professorSelecionado, setProfessorSelecionado] = useState('');
  const [arquivosSelecionados, setArquivosSelecionados] = useState<File[]>([]);
  const [abaTipo, setAbaTipo] = useState<'geral' | 'privadas'>('geral');
  const { usuario } = useAuth();

  const professores = [
    { id: 'prof1', nome: 'Prof. Carlos Santos', disciplinas: ['Matemática', 'Física'] },
    { id: 'prof2', nome: 'Profa. Maria Oliveira', disciplinas: ['Português', 'Literatura'] },
    { id: 'prof3', nome: 'Prof. João Costa', disciplinas: ['História', 'Geografia'] }
  ];

  const perguntas: Pergunta[] = [
    {
      id: '1',
      titulo: 'Dúvida sobre aplicação dos conceitos fundamentais',
      conteudo: 'Tenho dificuldade em entender como aplicar os conceitos fundamentais em situações práticas. Alguém poderia dar exemplos?',
      autor: 'Ana Silva',
      dataPublicacao: '2025-01-10',
      tags: ['conceitos', 'aplicacao', 'pratica'],
      likes: 12,
      respostas: 5,
      fixada: true,
      topico: 'Fundamentos'
    },
    {
      id: '2',
      titulo: 'Exercícios complementares para fixação',
      conteudo: 'Vocês conhecem algum material com exercícios extras para praticar os conceitos do primeiro módulo?',
      autor: 'Carlos Mendes',
      dataPublicacao: '2025-01-09',
      tags: ['exercicios', 'material', 'estudo'],
      likes: 8,
      respostas: 3,
      resolvida: true,
      topico: 'Exercícios'
    },
    {
      id: '3',
      titulo: 'Diferença entre teoria e prática',
      conteudo: 'Como vocês fazem para conectar o que aprendemos na teoria com a aplicação no mundo real?',
      autor: 'Maria Costa',
      dataPublicacao: '2025-01-08',
      tags: ['teoria', 'pratica', 'aplicacao'],
      likes: 15,
      respostas: 7,
      topico: 'Aplicação'
    },
    {
      id: '4',
      titulo: 'Preparação para a prova bimestral',
      conteudo: 'Alguém tem dicas de como se preparar melhor para a avaliação do segundo bimestre?',
      autor: 'João Santos',
      dataPublicacao: '2025-01-07',
      tags: ['prova', 'avaliacao', 'estudo'],
      likes: 6,
      respostas: 2,
      topico: 'Avaliação'
    }
  ];

  const mensagensPrivadas: Pergunta[] = [
    {
      id: 'priv1',
      titulo: 'Dúvida sobre exercício da lista 3',
      conteudo: 'Professor, não consegui resolver o exercício 15 da lista 3. Poderia me dar uma dica?',
      autor: usuario?.nome || 'Aluno',
      dataPublicacao: '2025-01-11',
      tags: ['exercicio', 'lista'],
      likes: 0,
      respostas: 1,
      privada: true,
      professorDestinatario: 'Prof. Carlos Santos',
      arquivos: [{
        id: 'arq1',
        nome: 'exercicio_15_tentativa.pdf',
        tipo: 'application/pdf',
        tamanho: 1024000,
        url: '#'
      }]
    }
  ];

  const listaAtual = abaTipo === 'geral' ? perguntas : mensagensPrivadas;
  
  const perguntasFiltradas = listaAtual.filter(pergunta => {
    const matchBusca = pergunta.titulo.toLowerCase().includes(busca.toLowerCase()) ||
                      pergunta.conteudo.toLowerCase().includes(busca.toLowerCase());
    
    if (filtro === 'todos') return matchBusca;
    if (filtro === 'fixadas') return matchBusca && pergunta.fixada;
    if (filtro === 'resolvidas') return matchBusca && pergunta.resolvida;
    if (filtro === 'sem-resposta') return matchBusca && pergunta.respostas === 0;
    
    return matchBusca;
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setArquivosSelecionados(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setArquivosSelecionados(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Fórum de Discussões</h2>
          <p className="text-sm text-gray-600">Tire suas dúvidas e ajude outros colegas</p>
        </div>
        <Button 
          onClick={() => setMostrarNovoTopico(!mostrarNovoTopico)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {abaTipo === 'privadas' ? 'Nova Mensagem Privada' : 'Nova Pergunta'}
        </Button>
      </div>

      {/* Tabs para mensagens gerais e privadas */}
      {usuario?.tipo === 'aluno' && (
        <Tabs value={abaTipo} onValueChange={(value) => setAbaTipo(value as 'geral' | 'privadas')}>
          <TabsList>
            <TabsTrigger value="geral" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Discussões Gerais
            </TabsTrigger>
            <TabsTrigger value="privadas" className="gap-2">
              <Lock className="w-4 h-4" />
              Mensagens Privadas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Nova Pergunta/Mensagem Form */}
      {mostrarNovoTopico && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {abaTipo === 'privadas' ? (
                <>
                  <Lock className="w-5 h-5" />
                  Nova Mensagem Privada
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Nova Pergunta
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Opção de mensagem privada para alunos */}
            {usuario?.tipo === 'aluno' && abaTipo === 'geral' && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <Switch
                  id="privada"
                  checked={mensagemPrivada}
                  onCheckedChange={setMensagemPrivada}
                />
                <Label htmlFor="privada" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Enviar como mensagem privada para professor
                </Label>
              </div>
            )}

            {/* Seleção de professor para mensagens privadas */}
            {(mensagemPrivada || abaTipo === 'privadas') && usuario?.tipo === 'aluno' && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Professor Destinatário</Label>
                <select 
                  className="w-full p-2 border border-gray-200 rounded-md"
                  value={professorSelecionado}
                  onChange={(e) => setProfessorSelecionado(e.target.value)}
                >
                  <option value="">Selecione um professor</option>
                  {professores.map(prof => (
                    <option key={prof.id} value={prof.nome}>
                      {prof.nome} - {prof.disciplinas.join(', ')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Título</Label>
              <Input placeholder={abaTipo === 'privadas' ? "Assunto da mensagem..." : "Digite o título da sua pergunta..."} />
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Descrição</Label>
              <Textarea 
                placeholder={abaTipo === 'privadas' ? "Descreva sua dúvida para o professor..." : "Descreva sua dúvida em detalhes..."} 
                rows={4}
              />
            </div>

            {/* Upload de arquivos */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Anexar Arquivos
              </Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  <Label 
                    htmlFor="file-upload"
                    className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4" />
                    Selecionar Arquivos
                  </Label>
                  <span className="text-xs text-gray-500">
                    PDF, DOC, TXT, JPG, PNG (máx. 10MB cada)
                  </span>
                </div>
                
                {/* Lista de arquivos selecionados */}
                {arquivosSelecionados.length > 0 && (
                  <div className="space-y-2">
                    {arquivosSelecionados.map((arquivo, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{arquivo.name}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(arquivo.size)})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {abaTipo === 'geral' && !mensagemPrivada && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Tags</Label>
                <Input placeholder="Ex: conceitos, exercicios, teoria (separadas por vírgula)" />
              </div>
            )}

            <div className="flex gap-2">
              <Button className="gap-2">
                <Send className="w-4 h-4" />
                {abaTipo === 'privadas' || mensagemPrivada ? 'Enviar Mensagem' : 'Publicar Pergunta'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setMostrarNovoTopico(false);
                  setMensagemPrivada(false);
                  setProfessorSelecionado('');
                  setArquivosSelecionados([]);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar discussões..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtro === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro('todos')}
              >
                Todos
              </Button>
              <Button
                variant={filtro === 'fixadas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro('fixadas')}
              >
                Fixadas
              </Button>
              <Button
                variant={filtro === 'resolvidas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro('resolvidas')}
              >
                Resolvidas
              </Button>
              <Button
                variant={filtro === 'sem-resposta' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro('sem-resposta')}
              >
                Sem resposta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Perguntas */}
      <div className="space-y-4">
        {perguntasFiltradas.map((pergunta) => (
          <Card key={pergunta.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header da Pergunta */}
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {pergunta.autor.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {pergunta.fixada && (
                            <Pin className="w-4 h-4 text-blue-500" />
                          )}
                          {pergunta.resolvida && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                          <h3 className="font-semibold text-gray-900 line-clamp-1">
                            {pergunta.titulo}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <User className="w-3 h-3" />
                          <span>{pergunta.autor}</span>
                          <Clock className="w-3 h-3 ml-2" />
                          <span>{new Date(pergunta.dataPublicacao).toLocaleDateString('pt-BR')}</span>
                          {pergunta.topico && (
                            <Badge variant="outline" className="text-xs">
                              {pergunta.topico}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {pergunta.conteudo}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {pergunta.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{pergunta.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{pergunta.respostas} respostas</span>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        Ver discussão
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {perguntasFiltradas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma discussão encontrada.</p>
            <p className="text-sm">Tente ajustar os filtros ou faça a primeira pergunta!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}