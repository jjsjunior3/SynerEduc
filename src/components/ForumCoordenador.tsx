import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Search, MessageSquare, Eye, Reply, Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface ForumCoordenadorProps {
  onVoltar: () => void;
}

interface MensagemForum {
  id: string;
  disciplina: string;
  serie: string;
  turma: string;
  autor: string;
  tipoAutor: 'aluno' | 'professor';
  titulo: string;
  conteudo: string;
  dataEnvio: string;
  respostas: number;
  ultimaResposta?: string;
  prioridade: 'baixa' | 'media' | 'alta';
  status: 'aberta' | 'respondida' | 'fechada';
}

export function ForumCoordenador({ onVoltar }: ForumCoordenadorProps) {
  const [filtroDisciplina, setFiltroDisciplina] = useState('todas');
  const [filtroSerie, setFiltroSerie] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [busca, setBusca] = useState('');

  const mensagens: MensagemForum[] = [
    {
      id: '1',
      disciplina: 'Matemática',
      serie: '3ª série',
      turma: 'A',
      autor: 'Maria Silva',
      tipoAutor: 'aluno',
      titulo: 'Dúvida sobre derivadas',
      conteudo: 'Professor, estou com dificuldade para entender o conceito de derivadas. Poderia explicar novamente?',
      dataEnvio: '2025-01-10T14:30:00',
      respostas: 2,
      ultimaResposta: '2025-01-10T15:45:00',
      prioridade: 'media',
      status: 'respondida'
    },
    {
      id: '2',
      disciplina: 'Física',
      serie: '3ª série',
      turma: 'B',
      autor: 'João Pedro',
      tipoAutor: 'aluno',
      titulo: 'Exercícios de cinemática',
      conteudo: 'Alguém pode me ajudar com os exercícios da lista 3? Estou travado na questão 7.',
      dataEnvio: '2025-01-11T09:15:00',
      respostas: 1,
      ultimaResposta: '2025-01-11T10:20:00',
      prioridade: 'baixa',
      status: 'respondida'
    },
    {
      id: '3',
      disciplina: 'Português',
      serie: '2ª série',
      turma: 'A',
      autor: 'Prof. Ana Silva',
      tipoAutor: 'professor',
      titulo: 'Material de apoio para literatura',
      conteudo: 'Pessoal, disponibilizei material extra sobre Romantismo na biblioteca virtual. Confiram!',
      dataEnvio: '2025-01-11T16:20:00',
      respostas: 5,
      ultimaResposta: '2025-01-12T08:30:00',
      prioridade: 'media',
      status: 'aberta'
    },
    {
      id: '4',
      disciplina: 'História',
      serie: '1ª série',
      turma: 'B',
      autor: 'Ana Carolina',
      tipoAutor: 'aluno',
      titulo: 'URGENTE: Dúvida para prova',
      conteudo: 'Professor, a prova é amanhã e estou com dúvida sobre a Segunda Guerra Mundial. Pode me ajudar?',
      dataEnvio: '2025-01-12T19:45:00',
      respostas: 0,
      prioridade: 'alta',
      status: 'aberta'
    },
    {
      id: '5',
      disciplina: 'Biologia',
      serie: '2ª série',
      turma: 'B',
      autor: 'Lucas Oliveira',
      tipoAutor: 'aluno',
      titulo: 'Trabalho sobre fotossíntese',
      conteudo: 'Professora, qual é o prazo para entrega do trabalho sobre fotossíntese?',
      dataEnvio: '2025-01-12T13:10:00',
      respostas: 1,
      ultimaResposta: '2025-01-12T14:25:00',
      prioridade: 'baixa',
      status: 'fechada'
    }
  ];

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-100 text-red-700';
      case 'media': return 'bg-yellow-100 text-yellow-700';
      case 'baixa': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-blue-100 text-blue-700';
      case 'respondida': return 'bg-green-100 text-green-700';
      case 'fechada': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTipoAutorColor = (tipo: string) => {
    return tipo === 'professor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  const mensagensFiltradas = mensagens.filter(mensagem => {
    const matchBusca = mensagem.titulo.toLowerCase().includes(busca.toLowerCase()) ||
                      mensagem.conteudo.toLowerCase().includes(busca.toLowerCase()) ||
                      mensagem.autor.toLowerCase().includes(busca.toLowerCase());
    const matchDisciplina = filtroDisciplina === 'todas' || mensagem.disciplina === filtroDisciplina;
    const matchSerie = filtroSerie === 'todas' || mensagem.serie === filtroSerie;
    const matchStatus = filtroStatus === 'todas' || mensagem.status === filtroStatus;
    return matchBusca && matchDisciplina && matchSerie && matchStatus;
  });

  const estatisticas = {
    totalMensagens: mensagens.length,
    mensagensAbertas: mensagens.filter(m => m.status === 'aberta').length,
    mensagensUrgentes: mensagens.filter(m => m.prioridade === 'alta').length,
    mensagensHoje: mensagens.filter(m => {
      const hoje = new Date().toDateString();
      const dataMensagem = new Date(m.dataEnvio).toDateString();
      return hoje === dataMensagem;
    }).length
  };

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    const agora = new Date();
    const diff = agora.getTime() - data.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    
    if (horas < 1) {
      const minutos = Math.floor(diff / (1000 * 60));
      return `${minutos} min atrás`;
    } else if (horas < 24) {
      return `${horas} h atrás`;
    } else {
      return data.toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Fórum das Disciplinas</h1>
            <p className="text-sm text-gray-600">Monitorar discussões entre alunos e professores</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{estatisticas.totalMensagens}</div>
                <div className="text-sm text-gray-600">Total de Mensagens</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{estatisticas.mensagensAbertas}</div>
                <div className="text-sm text-gray-600">Mensagens Abertas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{estatisticas.mensagensUrgentes}</div>
                <div className="text-sm text-gray-600">Urgentes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{estatisticas.mensagensHoje}</div>
                <div className="text-sm text-gray-600">Mensagens Hoje</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar mensagens..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Disciplina</label>
                  <Select value={filtroDisciplina} onValueChange={setFiltroDisciplina}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="Matemática">Matemática</SelectItem>
                      <SelectItem value="Português">Português</SelectItem>
                      <SelectItem value="Física">Física</SelectItem>
                      <SelectItem value="História">História</SelectItem>
                      <SelectItem value="Biologia">Biologia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="1ª série">1ª série</SelectItem>
                      <SelectItem value="2ª série">2ª série</SelectItem>
                      <SelectItem value="3ª série">3ª série</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todos</SelectItem>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="respondida">Respondida</SelectItem>
                      <SelectItem value="fechada">Fechada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Mensagens */}
          <div className="space-y-4">
            {mensagensFiltradas.map((mensagem) => (
              <Card key={mensagem.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {mensagem.autor.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">{mensagem.titulo}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getTipoAutorColor(mensagem.tipoAutor)}>
                              {mensagem.tipoAutor === 'professor' ? 'Professor' : 'Aluno'}
                            </Badge>
                            <span className="text-sm text-gray-600">{mensagem.autor}</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {mensagem.disciplina} - {mensagem.serie} {mensagem.turma}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={getPrioridadeColor(mensagem.prioridade)}>
                            {mensagem.prioridade}
                          </Badge>
                          <Badge className={getStatusColor(mensagem.status)}>
                            {mensagem.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">{mensagem.conteudo}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatarData(mensagem.dataEnvio)}
                          </div>
                          {mensagem.respostas > 0 && (
                            <div className="flex items-center gap-1">
                              <Reply className="w-4 h-4" />
                              {mensagem.respostas} resposta{mensagem.respostas > 1 ? 's' : ''}
                            </div>
                          )}
                          {mensagem.ultimaResposta && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              Última: {formatarData(mensagem.ultimaResposta)}
                            </div>
                          )}
                        </div>
                        
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Discussão
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {mensagensFiltradas.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhuma mensagem encontrada</h3>
                <p className="text-gray-600">
                  Tente ajustar os filtros para encontrar as mensagens desejadas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}