// scripts/indexar-imagens-locais.ts
// Indexa material didático a partir de imagens locais (PNG/JPG) via Ollama gemma3:4b
// Custo: R$ 0,00 — 100% local
//
// Estrutura esperada:
//   Ensino Médio:
//     D:\MATERIAL DIDÁTICO - 2026\1ª série - EM\CIENCIAS DA NATUREZA\VOLUME 1\Biologia\Screenshot_1.png
//   Fundamental:
//     D:\MATERIAL DIDÁTICO - 2026\6º ano\MODULO 1\Língua Portuguesa\Screenshot_1.png
//     D:\MATERIAL DIDÁTICO - 2026\6º ano\Arte\Screenshot_1.png
//
// Uso:
//   npm run indexar:imagens              → indexa tudo
//   npm run indexar:imagens -- --serie "1ª série"  → só uma série
//   npm run indexar:imagens -- --dry-run → mostra o que vai indexar sem processar

import * as fs     from 'fs'
import * as path   from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

// ─── Config ──────────────────────────────────────────────────────────────────

const PINECONE_KEY  = process.env.PINECONE_API_KEY ?? ''
const PINECONE_HOST = process.env.PINECONE_HOST    ?? ''
const OLLAMA_URL    = process.env.OLLAMA_URL ?? 'http://localhost:11434'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL   ?? ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY ?? ''
const supabase       = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null

const VISION_MODEL       = 'gemma3:4b'              // OCR local (mantido)
const PINECONE_EMBED_URL = 'https://api.pinecone.io/embed'
const PINECONE_EMBED_MODEL = 'multilingual-e5-large' // mesmo modelo usado na chat-sofia (queries)
const WORDS_POR_CHUNK = 400
const OVERLAP_WORDS   = 50
const BATCH_IMAGENS   = 2   // imagens por chamada (3 terminais paralelos → não sobrecarregar Ollama)
const BATCH_PINECONE  = 50  // vetores por upsert

const BASE_PATH       = 'D:\\MATERIAL DIDÁTICO - 2026'
const CHECKPOINT_FILE = path.resolve('scripts', 'indexar-imagens-checkpoint.json')

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const RESET   = args.includes('--reset')
const SERIE_FILTRO = args.includes('--serie')
  ? args[args.indexOf('--serie') + 1]
  : null

// ─── Checkpoint (para/continua sem reprocessar) ───────────────────────────────

function carregarCheckpoint(): Set<string> {
  if (RESET) {
    if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE)
    console.log('🔄 Checkpoint resetado — indexando tudo do zero.')
    return new Set()
  }
  if (!fs.existsSync(CHECKPOINT_FILE)) return new Set()
  try {
    const ids = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8')) as string[]
    console.log(`📌 Checkpoint: ${ids.length} livros já indexados — continuando de onde parou.`)
    return new Set(ids)
  } catch { return new Set() }
}

function salvarCheckpoint(ids: Set<string>) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify([...ids], null, 2))
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

// Pinecone só aceita IDs ASCII — remove acentos e caracteres especiais
function toAsciiId(s: string): string {
  return s
    .normalize('NFD')                    // decompõe acentos: é → e + ́
    .replace(/[̀-ͯ]/g, '')     // remove diacríticos
    .replace(/[ªº]/g, '')               // remove ordinais
    .replace(/[^a-zA-Z0-9_\-]/g, '_')  // substitui resto por _
    .replace(/_+/g, '_')                // colapsa múltiplos _
    .replace(/^_|_$/g, '')             // remove _ nas bordas
}

// ─── Mapeamento de estrutura de pastas → metadados ───────────────────────────

// Ensino Médio: série por pasta
const SERIES_EM: Record<string, string> = {
  '1ª série - EM': '1ª série',
  '2ª série - EM': '2ª série',
  '3ª série - EM': '3ª série',
  '3º SÉRIE - EM': '3ª série',
}

// Fundamental: série por pasta
const SERIES_FUND: Record<string, string> = {
  '4º ano': '4º ano',
  '5º ano': '5º ano',
  '6º ano': '6º ano',
  '7º ano': '7º ano',
  '8º ano': '8º ano',
  '9º ano': '9º ano',
}

// Volume → bimestre (normaliza para relativo à série)
// Vol 1-12 = 1ª série, vol 13-24 = 2ª, vol 25-36 = 3ª
// Dentro de cada série: 1-3=1ºbi, 4-6=2ºbi, 7-9=3ºbi, 10-12=4ºbi
function volumeParaBimestre(volume: number): number {
  const volRelativo = ((volume - 1) % 12) + 1
  return Math.ceil(volRelativo / 3)
}

// Área de conhecimento → nome amigável
const AREA_NOME: Record<string, string> = {
  'CIENCIAS DA NATUREZA E SUAS TECNOLOGIAS': 'Ciências da Natureza',
  'CIENCIAS HUMANAS E SOCIAIS APLICADAS':    'Ciências Humanas',
  'LINGUAGENS E SUAS TECNOLOGIAS':           'Linguagens',
  'MATEMATICA':                              'Matemática',
  'INGLES':                                  'Inglês',
}

// Módulo → bimestre
function moduloParaBimestre(modulo: number): number {
  return modulo
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Livro {
  id:           string  // chave única para Pinecone
  serie:        string
  disciplina:   string
  area:         string
  bimestre:     number
  volume?:      number  // volume original da pasta (para exibição)
  tipo:         'medio' | 'fundamental'
  pasta:        string  // caminho absoluto da pasta com imagens
  imagens:      string[] // caminhos ordenados das imagens
}

// ─── Descoberta de livros na estrutura de pastas ──────────────────────────────

function listarImagens(pasta: string): string[] {
  if (!fs.existsSync(pasta)) return []
  return fs.readdirSync(pasta)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => {
      // ordena Screenshot_1, Screenshot_2, ... Screenshot_10, Screenshot_11
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0')
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0')
      return numA - numB
    })
    .map(f => path.join(pasta, f))
}

function descobrirLivrosEM(pastaBase: string): Livro[] {
  const livros: Livro[] = []

  for (const [pastaSerieNome, serieNome] of Object.entries(SERIES_EM)) {
    const pastaSerie = path.join(pastaBase, pastaSerieNome)
    if (!fs.existsSync(pastaSerie)) continue

    for (const pastaAreaNome of fs.readdirSync(pastaSerie)) {
      if (pastaAreaNome === 'PDFs Prontos') continue
      const pastaSub = path.join(pastaSerie, pastaAreaNome)
      if (!fs.statSync(pastaSub).isDirectory()) continue

      // Inglês — pasta direta sem volumes
      if (pastaAreaNome.toUpperCase() === 'INGLES') {
        const imagens = listarImagens(pastaSub)
        if (imagens.length > 0) {
          livros.push({
            id:         toAsciiId(`${serieNome}_ingles_ano`),
            serie:      serieNome,
            disciplina: 'Inglês',
            area:       'Inglês',
            bimestre:   0, // ano inteiro
            tipo:       'medio',
            pasta:      pastaSub,
            imagens,
          })
        }
        continue
      }

      const areaNome = AREA_NOME[pastaAreaNome.toUpperCase()] ?? pastaAreaNome

      // Volumes dentro da área
      for (const pastaVolNome of fs.readdirSync(pastaSub)) {
        const match = pastaVolNome.match(/^VOLUME\s+(\d+)$/i)
        if (!match) continue
        const volNum = parseInt(match[1])

        // Volume 1-12 = 1ª série, 13-24 = 2ª, 25-36 = 3ª
        // Como já estamos dentro da pasta da série, vol é 1-12
        const bimestre = volumeParaBimestre(volNum)
        const pastaVol = path.join(pastaSub, pastaVolNome)

        // Subpastas de disciplinas dentro do volume
        const subDirs = fs.readdirSync(pastaVol)
          .filter(d => fs.statSync(path.join(pastaVol, d)).isDirectory())

        if (subDirs.length === 0) {
          // Sem subpastas — imagens direto (ex: Matemática)
          const imagens = listarImagens(pastaVol)
          if (imagens.length > 0) {
            livros.push({
              id:         toAsciiId(`${serieNome}_${areaNome}_vol${volNum}`),
              serie:      serieNome,
              disciplina: areaNome,
              area:       areaNome,
              bimestre,
              volume:     volNum,
              tipo:       'medio',
              pasta:      pastaVol,
              imagens,
            })
          }
        } else {
          // Com subpastas — cada disciplina separada
          for (const discNome of subDirs) {
            const pastaDisc = path.join(pastaVol, discNome)
            const imagens = listarImagens(pastaDisc)
            if (imagens.length > 0) {
              livros.push({
                id:         toAsciiId(`${serieNome}_${discNome}_vol${volNum}`),
                serie:      serieNome,
                disciplina: discNome,
                area:       areaNome,
                bimestre,
                volume:     volNum,
                tipo:       'medio',
                pasta:      pastaDisc,
                imagens,
              })
            }
          }
        }
      }
    }
  }

  return livros
}

function descobrirLivrosFundamental(pastaBase: string): Livro[] {
  const livros: Livro[] = []

  for (const [pastaSerie, serieNome] of Object.entries(SERIES_FUND)) {
    const pastaSerieDir = path.join(pastaBase, pastaSerie)
    if (!fs.existsSync(pastaSerieDir)) continue

    for (const item of fs.readdirSync(pastaSerieDir)) {
      if (item === 'PDFs Prontos') continue
      const pastaItem = path.join(pastaSerieDir, item)
      if (!fs.statSync(pastaItem).isDirectory()) continue

      // Módulos
      const matchModulo = item.match(/^MODULO\s+(\d+)$/i)
      if (matchModulo) {
        const moduloNum = parseInt(matchModulo[1])
        const bimestre  = moduloParaBimestre(moduloNum)

        // Subpastas de disciplinas dentro do módulo
        const subDirs = fs.readdirSync(pastaItem)
          .filter(d => fs.statSync(path.join(pastaItem, d)).isDirectory())

        for (const discNome of subDirs) {
          const pastaDisc = path.join(pastaItem, discNome)
          const imagens = listarImagens(pastaDisc)
          if (imagens.length > 0) {
            livros.push({
              id:         toAsciiId(`${serieNome}_${discNome}_mod${moduloNum}`),
              serie:      serieNome,
              disciplina: discNome,
              area:       'Fundamental',
              bimestre,
              tipo:       'fundamental',
              pasta:      pastaDisc,
              imagens,
            })
          }
        }
        continue
      }

      // Disciplinas soltas (Arte, Inglês, Produção Textual)
      const imagens = listarImagens(pastaItem)
      if (imagens.length > 0) {
        livros.push({
          id:         toAsciiId(`${serieNome}_${item}_ano`),
          serie:      serieNome,
          disciplina: item,
          area:       'Fundamental',
          bimestre:   0, // ano inteiro
          tipo:       'fundamental',
          pasta:      pastaItem,
          imagens,
        })
      }
    }
  }

  return livros
}

// ─── OCR via Ollama (gemma3:4b) ───────────────────────────────────────────────

interface OcrResultado {
  pagina: number | null
  texto:  string
}

async function ocrImagem(caminho: string, tentativa = 1): Promise<OcrResultado> {
  const image = fs.readFileSync(caminho).toString('base64')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min por imagem

    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  controller.signal,
      body: JSON.stringify({
        model:  VISION_MODEL,
        stream: false,
        messages: [{
          role:    'user',
          content: `Analise esta página do livro didático escolar e responda APENAS com um JSON válido contendo:
1. "pagina": o número de página impresso na imagem (inteiro). Se não encontrar, use null.
2. "texto": TODO o texto visível na página (parágrafos, títulos, subtítulos, enunciados de exercícios).

Formato esperado (sem texto fora do JSON):
{"pagina": 42, "texto": "conteúdo completo da página..."}`,
          images: [image],
        }],
      }),
    })
    clearTimeout(timeout)

    if (!resp.ok) throw new Error(`Ollama OCR ${resp.status}: ${await resp.text()}`)
    const data = await resp.json() as any
    const content: string = data.message?.content ?? ''

    // Extrai o JSON da resposta (modelo pode adicionar texto ao redor)
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          pagina: typeof parsed.pagina === 'number' ? Math.round(parsed.pagina) : null,
          texto:  typeof parsed.texto  === 'string' ? parsed.texto : content,
        }
      }
    } catch { /* fallback abaixo */ }

    // Fallback: retorna o texto bruto sem número de página
    return { pagina: null, texto: content }

  } catch (err: any) {
    if (tentativa <= 3) {
      const espera = tentativa * 15000 // 15s, 30s, 45s
      process.stdout.write(` [retry ${tentativa}/3 em ${espera/1000}s]`)
      await new Promise(r => setTimeout(r, espera))
      return ocrImagem(caminho, tentativa + 1)
    }
    throw new Error(`OCR falhou após 3 tentativas: ${err.message}`)
  }
}

// ─── Chunking com rastreamento de página ─────────────────────────────────────

interface ChunkComPagina {
  texto:  string
  pagina: number | null
}

function chunkarComPaginas(paginas: OcrResultado[]): ChunkComPagina[] {
  // Monta array plano de palavras, cada uma com a página de origem
  const palavras: { word: string; pagina: number | null }[] = []
  for (const { pagina, texto } of paginas) {
    for (const word of texto.replace(/\s+/g, ' ').trim().split(' ')) {
      if (word) palavras.push({ word, pagina })
    }
  }

  const chunks: ChunkComPagina[] = []
  let inicio = 0
  while (inicio < palavras.length) {
    const fim   = Math.min(inicio + WORDS_POR_CHUNK, palavras.length)
    const slice = palavras.slice(inicio, fim)
    const texto = slice.map(w => w.word).join(' ')
    if (texto.trim().length > 50) {
      chunks.push({ texto, pagina: slice[0]?.pagina ?? null })
    }
    if (fim === palavras.length) break
    inicio = fim - OVERLAP_WORDS
  }
  return chunks
}

// ─── Embeddings via Pinecone Inference API (multilingual-e5-large) ──────────
// IMPORTANTE: usa o mesmo modelo que chat-sofia usa nas queries (input_type: query)
// Aqui usamos input_type: passage (indexação) — garantindo consistência do espaço vetorial

async function gerarEmbeddings(textos: string[], tentativa = 1): Promise<number[][]> {
  try {
    const resp = await fetch(PINECONE_EMBED_URL, {
      method:  'POST',
      headers: {
        'Content-Type':            'application/json',
        'Api-Key':                 PINECONE_KEY,
        'X-Pinecone-API-Version':  '2024-10',
      },
      body: JSON.stringify({
        model:      PINECONE_EMBED_MODEL,
        inputs:     textos.map(text => ({ text })),
        parameters: { input_type: 'passage', truncate: 'END' },
      }),
    })

    if (!resp.ok) throw new Error(`Pinecone embed ${resp.status}: ${await resp.text()}`)
    const data = await resp.json() as any
    return (data.data as any[]).map(d => d.values as number[])

  } catch (err: any) {
    if (tentativa <= 3) {
      const espera = tentativa * 10000 // 10s, 20s, 30s
      process.stdout.write(` [embed retry ${tentativa}/3]`)
      await new Promise(r => setTimeout(r, espera))
      return gerarEmbeddings(textos, tentativa + 1)
    }
    throw new Error(`Embed falhou após 3 tentativas: ${err.message}`)
  }
}

// ─── Pinecone ─────────────────────────────────────────────────────────────────

async function deletarVetores(livroId: string) {
  await fetch(`${PINECONE_HOST}/vectors/delete`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body:    JSON.stringify({ filter: { livro_id: { '$eq': livroId } } }),
  })
}

async function upsertPinecone(vetores: object[]) {
  const resp = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body:    JSON.stringify({ vectors: vetores }),
  })
  if (!resp.ok) throw new Error(`Pinecone upsert ${resp.status}: ${await resp.text()}`)
}

// ─── Catálogo do RAG (Supabase) ────────────────────────────────────────────────
// Espelha o que está no Pinecone para a UI de gestão poder navegar/excluir
// sem depender de "listar valores distintos de metadata" (que o Pinecone não tem).

// Roda uma vez no início: garante que TODO livro descoberto localmente tenha uma
// linha no catálogo (mesmo os já indexados em runs anteriores a este recurso),
// sem sobrescrever total_vetores/indexado de linhas que já existem.
async function sincronizarCatalogoInicial(livros: Livro[], checkpoint: Set<string>) {
  if (!supabase) return
  const linhas = livros.map(l => ({
    livro_id:   l.id,
    serie:      l.serie,
    disciplina: l.disciplina,
    area:       l.area || null,
    bimestre:   l.bimestre,
    volume:     l.volume ?? null,
    tipo:       l.tipo,
    indexado:   checkpoint.has(l.id),
  }))
  for (let i = 0; i < linhas.length; i += 200) {
    const lote = linhas.slice(i, i + 200)
    const { error } = await supabase
      .from('rag_material_indexado')
      .upsert(lote, { onConflict: 'livro_id', ignoreDuplicates: true })
    if (error) console.error('⚠️  Falha ao sincronizar catálogo (seed):', error.message)
  }
}

// Chamado após indexação (ou remoção) bem-sucedida de um livro específico.
async function atualizarCatalogo(livro: Livro, totalVetores: number) {
  if (!supabase) return
  const { error } = await supabase
    .from('rag_material_indexado')
    .upsert({
      livro_id:      livro.id,
      serie:         livro.serie,
      disciplina:    livro.disciplina,
      area:          livro.area || null,
      bimestre:      livro.bimestre,
      volume:        livro.volume ?? null,
      tipo:          livro.tipo,
      total_vetores: totalVetores,
      indexado:      true,
      indexado_em:   new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'livro_id' })
  if (error) console.error('⚠️  Falha ao atualizar catálogo:', error.message)
}

// ─── Pipeline de um livro ─────────────────────────────────────────────────────

async function indexarLivro(livro: Livro, idx: number, total: number): Promise<boolean> {
  const volSuffix = livro.volume != null ? ` vol${livro.volume}` : ''
  const label = `[${idx}/${total}] ${livro.serie} / ${livro.disciplina}${livro.bimestre ? ` / ${livro.bimestre}º bi${volSuffix}` : ' / ano inteiro'}`
  process.stdout.write(`\n${label}`)
  process.stdout.write(`\n   📸 ${livro.imagens.length} imagens`)

  try {
    // 1. OCR — uma imagem por vez para extrair página + texto
    const resultados: OcrResultado[] = []
    for (let i = 0; i < livro.imagens.length; i++) {
      process.stdout.write(` [${i + 1}/${livro.imagens.length}]`)
      const resultado = await ocrImagem(livro.imagens[i])
      resultados.push(resultado)
    }

    const totalPalavras = resultados.reduce((acc, r) => acc + r.texto.split(/\s+/).length, 0)
    if (!totalPalavras) throw new Error('Nenhum texto extraído')

    const paginasEncontradas = resultados.filter(r => r.pagina !== null).length
    process.stdout.write(`\n   📝 ${totalPalavras.toLocaleString('pt-BR')} palavras | 📄 ${paginasEncontradas}/${resultados.length} páginas identificadas`)

    // 2. Chunking com rastreamento de página
    const chunks = chunkarComPaginas(resultados)
    process.stdout.write(` → ${chunks.length} chunks`)
    if (!chunks.length) throw new Error('Nenhum chunk gerado')

    // 3. Deletar vetores antigos + upsert novos
    await deletarVetores(livro.id)

    let totalVetores = 0
    for (let i = 0; i < chunks.length; i += BATCH_PINECONE) {
      const lote       = chunks.slice(i, i + BATCH_PINECONE)
      const embeddings = await gerarEmbeddings(lote.map(c => c.texto))
      const vetores    = lote.map((chunk, j) => ({
        id:     `img_${livro.id}_${i + j}`,
        values: embeddings[j],
        metadata: {
          livro_id:    livro.id,
          disciplina:  livro.disciplina,
          area:        livro.area,
          serie:       livro.serie,
          bimestre:    livro.bimestre,
          tipo:        livro.tipo,
          fonte:       'imagem_local',
          chunk_index: i + j,
          ...(chunk.pagina !== null ? { pagina: chunk.pagina } : {}),
          texto:       chunk.texto.slice(0, 800),
        },
      }))
      await upsertPinecone(vetores)
      totalVetores += lote.length
    }

    process.stdout.write(`\n   ✅ ${totalVetores} vetores no Pinecone\n`)
    await atualizarCatalogo(livro, totalVetores)
    return true

  } catch (err: any) {
    process.stdout.write(`\n   ❌ ${err.message}\n`)
    return false
  }
}



// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🖼️  Indexador de Imagens Locais — Ollama OCR + Pinecone Inference\n')
  console.log(`📁 Base: ${BASE_PATH}`)
  console.log(`🤖 OCR: ${VISION_MODEL} (local) | Embeddings: ${PINECONE_EMBED_MODEL} (Pinecone API)\n`)

  // Descobrir todos os livros
  const livrosEM   = descobrirLivrosEM(BASE_PATH)
  const livrosFund = descobrirLivrosFundamental(BASE_PATH)
  let livros = [...livrosEM, ...livrosFund]

  // Filtro opcional por série
  if (SERIE_FILTRO) {
    livros = livros.filter(l => l.serie.includes(SERIE_FILTRO))
    console.log(`🔍 Filtro: "${SERIE_FILTRO}"`)
  }

  if (!livros.length) {
    console.log('❌ Nenhum livro encontrado. Verifique o caminho BASE_PATH.')
    return
  }

  // Resumo
  const porSerie = livros.reduce((acc: Record<string, number>, l) => {
    acc[l.serie] = (acc[l.serie] ?? 0) + 1; return acc
  }, {})
  const totalImagens = livros.reduce((acc, l) => acc + l.imagens.length, 0)

  console.log(`📚 ${livros.length} livros encontrados | ${totalImagens.toLocaleString('pt-BR')} imagens total\n`)
  Object.entries(porSerie).forEach(([s, n]) => console.log(`  ${s}: ${n} livros`))

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — nenhum dado foi processado.')
    console.log('   Remova --dry-run para indexar.\n')
    livros.forEach((l, i) => {
      console.log(`  [${i+1}] ${l.serie} / ${l.disciplina} / ${l.bimestre ? `${l.bimestre}º bi` : 'ano'} — ${l.imagens.length} imgs — ${l.pasta}`)
    })
    return
  }

  // Checkpoint — pula os já processados
  const checkpoint = carregarCheckpoint()
  const pendentes  = livros.filter(l => !checkpoint.has(l.id))

  // Sincroniza o catálogo (Supabase) com tudo que foi descoberto localmente —
  // roda sempre, mesmo se não houver nada pendente, para popular metadados
  // (série/disciplina/bimestre) de livros indexados antes deste recurso existir.
  await sincronizarCatalogoInicial(livros, checkpoint)

  if (pendentes.length === 0) {
    console.log('\n✅ Todos os livros já foram indexados. Use --reset para reindexar.\n')
    return
  }
  if (pendentes.length < livros.length) {
    console.log(`⏭️  Pulando ${livros.length - pendentes.length} já indexados | Restam: ${pendentes.length}\n`)
  }

  // Processar
  let ok = 0, erro = 0
  for (let i = 0; i < pendentes.length; i++) {
    const resultado = await indexarLivro(pendentes[i], i + 1, pendentes.length)
    if (resultado) {
      checkpoint.add(pendentes[i].id)
      salvarCheckpoint(checkpoint)
      ok++
    } else {
      erro++
    }
  }

  console.log(`\n${'─'.repeat(55)}`)
  console.log(`✅ Indexados: ${ok} | ❌ Erros: ${erro} | Total acumulado: ${checkpoint.size}/${livros.length}`)
  if (erro > 0) console.log('  → rode novamente para tentar os que falharam')
  console.log(`${'─'.repeat(55)}\n`)
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })
