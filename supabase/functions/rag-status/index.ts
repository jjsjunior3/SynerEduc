// supabase/functions/rag-status/index.ts
// F5.10 — Gestão do RAG (Pinecone) para o Professor Conteudista
// Ações:
//   status    → total geral de vetores indexados no Pinecone (describe_index_stats)
//   catalogo  → lista o catálogo (série/disciplina/bimestre) espelhado no Supabase,
//               que é a única forma de "navegar" o que existe — o Pinecone não
//               suporta listar valores distintos de metadata
//   excluir   → remove vetores de um ou mais livros (por livro_id exato) do
//               Pinecone e do catálogo, usado antes de reindexar localmente

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

// IDs são gerados por nós mesmos (toAsciiId no script local) — só ASCII, _ e -
const LIVRO_ID_RE = /^[a-zA-Z0-9_-]{1,120}$/

function sanitizeLivroIds(val: unknown): string[] | null {
  if (!Array.isArray(val) || val.length === 0 || val.length > 200) return null
  const limpos = val.filter((v): v is string => typeof v === 'string' && LIVRO_ID_RE.test(v))
  return limpos.length === val.length ? limpos : null
}

async function supabaseRest(path: string, init?: RequestInit) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!resp.ok) throw new Error(`Supabase ${path}: ${resp.status} ${await resp.text()}`)
  return resp.status === 204 ? null : resp.json()
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

    const { acao, livro_ids } = await req.json()

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

    if (acao === 'catalogo') {
      const linhas = await supabaseRest(
        'rag_material_indexado?select=livro_id,serie,disciplina,area,bimestre,volume,tipo,total_vetores,indexado_em&indexado=eq.true&order=serie.asc,disciplina.asc,volume.asc.nullslast,bimestre.asc'
      )
      return new Response(JSON.stringify({ itens: linhas }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    if (acao === 'excluir') {
      const ids = sanitizeLivroIds(livro_ids)
      if (!ids) {
        return new Response(
          JSON.stringify({ erro: 'Informe ao menos um livro_id válido' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const resp = await fetch(`${PINECONE_HOST}/vectors/delete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
        body: JSON.stringify({
          filter: { livro_id: { '$in': ids } },
        }),
      })
      if (!resp.ok) throw new Error(`Pinecone vectors/delete: ${resp.status} ${await resp.text()}`)

      // Remove do catálogo (best-effort — a exclusão no Pinecone já aconteceu)
      const filtroIds = ids.map(id => `"${id}"`).join(',')
      await supabaseRest(`rag_material_indexado?livro_id=in.(${filtroIds})`, { method: 'DELETE' })

      return new Response(
        JSON.stringify({ ok: true, removidos: ids.length, mensagem: `${ids.length} item(ns) removido(s) do índice. Rode a reindexação local quando o material for atualizado.` }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ erro: 'Ação desconhecida' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('rag-status error:', err)
    return new Response(
      JSON.stringify({ erro: err.message ?? 'Erro ao consultar o RAG' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
