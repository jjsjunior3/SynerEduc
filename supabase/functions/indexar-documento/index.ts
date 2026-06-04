// supabase/functions/indexar-documento/index.ts
// Issue #20 · F5.1 — Pipeline de indexação Pinecone
//
// Fluxo:
//   1. Recebe { pdf_id } (id de um registro em pdfs_conteudista)
//   2. Lê metadados + URL pública do Supabase
//   3. Baixa o PDF via URL pública
//   4. Extrai texto com a API da Anthropic (document type)
//   5. Divide em chunks de ~400 palavras com overlap de 50
//   6. Gera embeddings via Voyage AI (voyage-3)
//   7. Faz upsert no Pinecone (chave: {pdf_id}_{chunk_index})
//   8. Atualiza status_indexacao no banco
//
// Também aceita { acao: 'deletar', pdf_id } para remover vetores do Pinecone
// E { acao: 'diagnostico' } para verificar secrets sem processar nada
//
// Secrets necessários:
//   ANTHROPIC_API_KEY
//   VOYAGE_API_KEY
//   PINECONE_API_KEY
//   PINECONE_HOST         (ex: https://synereduc-docs-xxxx.svc.aped-xxxx.pinecone.io)
//   SUPABASE_URL          (default secret — automático)
//   SUPABASE_SERVICE_ROLE_KEY (default secret — automático)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ─── Constantes ──────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CHUNK_PALAVRAS   = 400
const OVERLAP_PALAVRAS = 50
const BATCH_UPSERT     = 50

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PdfRegistro {
  id:             string
  nome:           string
  disciplina:     string
  serie:          string
  bimestre:       number
  url:            string
  tipo_documento: string
}

interface Chunk {
  texto:       string
  chunk_index: number
}

interface VetorPinecone {
  id:       string
  values:   number[]
  metadata: Record<string, unknown>
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function chunkar(texto: string): Chunk[] {
  const normalizado = texto.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const palavras    = normalizado.split(/\s+/)
  if (palavras.length === 0) return []

  const chunks: Chunk[] = []
  let inicio = 0
  let idx    = 0

  while (inicio < palavras.length) {
    const fim    = Math.min(inicio + CHUNK_PALAVRAS, palavras.length)
    const trecho = palavras.slice(inicio, fim).join(' ')
    chunks.push({ texto: trecho, chunk_index: idx })
    inicio = fim - OVERLAP_PALAVRAS
    if (inicio <= 0 || inicio >= palavras.length) break
    idx++
  }

  return chunks
}

async function gerarEmbeddings(textos: string[], voyageKey: string): Promise<number[][]> {
  const resp = await fetch('https://api.voyageai.com/v1/embeddings', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${voyageKey}` },
    body:    JSON.stringify({ model: 'voyage-3', input: textos }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Voyage AI erro ${resp.status}: ${err}`)
  }
  const dados = await resp.json() as { data: { embedding: number[] }[] }
  return dados.data.map(d => d.embedding)
}

async function upsertPinecone(vetores: VetorPinecone[], host: string, key: string): Promise<void> {
  const resp = await fetch(`${host}/vectors/upsert`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': key },
    body:    JSON.stringify({ vectors: vetores }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Pinecone upsert erro ${resp.status}: ${err}`)
  }
}

async function deletarVetoresPDF(pdfId: string, host: string, key: string): Promise<void> {
  const resp = await fetch(`${host}/vectors/delete`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': key },
    body:    JSON.stringify({ filter: { pdf_id: { '$eq': pdfId } } }),
  })
  if (!resp.ok && resp.status !== 404) {
    const err = await resp.text()
    throw new Error(`Pinecone delete erro ${resp.status}: ${err}`)
  }
}

async function extrairTextoPDF(url: string, anthropicKey: string): Promise<string> {
  // Baixa o PDF e converte para base64 de forma segura (sem spread de array grande)
  const pdfResp = await fetch(url)
  if (!pdfResp.ok) throw new Error(`Erro ao baixar PDF: ${pdfResp.status} ${url}`)

  const buffer = await pdfResp.arrayBuffer()
  const bytes  = new Uint8Array(buffer)

  // Conversão base64 segura para arrays grandes
  let binStr = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binStr += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  const base64 = btoa(binStr)

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role:    'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text',     text: 'Extraia TODO o texto deste documento. Preserve títulos e parágrafos. Retorne apenas o texto, sem comentários.' },
        ],
      }],
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Anthropic extração erro ${resp.status}: ${err}`)
  }

  const dados = await resp.json() as any
  return (dados.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
}

async function atualizarStatus(
  pdfId: string,
  patch: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/pdfs_conteudista?id=eq.${pdfId}`, {
    method:  'PATCH',
    headers: {
      apikey:          serviceKey,
      Authorization:   `Bearer ${serviceKey}`,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
    body: JSON.stringify(patch),
  })
}

// ─── Handler principal ───────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // Lê todos os secrets
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
  const voyageKey    = Deno.env.get('VOYAGE_API_KEY') ?? ''
  const pineconeKey  = Deno.env.get('PINECONE_API_KEY') ?? ''
  const pineconeHost = Deno.env.get('PINECONE_HOST') ?? ''
  const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  let body: { pdf_id?: string; acao?: string; texto?: string }
  try {
    body = await req.json()
  } catch {
    return json({ erro: 'Body JSON inválido.' }, 400)
  }

  // ── AÇÃO: Diagnóstico — verifica secrets sem processar nada ────────────────
  if (body.acao === 'diagnostico') {
    return json({
      secrets: {
        ANTHROPIC_API_KEY:       anthropicKey  ? `✅ presente (${anthropicKey.slice(0,8)}...)` : '❌ ausente',
        VOYAGE_API_KEY:          voyageKey     ? `✅ presente (${voyageKey.slice(0,8)}...)` : '❌ ausente',
        PINECONE_API_KEY:        pineconeKey   ? `✅ presente (${pineconeKey.slice(0,8)}...)` : '❌ ausente',
        PINECONE_HOST:           pineconeHost  ? `✅ presente (${pineconeHost})` : '❌ ausente',
        SUPABASE_URL:            supabaseUrl   ? `✅ presente (${supabaseUrl})` : '❌ ausente',
        SUPABASE_SERVICE_ROLE_KEY: serviceKey  ? `✅ presente (${serviceKey.slice(0,8)}...)` : '❌ ausente',
      }
    })
  }

  // ── Verificar secrets obrigatórios ─────────────────────────────────────────
  const faltando = Object.entries({ anthropicKey, voyageKey, pineconeKey, pineconeHost, supabaseUrl, serviceKey })
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (faltando.length > 0) {
    return json({ erro: `Secrets faltando: ${faltando.join(', ')}` }, 500)
  }

  const { pdf_id, acao = 'indexar', texto: textoRecebido } = body
  if (!pdf_id) return json({ erro: 'pdf_id obrigatório.' }, 400)

  // ── AÇÃO: Deletar ──────────────────────────────────────────────────────────
  if (acao === 'deletar') {
    try {
      await deletarVetoresPDF(pdf_id, pineconeHost, pineconeKey)
      return json({ ok: true, mensagem: `Vetores do PDF ${pdf_id} removidos.` })
    } catch (err: any) {
      return json({ erro: err.message }, 500)
    }
  }

  // ── AÇÃO: Indexar ──────────────────────────────────────────────────────────

  // 1. Buscar metadados no banco
  const dbResp = await fetch(
    `${supabaseUrl}/rest/v1/pdfs_conteudista?id=eq.${pdf_id}&select=id,nome,disciplina,serie,bimestre,url,tipo_documento`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const registros = await dbResp.json() as PdfRegistro[]
  const pdf = registros[0]

  if (!pdf) return json({ erro: `PDF ${pdf_id} não encontrado no banco.` }, 404)

  // 2. Marcar como indexando
  await atualizarStatus(pdf_id, { status_indexacao: 'indexando', erro_indexacao: null }, supabaseUrl, serviceKey)

  try {
    // 3. Usar texto recebido do script Node.js (extraído com pdf-parse, sem rate limit)
    //    Fallback: extrair via Anthropic (usado apenas se chamado sem texto pré-extraído)
    let texto: string
    if (textoRecebido?.trim()) {
      texto = textoRecebido
    } else {
      texto = await extrairTextoPDF(pdf.url, anthropicKey)
    }
    if (!texto.trim()) throw new Error('PDF sem conteúdo de texto extraível.')

    // 4. Chunking
    const chunks = chunkar(texto)
    if (chunks.length === 0) throw new Error('Nenhum chunk gerado.')

    // 5. Deletar vetores antigos (idempotência)
    await deletarVetoresPDF(pdf_id, pineconeHost, pineconeKey)

    // 6. Embeddings + upsert em batches
    let totalChunks = 0
    for (let i = 0; i < chunks.length; i += BATCH_UPSERT) {
      const lote       = chunks.slice(i, i + BATCH_UPSERT)
      const embeddings = await gerarEmbeddings(lote.map(c => c.texto), voyageKey)

      const vetores: VetorPinecone[] = lote.map((chunk, j) => ({
        id:     `${pdf_id}_${chunk.chunk_index}`,
        values: embeddings[j],
        metadata: {
          pdf_id,
          nome_arquivo:   pdf.nome,
          disciplina:     pdf.disciplina,
          serie:          pdf.serie,
          bimestre:       pdf.bimestre,
          tipo_documento: pdf.tipo_documento ?? 'material_didatico',
          chunk_index:    chunk.chunk_index,
          texto:          chunk.texto.slice(0, 1000),
        },
      }))

      await upsertPinecone(vetores, pineconeHost, pineconeKey)
      totalChunks += lote.length
    }

    // 7. Marcar como indexado
    await atualizarStatus(pdf_id, {
      status_indexacao: 'indexado',
      indexado_em:      new Date().toISOString(),
      chunks_indexados: totalChunks,
      erro_indexacao:   null,
    }, supabaseUrl, serviceKey)

    return json({ ok: true, pdf_id, chunks: totalChunks, mensagem: `${pdf.nome} indexado (${totalChunks} chunks).` })

  } catch (err: any) {
    await atualizarStatus(pdf_id, {
      status_indexacao: 'erro',
      erro_indexacao:   err.message?.slice(0, 500) ?? 'Erro desconhecido',
    }, supabaseUrl, serviceKey)

    return json({ erro: err.message }, 500)
  }
})
