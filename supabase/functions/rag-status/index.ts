// supabase/functions/rag-status/index.ts
// F5.10 — Gestão do RAG (Pinecone) para o Professor Conteudista
// Ações:
//   status   → total de vetores indexados no Pinecone (describe_index_stats)
//   excluir  → remove vetores de uma série/disciplina específica (filtro de metadata)
//              usado antes de reindexar localmente um livro atualizado

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PINECONE_KEY  = Deno.env.get('PINECONE_API_KEY') ?? ''
const PINECONE_HOST = Deno.env.get('PINECONE_HOST')     ?? ''
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')      ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

const PERFIS_PERMITIDOS = ['professor_conteudista', 'administrador']

// Aceita apenas letras (com acento), números, espaço, hífen — evita quebrar o filtro JSON do Pinecone
const TEXTO_SEGURO_RE = /^[\p{L}0-9 ºª\-]{1,60}$/u

function sanitizeTexto(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const limpo = val.trim()
  return TEXTO_SEGURO_RE.test(limpo) ? limpo : null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Validação de JWT ──────────────────────────────────────────────────────
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim() ?? ''
    if (!token) {
      return new Response(JSON.stringify({ erro: 'Não autorizado' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    })
    if (!userResp.ok) {
      return new Response(JSON.stringify({ erro: 'Não autorizado' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const userAuth = await userResp.json()
    const tipoUsuario = userAuth.user_metadata?.tipo ?? ''

    if (!PERFIS_PERMITIDOS.includes(tipoUsuario)) {
      return new Response(JSON.stringify({ erro: 'Perfil sem acesso à gestão do RAG' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { acao, serie, disciplina } = await req.json()

    if (acao === 'status') {
      const resp = await fetch(`${PINECONE_HOST}/describe_index_stats`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
        body:    JSON.stringify({}),
      })
      if (!resp.ok) throw new Error(`Pinecone describe_index_stats: ${resp.status}`)
      const data = await resp.json()
      return new Response(
        JSON.stringify({
          total_vetores: data.totalVectorCount ?? 0,
          dimensao:      data.dimension ?? null,
        }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (acao === 'excluir') {
      const serieLimpa      = sanitizeTexto(serie)
      const disciplinaLimpa = sanitizeTexto(disciplina)

      if (!serieLimpa || !disciplinaLimpa) {
        return new Response(
          JSON.stringify({ erro: 'Informe série e disciplina válidas' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const resp = await fetch(`${PINECONE_HOST}/vectors/delete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
        body: JSON.stringify({
          filter: {
            serie:      { '$eq': serieLimpa },
            disciplina: { '$eq': disciplinaLimpa },
          },
        }),
      })
      if (!resp.ok) throw new Error(`Pinecone vectors/delete: ${resp.status} ${await resp.text()}`)

      return new Response(
        JSON.stringify({ ok: true, mensagem: `Vetores de ${disciplinaLimpa} / ${serieLimpa} removidos. Rode a reindexação local para essa série/disciplina quando o material for atualizado.` }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ erro: 'Ação desconhecida' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('rag-status error:', err)
    return new Response(
      JSON.stringify({ erro: err.message ?? 'Erro ao consultar o Pinecone' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
