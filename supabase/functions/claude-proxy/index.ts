// supabase/functions/claude-proxy/index.ts
// Proxy seguro para a Anthropic API — a chave nunca sai do servidor.
//
// Setup:
//   Supabase Dashboard → Settings → Edge Functions → Secrets
//   Adicionar: ANTHROPIC_API_KEY = sk-ant-...
//
// Chamada do front-end:
//   const { data, error } = await supabase.functions.invoke('claude-proxy', {
//     body: { conteudo_base64, media_type, is_pdf, prompt }
//   })

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Tipos de payload ────────────────────────────────────────────────────────

interface ProxyPayload {
  // Para análise de documento (HistoricoIA)
  conteudo_base64?: string
  media_type?:      string           // 'application/pdf' | 'image/jpeg' | etc.
  is_pdf?:          boolean

  // Para geração de texto (agentes IA futuros)
  mensagens?: { role: 'user' | 'assistant'; content: string }[]

  // Prompt textual
  prompt: string

  // Configurações opcionais
  modelo?:     string   // padrão: claude-opus-4-5
  max_tokens?: number   // padrão: 4000
}

// ─── Handler principal ───────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ erro: 'ANTHROPIC_API_KEY não configurada. Configure em Supabase > Settings > Edge Functions > Secrets.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const payload: ProxyPayload = await req.json()
    const modelo     = payload.modelo     ?? 'claude-opus-4-5'
    const max_tokens = payload.max_tokens ?? 4000

    // ── Monta o conteúdo da mensagem ────────────────────────────────────────
    let conteudo: unknown[]

    if (payload.conteudo_base64 && payload.media_type) {
      // Modo documento: análise de PDF ou imagem
      const bloco_arquivo = payload.is_pdf
        ? {
            type:   'document',
            source: {
              type:       'base64',
              media_type: 'application/pdf',
              data:       payload.conteudo_base64,
            },
          }
        : {
            type:   'image',
            source: {
              type:       'base64',
              media_type: payload.media_type,
              data:       payload.conteudo_base64,
            },
          }

      conteudo = [bloco_arquivo, { type: 'text', text: payload.prompt }]
    } else {
      // Modo texto: geração de conteúdo (agentes IA)
      conteudo = [{ type: 'text', text: payload.prompt }]
    }

    // ── Monta mensagens ─────────────────────────────────────────────────────
    const mensagens = payload.mensagens ?? [{ role: 'user', content: conteudo }]

    // ── Chamada à Anthropic API ─────────────────────────────────────────────
    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      modelo,
        max_tokens,
        messages:   mensagens,
      }),
    })

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}))
      return new Response(
        JSON.stringify({ erro: (erro as any)?.error?.message ?? `Erro Anthropic: ${resposta.status}` }),
        { status: resposta.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const dados = await resposta.json()

    // Extrai o texto da resposta
    const texto = (dados.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    return new Response(
      JSON.stringify({
        texto,
        uso: dados.usage,   // input_tokens + output_tokens para auditoria de custo
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ erro: err.message ?? 'Erro inesperado no proxy.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
