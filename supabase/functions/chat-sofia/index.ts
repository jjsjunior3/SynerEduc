// supabase/functions/chat-sofia/index.ts  v6
// Fluxo:
//   1. Valida JWT → busca perfil do aluno (nome, série, turma)
//   2. Busca agenda de hoje para a série/turma/disciplina do aluno
//   3. Gera embedding via Pinecone Inference (multilingual-e5-large)
//   4. Busca chunks relevantes no Pinecone (filtra por série/disciplina)
//   5. Monta contexto com <aula_de_hoje> + <material_didatico> + histórico
//   6. Chama Claude Haiku → resposta contextualizada

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')        ?? ''
const PINECONE_KEY  = Deno.env.get('PINECONE_API_KEY')         ?? ''
const PINECONE_HOST = Deno.env.get('PINECONE_HOST')            ?? ''
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')             ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

const PINECONE_EMBED_MODEL = 'multilingual-e5-large'
const CHAT_MODEL           = 'claude-haiku-4-5-20251001'
const TOP_K                = 6

// ─── Log ────────────────────────────────────────────────────────────────────

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

// ─── System prompt ───────────────────────────────────────────────────────────

function systemPrompt(
  nomeAluno?: string,
  serie?:     string,
  disciplina?: string,
): string {
  return `Você é a Professora Sofia, assistente de estudos do Colégio Conexão Maranhense.
Você é jovem, animada, paciente e fala de forma clara e acolhedora com os alunos.
Use linguagem simples e incentivadora. Emojis são bem-vindos com moderação.

${nomeAluno ? `Você está conversando com ${nomeAluno}.` : ''}
${serie     ? `O aluno está na ${serie}.`                : ''}
${disciplina ? `O foco atual é ${disciplina}.`           : ''}

<regras>
- Se houver uma tag <aula_de_hoje>, use esse contexto como referência principal para explicar o conteúdo do dia
- Use os trechos do material didático fornecidos em <material_didatico> para aprofundar a explicação
- Se o aluno disser "não entendi a aula de hoje" ou similar, explique baseando-se no título e conteúdo da aula registrada
- NUNCA invente conteúdo que não está no contexto — se não souber, diga que vai buscar nos livros
- Respostas curtas e diretas (máx. 3 parágrafos) — o aluno está no celular
- Sempre termine com uma pergunta de curiosidade ou incentivo
- Se a pergunta não tiver relação com estudos escolares, responda brevemente e redirecione
</regras>`
}

// ─── Embedding ───────────────────────────────────────────────────────────────

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
  if (!resp.ok) throw new Error(`Pinecone embed: ${resp.status} ${await resp.text()}`)
  const data = await resp.json()
  return data.data?.[0]?.values as number[]
}

// ─── Busca Pinecone ──────────────────────────────────────────────────────────

interface ChunkResultado {
  texto:      string
  pagina:     number | null
  disciplina: string | null
}

async function buscarPinecone(
  vetor:       number[],
  serie?:      string,
  disciplina?: string,
): Promise<ChunkResultado[]> {
  const filter: Record<string, unknown> = {}
  if (serie)      filter['serie']      = { '$eq': serie }
  if (disciplina) filter['disciplina'] = { '$eq': disciplina }

  const body: Record<string, unknown> = {
    vector: vetor, topK: TOP_K, includeMetadata: true,
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

// ─── Perfil do aluno ─────────────────────────────────────────────────────────

interface PerfilAluno {
  userId: string | null
  nome:   string | null
  serie:  string | null
  turma:  string | null
}

async function buscarPerfilAluno(authHeader: string): Promise<PerfilAluno> {
  const token = authHeader.slice(7)

  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
  })
  if (!userResp.ok) throw new Error('JWT inválido')
  const { id: userId } = await userResp.json()

  const perfilResp = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=nome,role`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  if (!perfilResp.ok) return { userId, nome: null, serie: null, turma: null }

  const [usuario] = await perfilResp.json()
  if (!usuario) return { userId, nome: null, serie: null, turma: null }

  // Busca série e nome da turma
  const turmaResp = await fetch(
    `${SUPABASE_URL}/rest/v1/alunos_turmas?user_id=eq.${userId}&select=turmas(nome,series(nome))&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )

  let serie: string | null = null
  let turma: string | null = null
  if (turmaResp.ok) {
    const [at] = await turmaResp.json()
    serie = at?.turmas?.series?.nome ?? null
    turma = at?.turmas?.nome         ?? null
  }

  return { userId, nome: usuario.nome ?? null, serie, turma }
}

// ─── Agenda de hoje ───────────────────────────────────────────────────────────

interface AgendaAula {
  titulo_unidade: string | null
  conteudo_sala:  string | null
  atividade_casa: string | null
  disciplina:     string | null
}

async function buscarAgendaHoje(
  serie:       string,
  turma?:      string | null,
  disciplina?: string,
): Promise<AgendaAula[]> {
  const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  let url = `${SUPABASE_URL}/rest/v1/agenda_professor`
    + `?data_aula=eq.${hoje}`
    + `&serie=eq.${encodeURIComponent(serie)}`
    + `&select=titulo_unidade,conteudo_sala,atividade_casa,disciplinas(nome)`

  if (turma)      url += `&turma=eq.${encodeURIComponent(turma)}`
  if (disciplina) url += `&disciplinas.nome=eq.${encodeURIComponent(disciplina)}`

  const resp = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!resp.ok) return []

  const rows = await resp.json()
  return rows.map((r: any) => ({
    titulo_unidade: r.titulo_unidade ?? null,
    conteudo_sala:  r.conteudo_sala  ?? null,
    atividade_casa: r.atividade_casa ?? null,
    disciplina:     r.disciplinas?.nome ?? null,
  }))
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
  agenda:      AgendaAula[],
  historico:   { role: string; content: string }[],
  serie?:      string,
  disciplina?: string,
  nomeAluno?:  string,
): Promise<RespostaClaude> {
  // Bloco da aula de hoje
  let aulaBlock = ''
  if (agenda.length > 0) {
    const aulas = agenda.map(a => {
      const linhas = []
      if (a.disciplina)    linhas.push(`Disciplina: ${a.disciplina}`)
      if (a.titulo_unidade) linhas.push(`Título da aula: ${a.titulo_unidade}`)
      if (a.conteudo_sala)  linhas.push(`Conteúdo trabalhado em sala: ${a.conteudo_sala}`)
      if (a.atividade_casa) linhas.push(`Atividade para casa: ${a.atividade_casa}`)
      return linhas.join('\n')
    }).join('\n\n')

    aulaBlock = `<aula_de_hoje>\n${aulas}\n</aula_de_hoje>\n\n`
  }

  // Bloco do material didático (Pinecone)
  const materialBlock = chunks.length > 0
    ? `<material_didatico>\n${chunks.map((c, i) => {
        const ref = c.pagina ? ` (pág. ${c.pagina})` : ''
        return `[Trecho ${i + 1}${ref}]\n${c.texto}`
      }).join('\n\n')}\n</material_didatico>`
    : ''

  const mensagens = [
    ...historico.map(h => ({ role: h.role, content: h.content })),
    {
      role:    'user',
      content: `${aulaBlock}${materialBlock}${aulaBlock || materialBlock ? '\n\n' : ''}${pergunta}`,
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
      system:     systemPrompt(nomeAluno, serie, disciplina),
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

// ─── Handler ─────────────────────────────────────────────────────────────────

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

    const perfil = await buscarPerfilAluno(auth)
    const { pergunta, disciplina, historico = [] } = await req.json()

    if (!pergunta?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Pergunta vazia' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Busca agenda de hoje (paralelo com embedding)
    const [vetor, agenda] = await Promise.all([
      gerarEmbedding(pergunta),
      perfil.serie
        ? buscarAgendaHoje(perfil.serie, perfil.turma, disciplina)
        : Promise.resolve([]),
    ])

    // Busca chunks no Pinecone
    const chunks = await buscarPinecone(vetor, perfil.serie ?? undefined, disciplina)

    // Resposta do Claude
    const t0 = Date.now()
    const resultado = await chamarClaude(
      pergunta,
      chunks,
      agenda,
      historico,
      perfil.serie      ?? undefined,
      disciplina,
      perfil.nome       ?? undefined,
    )
    const latencia = Date.now() - t0

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
      JSON.stringify({
        resposta:      resultado.texto,
        chunks_usados: chunks.length,
        aula_hoje:     agenda.length > 0,
        paginas,
      }),
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
