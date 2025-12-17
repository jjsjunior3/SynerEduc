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
  onUpdate?: () => void; // ✅ Nova prop para atualizar o contador do pai
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
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);

      if (error) throw error;

      setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: true } : n)));
      if (onUpdate) onUpdate(); // ✅ Avisa o dashboard
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }

  async function marcarTodasComoLidas() {
    if (!usuario?.id) return;
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', usuario.id)
        .eq('lida', false);

      if (error) throw error;

      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      if (onUpdate) onUpdate(); // ✅ Avisa o dashboard
      toast.success("Todas as notificações marcadas como lidas");
    } catch (error) {
      console.error('Erro ao marcar todas:', error);
    }
  }

  async function excluirNotificacao(id: string) {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotificacoes(prev => prev.filter(n => n.id !== id));
      if (onUpdate) onUpdate(); // ✅ Avisa o dashboard
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case 'atividade': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'prazo': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'forum': return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'avaliacao': return <Award className="w-5 h-5 text-yellow-500" />;
      case 'nota': return <Award className="w-5 h-5 text-green-500" />;
      case 'sistema': return <Info className="w-5 h-5 text-gray-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const formatarData = (data: string) => {
    const date = new Date(data);
    const agora = new Date();
    const diff = agora.getTime() - date.getTime();
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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mt-16 animate-in slide-in-from-right border border-gray-200">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">Notificações</h3>
            {naoLidas > 0 && <Badge variant="destructive" className="ml-2">{naoLidas}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {naoLidas > 0 && (
              <Button variant="ghost" size="sm" onClick={marcarTodasComoLidas} className="text-xs h-8">
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
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : notificacoes.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Bell className="w-12 h-12 text-gray-200 mb-3" />
              <p className="font-medium">Nenhuma notificação</p>
              <p className="text-sm mt-1">Você está em dia!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((notif) => (
                <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notif.lida ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">{getIcone(notif.tipo)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium ${notif.lida ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notif.titulo}
                        </h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-gray-400 hover:text-red-500" onClick={() => excluirNotificacao(notif.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notif.descricao}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">{formatarData(notif.created_at)}</span>
                        {notif.acao_texto && notif.acao_link && (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600" onClick={() => { window.location.href = notif.acao_link!; marcarComoLida(notif.id); }}>
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
