// supabase/functions/chat-sofia/index.ts
// Edge Function — Professora Sofia: RAG sobre material didático
//
// Fluxo:
//   1. Valida JWT do usuário
//   2. Gera embedding da pergunta via BGE-M3 (Ollama local) ← ou Pinecone inference
//   3. Busca chunks relevantes no Pinecone (filtro: serie, disciplina)
//   4. Monta contexto + histórico
//   5. Chama Claude Haiku para gerar resposta amigável
//
// Secrets necessários:
//   ANTHROPIC_API_KEY
//   PINECONE_API_KEY
//   PINECONE_HOST
//   OLLAMA_URL          ← URL do Ollama acessível pela Edge Function
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY')  ?? ''
const PINECONE_KEY   = Deno.env.get('PINECONE_API_KEY')   ?? ''
const PINECONE_HOST  = Deno.env.get('PINECONE_HOST')      ?? ''
const OLLAMA_URL     = Deno.env.get('OLLAMA_URL')         ?? 'http://localhost:11434'
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')       ?? ''
// SUPABASE_SERVICE_ROLE_KEY é um secret padrão do Supabase — não precisa configurar manualmente
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

// Pinecone inference API — multilingual-e5-large (1024 dims, compatível com BGE-M3)
// Não depende do Ollama local: funciona direto nos servidores do Supabase
const PINECONE_EMBED_MODEL = 'multilingual-e5-large'
const CHAT_MODEL           = 'claude-haiku-4-5-20251001'
const TOP_K                = 6   // chunks recuperados do Pinecone

// ─── Log assíncrono ───────────────────────────────────────────────────────────

async function logIA(row: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/agente_ia_log`, {
      method: 'POST',
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

// ─── System prompt da Professora Sofia ───────────────────────────────────────

function systemPrompt(serie?: string, disciplina?: string, nomeAluno?: string): string {
  return `Você é a Professora Sofia, assistente de estudos do Colégio Conexão Maranhense.
Você é jovem, animada, paciente e fala de forma clara e acolhedora com os alunos.
Use linguagem simples e incentivadora. Emojis são bem-vindos com moderação.

${nomeAluno ? `Você está conversando com ${nomeAluno}.` : ''}
${serie ? `O aluno está na ${serie}.` : ''}
${disciplina ? `O foco atual é ${disciplina}.` : ''}

<regras>
- Use os trechos do material didático fornecidos em <contexto> para embasar sua resposta
- Se a pergunta não tiver relação com estudos escolares, responda brevemente e redirecione
- NUNCA invente conteúdo que não está no contexto — se não souber, diga que vai buscar nos livros
- Respostas curtas e diretas (máx. 3 parágrafos) — o aluno está no celular
- Sempre termine com uma pergunta de curiosidade ou incentivo
</regras>`
}

// ─── Geração de embedding via Pinecone Inference API ─────────────────────────
// multilingual-e5-large → 1024 dims, compatível com BGE-M3 indexado localmente

async function gerarEmbedding(texto: string): Promise<number[]> {
  const resp = await fetch('https://api.pinecone.io/embed', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key':      PINECONE_KEY,
      'X-Pinecone-API-Version': '2024-10',
    },
    body: JSON.stringify({
      model:  PINECONE_EMBED_MODEL,
      inputs: [{ text: texto }],
      parameters: { input_type: 'query', truncate: 'END' },
    }),
  })
  if (!resp.ok) throw new Error(`Pinecone embed: ${resp.status} ${await resp.text()}`)
  const data = await resp.json()
  return data.data?.[0]?.values as number[]
}

// ─── Busca no Pinecone ────────────────────────────────────────────────────────

interface ChunkResultado {
  texto:      string
  pagina:     number | null
  disciplina: string | null
}

async function buscarPinecone(
  vetor: number[],
  serie?: string,
  disciplina?: string,
): Promise<ChunkResultado[]> {
  const filter: Record<string, unknown> = {}
  if (serie)      filter['serie']      = { '$eq': serie }
  if (disciplina) filter['disciplina'] = { '$eq': disciplina }

  const body: Record<string, unknown> = {
    vector:          vetor,
    topK:            TOP_K,
    includeMetadata: true,
  }
  if (Object.keys(filter).length > 0) body['filter'] = filter

  const resp = await fetch(`${PINECONE_HOST}/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body: JSON.stringify(body),
  })

  if (!resp.ok) throw new Error(`Pinecone query: ${resp.status}`)
  const data = await resp.json()

  return (data.matches ?? [])
    .filter((m: any) => m.score > 0.3)
    .map((m: any) => ({
      texto:      m.metadata?.texto      ?? '',
      pagina:     m.metadata?.pagina     ?? null,
      disciplina: m.metadata?.disciplina ?? null,
    }))
    .filter((c: ChunkResultado) => c.texto)
}

// ─── Claude Haiku ─────────────────────────────────────────────────────────────

interface RespostaClaude {
  texto:         string
  input_tokens:  number
  output_tokens: number
}

async function chamarClaude(
  pergunta:    string,
  chunks:      ChunkResultado[],
  historico:   { role: string; content: string }[],
  serie?:      string,
  disciplina?: string,
  nomeAluno?:  string,
): Promise<RespostaClaude> {
  const contextBlock = chunks.length > 0
    ? `<contexto>\n${chunks.map((c, i) => {
        const ref = c.pagina ? ` (página ${c.pagina})` : ''
        return `[Trecho ${i + 1}${ref}]\n${c.texto}`
      }).join('\n\n')}\n</contexto>`
    : '<contexto>Nenhum trecho específico encontrado para esta pergunta.</contexto>'

  const mensagens = [
    ...historico.map(h => ({
      role:    h.role,
      content: h.content,
    })),
    {
      role:    'user',
      content: `${contextBlock}\n\n${pergunta}`,
    },
  ]

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      CHAT_MODEL,
      max_tokens: 1024,
      system:     systemPrompt(serie, disciplina, nomeAluno),
      messages:   mensagens,
    }),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as any
    throw new Error(`Claude: ${resp.status} ${err?.error?.message ?? ''}`)
  }

  const data = await resp.json() as any
  return {
    texto:         data.content?.[0]?.text ?? 'Não consegui gerar uma resposta. Tente novamente!',
    input_tokens:  data.usage?.input_tokens  ?? 0,
    output_tokens: data.usage?.output_tokens ?? 0,
  }
}

// ─── Busca perfil do aluno no banco ──────────────────────────────────────────

interface PerfilAluno {
  nome:  string | null
  serie: string | null
}

async function buscarPerfilAluno(authHeader: string): Promise<PerfilAluno> {
  const token = authHeader.slice(7)

  // Busca usuário autenticado
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
  })
  if (!userResp.ok) throw new Error('JWT inválido')

  const { id: userId } = await userResp.json()

  // Busca nome e série do aluno na tabela users + alunos_turmas
  const perfilResp = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=nome,role`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  if (!perfilResp.ok) return { nome: null, serie: null }

  const [usuario] = await perfilResp.json()
  if (!usuario) return { nome: null, serie: null }

  // Busca a série atual do aluno (turma ativa)
  const turmaResp = await fetch(
    `${SUPABASE_URL}/rest/v1/alunos_turmas?user_id=eq.${userId}&select=turmas(series(nome))&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )

  let serie: string | null = null
  if (turmaResp.ok) {
    const [at] = await turmaResp.json()
    serie = at?.turmas?.series?.nome ?? null
  }

  return { nome: usuario.nome ?? null, serie }
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Busca perfil do aluno no banco (nome + série reais)
    const perfil = await buscarPerfilAluno(auth)

    const { pergunta, disciplina, historico = [] } = await req.json()

    if (!pergunta?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Pergunta vazia' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Embedding da pergunta
    const vetor = await gerarEmbedding(pergunta)

    // 2. Busca no Pinecone (filtra pela série real do banco)
    const chunks = await buscarPinecone(vetor, perfil.serie ?? undefined, disciplina)

    // 3. Resposta do Claude
    const t0 = Date.now()
    const resultado = await chamarClaude(
      pergunta, chunks, historico, perfil.serie ?? undefined, disciplina, perfil.nome ?? undefined
    )
    const latencia = Date.now() - t0

    // Log assíncrono
    await logIA({
      agente:        'sofia',
      contexto:      disciplina ?? perfil.serie ?? null,
      pergunta:      pergunta.slice(0, 300),
      turns:         1,
      input_tokens:  resultado.input_tokens,
      output_tokens: resultado.output_tokens,
      latencia_ms:   latencia,
      erro:          false,
    })

    const paginas = [...new Set(chunks.map(c => c.pagina).filter(p => p !== null))] as number[]

    return new Response(
      JSON.stringify({ resposta: resultado.texto, chunks_usados: chunks.length, paginas }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('chat-sofia error:', err)
    await logIA({ agente: 'sofia', erro: true, erro_msg: err.message?.slice(0, 500) })
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
