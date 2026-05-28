import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { MessageSquare, Send, Plus, Reply, Clock, Loader2, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface ForumProfessorProps {
  disciplina: { id: string; nome: string };
  serie: { id: string; nome: string };
}

// Interfaces baseadas nas suas tabelas do Supabase
interface MensagemResposta {
  id: string;
  conteudo: string;
  criado_em: string;
  autor_id: string;
  autor?: { nome: string; tipo: string }; // Join com tabela users
}

interface MensagemForum {
  id: string;
  titulo: string;
  conteudo: string;
  criado_em: string;
  autor_id: string;
  resolvido: boolean;
  autor?: { nome: string; tipo: string }; // Join com tabela users
  respostas: MensagemResposta[]; // Join com tabela forum_respostas
}

export function ForumProfessor({ disciplina, serie }: ForumProfessorProps) {
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState<MensagemForum[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [respostaAberta, setRespostaAberta] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Estados para formulários
  const [novoTopico, setNovoTopico] = useState({ titulo: '', conteudo: '' });
  const [novaResposta, setNovaResposta] = useState('');
  const [enviando, setEnviando] = useState(false);

  // ========================================
  // BUSCAR TÓPICOS E RESPOSTAS
  // ========================================
  const carregarTopicos = useCallback(async () => {
    if (!disciplina?.id) return;

    setLoading(true);
    try {
      // Busca tópicos, autores e respostas aninhadas
      const { data, error } = await supabase
        .from('forum_topicos')
        .select(`
          *,
          autor:users!autor_id(nome, tipo),
          respostas:forum_respostas(
            *,
            autor:users!autor_id(nome, tipo)
          )
        `)
        .eq('disciplina_id', disciplina.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // Ordenar as respostas por data (mais antigas primeiro)
      const topicosFormatados = data?.map(topico => ({
        ...topico,
        respostas: topico.respostas?.sort((a: any, b: any) => 
          new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
        ) || []
      })) || [];

      setMensagens(topicosFormatados);
    } catch (error) {
      console.error('Erro ao carregar fórum:', error);
      toast.error('Erro ao carregar mensagens do fórum.');
    } finally {
      setLoading(false);
    }
  }, [disciplina.id]);

  useEffect(() => {
    carregarTopicos();
  }, [carregarTopicos]);

  // ========================================
  // CRIAR NOVO TÓPICO
  // ========================================
  const handleEnviarMensagem = async () => {
    if (!novoTopico.titulo || !novoTopico.conteudo) {
      toast.error('Preencha título e conteúdo.');
      return;
    }
    if (!usuario?.id) return;

    setEnviando(true);
    try {
      const { error } = await supabase
        .from('forum_topicos')
        .insert({
          titulo: novoTopico.titulo,
          conteudo: novoTopico.conteudo,
          disciplina_id: disciplina.id,
          autor_id: usuario.id,
          resolvido: false
        });

      if (error) throw error;

      toast.success('Tópico criado com sucesso!');
      setNovoTopico({ titulo: '', conteudo: '' });
      setModalAberto(false);
      carregarTopicos(); // Recarrega a lista
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  // ========================================
  // ENVIAR RESPOSTA
  // ========================================
  const handleEnviarResposta = async (topicoId: string) => {
    if (!novaResposta) {
      toast.error('Digite uma resposta.');
      return;
    }
    if (!usuario?.id) return;

    setEnviando(true);
    try {
      const { error } = await supabase
        .from('forum_respostas')
        .insert({
          topico_id: topicoId,
          conteudo: novaResposta,
          autor_id: usuario.id,
          eh_solucao: false
        });

      if (error) throw error;

      toast.success('Resposta enviada!');
      setNovaResposta('');
      setRespostaAberta(null);
      carregarTopicos(); // Recarrega para mostrar a nova resposta
    } catch (error) {
      console.error('Erro ao responder:', error);
      toast.error('Erro ao enviar resposta.');
    } finally {
      setEnviando(false);
    }
  };

  // ========================================
  // EXCLUIR TÓPICO (Apenas Professor/Admin)
  // ========================================
  const handleExcluirTopico = (id: string) => {
    setConfirmId(id);
  };

  // ========================================
  // HELPERS
  // ========================================
  const formatarData = (dataStr: string) => {
    if (!dataStr) return '';
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
      return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  };

  const getTipoAutorColor = (tipo?: string) => {
    return tipo === 'professor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  const getIniciais = (nome?: string) => {
    return nome ? nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fórum da Disciplina</h2>
          <p className="text-sm text-gray-500">{disciplina.nome} - {serie.nome}</p>
        </div>

        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Discussão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Tópico</DialogTitle>
              <DialogDescription>
                Inicie uma discussão com a turma sobre a matéria.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={novoTopico.titulo}
                  onChange={(e) => setNovoTopico(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Dúvida sobre a aula de ontem"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo</Label>
                <Textarea
                  id="conteudo"
                  value={novoTopico.conteudo}
                  onChange={(e) => setNovoTopico(prev => ({ ...prev, conteudo: e.target.value }))}
                  placeholder="Digite sua mensagem..."
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEnviarMensagem} disabled={enviando}>
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Publicar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : mensagens.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhuma mensagem no fórum</h3>
            <p className="text-gray-600 mb-4">
              Seja o primeiro a iniciar uma discussão sobre esta disciplina.
            </p>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Tópico
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {mensagens.map((mensagem) => (
            <Card key={mensagem.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10 border">
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      {getIniciais(mensagem.autor?.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">{mensagem.titulo}</h3>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={getTipoAutorColor(mensagem.autor?.tipo)}>
                            {mensagem.autor?.tipo === 'professor' ? 'Professor' : 'Aluno'}
                          </Badge>
                          <span className="text-sm font-medium text-gray-700">{mensagem.autor?.nome || 'Usuário Desconhecido'}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatarData(mensagem.criado_em)}
                          </div>
                        </div>
                      </div>

                      {/* Botão de excluir para o dono ou professor */}
                      {(usuario?.id === mensagem.autor_id || usuario?.tipo === 'professor') && (
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500" onClick={() => handleExcluirTopico(mensagem.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="text-gray-700 mb-4 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-3 rounded-md border border-gray-100">
                      {mensagem.conteudo}
                    </div>

                    {/* Lista de Respostas */}
                    {mensagem.respostas && mensagem.respostas.length > 0 && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Respostas</h4>
                        {mensagem.respostas.map((resposta) => (
                          <div key={resposta.id} className="flex items-start gap-3 bg-white">
                            <Avatar className="w-8 h-8 mt-1">
                              <AvatarFallback className="text-xs">
                                {getIniciais(resposta.autor?.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-900">{resposta.autor?.nome || 'Desconhecido'}</span>
                                  <Badge className={`${getTipoAutorColor(resposta.autor?.tipo)} text-[10px] px-1 py-0 h-5`}>
                                    {resposta.autor?.tipo === 'professor' ? 'Prof.' : 'Aluno'}
                                  </Badge>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {formatarData(resposta.criado_em)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{resposta.conteudo}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Campo de resposta */}
                    {respostaAberta === mensagem.id ? (
                      <div className="mt-4 pl-0 md:pl-11 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-3">
                          <Textarea
                            value={novaResposta}
                            onChange={(e) => setNovaResposta(e.target.value)}
                            placeholder="Escreva sua resposta..."
                            rows={3}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEnviarResposta(mensagem.id)}
                              disabled={enviando}
                            >
                              {enviando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                              Responder
                            </Button>
                            <Button
                              variant="ghost"
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
                      </div>
                    ) : (
                      <div className="mt-3 pl-0 md:pl-11">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRespostaAberta(mensagem.id)}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <Reply className="w-4 h-4 mr-1" />
                          Responder
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este tópico?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">
            As respostas também serão removidas. Esta ação não pode ser desfeita.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmId) return;
                try {
                  const { error } = await supabase.from('forum_topicos').delete().eq('id', confirmId);
                  if (error) throw error;
                  toast.success('Tópico excluído.');
                  carregarTopicos();
                } catch (error) {
                  console.error('Erro ao excluir:', error);
                  toast.error('Erro ao excluir tópico.');
                }
                setConfirmId(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
