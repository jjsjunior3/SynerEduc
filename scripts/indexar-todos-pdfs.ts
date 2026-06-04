// scripts/indexar-todos-pdfs.ts
// Indexa no Pinecone todos os PDFs existentes em pdfs_conteudista
// que ainda não foram indexados (status_indexacao = 'nao_indexado' ou 'erro')
//
// Uso:
//   npx tsx scripts/indexar-todos-pdfs.ts
//   npx tsx scripts/indexar-todos-pdfs.ts --reindexar-erros
//   npx tsx scripts/indexar-todos-pdfs.ts --tudo   (reindexar todos, inclusive já indexados)
//
// Requer arquivo .env.local com:
//   VITE_SUPABASE_URL=https://xxx.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...
//   (A Edge Function usa os outros secrets configurados no Supabase Dashboard)

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  ?? process.env.SUPABASE_URL ?? ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY ?? ''
const CONCORRENCIA  = 3    // indexar N PDFs ao mesmo tempo (respeitar rate limits)
const DELAY_MS      = 500  // delay entre batches

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const args         = process.argv.slice(2)
const reindexarErros = args.includes('--reindexar-erros')
const reindexarTudo  = args.includes('--tudo')

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function indexarPDF(pdfId: string, nome: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('indexar-documento', {
      body: { pdf_id: pdfId, acao: 'indexar' },
    })

    if (error) {
      // Tentar extrair o corpo do erro para mostrar a mensagem real
      const detalhe = (error as any)?.context?.json?.erro
        ?? (error as any)?.context?.text
        ?? error.message
      console.error(`  ❌ ${nome}: ${detalhe}`)
      return false
    }

    if (data?.erro) {
      console.error(`  ❌ ${nome}: ${data.erro}`)
      return false
    }

    console.log(`  ✅ ${nome}: ${data.chunks} chunks indexados`)
    return true
  } catch (err: any) {
    console.error(`  ❌ ${nome}: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('\n🔍 Buscando PDFs no banco de dados...\n')

  // Montar filtro de status
  let query = supabase
    .from('pdfs_conteudista')
    .select('id, nome, disciplina, serie, bimestre, status_indexacao')
    .order('serie')
    .order('disciplina')

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

  if (!pdfs || pdfs.length === 0) {
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

  // Processar em batches para respeitar rate limits
  let ok = 0
  let erro = 0

  for (let i = 0; i < pdfs.length; i += CONCORRENCIA) {
    const lote = pdfs.slice(i, i + CONCORRENCIA)

    console.log(`📦 Batch ${Math.floor(i / CONCORRENCIA) + 1}/${Math.ceil(pdfs.length / CONCORRENCIA)}:`)

    const resultados = await Promise.all(
      lote.map(p => indexarPDF(p.id, `${p.serie} / ${p.disciplina} / ${p.nome}`))
    )

    ok   += resultados.filter(Boolean).length
    erro += resultados.filter(r => !r).length

    if (i + CONCORRENCIA < pdfs.length) {
      await sleep(DELAY_MS)
    }
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
