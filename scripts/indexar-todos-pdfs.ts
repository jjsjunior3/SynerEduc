// scripts/indexar-todos-pdfs.ts
// Orquestrador: busca PDFs no banco e dispara um subprocess por PDF.
// Cada subprocess (indexar-pdf-worker.ts) processa um PDF e sai — memória 100% liberada.
//
// Uso:
//   npm run indexar          → indexa status = 'nao_indexado'
//   npm run indexar:erros    → indexa status IN ('nao_indexado', 'erro')
//   npm run indexar:tudo     → reindexar tudo

import { createClient } from '@supabase/supabase-js'
import { spawnSync }    from 'child_process'
import * as path        from 'path'
import * as dotenv      from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY ?? ''
const DELAY_ENTRE_PDFS = 65000 // 65s entre PDFs — Sonnet 4.6 tem 30k tokens/min

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Preencha VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local')
  process.exit(1)
}

const supabase       = createClient(SUPABASE_URL, SERVICE_KEY)
const args           = process.argv.slice(2)
const reindexarErros = args.includes('--reindexar-erros')
const reindexarTudo  = args.includes('--tudo')
const workerPath = path.resolve('scripts', 'indexar-pdf-worker.mjs') // pré-compilado: sem tsx em runtime
const nodeExe    = process.execPath

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

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

  const porSerie = pdfs.reduce((acc: Record<string, number>, p) => {
    acc[p.serie] = (acc[p.serie] ?? 0) + 1; return acc
  }, {})
  console.log(`📚 ${pdfs.length} PDF(s) — embeddings: BGE-M3 local (grátis) | OCR: Claude Sonnet\n`)
  Object.entries(porSerie).forEach(([s, n]) => console.log(`  ${s}: ${n}`))

  let ok = 0, erro = 0

  for (let i = 0; i < pdfs.length; i++) {
    const p = pdfs[i]
    process.stdout.write(`\n[${i + 1}/${pdfs.length}] ${p.serie} / ${p.disciplina} / ${p.nome}`)

    // Cada PDF roda em subprocess isolado — memória zerada a cada iteração
    const resultado = spawnSync(
      nodeExe,
      ['--max-old-space-size=512', workerPath, p.id],
      {
        stdio: 'inherit',
        env: { ...process.env, NODE_OPTIONS: '' },
        shell: false,
      }
    )

    if (resultado.status === 0) {
      ok++
    } else {
      erro++
    }

    if (i < pdfs.length - 1) await sleep(DELAY_ENTRE_PDFS)
  }

  console.log(`\n${'─'.repeat(55)}`)
  console.log(`✅ Indexados: ${ok} | ❌ Erros: ${erro}`)
  if (erro > 0) console.log('  → rode npm run indexar:erros para tentar os erros')
  console.log(`${'─'.repeat(55)}\n`)
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })
