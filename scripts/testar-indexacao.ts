// scripts/testar-indexacao.ts
// Testa a Edge Function indexar-documento com um único PDF
// Uso: npx tsx scripts/testar-indexacao.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL ?? ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY ?? ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Preencha VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// 1. Buscar o primeiro PDF do banco
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
console.log(`   ID:   ${pdf.id}`)
console.log(`   Nome: ${pdf.nome}`)
console.log(`   URL:  ${pdf.url}\n`)

// 2. Chamar a Edge Function
console.log('🚀 Chamando Edge Function indexar-documento...\n')

const { data, error } = await supabase.functions.invoke('indexar-documento', {
  body: { pdf_id: pdf.id, acao: 'indexar' },
})

console.log('--- Resposta da Edge Function ---')
console.log('data:', JSON.stringify(data, null, 2))
console.log('error:', JSON.stringify(error, null, 2))

// 3. Verificar status no banco após indexação
const { data: status } = await supabase
  .from('pdfs_conteudista')
  .select('status_indexacao, chunks_indexados, erro_indexacao')
  .eq('id', pdf.id)
  .single()

console.log('\n--- Status no banco após chamada ---')
console.log(JSON.stringify(status, null, 2))
