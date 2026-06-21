// src/components/NotificacaoBalloon.tsx
// Balão flutuante de notificação — aparece ao logar (pendentes) e em tempo real (nova mensagem)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Bell, X, ChevronRight, UserX, BookOpen, Award, AlertCircle, Info } from 'lucide-react'

interface NotifResumo {
  id:        string
  titulo:    string
  descricao: string
  tipo:      string
  created_at: string
}

function getIconeTipo(tipo: string) {
  switch (tipo) {
    case 'falta':      return <UserX  className="w-5 h-5 text-red-500 shrink-0" />
    case 'plano_aula': return <BookOpen className="w-5 h-5 text-indigo-500 shrink-0" />
    case 'avaliacao':
    case 'nota':       return <Award  className="w-5 h-5 text-yellow-500 shrink-0" />
    case 'sistema':    return <Info   className="w-5 h-5 text-blue-400 shrink-0" />
    default:           return <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
  }
}

interface Props {
  onAbrirNotificacoes: () => void
}

export function NotificacaoBalloon({ onAbrirNotificacoes }: Props) {
  const { usuario } = useAuth()

  const [visivel,       setVisivel]       = useState(false)
  const [totalNaoLidas, setTotalNaoLidas] = useState(0)
  const [notifDestaque, setNotifDestaque] = useState<NotifResumo | null>(null)
  const [modo,          setModo]          = useState<'login' | 'nova'>('login')
  const [fechando,      setFechando]      = useState(false)

  const fechar = useCallback(() => {
    setFechando(true)
    setTimeout(() => { setVisivel(false); setFechando(false) }, 300)
  }, [])

  // Ao logar — carrega pendentes e mostra balão se houver (uma vez por sessão)
  useEffect(() => {
    if (!usuario?.id) return
    if (sessionStorage.getItem(`balloon-shown-${usuario.id}`)) return

    async function verificarPendentes() {
      const { count } = await supabase
        .from('notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', usuario!.id)
        .eq('lida', false)

      if (!count || count === 0) return
      sessionStorage.setItem(`balloon-shown-${usuario!.id}`, '1')

      // Pega a mais recente não lida
      const { data } = await supabase
        .from('notificacoes')
        .select('id, titulo, descricao, tipo, created_at')
        .eq('user_id', usuario!.id)
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setTotalNaoLidas(count)
      setNotifDestaque(data ?? null)
      setModo('login')
      setVisivel(true)

      // Fecha automaticamente após 8s
      setTimeout(fechar, 8000)
    }

    // Pequeno delay para não brigar com o carregamento da tela
    const t = setTimeout(verificarPendentes, 1200)
    return () => clearTimeout(t)
  }, [usuario?.id, fechar])

  // Realtime — nova notificação chega
  useEffect(() => {
    if (!usuario?.id) return

    const channel = supabase
      .channel(`balloon-${usuario.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notificacoes',
        filter: `user_id=eq.${usuario.id}`,
      }, (payload) => {
        const nova = payload.new as NotifResumo
        setNotifDestaque(nova)
        setTotalNaoLidas(c => c + 1)
        setModo('nova')
        setVisivel(true)
        setFechando(false)
        // Fecha após 7s
        setTimeout(fechar, 7000)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [usuario?.id, fechar])

  if (!visivel) return null

  return (
    <div
      className={`fixed top-16 right-4 z-[9999] transition-all duration-300 ${
        fechando ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
    >
      {/* Balão */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-200 dark:border-blue-700 w-[340px] max-w-[90vw] overflow-hidden">

        {/* Barra colorida no topo */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Conteúdo */}
        <div className="px-4 py-3.5">
          <div className="flex items-start gap-3">
            {/* Ícone sino com badge */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              {totalNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
                </span>
              )}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">
                {modo === 'nova'
                  ? '🔔 Nova notificação!'
                  : totalNaoLidas === 1
                    ? '📬 Você tem 1 mensagem não lida'
                    : `📬 Você tem ${totalNaoLidas} mensagens não lidas`
                }
              </p>

              {notifDestaque && (
                <div className="mt-2 flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                  {getIconeTipo(notifDestaque.tipo)}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {notifDestaque.titulo}
                    </p>
                    {notifDestaque.descricao && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {notifDestaque.descricao}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {totalNaoLidas > 1 && modo === 'login' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  + {totalNaoLidas - 1} outra{totalNaoLidas - 1 > 1 ? 's' : ''} mensage{totalNaoLidas - 1 > 1 ? 'ns' : 'm'}
                </p>
              )}
            </div>

            {/* Fechar */}
            <button
              onClick={fechar}
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Ver mensagens */}
          <button
            onClick={() => { fechar(); onAbrirNotificacoes() }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Ver mensagens
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Ponteiro do balão (em cima, alinhado com o sino à direita) */}
        <div className="absolute -top-2.5 right-3 w-5 h-5 bg-white dark:bg-gray-900 border-t-2 border-l-2 border-blue-200 dark:border-blue-700 rotate-45" />
      </div>
    </div>
  )
}
