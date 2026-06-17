// supabase/functions/agente-gabriela/index.ts
// Gabriela — Agente Administrativa com Tool Use + Supabase ao vivo
// Contextos: secretaria | gestor | financeiro
// Cada contexto tem ferramentas exclusivas — sem vazamento entre perfis
// v2: agente_log para observabilidade (tokens + latência + turns)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

// ─── Queries Supabase ─────────────────────────────────────────────────────────

async function query(sql: string, params: Record<string, any> = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  // Usa queries REST diretas por tabela (mais simples e seguro)
  return null
}

async function supabaseGet(path: string) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
    },
  })
  if (!resp.ok) throw new Error(`Supabase ${path}: ${resp.status}`)
  return resp.json()
}

async function supabaseInsert(table: string, row: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(row),
    })
  } catch (_) { /* log failure nunca deve quebrar a resposta */ }
}

// ─── Ferramentas por contexto ─────────────────────────────────────────────────

const TOOLS_SECRETARIA = [
  {
    name: 'buscar_alunos',
    description: 'Busca alunos por nome, turma ou série. Use quando perguntarem sobre um aluno específico ou lista de alunos.',
    input_schema: {
      type: 'object',
      properties: {
        nome:   { type: 'string', description: 'Parte do nome do aluno (opcional)' },
        serie:  { type: 'string', description: 'Série/ano (ex: "6º ano", "1ª série") (opcional)' },
        status: { type: 'string', description: '"ativo" ou "inativo" (opcional, padrão ativo)' },
      },
      required: [],
    },
  },
  {
    name: 'documentos_pendentes',
    description: 'Lista alunos com documentação incompleta na ficha de matrícula.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'matriculas_recentes',
    description: 'Mostra matrículas realizadas nos últimos 30 dias.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'resumo_turmas',
    description: 'Resumo geral de turmas: quantidade de alunos por turma/série.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
]

const TOOLS_GESTOR = [
  {
    name: 'indicadores_escola',
    description: 'Indicadores gerais da escola: total de alunos, professores, turmas e séries.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'pendencias_secretaria',
    description: 'Mostra as pendências do painel do gestor: alunos sem ficha, sem contrato e com documentação incompleta. Use quando perguntarem sobre pendências abertas no painel, fichas, contratos ou documentação.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'frequencia_geral',
    description: 'Percentual de frequência por turma ou geral da escola.',
    input_schema: {
      type: 'object',
      properties: {
        mes: { type: 'string', description: 'Mês no formato YYYY-MM (opcional, padrão mês atual)' },
      },
      required: [],
    },
  },
  {
    name: 'atividades_pendentes_correcao',
    description: 'Quantidade de atividades enviadas por alunos aguardando correção dos professores.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'resumo_financeiro_gestor',
    description: 'Visão financeira resumida: total a receber, recebido no mês, inadimplência.',
    input_schema: {
      type: 'object',
      properties: {
        mes: { type: 'string', description: 'Mês no formato YYYY-MM (opcional)' },
      },
      required: [],
    },
  },
]

const TOOLS_FINANCEIRO = [
  {
    name: 'inadimplentes',
    description: 'Lista alunos com mensalidades em atraso (status pendente ou vencido).',
    input_schema: {
      type: 'object',
      properties: {
        mes: { type: 'string', description: 'Mês de referência YYYY-MM (opcional, padrão mês atual)' },
      },
      required: [],
    },
  },
  {
    name: 'resumo_financeiro_mes',
    description: 'Resumo do mês: total recebido, pendente, quantidade de pagamentos.',
    input_schema: {
      type: 'object',
      properties: {
        mes: { type: 'string', description: 'Mês YYYY-MM (opcional, padrão mês atual)' },
      },
      required: [],
    },
  },
  {
    name: 'pagamentos_aluno',
    description: 'Histórico de pagamentos de um aluno específico.',
    input_schema: {
      type: 'object',
      properties: {
        nome_aluno: { type: 'string', description: 'Nome (parcial) do aluno' },
      },
      required: ['nome_aluno'],
    },
  },
]

function getTools(contexto: string) {
  if (contexto === 'secretaria') return TOOLS_SECRETARIA
  if (contexto === 'gestor')     return TOOLS_GESTOR
  if (contexto === 'financeiro') return TOOLS_FINANCEIRO
  return []
}

// ─── Executores de ferramentas ────────────────────────────────────────────────

async function executarFerramenta(nome: string, input: any, contexto: string): Promise<any> {
  try {
    const mesAtual = new Date().toISOString().slice(0, 7) // YYYY-MM
    const mes      = input.mes ?? mesAtual

    // ── Secretaria ────────────────────────────────────────────────────────────
    if (nome === 'buscar_alunos') {
      let path = 'fichas_matricula?select=id,nome_aluno,serie,turma,status_matricula&order=nome_aluno'
      if (input.nome)   path += `&nome_aluno=ilike.*${encodeURIComponent(input.nome)}*`
      if (input.serie)  path += `&serie=ilike.*${encodeURIComponent(input.serie)}*`
      const status = input.status ?? 'ativo'
      path += `&status_matricula=eq.${status}&limit=20`
      const data = await supabaseGet(path)
      return { alunos: data, total: data.length }
    }

    if (nome === 'documentos_pendentes') {
      const data = await supabaseGet(
        'fichas_matricula?select=id,nome_aluno,serie,turma,docs_pendentes&status_matricula=eq.ativo&order=nome_aluno&limit=50'
      )
      const pendentes = data.filter((a: any) => a.docs_pendentes === true)
      return { pendentes, total: pendentes.length }
    }

    if (nome === 'matriculas_recentes') {
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      const data = await supabaseGet(
        `fichas_matricula?select=id,nome_aluno,serie,turma,created_at&created_at=gte.${trintaDiasAtras}&order=created_at.desc&limit=20`
      )
      return { matriculas: data, total: data.length }
    }

    if (nome === 'resumo_turmas') {
      const data = await supabaseGet(
        'fichas_matricula?select=serie,turma&status_matricula=eq.ativo'
      )
      const agrupado: Record<string, number> = {}
      for (const a of data) {
        const chave = `${a.serie} — ${a.turma ?? 'Turma Única'}`
        agrupado[chave] = (agrupado[chave] ?? 0) + 1
      }
      const turmas = Object.entries(agrupado).map(([nome, total]) => ({ nome, total }))
      return { turmas, total_alunos: data.length }
    }

    // ── Gestor ────────────────────────────────────────────────────────────────
    if (nome === 'indicadores_escola') {
      const [alunos, profs, turmas] = await Promise.all([
        supabaseGet('users?select=id&tipo=eq.aluno&status=eq.ativo'),
        supabaseGet('users?select=id&tipo=eq.professor'),
        supabaseGet('turmas?select=id,nome,serie'),
      ])
      return {
        total_alunos:      alunos.length,
        total_professores: profs.length,
        total_turmas:      turmas.length,
        turmas:            turmas.slice(0, 10),
      }
    }

    if (nome === 'pendencias_secretaria') {
      // 1. Todos os alunos do portal
      const alunos = await supabaseGet('users?select=id&tipo=eq.aluno')
      const totalAlunos = alunos.length
      const idsAlunos = new Set(alunos.map((u: any) => u.id))

      // 2. Fichas de matrícula (campo docs_pendentes é boolean)
      const fichas = await supabaseGet('fichas_matricula?select=id,aluno_id,docs_pendentes&limit=1000')
      const idsComFicha = new Set(fichas.map((f: any) => f.aluno_id).filter(Boolean))

      // 3. Contratos existentes (chave: ficha_id)
      let contratos: any[] = []
      try {
        contratos = await supabaseGet('contratos?select=ficha_id&limit=1000')
      } catch (_) { /* tabela pode não existir ainda */ }
      const fichaIdsComContrato = new Set(contratos.map((c: any) => c.ficha_id).filter(Boolean))

      // 4. Alunos (do portal) sem ficha vinculada
      const semFicha = alunos.filter((u: any) => !idsComFicha.has(u.id)).length

      // 5. Fichas sem contrato + alunos sem ficha (todos sem contrato também)
      const fichasSemContrato = fichas.filter((f: any) => !fichaIdsComContrato.has(f.id)).length
      const semContrato = fichasSemContrato + semFicha

      // 6. Fichas com documentação pendente
      const docsIncompletos = fichas.filter((f: any) => f.docs_pendentes === true).length

      return {
        total_alunos: totalAlunos,
        total_fichas: fichas.length,
        sem_ficha:    semFicha,
        sem_contrato: semContrato,
        docs_incompletos: docsIncompletos,
        resumo: `De ${totalAlunos} alunos cadastrados: ${semFicha} sem ficha de matrícula, ${semContrato} sem contrato assinado, ${docsIncompletos} com documentação incompleta.`,
      }
    }

    if (nome === 'frequencia_geral') {
      const data = await supabaseGet(
        `frequencia?select=status,aluno_id&mes_referencia=eq.${mes}`
      )
      const total    = data.length
      const presentes = data.filter((f: any) => f.status === 'presente').length
      const pct      = total > 0 ? ((presentes / total) * 100).toFixed(1) : '0'
      return { mes, total_registros: total, presentes, ausentes: total - presentes, percentual: `${pct}%` }
    }

    if (nome === 'atividades_pendentes_correcao') {
      const data = await supabaseGet(
        'atividades_alunos?select=id,aluno_id,atividade_id&status=eq.enviado&limit=100'
      )
      return { pendentes_correcao: data.length }
    }

    if (nome === 'resumo_financeiro_gestor') {
      const data = await supabaseGet(
        `financeiro_mensalidades?select=status,valor&mes_referencia=eq.${mes}`
      )
      const recebido  = data.filter((m: any) => m.status === 'pago').reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0)
      const pendente  = data.filter((m: any) => m.status === 'pendente').reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0)
      const vencido   = data.filter((m: any) => m.status === 'vencido').reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0)
      const inadimpl  = data.filter((m: any) => m.status === 'vencido').length
      return { mes, recebido, pendente, vencido, inadimplentes: inadimpl, total_registros: data.length }
    }

    // ── Financeiro ────────────────────────────────────────────────────────────
    if (nome === 'inadimplentes') {
      const data = await supabaseGet(
        `financeiro_mensalidades?select=aluno_id,valor,mes_referencia,data_vencimento,fichas_matricula(nome_aluno,serie,turma)&status=in.(pendente,vencido)&mes_referencia=eq.${mes}&order=fichas_matricula(nome_aluno)&limit=50`
      )
      return { mes, inadimplentes: data, total: data.length }
    }

    if (nome === 'resumo_financeiro_mes') {
      const data = await supabaseGet(
        `financeiro_mensalidades?select=status,valor&mes_referencia=eq.${mes}`
      )
      const recebido = data.filter((m: any) => m.status === 'pago').reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0)
      const pendente = data.filter((m: any) => m.status === 'pendente').reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0)
      const vencido  = data.filter((m: any) => m.status === 'vencido').reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0)
      return {
        mes,
        recebido:   recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pendente:   pendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        vencido:    vencido.toLocaleString('pt-BR',  { style: 'currency', currency: 'BRL' }),
        qtd_pagos:    data.filter((m: any) => m.status === 'pago').length,
        qtd_pendentes: data.filter((m: any) => m.status === 'pendente').length,
        qtd_vencidos:  data.filter((m: any) => m.status === 'vencido').length,
      }
    }

    if (nome === 'pagamentos_aluno') {
      const alunos = await supabaseGet(
        `fichas_matricula?select=id,nome_aluno&nome_aluno=ilike.*${encodeURIComponent(input.nome_aluno)}*&limit=3`
      )
      if (!alunos.length) return { erro: 'Aluno não encontrado', nome_buscado: input.nome_aluno }
      const aluno = alunos[0]
      const pagamentos = await supabaseGet(
        `financeiro_mensalidades?select=mes_referencia,valor,status,data_pagamento&aluno_id=eq.${aluno.id}&order=mes_referencia.desc&limit=12`
      )
      return { aluno: aluno.nome_aluno, pagamentos, total_registros: pagamentos.length }
    }

    return { erro: `Ferramenta desconhecida: ${nome}` }

  } catch (err: any) {
    console.error(`Erro em ${nome}:`, err)
    return { erro: err.message ?? 'Erro ao consultar dados' }
  }
}

// ─── Prompt do sistema por contexto ──────────────────────────────────────────

function buildSistema(contexto: string): string {
  const base = `Você é Gabriela, assistente administrativa do Colégio Conexão Maranhense.
Você é profissional, objetiva e cordial. Responde em português brasileiro.
Use as ferramentas disponíveis para consultar os dados em tempo real antes de responder.
Sempre formate números de alunos, valores e percentuais de forma clara.
Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`

  if (contexto === 'secretaria') return `${base}
Você está no módulo da SECRETARIA. Ajuda com: matrícula de alunos, documentação, lista de alunos e dados cadastrais.
Não comente sobre finanças ou gestão pedagógica — redirecione se perguntarem.`

  if (contexto === 'gestor') return `${base}
Você está no módulo do GESTOR GERAL. Ajuda com: visão geral da escola, pendências da secretaria (fichas, contratos, documentos), frequência, atividades pedagógicas e financeiro estratégico.
Quando perguntarem sobre "pendências do painel", "o que está pendente", fichas ou contratos — use SEMPRE a ferramenta pendencias_secretaria para obter os números reais.
Você tem uma visão ampla e estratégica do colégio.`

  if (contexto === 'financeiro') return `${base}
Você está no módulo FINANCEIRO. Ajuda com: inadimplência, pagamentos, mensalidades e fluxo de caixa.
Não comente sobre dados pedagógicos ou cadastrais — redirecione se perguntarem.`

  return base
}

// ─── Loop Tool Use ────────────────────────────────────────────────────────────

interface LoopResult {
  resposta:      string
  turns:         number
  input_tokens:  number
  output_tokens: number
}

async function rodarComTools(
  mensagens: any[],
  tools: any[],
  sistema: string,
): Promise<LoopResult> {
  let msgs = [...mensagens]
  const MAX_TURNS = 5
  let totalInput  = 0
  let totalOutput = 0

  for (let i = 0; i < MAX_TURNS; i++) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-api-key':     ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:     sistema,
        tools,
        messages:   msgs,
      }),
    })

    if (!resp.ok) throw new Error(`Claude: ${resp.status}`)
    const data = await resp.json() as any

    totalInput  += data.usage?.input_tokens  ?? 0
    totalOutput += data.usage?.output_tokens ?? 0

    // Resposta final — sem mais tools
    if (data.stop_reason === 'end_turn') {
      const texto = data.content?.find((b: any) => b.type === 'text')?.text ?? ''
      return { resposta: texto, turns: i + 1, input_tokens: totalInput, output_tokens: totalOutput }
    }

    // Precisa executar ferramentas
    if (data.stop_reason === 'tool_use') {
      const toolResults: any[] = []
      for (const block of data.content ?? []) {
        if (block.type === 'tool_use') {
          const resultado = await executarFerramenta(block.name, block.input ?? {}, '')
          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(resultado),
          })
        }
      }
      msgs = [
        ...msgs,
        { role: 'assistant', content: data.content },
        { role: 'user',      content: toolResults },
      ]
      continue
    }

    // Qualquer outro stop_reason
    const texto = data.content?.find((b: any) => b.type === 'text')?.text ?? 'Não consegui processar.'
    return { resposta: texto, turns: i + 1, input_tokens: totalInput, output_tokens: totalOutput }
  }

  return {
    resposta:      'Atingi o limite de consultas. Pode reformular a pergunta?',
    turns:         MAX_TURNS,
    input_tokens:  totalInput,
    output_tokens: totalOutput,
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

// Mapeia tipo do usuário para contexto da Gabriela
function tipoParaContexto(tipo: string): string | null {
  if (tipo === 'gestor_geral' || tipo === 'administrador') return 'gestor'
  if (tipo === 'secretaria')                                return 'secretaria'
  if (tipo === 'financeiro')                                return 'financeiro'
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Validação de JWT ──────────────────────────────────────────────────────
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim() ?? ''
    if (!token) {
      return new Response(
        JSON.stringify({ erro: 'Não autorizado' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    })
    if (!userResp.ok) {
      return new Response(
        JSON.stringify({ erro: 'Não autorizado' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }
    const userAuth = await userResp.json()
    const tipoUsuario = userAuth.user_metadata?.tipo ?? ''
    const contexto = tipoParaContexto(tipoUsuario)

    if (!contexto) {
      return new Response(
        JSON.stringify({ erro: 'Perfil sem acesso à Gabriela' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { mensagens } = await req.json()

    if (!mensagens?.length) {
      return new Response(
        JSON.stringify({ erro: 'mensagens são obrigatórias' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const tools    = getTools(contexto)
    const sistema  = buildSistema(contexto)
    const t0       = Date.now()
    const resultado = await rodarComTools(mensagens, tools, sistema)
    const latencia  = Date.now() - t0

    // Última mensagem do usuário (resumo para log)
    const ultimaMsg = [...mensagens].reverse().find((m: any) => m.role === 'user')
    const pergunta  = typeof ultimaMsg?.content === 'string'
      ? ultimaMsg.content.slice(0, 300)
      : JSON.stringify(ultimaMsg?.content).slice(0, 300)

    // Log assíncrono — não bloqueia resposta
    await supabaseInsert('agente_ia_log', {
      agente:        'gabriela',
      contexto,
      pergunta,
      turns:         resultado.turns,
      input_tokens:  resultado.input_tokens,
      output_tokens: resultado.output_tokens,
      latencia_ms:   latencia,
      erro:          false,
    })

    return new Response(
      JSON.stringify({ resposta: resultado.resposta }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('agente-gabriela error:', err)
    await supabaseInsert('agente_ia_log', {
      agente:   'gabriela',
      contexto: '',
      erro:     true,
      erro_msg: err.message?.slice(0, 500),
    })
    return new Response(
      JSON.stringify({ resposta: 'Desculpe, tive um problema ao consultar os dados. Tente novamente.' }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
