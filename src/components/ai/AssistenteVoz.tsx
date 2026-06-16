// src/components/ai/AssistenteVoz.tsx
// Assistente de voz para professores — reconhece fala e interpreta comandos
// Suporta: criar agenda, marcar frequência, adicionar observação
//
// Tecnologia: Web Speech API (browser nativo, gratuito, PT-BR)
//             Claude Haiku via Edge Function para interpretar a intenção

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2, CheckCircle, X, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { supabase } from '../../supabase/supabaseClient'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface DadosAgenda {
  titulo_unidade?: string
  conteudo_sala?:  string
  atividade_casa?: string
  observacao?:     string
}

export interface AlunoVoz {
  id:   string
  nome: string
}

export interface DadosFrequencia {
  alunos_ausentes: AlunoVoz[]
  numero_aula:     number
}

export interface DadosObservacao {
  aluno_id?:   string
  aluno_nome?: string
  observacao:  string
}

type Acao = 'criar_agenda' | 'marcar_frequencia' | 'adicionar_observacao' | 'desconhecido'
type Fase = 'idle' | 'ouvindo' | 'processando' | 'revisao'

interface ResultadoVoz {
  acao:       Acao
  confianca:  'alta' | 'media' | 'baixa'
  resumo:     string
  dados:      Partial<DadosAgenda & DadosFrequencia & DadosObservacao>
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Contexto da tela atual — guia a interpretação do Claude */
  contexto:        'agenda' | 'frequencia' | 'geral'
  /** Lista de alunos da turma (necessária para marcar frequência por nome) */
  alunos?:         AlunoVoz[]
  /** Callback quando agenda é interpretada */
  onAgenda?:       (dados: DadosAgenda) => void
  /** Callback quando frequência é interpretada */
  onFrequencia?:   (ausentes: AlunoVoz[], numeroAula: number) => void
  /** Callback quando observação é interpretada */
  onObservacao?:   (dados: DadosObservacao) => void
  /** Texto do botão (default: "Ditar pela voz") */
  labelBotao?:     string
  className?:      string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AssistenteVoz({
  contexto,
  alunos = [],
  onAgenda,
  onFrequencia,
  onObservacao,
  labelBotao = 'Ditar pela voz',
  className,
}: Props) {

  const [suportado,   setSuportado]   = useState(false)
  const [fase,        setFase]        = useState<Fase>('idle')
  const [transcrito,  setTranscrito]  = useState('')
  const [resultado,   setResultado]   = useState<ResultadoVoz | null>(null)
  const [erro,        setErro]        = useState<string | null>(null)

  // Refs para usar dentro dos callbacks do SpeechRecognition (evita closure stale)
  const recognitionRef    = useRef<any>(null)
  const transcritoRef     = useRef('')
  const processarVozRef   = useRef<((texto: string) => Promise<void>) | null>(null)

  // ── Interpretação via Edge Function ────────────────────────────────────────

  const processarVoz = useCallback(async (texto: string) => {
    setFase('processando')
    setErro(null)
    try {
      const { data, error } = await supabase.functions.invoke('interpretar-voz', {
        body: { texto, contexto, alunos },
      })
      if (error) throw new Error(error.message)
      setResultado(data as ResultadoVoz)
      setFase('revisao')
    } catch {
      setErro('Não consegui interpretar. Tente novamente.')
      setFase('idle')
    }
  }, [contexto, alunos])

  // Mantém ref atualizada para o onend poder chamar a versão mais recente
  useEffect(() => { processarVozRef.current = processarVoz }, [processarVoz])

  // ── Inicialização do SpeechRecognition ─────────────────────────────────────

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return // Firefox/browsers sem suporte — componente fica oculto

    setSuportado(true)
    const r = new SR()
    r.lang              = 'pt-BR'
    r.continuous        = true    // Mantém ativo até professor clicar "Parar"
    r.interimResults    = true    // Mostra texto em tempo real
    r.maxAlternatives   = 1

    r.onresult = (e: any) => {
      const texto = Array.from(e.results as any[])
        .map((res: any) => res[0].transcript)
        .join('')
      setTranscrito(texto)
      transcritoRef.current = texto
    }

    r.onend = () => {
      const texto = transcritoRef.current.trim()
      if (texto) {
        processarVozRef.current?.(texto)
      } else {
        setFase('idle')
      }
    }

    r.onerror = (e: any) => {
      // 'no-speech' e 'aborted' são normais — não mostrar erro ao usuário
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setErro('Erro no microfone. Verifique as permissões do browser.')
        setFase('idle')
      } else {
        setFase('idle')
      }
    }

    recognitionRef.current = r
    return () => { try { r.abort() } catch {} }
  }, [])

  // ── Controles de gravação ──────────────────────────────────────────────────

  const iniciarGravacao = () => {
    if (!recognitionRef.current) return
    setTranscrito('')
    transcritoRef.current = ''
    setResultado(null)
    setErro(null)
    setFase('ouvindo')
    try { recognitionRef.current.start() } catch {}
  }

  const pararGravacao = () => {
    try { recognitionRef.current?.stop() } catch {}
  }

  const resetar = () => {
    try { recognitionRef.current?.abort() } catch {}
    setFase('idle')
    setTranscrito('')
    transcritoRef.current = ''
    setResultado(null)
    setErro(null)
  }

  // ── Confirmar ação ─────────────────────────────────────────────────────────

  const confirmar = () => {
    if (!resultado) return

    if (resultado.acao === 'criar_agenda' && onAgenda) {
      onAgenda({
        titulo_unidade: resultado.dados.titulo_unidade,
        conteudo_sala:  resultado.dados.conteudo_sala,
        atividade_casa: resultado.dados.atividade_casa,
        observacao:     resultado.dados.observacao,
      })
    }

    if (resultado.acao === 'marcar_frequencia' && onFrequencia) {
      onFrequencia(
        resultado.dados.alunos_ausentes ?? [],
        resultado.dados.numero_aula ?? 1
      )
    }

    if (resultado.acao === 'adicionar_observacao' && onObservacao && resultado.dados.observacao) {
      onObservacao({
        aluno_id:   resultado.dados.aluno_id,
        aluno_nome: resultado.dados.aluno_nome,
        observacao: resultado.dados.observacao,
      })
    }

    resetar()
  }

  // ── Não renderiza se browser não suportar ─────────────────────────────────

  if (!suportado) return null

  // ── Cores por fase ─────────────────────────────────────────────────────────

  const corHeader = fase === 'ouvindo'
    ? 'bg-red-500'
    : fase === 'revisao' && resultado?.acao !== 'desconhecido'
      ? 'bg-emerald-600'
      : fase === 'revisao'
        ? 'bg-amber-500'
        : 'bg-blue-600'

  const podeCorfirmar = resultado?.acao && resultado.acao !== 'desconhecido'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Botão de microfone (inline no formulário) ── */}
      <button
        type="button"
        onClick={fase === 'idle' ? iniciarGravacao : fase === 'ouvindo' ? pararGravacao : undefined}
        disabled={fase === 'processando' || fase === 'revisao'}
        title={fase === 'ouvindo' ? 'Clique para parar' : 'Clique para falar'}
        className={`
          inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
          border transition-all duration-200 select-none
          ${fase === 'ouvindo'
            ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200 dark:shadow-red-900/40 animate-pulse'
            : fase === 'processando' || fase === 'revisao'
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:scale-105 active:scale-95'
          }
          ${className ?? ''}
        `}
      >
        {fase === 'ouvindo' ? (
          <><MicOff size={16} /> Parar</>
        ) : fase === 'processando' ? (
          <><Loader2 size={16} className="animate-spin" /> Interpretando...</>
        ) : (
          <><Mic size={16} /> {labelBotao} <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span></>
        )}
      </button>

      {/* ── Modal de captura / revisão ── */}
      {(fase === 'ouvindo' || fase === 'processando' || fase === 'revisao') && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className={`${corHeader} px-5 py-4 flex items-center gap-3`}>
              <div className={`p-2 rounded-full bg-white/20 ${fase === 'ouvindo' ? 'animate-pulse' : ''}`}>
                {fase === 'ouvindo'     ? <Mic      size={20} className="text-white" /> :
                 fase === 'processando' ? <Loader2  size={20} className="animate-spin text-white" /> :
                 resultado?.acao === 'desconhecido'
                   ? <AlertCircle size={20} className="text-white" />
                   : <CheckCircle size={20} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">
                  {fase === 'ouvindo'     ? 'Ouvindo...' :
                   fase === 'processando' ? 'Interpretando...' :
                   resultado?.acao === 'desconhecido' ? 'Não entendi' : 'Confira o que entendi'}
                </p>
                <p className="text-white/70 text-xs truncate">
                  {fase === 'ouvindo'     ? 'Fale o que deseja registrar' :
                   fase === 'processando' ? 'Analisando com IA...' :
                   resultado?.resumo ?? ''}
                </p>
              </div>
              {fase !== 'processando' && (
                <button onClick={resetar} className="text-white/70 hover:text-white shrink-0 p-1">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">

              {/* Transcrição ao vivo */}
              {(fase === 'ouvindo' || fase === 'processando') && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 min-h-[80px] flex flex-col justify-between">
                  {transcrito ? (
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{transcrito}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Aguardando fala... fale normalmente</p>
                  )}
                  {fase === 'ouvindo' && (
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1.5">
                        {[0, 100, 200, 100, 0].map((delay, i) => (
                          <div
                            key={i}
                            style={{ animationDelay: `${delay}ms` }}
                            className="w-1.5 h-4 bg-red-400 rounded-full animate-bounce"
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={pararGravacao}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <MicOff size={14} /> Parar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cartão de confirmação */}
              {fase === 'revisao' && resultado && (
                <div className={`rounded-xl p-4 border-2 ${
                  resultado.confianca === 'alta'
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                    : resultado.confianca === 'media'
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                }`}>

                  {/* Agenda */}
                  {resultado.acao === 'criar_agenda' && (
                    <div className="space-y-2.5 text-sm">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        📋 Agenda identificada
                      </p>
                      {resultado.dados.titulo_unidade && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">Título:</span>
                          <span className="text-gray-800 dark:text-gray-100">{resultado.dados.titulo_unidade}</span>
                        </div>
                      )}
                      {resultado.dados.conteudo_sala && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">Em sala:</span>
                          <span className="text-gray-800 dark:text-gray-100">{resultado.dados.conteudo_sala}</span>
                        </div>
                      )}
                      {resultado.dados.atividade_casa && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">Para casa:</span>
                          <span className="text-gray-800 dark:text-gray-100">{resultado.dados.atividade_casa}</span>
                        </div>
                      )}
                      {resultado.dados.observacao && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">Obs:</span>
                          <span className="text-gray-800 dark:text-gray-100">{resultado.dados.observacao}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Frequência */}
                  {resultado.acao === 'marcar_frequencia' && (
                    <div className="space-y-2.5 text-sm">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        📊 Faltas identificadas
                      </p>
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">Aula:</span>
                        <span className="text-gray-800 dark:text-gray-100">{resultado.dados.numero_aula ?? 1}ª aula</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400 block mb-1">Ausentes:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(resultado.dados.alunos_ausentes ?? []).map((a, i) => (
                            <span key={i} className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                              {a.nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observação */}
                  {resultado.acao === 'adicionar_observacao' && (
                    <div className="space-y-2.5 text-sm">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        📝 Observação
                      </p>
                      {resultado.dados.aluno_nome && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">Aluno:</span>
                          <span className="text-gray-800 dark:text-gray-100">{resultado.dados.aluno_nome}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-600 dark:text-gray-400 shrink-0">Obs:</span>
                        <span className="text-gray-800 dark:text-gray-100">{resultado.dados.observacao}</span>
                      </div>
                    </div>
                  )}

                  {/* Não entendeu */}
                  {resultado.acao === 'desconhecido' && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">{resultado.resumo}</p>
                  )}
                </div>
              )}

              {/* Erro */}
              {erro && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{erro}</p>
              )}

              {/* Botões de ação */}
              {fase === 'revisao' && (
                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetar}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>

                  {podeCorfirmar ? (
                    <Button
                      type="button"
                      onClick={confirmar}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                    >
                      <CheckCircle size={15} />
                      {resultado?.acao === 'criar_agenda'
                        ? 'Preencher formulário'
                        : resultado?.acao === 'marcar_frequencia'
                          ? 'Aplicar faltas'
                          : 'Salvar observação'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={iniciarGravacao}
                      className="flex-1 gap-1.5"
                    >
                      <RefreshCw size={15} />
                      Tentar novamente
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
