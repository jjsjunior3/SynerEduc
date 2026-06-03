// src/hooks/useChatIA.ts
// Hook base dos agentes de IA — F5.0 / F5.2
//
// Gerencia:
//   - histórico de mensagens (UI completa)
//   - janela de contexto enviada ao Claude (máx 10 mensagens)
//   - chamadas à Edge Function claude-proxy v2
//   - estado de carregamento e erro

import { useState, useCallback } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { Mensagem, PerfilAgente, RespostaProxy } from '../types/chat'

const MAX_MENSAGENS_CONTEXTO = 10  // janela enviada ao Claude
const MAX_TOKENS_DEFAULT     = 2000

interface UseChatIAOptions {
  perfil:        PerfilAgente
  systemExtra?:  string   // contexto adicional do dashboard
  maxTokens?:    number
}

interface UseChatIAReturn {
  mensagens:   Mensagem[]
  carregando:  boolean
  enviar:      (texto: string) => Promise<void>
  limpar:      () => void
}

export function useChatIA({
  perfil,
  systemExtra,
  maxTokens = MAX_TOKENS_DEFAULT,
}: UseChatIAOptions): UseChatIAReturn {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(false)

  const adicionarMensagem = useCallback((m: Omit<Mensagem, 'id' | 'timestamp'>) => {
    const nova: Mensagem = {
      ...m,
      id:        crypto.randomUUID(),
      timestamp: new Date(),
    }
    setMensagens(prev => [...prev, nova])
    return nova.id
  }, [])

  const atualizarMensagem = useCallback((id: string, patch: Partial<Mensagem>) => {
    setMensagens(prev =>
      prev.map(m => m.id === id ? { ...m, ...patch } : m)
    )
  }, [])

  /** Converte histórico de UI para o formato esperado pela Anthropic API */
  const montarHistoricoContexto = useCallback((
    historicoUI: Mensagem[]
  ): { role: 'user' | 'assistant'; content: string }[] => {
    // Pega as últimas MAX_MENSAGENS_CONTEXTO mensagens com status 'ok'
    return historicoUI
      .filter(m => m.status === 'ok')
      .slice(-MAX_MENSAGENS_CONTEXTO)
      .map(m => ({ role: m.role, content: m.conteudo }))
  }, [])

  const enviar = useCallback(async (texto: string) => {
    if (!texto.trim() || carregando) return

    // Adiciona mensagem do usuário na UI
    adicionarMensagem({ role: 'user', conteudo: texto.trim(), status: 'ok' })

    // ID provisório para a mensagem do assistente (estado "enviando")
    const idAssistente = adicionarMensagem({
      role:     'assistant',
      conteudo: '',
      status:   'enviando',
    })

    setCarregando(true)

    try {
      // Monta contexto (últimas 10 msgs ok + a nova do usuário)
      const mensagensParaEnviar = montarHistoricoContexto([
        ...mensagens.filter(m => m.status === 'ok'),
        { id: '', role: 'user', conteudo: texto.trim(), status: 'ok', timestamp: new Date() },
      ])

      const { data, error } = await supabase.functions.invoke<RespostaProxy>(
        'claude-proxy',
        {
          body: {
            modo:         'agente',
            perfil,
            mensagens:    mensagensParaEnviar,
            system_extra: systemExtra,
            max_tokens:   maxTokens,
          },
        }
      )

      if (error || !data) {
        throw new Error(error?.message ?? 'Sem resposta do servidor')
      }

      if (data.erro) {
        throw new Error(data.erro)
      }

      if (data.tipo === 'resposta' && data.texto) {
        atualizarMensagem(idAssistente, {
          conteudo: data.texto,
          status:   'ok',
        })
        return
      }

      // tool_use: nesta v2 o frontend recebe a solicitação
      // Cada agente (F5.3+) implementará a execução das tools e chamará enviar() novamente
      // com os resultados — por ora exibe mensagem informativa
      if (data.tipo === 'tool_use') {
        atualizarMensagem(idAssistente, {
          conteudo: '⏳ Buscando informações no sistema…',
          status:   'ok',
        })
        return
      }

      throw new Error('Resposta inesperada do servidor')

    } catch (err: any) {
      const msgErro = err.message?.includes('Limite diário')
        ? err.message
        : 'Não foi possível responder agora. Tente novamente.'

      atualizarMensagem(idAssistente, {
        conteudo: msgErro,
        status:   'erro',
      })
    } finally {
      setCarregando(false)
    }
  }, [mensagens, carregando, perfil, systemExtra, maxTokens, adicionarMensagem, atualizarMensagem, montarHistoricoContexto])

  const limpar = useCallback(() => setMensagens([]), [])

  return { mensagens, carregando, enviar, limpar }
}
