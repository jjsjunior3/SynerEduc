// scripts/reindexar-embeddings.ts
// Re-embeda vetores existentes no Pinecone usando multilingual-e5-large
// SEM re-fazer OCR — usa o texto já armazenado no metadata.
//
// Uso:
//   npx tsx scripts/reindexar-embeddings.ts            → re-embeda todos
//   npx tsx scripts/reindexar-embeddings.ts --dry-run  → mostra o que faria

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const PINECONE_KEY        = process.env.PINECONE_API_KEY ?? ''
const PINECONE_HOST       = process.env.PINECONE_HOST    ?? ''
const PINECONE_EMBED_MODEL = 'multilingual-e5-large'
const BATCH_EMBED         = 50   // chunks por chamada de embedding
const BATCH_UPSERT        = 50   // vetores por upsert
const DRY_RUN             = process.argv.includes('--dry-run')

// ─── IDs dos livros indexados (do checkpoint) ─────────────────────────────────

const LIVROS_INDEXADOS = [
  '1_serie_Biologia_vol1',  '1_serie_Fisica_vol1',  '1_serie_Quimica_vol1',
  '1_serie_Biologia_vol2',  '1_serie_Fisica_vol2',  '1_serie_Quimica_vol2',
  '1_serie_Biologia_vol3',  '1_serie_Fisica_vol3',  '1_serie_Quimica_vol3',
  '1_serie_Biologia_vol4',  '1_serie_Fisica_vol4',  '1_serie_Quimica_vol4',
  '1_serie_Biologia_vol5',
  '1_serie_Biologia_vol10', '1_serie_Fisica_vol10', '1_serie_Quimica_vol10',
  '1_serie_Biologia_vol11', '1_serie_Fisica_vol11', '1_serie_Quimica_vol11',
  '1_serie_Biologia_vol12', '1_serie_Fisica_vol12', '1_serie_Quimica_vol12',
]

// ─── Pinecone: listar IDs de um livro ────────────────────────────────────────

async function listarIds(livroId: string): Promise<string[]> {
  const ids: string[] = []
  let paginationToken: string | undefined

  do {
    const url = new URL(`${PINECONE_HOST}/vectors/list`)
    url.searchParams.set('prefix', `img_${livroId}_`)
    url.searchParams.set('limit', '100')
    if (paginationToken) url.searchParams.set('paginationToken', paginationToken)

    const resp = await fetch(url.toString(), {
      headers: { 'Api-Key': PINECONE_KEY },
    })
    if (!resp.ok) throw new Error(`list ${resp.status}: ${await resp.text()}`)

    const data = await resp.json() as any
    ids.push(...(data.vectors ?? []).map((v: any) => v.id as string))
    paginationToken = data.pagination?.next
  } while (paginationToken)

  return ids
}

// ─── Pinecone: buscar vetores por IDs ────────────────────────────────────────

interface VetorExistente {
  id:       string
  texto:    string
  metadata: Record<string, unknown>
}

async function buscarVetores(ids: string[]): Promise<VetorExistente[]> {
  if (!ids.length) return []

  // fetch em lotes de 1000 (limite Pinecone)
  const resultado: VetorExistente[] = []
  for (let i = 0; i < ids.length; i += 1000) {
    const lote = ids.slice(i, i + 1000)
    const resp = await fetch(`${PINECONE_HOST}/vectors/fetch?ids=${lote.map(encodeURIComponent).join('&ids=')}`, {
      headers: { 'Api-Key': PINECONE_KEY },
    })
    if (!resp.ok) throw new Error(`fetch ${resp.status}: ${await resp.text()}`)
    const data = await resp.json() as any

    for (const [id, v] of Object.entries(data.vectors ?? {})) {
      const meta = (v as any).metadata ?? {}
      if (meta.texto) {
        resultado.push({ id, texto: meta.texto as string, metadata: meta })
      }
    }
  }
  return resultado
}

// ─── Pinecone Inference: gerar embeddings ────────────────────────────────────

async function gerarEmbeddings(textos: string[], tentativa = 1): Promise<number[][]> {
  try {
    const resp = await fetch('https://api.pinecone.io/embed', {
      method:  'POST',
      headers: {
        'Content-Type':           'application/json',
        'Api-Key':                PINECONE_KEY,
        'X-Pinecone-API-Version': '2024-10',
      },
      body: JSON.stringify({
        model:      PINECONE_EMBED_MODEL,
        inputs:     textos.map(text => ({ text })),
        parameters: { input_type: 'passage', truncate: 'END' },
      }),
    })
    if (!resp.ok) throw new Error(`embed ${resp.status}: ${await resp.text()}`)
    const data = await resp.json() as any
    return (data.data as any[]).map((d: any) => d.values as number[])
  } catch (err: any) {
    if (tentativa <= 3) {
      process.stdout.write(` [retry ${tentativa}/3]`)
      await new Promise(r => setTimeout(r, tentativa * 10_000))
      return gerarEmbeddings(textos, tentativa + 1)
    }
    throw err
  }
}

// ─── Pinecone: upsert ────────────────────────────────────────────────────────

async function upsertVetores(vetores: object[]) {
  const resp = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body:    JSON.stringify({ vectors: vetores }),
  })
  if (!resp.ok) throw new Error(`upsert ${resp.status}: ${await resp.text()}`)
}

// ─── Pipeline por livro ───────────────────────────────────────────────────────

async function reindexarLivro(livroId: string, idx: number, total: number) {
  process.stdout.write(`\n[${idx}/${total}] ${livroId}`)

  // 1. Listar IDs existentes
  const ids = await listarIds(livroId)
  if (!ids.length) {
    process.stdout.write(' — nenhum vetor encontrado, pulando')
    return
  }
  process.stdout.write(` — ${ids.length} vetores`)

  // 2. Buscar texto do metadata
  const vetores = await buscarVetores(ids)
  process.stdout.write(` | ${vetores.length} com texto`)

  if (!vetores.length) {
    process.stdout.write(' — sem texto recuperável, pulando')
    return
  }

  if (DRY_RUN) {
    process.stdout.write(' [dry-run]')
    return
  }

  // 3. Re-embedar em lotes e upsert
  let atualizados = 0
  for (let i = 0; i < vetores.length; i += BATCH_EMBED) {
    const lote    = vetores.slice(i, i + BATCH_EMBED)
    const embeds  = await gerarEmbeddings(lote.map(v => v.texto))
    const payload = lote.map((v, j) => ({
      id:       v.id,
      values:   embeds[j],
      metadata: v.metadata,  // mantém todo o metadata original
    }))

    for (let k = 0; k < payload.length; k += BATCH_UPSERT) {
      await upsertVetores(payload.slice(k, k + BATCH_UPSERT))
    }
    atualizados += lote.length
    process.stdout.write(` [${atualizados}/${vetores.length}]`)
  }

  process.stdout.write(' ✅')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔄 Re-embedding Pinecone — BGE-M3 → multilingual-e5-large')
  console.log(`   Modelo: ${PINECONE_EMBED_MODEL} | input_type: passage`)
  console.log(`   Livros: ${LIVROS_INDEXADOS.length}`)
  if (DRY_RUN) console.log('   ⚠️  DRY RUN — nenhum dado será alterado\n')
  else         console.log('   Nenhum OCR necessário — usa texto já no metadata\n')

  let ok = 0, erro = 0
  for (let i = 0; i < LIVROS_INDEXADOS.length; i++) {
    try {
      await reindexarLivro(LIVROS_INDEXADOS[i], i + 1, LIVROS_INDEXADOS.length)
      ok++
    } catch (err: any) {
      process.stdout.write(` ❌ ${err.message}`)
      erro++
    }
  }

  console.log(`\n\n${'─'.repeat(55)}`)
  console.log(`✅ Re-indexados: ${ok} | ❌ Erros: ${erro}`)
  console.log(`   Espaço vetorial agora consistente com chat-sofia`)
  console.log(`${'─'.repeat(55)}\n`)
}

main().catch(err => { console.error('\nErro fatal:', err); process.exit(1) })
