// src/components/ai/ChatFlutuante.tsx
// Chat flutuante da Professora Sofia — RAG sobre material didático
// Usa Pinecone (busca semântica) + Claude (resposta)

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Minimize2, Loader2, Mic, MicOff } from 'lucide-react'
import { AvatarSofia } from './AvatarSofia'
import { Button } from '../ui/button'
import { supabase } from '../../supabase/supabaseClient'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Mensagem {
  id:      string
  role:    'sofia' | 'user'
  texto:   string
  loading?: boolean
}

interface Props {
  serie?:      string  // ex: "1ª série", "6º ano"
  disciplina?: string  // ex: "Biologia" — pré-filtra o Pinecone
  nomeAluno?:  string
}

// ─── Prompt da Professora Sofia ───────────────────────────────────────────────

function buildSystemPrompt(serie?: string, disciplina?: string, nomeAluno?: string): string {
  return `Você é a Professora Sofia, assistente de estudos do Colégio Conexão Maranhense.
Você é jovem, animada, paciente e fala de forma clara e acolhedora com os alunos.
Use linguagem simples, emojis ocasionais e sempre incentive o aluno.

${nomeAluno ? `Você está conversando com ${nomeAluno}.` : ''}
${serie ? `O aluno está na ${serie}.` : ''}
${disciplina ? `O contexto atual é a disciplina de ${disciplina}.` : ''}

Ao responder:
- Use os trechos do material didático fornecidos no contexto quando relevantes
- Se a pergunta não tiver relação com o material escolar, responda brevemente e redirecione para os estudos
- Nunca invente conteúdo — se não souber, diga que vai buscar nos livros
- Sempre termine com uma pergunta de curiosidade ou incentivo`
}

// ─── Mensagem de boas-vindas ─────────────────────────────────────────────────

function boasVindas(nomeAluno?: string): string {
  const nome = nomeAluno ? `, ${nomeAluno.split(' ')[0]}` : ''
  return `Oi${nome}! 👋 Sou a **Professora Sofia**, sua assistente de estudos aqui no Conexão! 📚✨

Pode me perguntar qualquer coisa sobre os conteúdos dos seus livros — estou aqui pra te ajudar a entender melhor. O que você quer estudar hoje? 😊`
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ChatFlutuante({ serie, disciplina, nomeAluno }: Props) {
  const [aberto,     setAberto]     = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [mensagens,  setMensagens]  = useState<Mensagem[]>([
    { id: '0', role: 'sofia', texto: boasVindas(nomeAluno) },
  ])
  const [input,    setInput]    = useState('')
  const [enviando, setEnviando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const scrollEndRef   = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  // Auto-scroll ao fundo
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  // Foca no input ao abrir
  useEffect(() => {
    if (aberto && !minimizado) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [aberto, minimizado])

  // Auto-resize do textarea conforme o texto cresce
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  // ── Entrada por voz ──────────────────────────────────────────────────────────
  const iniciarVoz = useCallback(() => {
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      alert('Reconhecimento de voz não suportado neste navegador.')
      return
    }
    const rec = new SpeechRec()
    rec.lang            = 'pt-BR'
    rec.continuous      = false
    rec.interimResults  = false
    rec.onstart  = () => setGravando(true)
    rec.onend    = () => setGravando(false)
    rec.onerror  = () => setGravando(false)
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join(' ')
      setInput(prev => (prev.trim() ? prev.trim() + ' ' + transcript : transcript))
    }
    rec.start()
    recognitionRef.current = rec
  }, [])

  const pararVoz = useCallback(() => {
    recognitionRef.current?.stop()
    setGravando(false)
  }, [])

  async function enviarMensagem() {
    const texto = input.trim()
    if (!texto || enviando) return

    const msgUser: Mensagem = { id: Date.now().toString(), role: 'user', texto }
    const msgLoading: Mensagem = { id: 'loading', role: 'sofia', texto: '', loading: true }

    setMensagens(prev => [...prev, msgUser, msgLoading])
    setInput('')
    setEnviando(true)

    try {
      // Busca no RAG via Edge Function do Supabase
      const resposta = await buscarRAG(texto, serie, disciplina, mensagens)
      setMensagens(prev => prev
        .filter(m => m.id !== 'loading')
        .concat({ id: Date.now().toString(), role: 'sofia', texto: resposta })
      )
    } catch (err) {
      setMensagens(prev => prev
        .filter(m => m.id !== 'loading')
        .concat({
          id:    Date.now().toString(),
          role:  'sofia',
          texto: 'Opa, tive um probleminha técnico! 😅 Tenta de novo em alguns segundos.',
        })
      )
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg shadow-violet-200 dark:shadow-violet-900/40 transition-all duration-300 hover:scale-105 p-1 sm:pr-4"
        aria-label="Abrir chat com Professora Sofia"
      >
        <div className="rounded-full bg-white p-0.5 shrink-0">
          <AvatarSofia size={44} />
        </div>
        {/* Label só aparece em sm+ */}
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs font-semibold opacity-80">Dúvidas?</span>
          <span className="text-sm font-bold flex items-center gap-1.5">
            Professora Sofia
            <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
          </span>
        </div>
      </button>
    )
  }

  return (
    /* Mobile: bottom sheet largura total, Desktop: card fixo 360px canto inferior direito */
    <div className={`
      fixed z-[60] flex flex-col
      bg-white dark:bg-gray-900 shadow-2xl
      border border-violet-100 dark:border-violet-900
      transition-all duration-300
      inset-x-0 bottom-0 rounded-t-2xl
      sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[360px] sm:rounded-2xl
      ${minimizado ? 'h-16' : 'h-[85dvh] sm:h-[520px]'}
    `}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-violet-600 rounded-t-2xl">
        <div className="rounded-full bg-white p-0.5 shrink-0">
          <AvatarSofia size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight flex items-center gap-1.5">
            Professora Sofia
            <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
          </p>
          <p className="text-violet-200 text-xs">Assistente de Estudos ✨</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMinimizado(m => !m)}
            className="text-violet-200 hover:text-white p-1 rounded transition-colors"
            aria-label="Minimizar"
          >
            <Minimize2 size={15} />
          </button>
          <button
            onClick={() => setAberto(false)}
            className="text-violet-200 hover:text-white p-1 rounded transition-colors"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {!minimizado && (
        <>
          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-3">
              {mensagens.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'sofia' && (
                    <div className="shrink-0 mt-1">
                      <AvatarSofia size={28} />
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                  }`}>
                    {msg.loading ? (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    ) : (
                      <MarkdownSimples texto={msg.texto} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800">

            {/* Indicador de gravação — barras de áudio animadas */}
            {gravando && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-end gap-[3px] h-5">
                  {[0, 60, 120, 180, 240].map(delay => (
                    <span
                      key={delay}
                      className="w-[3px] bg-red-500 rounded-full origin-bottom"
                      style={{
                        animation: `audioBar 0.8s ease-in-out ${delay}ms infinite alternate`,
                        height: '40%',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400 flex-1">
                  Gravando... fale sua pergunta
                </span>
                <button
                  type="button"
                  onClick={pararVoz}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 underline"
                >
                  parar
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo sobre os livros..."
                className="flex-1 min-h-[42px] max-h-[120px] resize-none text-sm rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 overflow-y-auto"
                rows={1}
              />

              {/* Botão de voz */}
              <button
                type="button"
                onClick={gravando ? pararVoz : iniciarVoz}
                disabled={enviando}
                aria-label={gravando ? 'Parar gravação' : 'Falar pergunta'}
                className={`h-[42px] w-[42px] shrink-0 rounded-xl flex items-center justify-center transition-all ${
                  gravando
                    ? 'bg-red-500 text-white shadow-md shadow-red-300 dark:shadow-red-900/40'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600'
                }`}
              >
                {gravando ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Botão enviar */}
              <Button
                onClick={enviarMensagem}
                disabled={!input.trim() || enviando}
                size="icon"
                className="bg-violet-600 hover:bg-violet-700 rounded-xl h-[42px] w-[42px] shrink-0"
              >
                {enviando
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={16} />
                }
              </Button>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-1.5">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Markdown mínimo ─────────────────────────────────────────────────────────
// Renderiza markdown do chat: bold, italic, listas, cabeçalhos

function renderLinha(linha: string, key: number) {
  // Processa inline: **bold** e *italic*
  const partes = linha.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
  const inline = partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*')  && p.endsWith('*'))  return <em      key={i}>{p.slice(1, -1)}</em>
    return p
  })
  return inline
}

function MarkdownSimples({ texto }: { texto: string }) {
  const linhas = texto.split('\n')
  const elementos: React.ReactNode[] = []
  let listaItems: React.ReactNode[] = []
  let listaNum:   React.ReactNode[] = []

  const flushLista = () => {
    if (listaItems.length) {
      elementos.push(<ul key={`ul-${elementos.length}`} className="list-disc pl-4 space-y-0.5 my-1">{listaItems}</ul>)
      listaItems = []
    }
    if (listaNum.length) {
      elementos.push(<ol key={`ol-${elementos.length}`} className="list-decimal pl-4 space-y-0.5 my-1">{listaNum}</ol>)
      listaNum = []
    }
  }

  linhas.forEach((linha, i) => {
    const t = linha.trim()

    // Cabeçalho ## ou ###
    if (t.startsWith('### ')) {
      flushLista()
      elementos.push(<p key={i} className="font-semibold text-sm mt-2">{renderLinha(t.slice(4), i)}</p>)
      return
    }
    if (t.startsWith('## ')) {
      flushLista()
      elementos.push(<p key={i} className="font-bold text-sm mt-2">{renderLinha(t.slice(3), i)}</p>)
      return
    }

    // Lista com - ou •
    if (/^[-•]\s/.test(t)) {
      listaNum.length && flushLista()
      listaItems.push(<li key={i}>{renderLinha(t.slice(2), i)}</li>)
      return
    }

    // Lista numerada
    if (/^\d+\.\s/.test(t)) {
      listaItems.length && flushLista()
      listaNum.push(<li key={i}>{renderLinha(t.replace(/^\d+\.\s/, ''), i)}</li>)
      return
    }

    // Linha vazia
    if (t === '') {
      flushLista()
      elementos.push(<div key={i} className="h-1.5" />)
      return
    }

    // Parágrafo normal
    flushLista()
    elementos.push(<p key={i} className="leading-relaxed">{renderLinha(t, i)}</p>)
  })

  flushLista()
  return <span className="space-y-0.5 block">{elementos}</span>
}

// ─── RAG: busca no Pinecone + resposta via Claude ─────────────────────────────

async function buscarRAG(
  pergunta:    string,
  serie?:      string,
  disciplina?: string,
  historico?:  Mensagem[],
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('chat-sofia', {
    body: {
      pergunta,
      serie,
      disciplina,
      historico: (historico ?? [])
        .filter(m => !m.loading)
        .slice(-6)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.texto })),
    },
  })

  if (error) throw new Error(error.message)
  return data.resposta as string
}
