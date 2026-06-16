// scripts/testar-indexacao.ts
// Testa o pipeline de indexação com um único PDF
// Uso: npx tsx scripts/testar-indexacao.ts

import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL    ?? ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY ?? ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY    ?? ''
const PINECONE_KEY  = process.env.PINECONE_API_KEY     ?? ''
const PINECONE_HOST = process.env.PINECONE_HOST        ?? ''
const OLLAMA_URL    = 'http://localhost:11434'

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Preencha VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Buscar o primeiro PDF
  const { data: pdfs, error: dbErr } = await supabase
    .from('pdfs_conteudista')
    .select('id, nome, disciplina, serie, url')
    .limit(1)

  if (dbErr || !pdfs?.length) {
    console.error('❌ Erro ao buscar PDF:', dbErr?.message ?? 'Nenhum PDF encontrado')
    process.exit(1)
  }

  const pdf = pdfs[0]
  console.log('\n📄 PDF para testar:')
  console.log(`   Nome: ${pdf.nome}  |  Série: ${pdf.serie}`)
  console.log(`   URL:  ${pdf.url}\n`)

  // 2. Baixar e verificar tamanho
  console.log('📥 Baixando PDF...')
  const resp = await fetch(pdf.url)
  const pdfBytes = new Uint8Array(await resp.arrayBuffer())
  console.log(`   Tamanho: ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB`)

  // 3. Contar páginas e extrair apenas as 2 primeiras (teste rápido)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  console.log(`   Páginas totais: ${pdfDoc.getPageCount()}`)

  const novoDoc    = await PDFDocument.create()
  const paginas    = await novoDoc.copyPages(pdfDoc, [0, 1]) // só pg 1 e 2
  paginas.forEach(p => novoDoc.addPage(p))
  const chunk2pags = await novoDoc.save()

  // 4. OCR com Anthropic Haiku
  console.log('\n🔍 Testando OCR (2 primeiras páginas) com claude-sonnet-4-6...')
  const base64 = Buffer.from(chunk2pags).toString('base64')

  const ocrResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extraia o texto visível nestas páginas. Retorne apenas o texto.' },
        ],
      }],
    }),
  })

  console.log(`   Status Anthropic: ${ocrResp.status}`)
  if (ocrResp.ok) {
    const ocrData = await ocrResp.json() as any
    const texto = ocrData.content?.[0]?.text ?? ''
    console.log(`   ✅ Tokens usados: ${ocrData.usage?.input_tokens} input / ${ocrData.usage?.output_tokens} output`)
    console.log(`   Prévia: "${texto.slice(0, 200)}..."`)
  } else {
    const err = await ocrResp.json() as any
    console.log(`   ❌ Erro: ${err?.error?.message}`)
  }

  // 5. Testar BGE-M3 embedding
  console.log('\n🧮 Testando embedding BGE-M3 via Ollama...')
  const embResp = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'bge-m3:567m', input: ['texto de teste para embedding'] }),
  })

  if (embResp.ok) {
    const embData = await embResp.json() as any
    const dims = embData.embeddings?.[0]?.length
    console.log(`   ✅ Embedding gerado: ${dims} dimensões`)
  } else {
    console.log(`   ❌ Ollama não respondeu (status ${embResp.status})`)
  }

  // 6. Testar Pinecone (só verifica conectividade)
  if (PINECONE_KEY && PINECONE_HOST) {
    console.log('\n📌 Testando conectividade com Pinecone...')
    const pingResp = await fetch(`${PINECONE_HOST}/describe_index_stats`, {
      headers: { 'Api-Key': PINECONE_KEY },
    })
    if (pingResp.ok) {
      const stats = await pingResp.json() as any
      console.log(`   ✅ Pinecone OK — vetores no índice: ${stats.totalVectorCount ?? stats.total_vector_count ?? 0}`)
    } else {
      console.log(`   ❌ Pinecone erro ${pingResp.status}`)
    }
  }

  console.log('\n✅ Diagnóstico completo. Se tudo OK acima, rode: npm run indexar:erros\n')
}

main().catch(err => { console.error('Erro:', err); process.exit(1) })
