// src/components/Notificacoes.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  Bell, CheckCircle, Clock, MessageSquare, AlertCircle,
  Award, X, Info, UserX, BookOpen,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';

type TipoNotif = 'atividade' | 'prazo' | 'forum' | 'sistema' | 'avaliacao' | 'nota' | 'falta' | 'plano_aula';

interface Notificacao {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  descricao: string;
  created_at: string;
  lida: boolean;
  acao_texto?: string;
  acao_link?: string;
}

interface NotificacoesProps {
  onClose: () => void;
  onCountChange?: (count: number) => void;
  onNavegar?: (link: string) => void;
}

function getIcone(tipo: string) {
  switch (tipo) {
    case 'atividade':  return <CheckCircle className="w-5 h-5 text-blue-500" />;
    case 'prazo':      return <Clock className="w-5 h-5 text-orange-500" />;
    case 'forum':      return <MessageSquare className="w-5 h-5 text-purple-500" />;
    case 'avaliacao':  return <Award className="w-5 h-5 text-yellow-500" />;
    case 'nota':       return <Award className="w-5 h-5 text-green-500" />;
    case 'falta':      return <UserX className="w-5 h-5 text-red-500" />;
    case 'plano_aula': return <BookOpen className="w-5 h-5 text-indigo-500" />;
    case 'sistema':    return <Info className="w-5 h-5 text-muted-foreground" />;
    default:           return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
  }
}

function formatarData(data: string) {
  const date = new Date(data);
  const diff  = Date.now() - date.getTime();
  const min   = Math.floor(diff / 60000);
  const h     = Math.floor(min / 60);
  const d     = Math.floor(h / 24);
  if (min < 1)  return 'Agora';
  if (min < 60) return `${min}min atrás`;
  if (h < 24)   return `${h}h atrás`;
  if (d < 7)    return `${d}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

export function Notificacoes({ onClose, onCountChange, onNavegar }: NotificacoesProps) {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading]           = useState(true);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  // Informa o pai sempre que a contagem mudar
  useEffect(() => { onCountChange?.(naoLidas); }, [naoLidas, onCountChange]);

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(60);
    setNotificacoes(data ?? []);
    setLoading(false);
  }, [usuario?.id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Realtime — novas notificações aparecem instantaneamente
  useEffect(() => {
    if (!usuario?.id) return;
    const channel = supabase
      .channel(`notif-user-${usuario.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notificacoes',
        filter: `user_id=eq.${usuario.id}`,
      }, (payload) => {
        const nova = payload.new as Notificacao;
        setNotificacoes(prev => [nova, ...prev]);
        toast.info(nova.titulo, { description: nova.descricao });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notificacoes',
        filter: `user_id=eq.${usuario.id}`,
      }, (payload) => {
        const upd = payload.new as Notificacao;
        setNotificacoes(prev => prev.map(n => n.id === upd.id ? { ...n, ...upd } : n));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [usuario?.id]);

  async function marcarComoLida(id: string) {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  }

  async function marcarTodasLidas() {
    if (!usuario?.id) return;
    await supabase.from('notificacoes').update({ lida: true }).eq('user_id', usuario.id).eq('lida', false);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    toast.success('Todas as notificações marcadas como lidas');
  }

  async function excluir(id: string) {
    await supabase.from('notificacoes').delete().eq('id', id);
    setNotificacoes(prev => prev.filter(n => n.id !== id));
  }

  return (
    <>
      {/* Backdrop invisível para fechar ao clicar fora */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-2 z-50 bg-card rounded-xl shadow-2xl w-80 border border-border animate-in slide-in-from-top-2 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">Notificações</h3>
            {naoLidas > 0 && (
              <span className="bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {naoLidas}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {naoLidas > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={marcarTodasLidas}>
                Ler todas
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[480px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Carregando…</div>
          ) : notificacoes.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="font-medium text-foreground">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notificacoes.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => !notif.lida && marcarComoLida(notif.id)}
                  className={`px-4 py-3 transition-colors cursor-pointer group ${
                    !notif.lida
                      ? 'bg-blue-50/50 dark:bg-blue-900/15 hover:bg-blue-50 dark:hover:bg-blue-900/25'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Ícone + indicador não lida */}
                    <div className="relative shrink-0 mt-0.5">
                      {getIcone(notif.tipo)}
                      {!notif.lida && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm font-medium leading-snug ${notif.lida ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notif.titulo}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); excluir(notif.id); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {notif.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.descricao}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-muted-foreground/60">{formatarData(notif.created_at)}</span>
                        {notif.acao_texto && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              marcarComoLida(notif.id);
                              if (notif.acao_link) {
                                if (onNavegar) { onClose(); onNavegar(notif.acao_link); }
                                else window.open(notif.acao_link, '_blank');
                              }
                            }}
                            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {notif.acao_texto} →
                          </button>
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
    </>
  );
}

// Hook para usar em qualquer dashboard
export function useNotificacoesCount() {
  const { usuario } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!usuario?.id) return;

    // Carrega contagem inicial
    supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', usuario.id)
      .eq('lida', false)
      .then(({ count: c }) => setCount(c ?? 0));

    // Realtime
    const channel = supabase
      .channel(`notif-count-${usuario.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notificacoes',
        filter: `user_id=eq.${usuario.id}`,
      }, () => setCount(c => c + 1))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notificacoes',
        filter: `user_id=eq.${usuario.id}`,
      }, (payload) => {
        if ((payload.new as any).lida === true && !(payload.old as any).lida) {
          setCount(c => Math.max(0, c - 1));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [usuario?.id]);

  return { count, setCount };
}
