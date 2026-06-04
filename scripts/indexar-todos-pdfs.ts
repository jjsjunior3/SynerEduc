// scripts/indexar-todos-pdfs.ts
// Pipeline de indexação RAG para PDFs de livros didáticos escaneados
//
// Arquitetura:
//   1. pdf-lib: divide cada PDF em chunks de páginas (sem native deps)
//   2. Anthropic claude-3-5-haiku: OCR de cada chunk de páginas (mais barato, maior rate limit)
//   3. Chunking de texto local (400 palavras, 50 overlap)
//   4. BGE-M3 via Ollama local: embeddings grátis, 1024 dims, sem Voyage AI
//   5. Pinecone: upsert direto
//   6. Supabase: atualiza status
//
// Uso:
//   npm run indexar                 → indexa status = 'nao_indexado'
//   npm run indexar:erros           → indexa status IN ('nao_indexado', 'erro')
//   npm run indexar:tudo            → reindexar tudo

import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL    = process.env.VITE_SUPABASE_URL    ?? ''
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY ?? ''
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY    ?? ''
const PINECONE_KEY    = process.env.PINECONE_API_KEY      ?? ''
const PINECONE_HOST   = process.env.PINECONE_HOST         ?? ''
const OLLAMA_URL      = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const EMBED_MODEL     = 'bge-m3:567m'
const OCR_MODEL       = 'claude-3-5-haiku-20241022'

const PAGINAS_POR_CHUNK = 5     // páginas por chamada Anthropic
const DELAY_ENTRE_CHUNKS = 4000 // ms entre chamadas (respeita rate limit)
const DELAY_ENTRE_PDFS   = 3000 // ms entre PDFs
const CONCORRENCIA        = 1    // 1 PDF por vez (OCR é sequencial)
const WORDS_POR_CHUNK     = 400  // tamanho do chunk de texto
const OVERLAP_WORDS       = 50
const BATCH_PINECONE      = 50   // vetores por upsert

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Preencha VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('❌ Preencha ANTHROPIC_API_KEY no .env.local')
  process.exit(1)
}
if (!PINECONE_KEY || !PINECONE_HOST) {
  console.error('❌ Preencha PINECONE_API_KEY e PINECONE_HOST no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const args           = process.argv.slice(2)
const reindexarErros = args.includes('--reindexar-erros')
const reindexarTudo  = args.includes('--tudo')

// ─── Utilitários ─────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function chunkarTexto(texto: string): string[] {
  const palavras = texto.replace(/\s+/g, ' ').trim().split(' ')
  if (!palavras.length) return []

  const chunks: string[] = []
  let inicio = 0
  while (inicio < palavras.length) {
    const fim = Math.min(inicio + WORDS_POR_CHUNK, palavras.length)
    chunks.push(palavras.slice(inicio, fim).join(' '))
    inicio = fim - OVERLAP_WORDS
    if (inicio <= 0 || inicio >= palavras.length) break
  }
  return chunks.filter(c => c.trim().length > 50) // ignora chunks muito pequenos
}

// ─── OCR via Anthropic Haiku ──────────────────────────────────────────────────

async function ocrChunkPaginas(pdfBytes: Uint8Array): Promise<string> {
  const base64 = Buffer.from(pdfBytes).toString('base64')

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      OCR_MODEL,
      max_tokens: 4000,
      messages: [{
        role:    'user',
        content: [
          {
            type:   'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: 'Extraia TODO o texto visível nestas páginas do livro didático escolar. Preserve parágrafos, títulos e exercícios. Retorne apenas o texto extraído, sem comentários.',
          },
        ],
      }],
    }),
  })

  // Ler headers de rate limit para delay inteligente
  const tokensRestantes = parseInt(resp.headers.get('anthropic-ratelimit-tokens-remaining') ?? '99999')
  if (tokensRestantes < 5000) {
    const resetHeader = resp.headers.get('anthropic-ratelimit-tokens-reset')
    if (resetHeader) {
      const resetMs = new Date(resetHeader).getTime() - Date.now()
      if (resetMs > 0 && resetMs < 120000) {
        process.stdout.write(` [aguardando ${Math.ceil(resetMs/1000)}s rate limit]`)
        await sleep(resetMs + 500)
      }
    }
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as any
    if (resp.status === 429) {
      // Rate limit: espera 60s e tenta de novo
      process.stdout.write(' [rate limit, aguardando 60s]')
      await sleep(60000)
      return ocrChunkPaginas(pdfBytes) // retry
    }
    throw new Error(`Anthropic OCR erro ${resp.status}: ${err?.error?.message ?? 'desconhecido'}`)
  }

  const data = await resp.json() as any
  return (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
}

async function extrairTextoPDF(pdfBytes: Uint8Array): Promise<string> {
  const pdfDoc    = await PDFDocument.load(pdfBytes)
  const numPages  = pdfDoc.getPageCount()
  const textos: string[] = []

  process.stdout.write(`\n     📖 ${numPages} páginas`)

  for (let inicio = 0; inicio < numPages; inicio += PAGINAS_POR_CHUNK) {
    const fim          = Math.min(inicio + PAGINAS_POR_CHUNK, numPages)
    const novoDoc      = await PDFDocument.create()
    const indices      = Array.from({ length: fim - inicio }, (_, i) => inicio + i)
    const pagCopiadas  = await novoDoc.copyPages(pdfDoc, indices)
    pagCopiadas.forEach(p => novoDoc.addPage(p))
    const chunkBytes   = await novoDoc.save()

    process.stdout.write(` [${inicio + 1}-${fim}]`)
    const texto = await ocrChunkPaginas(chunkBytes)
    textos.push(texto)

    if (fim < numPages) await sleep(DELAY_ENTRE_CHUNKS)
  }

  return textos.join('\n\n')
}

// ─── Embeddings via BGE-M3 (Ollama local) ────────────────────────────────────

async function gerarEmbeddingsBGE(textos: string[]): Promise<number[][]> {
  const resp = await fetch(`${OLLAMA_URL}/api/embed`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: EMBED_MODEL, input: textos }),
  })

  if (!resp.ok) {
    throw new Error(`Ollama BGE-M3 erro ${resp.status}: ${await resp.text()}`)
  }

  const data = await resp.json() as any
  return data.embeddings as number[][]
}

// ─── Pinecone ─────────────────────────────────────────────────────────────────

async function deletarVetoresPinecone(pdfId: string): Promise<void> {
  await fetch(`${PINECONE_HOST}/vectors/delete`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body:    JSON.stringify({ filter: { pdf_id: { '$eq': pdfId } } }),
  })
}

async function upsertPinecone(vetores: object[]): Promise<void> {
  const resp = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body:    JSON.stringify({ vectors: vetores }),
  })
  if (!resp.ok) throw new Error(`Pinecone upsert ${resp.status}: ${await resp.text()}`)
}

// ─── Status no Supabase ───────────────────────────────────────────────────────

async function atualizarStatus(pdfId: string, patch: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/pdfs_conteudista?id=eq.${pdfId}`, {
    method:  'PATCH',
    headers: {
      apikey:          SERVICE_KEY,
      Authorization:   `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
    body: JSON.stringify(patch),
  })
}

// ─── Pipeline principal por PDF ───────────────────────────────────────────────

async function indexarPDF(pdf: {
  id: string; nome: string; serie: string
  disciplina: string; bimestre: number
  url: string; tipo_documento: string
}): Promise<boolean> {
  try {
    // 1. Baixar PDF
    const resp = await fetch(pdf.url)
    if (!resp.ok) throw new Error(`Download falhou (${resp.status})`)
    const pdfBytes = new Uint8Array(await resp.arrayBuffer())
    const tamanho  = (pdfBytes.length / 1024 / 1024).toFixed(1)
    process.stdout.write(`\n   📥 ${tamanho}MB`)

    // 2. OCR via Anthropic Haiku (chunk por chunk de páginas)
    await atualizarStatus(pdf.id, { status_indexacao: 'indexando' })
    const textoCompleto = await extrairTextoPDF(pdfBytes)

    if (!textoCompleto.trim()) throw new Error('Nenhum texto extraído após OCR')

    const palavras = textoCompleto.split(/\s+/).length
    process.stdout.write(`\n     📝 ${palavras.toLocaleString('pt-BR')} palavras extraídas`)

    // 3. Chunking local
    const chunks = chunkarTexto(textoCompleto)
    process.stdout.write(` → ${chunks.length} chunks`)

    if (!chunks.length) throw new Error('Nenhum chunk gerado')

    // 4. Deletar vetores antigos (idempotência)
    await deletarVetoresPinecone(pdf.id)

    // 5. Embeddings BGE-M3 + Upsert Pinecone em batches
    let totalVetores = 0
    for (let i = 0; i < chunks.length; i += BATCH_PINECONE) {
      const lote       = chunks.slice(i, i + BATCH_PINECONE)
      const embeddings = await gerarEmbeddingsBGE(lote)

      const vetores = lote.map((texto, j) => ({
        id:     `${pdf.id}_${i + j}`,
        values: embeddings[j],
        metadata: {
          pdf_id:         pdf.id,
          nome_arquivo:   pdf.nome,
          disciplina:     pdf.disciplina,
          serie:          pdf.serie,
          bimestre:       pdf.bimestre,
          tipo_documento: pdf.tipo_documento ?? 'material_didatico',
          chunk_index:    i + j,
          texto:          texto.slice(0, 800),
        },
      }))

      await upsertPinecone(vetores)
      totalVetores += lote.length
    }

    // 6. Marcar como indexado
    await atualizarStatus(pdf.id, {
      status_indexacao: 'indexado',
      indexado_em:      new Date().toISOString(),
      chunks_indexados: totalVetores,
      erro_indexacao:   null,
    })

    process.stdout.write(`\n     ✅ ${totalVetores} vetores no Pinecone\n`)
    return true

  } catch (err: any) {
    await atualizarStatus(pdf.id, {
      status_indexacao: 'erro',
      erro_indexacao:   err.message?.slice(0, 500),
    })
    process.stdout.write(`\n     ❌ ${err.message}\n`)
    return false
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 Buscando PDFs no banco de dados...\n')

  let query = supabase
    .from('pdfs_conteudista')
    .select('id, nome, disciplina, serie, bimestre, url, tipo_documento, status_indexacao')
    .order('serie').order('disciplina')

  if (!reindexarTudo) {
    if (reindexarErros) {
      query = query.in('status_indexacao', ['nao_indexado', 'erro'])
    } else {
      query = query.eq('status_indexacao', 'nao_indexado')
    }
  }

  const { data: pdfs, error } = await query
  if (error) { console.error('❌', error.message); process.exit(1) }
  if (!pdfs?.length) { console.log('✅ Nenhum PDF pendente.'); return }

  // Resumo
  const porSerie = pdfs.reduce((acc: Record<string, number>, p) => {
    acc[p.serie] = (acc[p.serie] ?? 0) + 1; return acc
  }, {})
  console.log(`📚 ${pdfs.length} PDF(s) — embeddings: BGE-M3 local (grátis) | OCR: Anthropic Haiku\n`)
  Object.entries(porSerie).forEach(([s, n]) => console.log(`  ${s}: ${n}`))

  let ok = 0, erro = 0
  for (let i = 0; i < pdfs.length; i++) {
    const p = pdfs[i]
    process.stdout.write(`\n[${i+1}/${pdfs.length}] ${p.serie} / ${p.disciplina} / ${p.nome}`)
    const resultado = await indexarPDF(p)
    resultado ? ok++ : erro++
    if (i < pdfs.length - 1) await sleep(DELAY_ENTRE_PDFS)
  }

  console.log(`\n${'─'.repeat(55)}`)
  console.log(`✅ Indexados: ${ok} | ❌ Erros: ${erro}`)
  if (erro > 0) console.log('  → rode npm run indexar:erros para tentar os erros')
  console.log(`${'─'.repeat(55)}\n`)
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })
