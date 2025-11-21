import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Bell, 
  Check, 
  X, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  AlertTriangle,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Notificacao {
  id: string;
  tipo: 'atividade' | 'prazo' | 'forum' | 'sistema' | 'avaliacao';
  titulo: string;
  descricao: string;
  data: string;
  lida: boolean;
  acao?: {
    texto: string;
    link: string;
  };
}

interface NotificacoesProps {
  onClose: () => void;
}

export function Notificacoes({ onClose }: NotificacoesProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([
    {
      id: '1',
      tipo: 'prazo',
      titulo: 'Entrega Próxima',
      descricao: 'O trabalho em grupo de Matemática deve ser entregue até amanhã.',
      data: '2025-01-10T14:30:00Z',
      lida: false,
      acao: {
        texto: 'Ver Atividade',
        link: '/atividade/1'
      }
    },
    {
      id: '2',
      tipo: 'forum',
      titulo: 'Nova Resposta',
      descricao: 'Prof. João Santos respondeu sua pergunta sobre "Conceitos Fundamentais".',
      data: '2025-01-10T10:15:00Z',
      lida: false,
      acao: {
        texto: 'Ver Resposta',
        link: '/forum/pergunta/1'
      }
    },
    {
      id: '3',
      tipo: 'atividade',
      titulo: 'Nova Atividade Disponível',
      descricao: 'Lista de Exercícios 3 foi publicada na disciplina de Química.',
      data: '2025-01-09T16:45:00Z',
      lida: true,
      acao: {
        texto: 'Acessar',
        link: '/disciplina/quimica'
      }
    },
    {
      id: '4',
      tipo: 'avaliacao',
      titulo: 'Resultado da Prova',
      descricao: 'As notas da prova de História já estão disponíveis.',
      data: '2025-01-09T09:00:00Z',
      lida: true,
      acao: {
        texto: 'Ver Notas',
        link: '/boletim'
      }
    },
    {
      id: '5',
      tipo: 'sistema',
      titulo: 'Manutenção Programada',
      descricao: 'O sistema ficará offline para manutenção no sábado das 2h às 4h.',
      data: '2025-01-08T12:00:00Z',
      lida: true
    },
    {
      id: '6',
      tipo: 'forum',
      titulo: 'Nova Pergunta',
      descricao: 'Ana Silva fez uma pergunta na disciplina de Biologia.',
      data: '2025-01-08T08:30:00Z',
      lida: true,
      acao: {
        texto: 'Ver Pergunta',
        link: '/forum/pergunta/2'
      }
    }
  ]);

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case 'atividade':
        return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'prazo':
        return <Clock className="w-5 h-5 text-red-500" />;
      case 'forum':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'avaliacao':
        return <CheckCircle className="w-5 h-5 text-purple-500" />;
      case 'sistema':
        return <Info className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCorFundo = (tipo: string, lida: boolean) => {
    if (lida) return 'bg-white';
    
    switch (tipo) {
      case 'prazo':
        return 'bg-red-50';
      case 'atividade':
        return 'bg-blue-50';
      case 'forum':
        return 'bg-green-50';
      case 'avaliacao':
        return 'bg-purple-50';
      case 'sistema':
        return 'bg-orange-50';
      default:
        return 'bg-gray-50';
    }
  };

  const marcarComoLida = (id: string) => {
    setNotificacoes(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, lida: true } : notif
      )
    );
  };

  const removerNotificacao = (id: string) => {
    setNotificacoes(prev => prev.filter(notif => notif.id !== id));
  };

  const marcarTodasComoLidas = () => {
    setNotificacoes(prev => 
      prev.map(notif => ({ ...notif, lida: true }))
    );
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const formatarData = (data: string) => {
    const date = new Date(data);
    const agora = new Date();
    const diff = agora.getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (minutos < 60) {
      return `${minutos}m atrás`;
    } else if (horas < 24) {
      return `${horas}h atrás`;
    } else if (dias < 7) {
      return `${dias}d atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  return (
    <Card className="w-96 max-h-96">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Notificações</CardTitle>
            {naoLidas > 0 && (
              <Badge variant="destructive" className="rounded-full px-2 py-1 text-xs">
                {naoLidas}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {naoLidas > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={marcarTodasComoLidas}
                className="text-xs"
              >
                Marcar todas como lidas
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          {notificacoes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma notificação</p>
              <p className="text-sm">Você está em dia!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notificacoes.map((notificacao, index) => (
                <div key={notificacao.id}>
                  <div 
                    className={`p-4 hover:bg-gray-50 transition-colors ${getCorFundo(notificacao.tipo, notificacao.lida)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcone(notificacao.tipo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm ${notificacao.lida ? 'font-medium' : 'font-semibold'} text-gray-900`}>
                                {notificacao.titulo}
                              </h4>
                              {!notificacao.lida && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notificacao.descricao}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatarData(notificacao.data)}
                            </p>
                            
                            {notificacao.acao && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto mt-2 text-blue-600"
                              >
                                {notificacao.acao.texto}
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notificacao.lida && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => marcarComoLida(notificacao.id)}
                                className="p-1 h-auto"
                                title="Marcar como lida"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerNotificacao(notificacao.id)}
                              className="p-1 h-auto"
                              title="Remover notificação"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < notificacoes.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}