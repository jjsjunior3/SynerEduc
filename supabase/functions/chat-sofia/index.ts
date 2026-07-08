// supabase/functions/chat-sofia/index.ts  v7
// Suporta aluno, professor e coordenador com contextos distintos.
// Fluxo:
//   1. Valida JWT → busca perfil (nome, tipo, serie, segmento)
//   2. Para professor: busca disciplinas/series vinculadas
//   3. Busca agenda de hoje (escopo depende do tipo)
//   4. Gera embedding + busca Pinecone (filtro depende do tipo)
//   5. Monta contexto e chama Claude Haiku com system prompt adaptado

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')             ?? ''
const PINECONE_KEY  = Deno.env.get('PINECONE_API_KEY')              ?? ''
const PINECONE_HOST = Deno.env.get('PINECONE_HOST')                 ?? ''
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')                  ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')     ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

const PINECONE_EMBED_MODEL = 'multilingual-e5-large'
const CHAT_MODEL           = 'claude-haiku-4-5-20251001'
const TOP_K                = 6

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

// ─── Perfil unificado ─────────────────────────────────────────────────────────

interface Perfil {
  userId:      string
  nome:        string | null
  tipo:        string        // 'aluno' | 'professor' | 'coordenador' | ...
  serie:       string | null // aluno: sua série
  segmento:    string | null
  disciplinas: string[]      // professor: disciplinas vinculadas
  series:      string[]      // professor: séries que leciona
}

async function buscarPerfil(authHeader: string): Promise<Perfil> {
  const token = authHeader.slice(7)

  // 1. Valida JWT e obtém userId
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
  })
  if (!userResp.ok) throw new Error('JWT inválido')
  const { id: userId } = await userResp.json()

  // 2. Busca perfil na tabela users
  const perfilResp = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=nome,tipo,serie,segmento&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  if (!perfilResp.ok) throw new Error('Erro ao buscar perfil')
  const [usuario] = await perfilResp.json()
  if (!usuario) throw new Error('Perfil não encontrado')

  const tipo     = usuario.tipo     ?? 'aluno'
  const nome     = usuario.nome     ?? null
  const serie    = usuario.serie    ?? null
  const segmento = usuario.segmento ?? null

  // 3. Para professor: busca disciplinas e séries vinculadas
  let disciplinas: string[] = []
  let series:      string[] = []

  if (tipo === 'professor' || tipo === 'professor_conteudista') {
    const vinculoResp = await fetch(
      `${SUPABASE_URL}/rest/v1/professores_disciplinas_series`
      + `?professor_id=eq.${userId}`
      + `&select=disciplinas(nome),series(nome)`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (vinculoResp.ok) {
      const vinculos = await vinculoResp.json()
      disciplinas = [...new Set(vinculos.map((v: any) => v.disciplinas?.nome).filter(Boolean))] as string[]
      series      = [...new Set(vinculos.map((v: any) => v.series?.nome).filter(Boolean))]      as string[]
    }
  }

  return { userId, nome, tipo, serie, segmento, disciplinas, series }
}

// ─── Contexto extra do coordenador ───────────────────────────────────────────

interface ContextoCoordenador {
  frequenciaSemanalPct:      string
  atividadesPendentesCorrecao: number
}

async function buscarContextoCoordenador(segmento: string | null): Promise<ContextoCoordenador | null> {
  if (!segmento) return null

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0]

  const [freqResp, ativResp] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/frequencia_diaria`
        + `?select=presente,turmas!inner(segmento)`
        + `&turmas.segmento=eq.${encodeURIComponent(segmento)}`
        + `&data_aula=gte.${seteDiasAtras}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/atividades_alunos`
        + `?select=status,users!inner(segmento)`
        + `&users.segmento=eq.${encodeURIComponent(segmento)}`
        + `&status=eq.enviado`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    ),
  ])

  if (!freqResp.ok || !ativResp.ok) return null

  const freqRows: { presente: boolean }[] = await freqResp.json()
  const ativRows: unknown[] = await ativResp.json()

  const total     = freqRows.length
  const presentes = freqRows.filter(r => r.presente).length
  const pct       = total > 0 ? ((presentes / total) * 100).toFixed(1) : 'sem registros'

  return {
    frequenciaSemanalPct:        total > 0 ? `${pct}%` : 'sem registros nos últimos 7 dias',
    atividadesPendentesCorrecao: ativRows.length,
  }
}

// ─── System prompt por tipo de usuário ───────────────────────────────────────

function systemPrompt(
  perfil: Perfil,
  agenda: AgendaAula[],
  disciplinaAtual?: string,
  contextoCoordenador?: ContextoCoordenador | null,
): string {
  const { nome, tipo, serie, disciplinas, series } = perfil

  // Bloco de agenda formatado para o system prompt
  let agendaBlock = ''
  if (agenda.length > 0) {
    const aulas = agenda.map(a => {
      const linhas: string[] = []
      if (a.serie)          linhas.push(`Série: ${a.serie}`)
      if (a.disciplina)     linhas.push(`Disciplina: ${a.disciplina}`)
      if (a.titulo_unidade) linhas.push(`Título da aula: ${a.titulo_unidade}`)
      if (a.conteudo_sala)  linhas.push(`Conteúdo trabalhado em sala: ${a.conteudo_sala}`)
      if (a.atividade_casa) linhas.push(`Atividade para casa: ${a.atividade_casa}`)
      return linhas.join('\n')
    }).join('\n\n')
    agendaBlock = `\n\n<agenda_de_hoje>\n${aulas}\n</agenda_de_hoje>`
  }

  if (tipo === 'aluno') {
    return `Você é a Professora Sofia, assistente de estudos do Colégio Conexão Maranhense.
Você é jovem, animada, paciente e fala de forma clara e acolhedora.
Use linguagem simples e incentivadora. Emojis são bem-vindos com moderação.

Você está conversando com ${nome ?? 'um aluno'}${serie ? `, aluno(a) da ${serie}` : ''}.
${disciplinaAtual ? `O foco atual é a disciplina de ${disciplinaAtual}.` : ''}${agendaBlock}

<regras>
- Responda SOMENTE sobre o conteúdo escolar da série do aluno
- Use <agenda_de_hoje> para responder perguntas sobre aulas e tarefas do dia — NÃO a mencione proativamente em toda resposta
- Use os trechos em <material_didatico> para aprofundar explicações
- NUNCA invente conteúdo — se não souber, diga que vai buscar nos livros
- Respostas curtas e diretas (máx. 3 parágrafos) — o aluno pode estar no celular
- Sempre termine com uma pergunta de curiosidade ou incentivo
- Não comente sobre outros alunos ou informações de terceiros
</regras>`
  }

  if (tipo === 'professor' || tipo === 'professor_conteudista') {
    const discStr   = disciplinas.length ? disciplinas.join(', ')    : 'suas disciplinas'
    const seriesStr = series.length      ? series.join(', ')         : 'suas turmas'
    return `Você é a Professora Sofia, assistente pedagógica do Colégio Conexão Maranhense.
Você auxilia professores com planejamento de aulas, explicações de conteúdo e sugestões didáticas.
Tom profissional mas acolhedor.

Você está conversando com ${nome ?? 'um professor'}, professor(a) de ${discStr} nas séries ${seriesStr}.
${disciplinaAtual ? `O contexto atual é a disciplina de ${disciplinaAtual}.` : ''}${agendaBlock}

<regras>
- Responda sobre o material didático das disciplinas e séries vinculadas ao professor
- Use <agenda_de_hoje> para contextualizar o planejamento quando perguntado — não repita em toda resposta
- Use <material_didatico> para embasar sugestões pedagógicas
- Pode sugerir estratégias de ensino, exercícios e explicações para os alunos
- Não forneça informações sobre alunos específicos (notas, frequência) — esses dados ficam em outros módulos
- NUNCA invente conteúdo curricular — baseie-se no material indexado
</regras>`
  }

  // coordenador (e outros papéis privilegiados)
  const coordBlock = contextoCoordenador
    ? `\n\n<contexto_coordenador>\nFrequência dos últimos 7 dias: ${contextoCoordenador.frequenciaSemanalPct}\nAtividades aguardando correção pelos professores: ${contextoCoordenador.atividadesPendentesCorrecao}\n</contexto_coordenador>`
    : ''

  return `Você é a Professora Sofia, assistente pedagógica do Colégio Conexão Maranhense.
Você apoia a coordenação com visão ampla do conteúdo escolar, planejamento e acompanhamento curricular.
Tom profissional, objetivo e completo.

Você está conversando com ${nome ?? 'a coordenação'}, coordenador(a) pedagógico(a).${agendaBlock}${coordBlock}

<regras>
- Você tem acesso ao material didático de TODAS as séries e disciplinas
- Use <agenda_de_hoje> para contextualizar discussões curriculares quando perguntado — não repita em toda resposta
- Use <contexto_coordenador> para responder sobre frequência da semana ou atividades pendentes de correção quando perguntado — não repita proativamente em toda resposta
- Use <material_didatico> para embasar análises e recomendações
- Pode responder sobre qualquer série, disciplina ou aspecto pedagógico
- Mantenha foco em conteúdo curricular e gestão pedagógica
- NUNCA invente dados — baseie-se no material indexado
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

// ─── Busca Pinecone ───────────────────────────────────────────────────────────

interface ChunkResultado {
  texto:      string
  pagina:     number | null
  disciplina: string | null
}

async function buscarPinecone(
  vetor:      number[],
  perfil:     Perfil,
  disciplina?: string,
): Promise<ChunkResultado[]> {
  const filter: Record<string, unknown> = {}

  if (perfil.tipo === 'aluno') {
    // Aluno só vê material da sua série
    if (perfil.serie)  filter['serie']      = { '$eq': perfil.serie }
    if (disciplina)    filter['disciplina'] = { '$eq': disciplina }
  } else if (perfil.tipo === 'professor' || perfil.tipo === 'professor_conteudista') {
    // Professor filtra pela disciplina atual (se informada)
    if (disciplina)    filter['disciplina'] = { '$eq': disciplina }
    // Sem filtro de série — o professor pode lecionar várias séries
  }
  // Coordenador: sem filtro — vê todo o material

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

// ─── Agenda de hoje ───────────────────────────────────────────────────────────

interface AgendaAula {
  titulo_unidade: string | null
  conteudo_sala:  string | null
  atividade_casa: string | null
  disciplina:     string | null
  serie:          string | null
}

async function buscarAgendaHoje(perfil: Perfil, disciplina?: string): Promise<AgendaAula[]> {
  const hoje = new Date().toISOString().split('T')[0]
  let url = `${SUPABASE_URL}/rest/v1/agenda_professor`
    + `?data_aula=eq.${hoje}`
    + `&select=titulo_unidade,conteudo_sala,atividade_casa,serie,disciplinas(nome)`

  if (perfil.tipo === 'aluno') {
    // Aluno vê somente a agenda da sua série
    if (!perfil.serie) return []
    url += `&serie=eq.${encodeURIComponent(perfil.serie)}`
    if (disciplina) url += `&disciplina_id=not.is.null` // filtro extra opcional
  } else if (perfil.tipo === 'professor' || perfil.tipo === 'professor_conteudista') {
    // Professor vê apenas as aulas que ele próprio registrou
    url += `&professor_id=eq.${perfil.userId}`
    if (disciplina) url += `&disciplinas.nome=eq.${encodeURIComponent(disciplina)}`
  }
  // Coordenador: sem filtro adicional — vê todas as aulas de hoje

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
    serie:          r.serie ?? null,
  }))
}

// ─── Claude Haiku ─────────────────────────────────────────────────────────────

interface RespostaClaude {
  texto:         string
  input_tokens:  number
  output_tokens: number
}

async function chamarClaude(
  pergunta:   string,
  chunks:     ChunkResultado[],
  agenda:     AgendaAula[],
  historico:  { role: string; content: string }[],
  perfil:     Perfil,
  disciplina?: string,
  contextoCoordenador?: ContextoCoordenador | null,
): Promise<RespostaClaude> {
  // Bloco do material didático (vai na mensagem do usuário, por ser dinâmico por pergunta)
  const materialBlock = chunks.length > 0
    ? `<material_didatico>\n${chunks.map((c, i) => {
        const ref = c.pagina ? ` (pág. ${c.pagina})` : ''
        const disc = c.disciplina ? ` [${c.disciplina}]` : ''
        return `[Trecho ${i + 1}${ref}${disc}]\n${c.texto}`
      }).join('\n\n')}\n</material_didatico>`
    : ''

  const mensagens = [
    ...historico.map(h => ({ role: h.role, content: h.content })),
    {
      role:    'user',
      content: `${materialBlock}${materialBlock ? '\n\n' : ''}${pergunta}`,
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
      system:     systemPrompt(perfil, agenda, disciplina, contextoCoordenador),
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

    const perfil = await buscarPerfil(auth)
    const { pergunta, disciplina, historico = [] } = await req.json()

    if (!pergunta?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Pergunta vazia' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Busca agenda, embedding e (se coordenador) contexto extra em paralelo
    const [vetor, agenda, contextoCoordenador] = await Promise.all([
      gerarEmbedding(pergunta),
      buscarAgendaHoje(perfil, disciplina),
      perfil.tipo === 'coordenador' ? buscarContextoCoordenador(perfil.segmento) : Promise.resolve(null),
    ])

    // Busca chunks no Pinecone (filtro por tipo)
    const chunks = await buscarPinecone(vetor, perfil, disciplina)

    // Resposta do Claude
    const t0 = Date.now()
    const resultado = await chamarClaude(pergunta, chunks, agenda, historico, perfil, disciplina, contextoCoordenador)
    const latencia  = Date.now() - t0

    await logIA({
      agente:        'sofia',
      contexto:      disciplina ?? perfil.serie ?? perfil.tipo,
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
