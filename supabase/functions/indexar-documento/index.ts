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
//
// Secrets necessários:
//   ANTHROPIC_API_KEY
//   VOYAGE_API_KEY
//   PINECONE_API_KEY
//   PINECONE_INDEX_NAME   (ex: synerEduc-docs)
//   PINECONE_HOST         (ex: https://synerEduc-docs-xxxx.svc.aped-xxxx.pinecone.io)
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ─── Constantes ──────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CHUNK_PALAVRAS   = 400   // tamanho alvo por chunk
const OVERLAP_PALAVRAS = 50    // overlap entre chunks consecutivos
const BATCH_UPSERT     = 50    // vetores por batch no Pinecone

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PdfRegistro {
  id:             string
  nome:           string
  disciplina:     string
  serie:          string
  bimestre:       number
  url:            string
  tipo_documento: string
  autor_id:       string
}

interface Chunk {
  texto:       string
  chunk_index: number
}

interface VetorPinecone {
  id:       string
  values:   number[]
  metadata: {
    pdf_id:         string
    nome_arquivo:   string
    disciplina:     string
    serie:          string
    bimestre:       number
    tipo_documento: string
    chunk_index:    number
    texto:          string   // texto bruto para exibição nos resultados
  }
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/**
 * Divide texto em chunks de ~CHUNK_PALAVRAS palavras com overlap.
 * Respeita quebras de parágrafo quando possível.
 */
function chunkar(texto: string): Chunk[] {
  // Normalizar espaços e quebras de linha
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

    // Avançar com overlap
    inicio = fim - OVERLAP_PALAVRAS
    if (inicio <= 0 || inicio >= palavras.length) break
    idx++
  }

  return chunks
}

/**
 * Gera embeddings em lote via Voyage AI.
 * Retorna array de vetores float[].
 */
async function gerarEmbeddings(textos: string[], voyageKey: string): Promise<number[][]> {
  const resp = await fetch('https://api.voyageai.com/v1/embeddings', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${voyageKey}`,
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: textos,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Voyage AI erro ${resp.status}: ${err}`)
  }

  const dados = await resp.json() as { data: { embedding: number[] }[] }
  return dados.data.map(d => d.embedding)
}

/**
 * Faz upsert de um batch de vetores no Pinecone.
 */
async function upsertPinecone(
  vetores: VetorPinecone[],
  pineconeHost: string,
  pineconeKey: string
): Promise<void> {
  const resp = await fetch(`${pineconeHost}/vectors/upsert`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key':      pineconeKey,
    },
    body: JSON.stringify({ vectors: vetores }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Pinecone upsert erro ${resp.status}: ${err}`)
  }
}

/**
 * Deleta vetores do Pinecone por prefixo de ID ({pdf_id}_*).
 * Usa deleteByMetadata para evitar precisar listar todos os IDs.
 */
async function deletarVetoresPDF(
  pdfId: string,
  pineconeHost: string,
  pineconeKey: string
): Promise<void> {
  const resp = await fetch(`${pineconeHost}/vectors/delete`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key':      pineconeKey,
    },
    body: JSON.stringify({
      filter: { pdf_id: { '$eq': pdfId } },
    }),
  })

  // 404 = nenhum vetor encontrado — não é erro
  if (!resp.ok && resp.status !== 404) {
    const err = await resp.text()
    throw new Error(`Pinecone delete erro ${resp.status}: ${err}`)
  }
}

/**
 * Extrai texto de um PDF via URL pública usando a Anthropic API.
 * Usa document type para preservar estrutura de tabelas e colunas.
 */
async function extrairTextoPDF(url: string, anthropicKey: string): Promise<string> {
  // Baixa o PDF como base64
  const pdfResp = await fetch(url)
  if (!pdfResp.ok) throw new Error(`Erro ao baixar PDF: ${pdfResp.status}`)

  const buffer     = await pdfResp.arrayBuffer()
  const uint8Array = new Uint8Array(buffer)
  const base64     = btoa(String.fromCharCode(...uint8Array))

  // Envia para Claude extrair o texto
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5',  // Haiku é suficiente para extração de texto puro
      max_tokens: 8000,
      messages: [{
        role:    'user',
        content: [
          {
            type:   'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: 'Extraia TODO o texto deste documento de material didático escolar. Preserve títulos, subtítulos e parágrafos. Não inclua comentários, apenas o texto extraído.',
          },
        ],
      }],
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Anthropic extração erro ${resp.status}: ${err}`)
  }

  const dados  = await resp.json() as any
  const blocos = dados.content ?? []
  return blocos
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
}

/**
 * Atualiza status de indexação no banco via Supabase REST.
 */
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

  const anthropicKey  = Deno.env.get('ANTHROPIC_API_KEY')!
  const voyageKey     = Deno.env.get('VOYAGE_API_KEY')!
  const pineconeKey   = Deno.env.get('PINECONE_API_KEY')!
  const pineconeHost  = Deno.env.get('PINECONE_HOST')!      // ex: https://xxx.svc.pinecone.io
  const supabaseUrl   = Deno.env.get('SUPABASE_URL')!
  const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  for (const [k, v] of Object.entries({ anthropicKey, voyageKey, pineconeKey, pineconeHost, supabaseUrl, serviceKey })) {
    if (!v) return json({ erro: `Secret ${k} não configurado.` }, 500)
  }

  let body: { pdf_id: string; acao?: 'indexar' | 'deletar' }
  try {
    body = await req.json()
  } catch {
    return json({ erro: 'Body JSON inválido.' }, 400)
  }

  const { pdf_id, acao = 'indexar' } = body
  if (!pdf_id) return json({ erro: 'pdf_id obrigatório.' }, 400)

  // ── AÇÃO: Deletar vetores do Pinecone ──────────────────────────────────────
  if (acao === 'deletar') {
    try {
      await deletarVetoresPDF(pdf_id, pineconeHost, pineconeKey)
      return json({ ok: true, mensagem: `Vetores do PDF ${pdf_id} removidos do Pinecone.` })
    } catch (err: any) {
      return json({ erro: err.message }, 500)
    }
  }

  // ── AÇÃO: Indexar ──────────────────────────────────────────────────────────

  // 1. Buscar metadados do PDF no banco
  const dbResp = await fetch(
    `${supabaseUrl}/rest/v1/pdfs_conteudista?id=eq.${pdf_id}&select=id,nome,disciplina,serie,bimestre,url,tipo_documento,autor_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const [pdf] = await dbResp.json() as PdfRegistro[]

  if (!pdf) return json({ erro: `PDF ${pdf_id} não encontrado.` }, 404)

  // 2. Marcar como 'indexando'
  await atualizarStatus(pdf_id, { status_indexacao: 'indexando', erro_indexacao: null }, supabaseUrl, serviceKey)

  try {
    // 3. Extrair texto via Anthropic (document type)
    const texto = await extrairTextoPDF(pdf.url, anthropicKey)

    if (!texto.trim()) {
      throw new Error('PDF sem conteúdo de texto extraível.')
    }

    // 4. Chunking
    const chunks = chunkar(texto)

    if (chunks.length === 0) {
      throw new Error('Nenhum chunk gerado após extração de texto.')
    }

    // 5. Deletar vetores antigos (re-indexação idempotente)
    await deletarVetoresPDF(pdf_id, pineconeHost, pineconeKey)

    // 6. Gerar embeddings e fazer upsert em batches
    let totalChunks = 0

    for (let i = 0; i < chunks.length; i += BATCH_UPSERT) {
      const lote   = chunks.slice(i, i + BATCH_UPSERT)
      const textos = lote.map(c => c.texto)

      const embeddings = await gerarEmbeddings(textos, voyageKey)

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
          texto:          chunk.texto.slice(0, 1000),  // limitar metadata para não inflar o índice
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

    return json({
      ok:     true,
      pdf_id,
      chunks: totalChunks,
      mensagem: `${pdf.nome} indexado com sucesso (${totalChunks} chunks).`,
    })

  } catch (err: any) {
    // Marcar como erro no banco
    await atualizarStatus(pdf_id, {
      status_indexacao: 'erro',
      erro_indexacao:   err.message?.slice(0, 500) ?? 'Erro desconhecido',
    }, supabaseUrl, serviceKey)

    return json({ erro: err.message }, 500)
  }
})
