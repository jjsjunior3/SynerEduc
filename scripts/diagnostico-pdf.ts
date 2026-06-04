// scripts/diagnostico-pdf.ts
// Testa extração de texto em um PDF real do banco
// Uso: npx tsx scripts/diagnostico-pdf.ts

import { createClient } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
)

// Pega 3 PDFs de séries diferentes para comparar
const { data: pdfs } = await supabase
  .from('pdfs_conteudista')
  .select('id, nome, serie, disciplina, url')
  .limit(3)

for (const pdf of pdfs ?? []) {
  console.log(`\n📄 ${pdf.serie} / ${pdf.disciplina} / ${pdf.nome}`)
  console.log(`   URL: ${pdf.url}`)

  const resp = await fetch(pdf.url)
  const data = new Uint8Array(await resp.arrayBuffer())
  console.log(`   Tamanho: ${(data.length / 1024 / 1024).toFixed(1)} MB`)

  const doc = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false
  }).promise

  console.log(`   Páginas: ${doc.numPages}`)

  // Testa as 3 primeiras páginas
  let totalChars = 0
  for (let i = 1; i <= Math.min(3, doc.numPages); i++) {
    const page    = await doc.getPage(i)
    const content = await page.getTextContent()
    const texto   = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str)
      .join(' ')
      .trim()
    totalChars += texto.length
    console.log(`   Página ${i}: ${texto.length} chars | "${texto.slice(0, 80)}..."`)
  }

  console.log(`   → ${totalChars > 100 ? '✅ TEM TEXTO' : '❌ SEM TEXTO (imagem/scan)'}`)
}
}

main().catch(console.error)
