import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { MessageSquare, Send, Plus, Reply, Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

interface ForumProfessorProps {
  disciplina: any;
  serie: any;
}

interface MensagemForum {
  id: string;
  autor: string;
  tipoAutor: 'aluno' | 'professor';
  titulo: string;
  conteudo: string;
  dataEnvio: string;
  respostas: MensagemResposta[];
}

interface MensagemResposta {
  id: string;
  autor: string;
  tipoAutor: 'aluno' | 'professor';
  conteudo: string;
  dataEnvio: string;
}

export function ForumProfessor({ disciplina, serie }: ForumProfessorProps) {
  const [mensagens, setMensagens] = useState<MensagemForum[]>([
    {
      id: '1',
      autor: 'Maria Silva',
      tipoAutor: 'aluno',
      titulo: 'Dúvida sobre a matéria de hoje',
      conteudo: 'Professor, não consegui entender a explicação sobre o último tópico. Poderia explicar novamente?',
      dataEnvio: '2025-01-10T14:30:00',
      respostas: [
        {
          id: '1-1',
          autor: 'Prof. Carlos Santos',
          tipoAutor: 'professor',
          conteudo: 'Claro, Maria! Vou explicar novamente na próxima aula. Também vou disponibilizar material extra.',
          dataEnvio: '2025-01-10T15:45:00'
        }
      ]
    },
    {
      id: '2',
      autor: 'João Pedro',
      tipoAutor: 'aluno',
      titulo: 'Exercícios para praticar',
      conteudo: 'Professor, tem alguma lista de exercícios extras para praticar o que vimos hoje?',
      dataEnvio: '2025-01-11T09:15:00',
      respostas: []
    }
  ]);

  const [modalAberto, setModalAberto] = useState(false);
  const [respostaAberta, setRespostaAberta] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState({
    titulo: '',
    conteudo: ''
  });
  const [novaResposta, setNovaResposta] = useState('');

  const handleEnviarMensagem = () => {
    if (!novaMensagem.titulo || !novaMensagem.conteudo) {
      toast.error('Preencha todos os campos');
      return;
    }

    const mensagem: MensagemForum = {
      id: Date.now().toString(),
      autor: 'Prof. Carlos Santos',
      tipoAutor: 'professor',
      titulo: novaMensagem.titulo,
      conteudo: novaMensagem.conteudo,
      dataEnvio: new Date().toISOString(),
      respostas: []
    };

    setMensagens(prev => [mensagem, ...prev]);
    setNovaMensagem({ titulo: '', conteudo: '' });
    setModalAberto(false);
    toast.success('Mensagem enviada com sucesso!');
  };

  const handleEnviarResposta = (mensagemId: string) => {
    if (!novaResposta) {
      toast.error('Digite uma resposta');
      return;
    }

    const resposta: MensagemResposta = {
      id: `${mensagemId}-${Date.now()}`,
      autor: 'Prof. Carlos Santos',
      tipoAutor: 'professor',
      conteudo: novaResposta,
      dataEnvio: new Date().toISOString()
    };

    setMensagens(prev => prev.map(msg => 
      msg.id === mensagemId 
        ? { ...msg, respostas: [...msg.respostas, resposta] }
        : msg
    ));

    setNovaResposta('');
    setRespostaAberta(null);
    toast.success('Resposta enviada com sucesso!');
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

  const getTipoAutorColor = (tipo: string) => {
    return tipo === 'professor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Fórum da Disciplina</h2>
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enviar Nova Mensagem</DialogTitle>
              <DialogDescription>
                Crie uma nova discussão no fórum da disciplina para seus alunos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={novaMensagem.titulo}
                  onChange={(e) => setNovaMensagem(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Título da mensagem"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo</Label>
                <Textarea
                  id="conteudo"
                  value={novaMensagem.conteudo}
                  onChange={(e) => setNovaMensagem(prev => ({ ...prev, conteudo: e.target.value }))}
                  placeholder="Digite sua mensagem..."
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEnviarMensagem}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {mensagens.map((mensagem) => (
          <Card key={mensagem.id}>
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
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {formatarData(mensagem.dataEnvio)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{mensagem.conteudo}</p>
                  
                  {/* Respostas */}
                  {mensagem.respostas.length > 0 && (
                    <div className="border-l-2 border-gray-200 pl-4 ml-6 space-y-3">
                      {mensagem.respostas.map((resposta) => (
                        <div key={resposta.id} className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {resposta.autor.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getTipoAutorColor(resposta.tipoAutor)} size="sm">
                                {resposta.tipoAutor === 'professor' ? 'Professor' : 'Aluno'}
                              </Badge>
                              <span className="text-sm text-gray-600">{resposta.autor}</span>
                              <span className="text-sm text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {formatarData(resposta.dataEnvio)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{resposta.conteudo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Campo de resposta */}
                  {respostaAberta === mensagem.id ? (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        value={novaResposta}
                        onChange={(e) => setNovaResposta(e.target.value)}
                        placeholder="Digite sua resposta..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleEnviarResposta(mensagem.id)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Responder
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setRespostaAberta(null);
                            setNovaResposta('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setRespostaAberta(mensagem.id)}
                      className="mt-4"
                    >
                      <Reply className="w-4 h-4 mr-1" />
                      Responder
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mensagens.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhuma mensagem no fórum</h3>
            <p className="text-gray-600 mb-4">
              Seja o primeiro a iniciar uma discussão sobre esta disciplina.
            </p>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Enviar Primeira Mensagem
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}