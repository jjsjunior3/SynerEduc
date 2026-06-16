// supabase/functions/gerar-plano-aula/index.ts  v1
// Gera plano de aula completo com base no material indexado no Pinecone + Claude Sonnet
// Fluxo:
//   1. Valida JWT do professor
//   2. Busca contexto no Pinecone (série + disciplina)
//   3. Chama Claude Sonnet com prompt estruturado de plano de aula
//   4. Retorna JSON com todas as seções do plano

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')         ?? ''
const PINECONE_KEY  = Deno.env.get('PINECONE_API_KEY')          ?? ''
const PINECONE_HOST = Deno.env.get('PINECONE_HOST')             ?? ''
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')              ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

const PINECONE_EMBED_MODEL = 'multilingual-e5-large'
// Sonnet para geração — qualidade superior ao Haiku para planos estruturados
const CHAT_MODEL           = 'claude-sonnet-4-6'

// ─── Log ─────────────────────────────────────────────────────────────────────

async function logIA(row: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/agente_ia_log`, {
      method:  'POST',
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(row),
    })
  } catch (_) {}
}

// ─── Embedding ────────────────────────────────────────────────────────────────

async function gerarEmbedding(texto: string): Promise<number[]> {
  const resp = await fetch('https://api.pinecone.io/embed', {
    method:  'POST',
    headers: {
      'Content-Type':           'application/json',
      'Api-Key':                PINECONE_KEY,
      'X-Pinecone-API-Version': '2024-10',
    },
    body: JSON.stringify({
      model:      PINECONE_EMBED_MODEL,
      inputs:     [{ text: texto }],
      parameters: { input_type: 'query', truncate: 'END' },
    }),
  })
  if (!resp.ok) throw new Error(`Pinecone embed: ${resp.status}`)
  const data = await resp.json()
  return data.data?.[0]?.values as number[]
}

// ─── Busca Pinecone ───────────────────────────────────────────────────────────

interface Chunk {
  texto:  string
  pagina: number | null
}

async function buscarPinecone(
  vetor:      number[],
  serie:      string,
  disciplina: string,
): Promise<Chunk[]> {
  const body = {
    vector:          vetor,
    topK:            8,
    includeMetadata: true,
    filter: {
      serie:      { '$eq': serie },
      disciplina: { '$eq': disciplina },
    },
  }

  const resp = await fetch(`${PINECONE_HOST}/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body:    JSON.stringify(body),
  })
  if (!resp.ok) return []
  const data = await resp.json()

  return (data.matches ?? [])
    .filter((m: any) => m.score > 0.25)
    .map((m: any) => ({
      texto:  m.metadata?.texto  ?? '',
      pagina: m.metadata?.pagina ?? null,
    }))
    .filter((c: Chunk) => c.texto)
}

// ─── Prompt do plano de aula ──────────────────────────────────────────────────

function buildPrompt(params: {
  disciplina:   string
  serie:        string
  turma:        string
  tema:         string
  tipo:         string
  duracao:      string
  recursos:     string
  observacoes?: string
  chunks:       Chunk[]
}): string {
  const materialBlock = params.chunks.length > 0
    ? `<material_didatico>\n${params.chunks.map((c, i) => {
        const ref = c.pagina ? ` (pág. ${c.pagina})` : ''
        return `[Trecho ${i + 1}${ref}]\n${c.texto}`
      }).join('\n\n')}\n</material_didatico>`
    : '<material_didatico>Nenhum trecho encontrado para este tema — use seu conhecimento pedagógico geral.</material_didatico>'

  return `Você é um especialista em planejamento pedagógico. Gere um plano de aula completo e estruturado.

${materialBlock}

<dados_da_aula>
Disciplina: ${params.disciplina}
Série/Ano: ${params.serie}
Turma: ${params.turma}
Tema/Conteúdo: ${params.tema}
Tipo de aula: ${params.tipo}
Duração: ${params.duracao}
Recursos disponíveis: ${params.recursos}
${params.observacoes ? `Observações especiais: ${params.observacoes}` : ''}
</dados_da_aula>

Gere o plano de aula em formato JSON com EXATAMENTE esta estrutura (sem markdown, apenas JSON puro):

{
  "titulo": "Título da aula",
  "objetivo_geral": "O que o aluno deve aprender ao final",
  "objetivos_especificos": ["objetivo 1", "objetivo 2", "objetivo 3"],
  "competencias_bncc": ["código - descrição resumida"],
  "habilidades_bncc": ["código - habilidade"],
  "conteudos": ["Conteúdo 1", "Conteúdo 2"],
  "sequencia_didatica": {
    "inicio": {
      "duracao": "X min",
      "descricao": "Descrição das atividades de abertura/motivação",
      "atividades": ["atividade 1", "atividade 2"]
    },
    "desenvolvimento": {
      "duracao": "X min",
      "descricao": "Descrição das atividades centrais",
      "atividades": ["atividade 1", "atividade 2", "atividade 3"]
    },
    "fechamento": {
      "duracao": "X min",
      "descricao": "Síntese e avaliação formativa",
      "atividades": ["atividade 1", "atividade 2"]
    }
  },
  "avaliacao": "Como o professor vai verificar a aprendizagem",
  "recursos_materiais": ["recurso 1", "recurso 2"],
  "referencias": ["Referência do material didático com página se disponível"],
  "adaptacoes_inclusao": "Sugestões para alunos com necessidades especiais (se aplicável)",
  "tarefa_casa": "Atividade complementar para casa (opcional)"
}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { disciplina, serie, turma, tema, tipo, duracao, recursos, observacoes } = body

    if (!disciplina || !serie || !tema) {
      return new Response(
        JSON.stringify({ error: 'disciplina, serie e tema são obrigatórios' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Busca contexto no Pinecone (paralelo com nada — apenas uma chamada)
    const consultaPinecone = `${tema} ${disciplina} ${serie}`
    const vetor = await gerarEmbedding(consultaPinecone)
    const chunks = await buscarPinecone(vetor, serie, disciplina)

    // Gera o plano com Claude Sonnet
    const prompt = buildPrompt({ disciplina, serie, turma: turma ?? '', tema, tipo, duracao, recursos, observacoes, chunks })

    const t0 = Date.now()
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      CHAT_MODEL,
        max_tokens: 2048,
        system:     'Você é um especialista em planejamento pedagógico brasileiro. Responda SEMPRE com JSON puro e válido, sem markdown, sem blocos de código, sem texto antes ou depois do JSON.',
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as any
      throw new Error(`Claude: ${resp.status} ${err?.error?.message ?? ''}`)
    }

    const data  = await resp.json() as any
    const texto = data.content?.[0]?.text ?? ''
    const latencia = Date.now() - t0

    // Parse do JSON retornado
    let plano: Record<string, unknown>
    try {
      // Remove possível markdown se o modelo desobedeceu
      const clean = texto.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      plano = JSON.parse(clean)
    } catch {
      throw new Error('Claude retornou JSON inválido: ' + texto.slice(0, 200))
    }

    await logIA({
      agente:        'gerar-plano-aula',
      contexto:      `${disciplina} · ${serie}`,
      pergunta:      tema.slice(0, 300),
      turns:         1,
      input_tokens:  data.usage?.input_tokens  ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
      latencia_ms:   latencia,
      erro:          false,
    })

    return new Response(
      JSON.stringify({ plano, chunks_usados: chunks.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('gerar-plano-aula error:', err)
    await logIA({ agente: 'gerar-plano-aula', erro: true, erro_msg: err.message?.slice(0, 500) })
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
