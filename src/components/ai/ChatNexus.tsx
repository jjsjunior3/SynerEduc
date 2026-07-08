// src/components/ai/ChatNexus.tsx
// NEXUS — Assistente técnico do Admin Geral: status do sistema, consumo de IA, logs de segurança

import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Send, X, Minimize2, Maximize2, Loader2, Cpu } from 'lucide-react'
import { supabase } from '../../supabase/supabaseClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

// ─── Avatar NEXUS ─────────────────────────────────────────────────────────────

function AvatarNexus({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#0891B2" />
      <rect x="12" y="12" width="16" height="16" rx="3" fill="#083344" />
      <rect x="16" y="16" width="8" height="8" rx="1.5" fill="#22D3EE" />
      <line x1="20" y1="6"  x2="20" y2="12" stroke="#083344" strokeWidth="1.5" />
      <line x1="20" y1="28" x2="20" y2="34" stroke="#083344" strokeWidth="1.5" />
      <line x1="6"  y1="20" x2="12" y2="20" stroke="#083344" strokeWidth="1.5" />
      <line x1="28" y1="20" x2="34" y2="20" stroke="#083344" strokeWidth="1.5" />
    </svg>
  )
}

// ─── Sugestões ────────────────────────────────────────────────────────────────

const SUGESTOES = [
  'Como está o status geral do sistema agora?',
  'Qual o consumo de IA dos últimos 7 dias?',
  'Houve alguma tentativa de violação de prompt recentemente?',
  'Quantos usuários estão online agora?',
]

// ─── Componente ───────────────────────────────────────────────────────────────

export function ChatNexus() {
  const [aberto,     setAberto]     = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [mensagens,  setMensagens]  = useState<Mensagem[]>([])
  const [input,      setInput]      = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      setMensagens([{
        role: 'assistant',
        content: 'Olá! Sou o **NEXUS**, assistente técnico do painel de administração.\n\nPosso consultar status do sistema, consumo de IA por agente e sinais de segurança em tempo real. O que você precisa?',
      }])
    }
  }, [aberto])

  const enviar = async (texto: string) => {
    if (!texto.trim() || carregando) return

    const novasMensagens: Mensagem[] = [...mensagens, { role: 'user', content: texto }]
    setMensagens(novasMensagens)
    setInput('')
    setCarregando(true)

    try {
      const historico = novasMensagens.map(m => ({ role: m.role, content: m.content }))

      const { data, error } = await supabase.functions.invoke('agente-nexus', {
        body: { mensagens: historico },
      })

      if (error) throw new Error(error.message)

      setMensagens(prev => [...prev, { role: 'assistant', content: data.resposta ?? 'Não consegui obter uma resposta.' }])
    } catch {
      setMensagens(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, tive um problema ao consultar os dados. Pode tentar novamente?',
      }])
    } finally {
      setCarregando(false)
    }
  }

  // ── Renderiza markdown simples do chat ────────────────────────────────────
  const renderTexto = (texto: string) => {
    const linhas = texto.split('\n')
    const elementos: React.ReactNode[] = []
    let listaItems: React.ReactNode[] = []

    const inline = (linha: string, key: number) =>
      linha.split(/(\*\*[^*]+\*\*)/).map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        return p
      })

    const flushLista = () => {
      if (listaItems.length) {
        elementos.push(<ul key={`ul-${elementos.length}`} className="list-disc pl-4 space-y-0.5 my-1 text-sm">{listaItems}</ul>)
        listaItems = []
      }
    }

    linhas.forEach((linha, i) => {
      const t = linha.trim()
      if (/^[-•]\s/.test(t)) { listaItems.push(<li key={i}>{inline(t.slice(2), i)}</li>); return }
      if (t === '')          { flushLista(); elementos.push(<div key={i} className="h-1.5" />); return }
      flushLista()
      elementos.push(<p key={i} className="leading-relaxed text-sm">{inline(t, i)}</p>)
    })

    flushLista()
    return <span className="space-y-0.5 block">{elementos}</span>
  }

  // ── Botão flutuante ─────────────────────────────────────────────────────────
  if (!aberto) {
    return ReactDOM.createPortal(
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-5 left-5 z-[9999] flex items-center gap-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-full shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 transition-all duration-300 hover:scale-105 sm:pr-4 sm:pl-1 sm:py-1 p-1"
        aria-label="Abrir assistente NEXUS"
      >
        <div className="rounded-full bg-white p-0.5">
          <AvatarNexus size={40} />
        </div>
        <div className="hidden sm:flex flex-col items-start leading-tight pr-1">
          <span className="text-xs font-semibold opacity-80">Admin Geral</span>
          <span className="text-sm font-bold flex items-center gap-1.5">
            NEXUS
            <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
          </span>
        </div>
      </button>,
      document.body,
    )
  }

  // ── Chat aberto ─────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div className={`fixed bottom-5 left-5 z-[9999] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 transition-all duration-300 ${minimizado ? 'h-16' : 'h-[520px]'} w-[calc(100vw-2.5rem)] max-w-[380px]`}>

      <div className="bg-cyan-700 px-4 py-3 rounded-t-2xl flex items-center gap-3 shrink-0">
        <div className="rounded-full bg-white p-0.5 shrink-0">
          <AvatarNexus size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight flex items-center gap-1.5">
            NEXUS
            <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
          </p>
          <p className="text-white/70 text-xs">Admin Geral · dados ao vivo</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMinimizado(m => !m)} className="text-white/70 hover:text-white p-1 rounded transition-colors" aria-label="Minimizar">
            {minimizado ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => { setAberto(false); setMensagens([]) }} className="text-white/70 hover:text-white p-1 rounded transition-colors" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimizado && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">

            {mensagens.filter(m => m.role === 'user').length === 0 && (
              <div className="space-y-2 pt-1">
                {mensagens.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full shrink-0 bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <Cpu size={12} className="text-cyan-700 dark:text-cyan-400" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 dark:text-gray-100 max-w-[88%]">
                      {renderTexto(m.content)}
                    </div>
                  </div>
                ))}
                <div className="pt-1 space-y-1.5">
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-1">Sugestões:</p>
                  {SUGESTOES.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => enviar(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl border transition-colors bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-800/30 border-cyan-200 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensagens.filter(m => m.role === 'user').length > 0 && mensagens.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full shrink-0 bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mt-1">
                    <Cpu size={12} className="text-cyan-700 dark:text-cyan-400" />
                  </div>
                )}
                <div className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-cyan-700 text-white rounded-tr-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                }`}>
                  {m.role === 'assistant' ? renderTexto(m.content) : <p>{m.content}</p>}
                </div>
              </div>
            ))}

            {carregando && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full shrink-0 bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Cpu size={12} className="text-cyan-700 dark:text-cyan-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-gray-500" />
                  <span className="text-xs text-gray-500">Consultando sistema...</span>
                </div>
              </div>
            )}

            <div ref={fimRef} />
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); enviar(input) }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunte sobre o sistema..."
                disabled={carregando}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:focus:ring-cyan-700 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || carregando}
                className="p-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
