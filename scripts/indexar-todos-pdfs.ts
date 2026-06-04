// scripts/indexar-todos-pdfs.ts
// Indexa no Pinecone todos os PDFs existentes em pdfs_conteudista
//
// Arquitetura correta:
//   1. Node.js (este script): baixa o PDF + extrai texto com pdf-parse (gratuito, sem rate limit)
//   2. Edge Function: recebe o texto já extraído + faz chunking + embeddings + Pinecone
//
// Uso:
//   npm run indexar                     → indexa status = 'nao_indexado'
//   npm run indexar:erros               → indexa status IN ('nao_indexado', 'erro')
//   npm run indexar:tudo                → reindexar todos

import { createClient } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY ?? ''
const CONCORRENCIA = 2     // 2 PDFs ao mesmo tempo (seguro para Voyage AI)
const DELAY_MS     = 1000  // 1s entre batches

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const args           = process.argv.slice(2)
const reindexarErros = args.includes('--reindexar-erros')
const reindexarTudo  = args.includes('--tudo')

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Baixa o PDF via URL pública e extrai o texto com pdfjs-dist.
 * Sem uso de LLM — gratuito e sem rate limits.
 */
async function extrairTextoPDF(url: string): Promise<string> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Erro ao baixar PDF (${resp.status}): ${url}`)

  const data     = new Uint8Array(await resp.arrayBuffer())
  const loadTask = pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false })
  const pdfDoc   = await loadTask.promise

  const textosPaginas: string[] = []
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page    = await pdfDoc.getPage(i)
    const content = await page.getTextContent()
    const texto   = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str)
      .join(' ')
    textosPaginas.push(texto)
  }

  const textoFinal = textosPaginas.join('\n').trim()
  if (!textoFinal) throw new Error('PDF sem texto extraível (pode ser imagem escaneada sem OCR)')

  return textoFinal
}

/**
 * Envia o texto já extraído para a Edge Function fazer
 * chunking + embeddings + upsert no Pinecone.
 */
async function indexarPDF(pdfId: string, nome: string, url: string): Promise<boolean> {
  try {
    // 1. Extrair texto localmente (sem LLM, sem rate limit)
    const texto = await extrairTextoPDF(url)
    const palavras = texto.split(/\s+/).length
    process.stdout.write(`  📄 ${nome}: ${palavras.toLocaleString('pt-BR')} palavras → `)

    // 2. Enviar texto para Edge Function (só embedding + Pinecone)
    const { data, error } = await supabase.functions.invoke('indexar-documento', {
      body: { pdf_id: pdfId, texto, acao: 'indexar' },
    })

    if (error) {
      let detalhe = error.message
      try {
        const ctx = (error as any)?.context
        if (ctx && typeof ctx.text === 'function') {
          const txt = await ctx.text()
          const parsed = JSON.parse(txt)
          detalhe = parsed?.erro ?? parsed?.message ?? txt
        }
      } catch { /* usa error.message */ }
      console.log(`❌ ${detalhe}`)
      return false
    }

    if (data?.erro) {
      console.log(`❌ ${data.erro}`)
      return false
    }

    console.log(`✅ ${data?.chunks ?? '?'} chunks`)
    return true

  } catch (err: any) {
    console.log(`❌ ${err.message}`)
    return false
  }
}

async function main() {
  console.log('\n🔍 Buscando PDFs no banco de dados...\n')

  let query = supabase
    .from('pdfs_conteudista')
    .select('id, nome, disciplina, serie, url, status_indexacao')
    .order('serie').order('disciplina')

  if (!reindexarTudo) {
    if (reindexarErros) {
      query = query.in('status_indexacao', ['nao_indexado', 'erro'])
    } else {
      query = query.eq('status_indexacao', 'nao_indexado')
    }
  }

  const { data: pdfs, error } = await query

  if (error) {
    console.error('❌ Erro ao buscar PDFs:', error.message)
    process.exit(1)
  }

  if (!pdfs?.length) {
    console.log('✅ Nenhum PDF pendente de indexação.')
    return
  }

  // Resumo por série
  const porSerie = pdfs.reduce((acc: Record<string, number>, p) => {
    acc[p.serie] = (acc[p.serie] ?? 0) + 1
    return acc
  }, {})

  console.log(`📚 ${pdfs.length} PDF(s) para indexar:\n`)
  Object.entries(porSerie).forEach(([serie, count]) => {
    console.log(`  ${serie}: ${count} PDF(s)`)
  })
  console.log()

  let ok = 0
  let erro = 0

  for (let i = 0; i < pdfs.length; i += CONCORRENCIA) {
    const lote = pdfs.slice(i, i + CONCORRENCIA)
    console.log(`📦 Batch ${Math.floor(i / CONCORRENCIA) + 1}/${Math.ceil(pdfs.length / CONCORRENCIA)}:`)

    const resultados = await Promise.all(
      lote.map(p => indexarPDF(p.id, `${p.serie} / ${p.disciplina} / ${p.nome}`, p.url))
    )

    ok   += resultados.filter(Boolean).length
    erro += resultados.filter(r => !r).length

    if (i + CONCORRENCIA < pdfs.length) await sleep(DELAY_MS)
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Indexados com sucesso: ${ok}`)
  if (erro > 0) {
    console.log(`❌ Com erro: ${erro} (rode com --reindexar-erros para tentar novamente)`)
  }
  console.log(`${'─'.repeat(50)}\n`)
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
