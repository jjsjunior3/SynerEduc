// src/components/Notificacoes.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Bell, CheckCircle, Clock, MessageSquare, AlertCircle, Award, X, Info } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';

interface Notificacao {
  id: string;
  tipo: 'atividade' | 'prazo' | 'forum' | 'sistema' | 'avaliacao' | 'nota';
  titulo: string;
  descricao: string;
  created_at: string;
  lida: boolean;
  acao_texto?: string;
  acao_link?: string;
}

interface NotificacoesProps {
  onClose: () => void;
  onUpdate?: () => void;
}

export function Notificacoes({ onClose, onUpdate }: NotificacoesProps) {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarNotificacoes();
  }, [usuario?.id]);

  async function carregarNotificacoes() {
    if (!usuario?.id) return;
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', usuario.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotificacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  }

  async function marcarComoLida(id: string) {
    try {
      const { error } = await supabase
        .from('notificacoes').update({ lida: true }).eq('id', id);
      if (error) throw error;
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }

  async function marcarTodasComoLidas() {
    if (!usuario?.id) return;
    try {
      const { error } = await supabase
        .from('notificacoes').update({ lida: true })
        .eq('user_id', usuario.id).eq('lida', false);
      if (error) throw error;
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      if (onUpdate) onUpdate();
      toast.success("Todas as notificações marcadas como lidas");
    } catch (error) {
      console.error('Erro ao marcar todas:', error);
    }
  }

  async function excluirNotificacao(id: string) {
    try {
      const { error } = await supabase
        .from('notificacoes').delete().eq('id', id);
      if (error) throw error;
      setNotificacoes(prev => prev.filter(n => n.id !== id));
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case 'atividade': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'prazo':     return <Clock className="w-5 h-5 text-orange-500" />;
      case 'forum':     return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'avaliacao': return <Award className="w-5 h-5 text-yellow-500" />;
      case 'nota':      return <Award className="w-5 h-5 text-green-500" />;
      case 'sistema':   return <Info className="w-5 h-5 text-muted-foreground" />;
      default:          return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const formatarData = (data: string) => {
    const date = new Date(data);
    const diff = new Date().getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    if (minutos < 60) return `${minutos}m atrás`;
    if (horas < 24) return `${horas}h atrás`;
    if (dias < 7) return `${dias}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end p-4">
      <div className="bg-card rounded-lg shadow-2xl w-full max-w-md mt-16 animate-in slide-in-from-right border border-border">

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg text-foreground">Notificações</h3>
            {naoLidas > 0 && (
              <Badge variant="destructive" className="ml-2">{naoLidas}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {naoLidas > 0 && (
              <Button variant="ghost" size="sm" onClick={marcarTodasComoLidas} className="text-xs h-8 text-muted-foreground hover:text-foreground">
                Ler todas
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : notificacoes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-foreground">Nenhuma notificação</p>
              <p className="text-sm mt-1">Você está em dia!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notificacoes.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 transition-colors ${
                    !notif.lida
                      ? 'bg-blue-50/40 dark:bg-blue-900/20 hover:bg-blue-50/60 dark:hover:bg-blue-900/30'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">{getIcone(notif.tipo)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium ${notif.lida ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notif.titulo}
                        </h4>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                          onClick={() => excluirNotificacao(notif.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notif.descricao}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground/70">{formatarData(notif.created_at)}</span>
                        {notif.acao_texto && notif.acao_link && (
                          <Button
                            variant="link" size="sm"
                            className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
                            onClick={() => { window.location.href = notif.acao_link!; marcarComoLida(notif.id); }}
                          >
                            {notif.acao_texto}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}