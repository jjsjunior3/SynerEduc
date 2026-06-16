// src/components/ai/ChatGabriela.tsx
// Gabriela — Assistente Administrativa com Tool Use + dados ao vivo do Supabase
// Contextos: secretaria | gestor | financeiro (cada um tem ferramentas exclusivas)

import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Send, X, Minimize2, Maximize2, Loader2, Bot } from 'lucide-react'
import { supabase } from '../../supabase/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Contexto = 'secretaria' | 'gestor' | 'financeiro'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  contexto: Contexto
}

// ─── Avatar Gabriela ──────────────────────────────────────────────────────────

function AvatarGabriela({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#4F46E5" />
      {/* rosto */}
      <circle cx="20" cy="16" r="7" fill="#FDE68A" />
      {/* cabelo */}
      <path d="M13 14 Q14 8 20 8 Q26 8 27 14" fill="#92400E" />
      <path d="M13 14 Q11 18 13 22" fill="#92400E" stroke="#92400E" strokeWidth="1" />
      <path d="M27 14 Q29 18 27 22" fill="#92400E" stroke="#92400E" strokeWidth="1" />
      {/* corpo */}
      <path d="M12 32 Q14 25 20 24 Q26 25 28 32" fill="#4F46E5" />
      {/* colarinho */}
      <path d="M18 24 L20 27 L22 24" fill="white" opacity="0.8" />
      {/* olhos */}
      <circle cx="17.5" cy="15.5" r="1" fill="#1E1B4B" />
      <circle cx="22.5" cy="15.5" r="1" fill="#1E1B4B" />
      {/* sorriso */}
      <path d="M17.5 18.5 Q20 20.5 22.5 18.5" stroke="#92400E" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// ─── Sugestões por contexto ───────────────────────────────────────────────────

const SUGESTOES: Record<Contexto, string[]> = {
  secretaria: [
    'Quantos alunos estão matriculados?',
    'Quais alunos têm documentação pendente?',
    'Mostre as matrículas dos últimos 30 dias',
    'Quantos alunos há por turma?',
  ],
  gestor: [
    'Quais são as pendências da secretaria?',
    'Quantos alunos e professores temos ativos?',
    'Quantos alunos estão sem ficha ou contrato?',
    'Como está o financeiro deste mês?',
  ],
  financeiro: [
    'Quem está inadimplente este mês?',
    'Qual o resumo financeiro do mês?',
    'Quanto foi recebido até agora?',
    'Consultar pagamentos de um aluno',
  ],
}

const COR: Record<Contexto, { bg: string; hover: string; botao: string; sombra: string }> = {
  secretaria: {
    bg:     'bg-indigo-600',
    hover:  'hover:bg-indigo-700',
    botao:  'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-800/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300',
    sombra: 'shadow-indigo-200 dark:shadow-indigo-900/40',
  },
  gestor: {
    bg:     'bg-violet-600',
    hover:  'hover:bg-violet-700',
    botao:  'bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-800/30 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300',
    sombra: 'shadow-violet-200 dark:shadow-violet-900/40',
  },
  financeiro: {
    bg:     'bg-emerald-700',
    hover:  'hover:bg-emerald-800',
    botao:  'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-800/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
    sombra: 'shadow-emerald-200 dark:shadow-emerald-900/40',
  },
}

const LABEL_CONTEXTO: Record<Contexto, string> = {
  secretaria: 'Secretaria',
  gestor:     'Gestão Escolar',
  financeiro: 'Financeiro',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ChatGabriela({ contexto }: Props) {
  const { usuario } = useAuth()
  const segmento = usuario?.segmento ?? null

  const [aberto,     setAberto]     = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [mensagens,  setMensagens]  = useState<Mensagem[]>([])
  const [input,      setInput]      = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const cor    = COR[contexto]

  // Scroll automático ao final
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  // Mensagem de boas-vindas ao abrir
  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      setMensagens([{
        role: 'assistant',
        content: `Olá! 👋 Sou a **Gabriela**, sua assistente de ${LABEL_CONTEXTO[contexto]}.\n\nPosso consultar os dados do sistema em tempo real. O que você precisa saber?`,
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
      // Monta histórico excluindo a mensagem de boas-vindas (só do assistente)
      const historico = novasMensagens.map(m => ({
        role:    m.role,
        content: m.content,
      }))

      const { data, error } = await supabase.functions.invoke('agente-gabriela', {
        body: { mensagens: historico, contexto, segmento },
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

  // ── Renderiza markdown do chat ───────────────────────────────────────────────
  const renderTexto = (texto: string) => {
    const linhas = texto.split('\n')
    const elementos: React.ReactNode[] = []
    let listaItems: React.ReactNode[] = []
    let listaNum:   React.ReactNode[] = []

    const inline = (linha: string, key: number) =>
      linha.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('*')  && p.endsWith('*'))  return <em      key={i}>{p.slice(1, -1)}</em>
        return p
      })

    const flushLista = () => {
      if (listaItems.length) {
        elementos.push(<ul key={`ul-${elementos.length}`} className="list-disc pl-4 space-y-0.5 my-1 text-sm">{listaItems}</ul>)
        listaItems = []
      }
      if (listaNum.length) {
        elementos.push(<ol key={`ol-${elementos.length}`} className="list-decimal pl-4 space-y-0.5 my-1 text-sm">{listaNum}</ol>)
        listaNum = []
      }
    }

    linhas.forEach((linha, i) => {
      const t = linha.trim()
      if (t.startsWith('### ')) { flushLista(); elementos.push(<p key={i} className="font-semibold text-sm mt-2">{inline(t.slice(4), i)}</p>); return }
      if (t.startsWith('## '))  { flushLista(); elementos.push(<p key={i} className="font-bold text-sm mt-2">{inline(t.slice(3), i)}</p>); return }
      if (/^[-•]\s/.test(t))   { listaNum.length && flushLista(); listaItems.push(<li key={i}>{inline(t.slice(2), i)}</li>); return }
      if (/^\d+\.\s/.test(t))  { listaItems.length && flushLista(); listaNum.push(<li key={i}>{inline(t.replace(/^\d+\.\s/, ''), i)}</li>); return }
      if (t === '')             { flushLista(); elementos.push(<div key={i} className="h-1.5" />); return }
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
        className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2 ${cor.bg} ${cor.hover} text-white rounded-full shadow-lg ${cor.sombra} transition-all duration-300 hover:scale-105 sm:pr-4 sm:pl-1 sm:py-1 p-1`}
        aria-label="Abrir assistente Gabriela"
      >
        <div className="rounded-full bg-white p-0.5">
          <AvatarGabriela size={40} />
        </div>
        {/* Texto visível apenas em telas sm+ */}
        <div className="hidden sm:flex flex-col items-start leading-tight pr-1">
          <span className="text-xs font-semibold opacity-80">{LABEL_CONTEXTO[contexto]}</span>
          <span className="text-sm font-bold flex items-center gap-1.5">
            Gabriela
            <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
          </span>
        </div>
      </button>,
      document.body,
    )
  }

  // ── Chat aberto ─────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div className={`fixed bottom-5 right-5 z-[9999] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 transition-all duration-300 ${minimizado ? 'h-16' : 'h-[520px]'} w-[calc(100vw-2.5rem)] max-w-[380px]`}>

      {/* Header */}
      <div className={`${cor.bg} px-4 py-3 rounded-t-2xl flex items-center gap-3 shrink-0`}>
        <div className="rounded-full bg-white p-0.5 shrink-0">
          <AvatarGabriela size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight flex items-center gap-1.5">
            Gabriela
            <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
          </p>
          <p className="text-white/70 text-xs">{LABEL_CONTEXTO[contexto]} · dados ao vivo</p>
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
          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">

            {/* Sugestões (só antes do primeiro envio do usuário) */}
            {mensagens.filter(m => m.role === 'user').length === 0 && (
              <div className="space-y-2 pt-1">
                {mensagens.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full shrink-0 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Bot size={12} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 dark:text-gray-100 max-w-[88%]">
                      {renderTexto(m.content)}
                    </div>
                  </div>
                ))}
                <div className="pt-1 space-y-1.5">
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-1">Sugestões:</p>
                  {SUGESTOES[contexto].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => enviar(s)}
                      className={`w-full text-left text-xs px-3 py-2 rounded-xl border transition-colors ${cor.botao}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico completo */}
            {mensagens.filter(m => m.role === 'user').length > 0 && mensagens.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full shrink-0 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mt-1">
                    <Bot size={12} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] ${
                  m.role === 'user'
                    ? `${cor.bg} text-white rounded-tr-sm`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                }`}>
                  {m.role === 'assistant' ? renderTexto(m.content) : <p>{m.content}</p>}
                </div>
              </div>
            ))}

            {/* Digitando */}
            {carregando && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full shrink-0 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Bot size={12} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-gray-500" />
                  <span className="text-xs text-gray-500">Consultando dados...</span>
                </div>
              </div>
            )}

            <div ref={fimRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); enviar(input) }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunte sobre os dados do sistema..."
                disabled={carregando}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || carregando}
                className={`p-2 rounded-xl ${cor.bg} ${cor.hover} text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0`}
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
