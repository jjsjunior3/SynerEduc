// supabase/functions/dona-maria/index.ts
// Agente de Inclusão Educacional — Tia Maria José
// v13: gpt-image-1 (novo modelo OpenAI), limpeza &nbsp; server-side

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const OPENAI_KEY    = Deno.env.get('OPENAI_API_KEY')    ?? ''
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')      ?? ''
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CHAT_MODEL    = 'claude-sonnet-4-6'

const LIMITE_PROFESSOR   = 5
const LIMITE_COORDENADOR = 20

// ─── Log assíncrono ───────────────────────────────────────────────────────────
async function logIA(row: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/agente_ia_log`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(row),
    })
  } catch (_) {}
}

// ─── Semana ISO (ex: "2026-W24") ──────────────────────────────────────────────
function semanaISO(data = new Date()): string {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()))
  const dia = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dia)
  const ano = d.getUTCFullYear()
  const semana = Math.ceil((((d.getTime() - new Date(Date.UTC(ano, 0, 1)).getTime()) / 86400000) + 1) / 7)
  return `${ano}-W${String(semana).padStart(2, '0')}`
}

// ─── Quota ────────────────────────────────────────────────────────────────────
async function verificarQuota(usuarioId: string, perfil: string) {
  const limite = perfil === 'coordenador' ? LIMITE_COORDENADOR : LIMITE_PROFESSOR
  const semana = semanaISO()
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data } = await sb
    .from('uso_atividades_ia')
    .select('quantidade')
    .eq('usuario_id', usuarioId)
    .eq('semana', semana)
    .maybeSingle()
  const usado = data?.quantidade ?? 0
  return { permitido: usado < limite, usado, limite }
}

async function incrementarQuota(usuarioId: string): Promise<void> {
  const semana = semanaISO()
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
  await sb.rpc('incrementar_uso_ia', { p_usuario_id: usuarioId, p_semana: semana })
}

// ─── DALL-E 3 ─────────────────────────────────────────────────────────────────
async function gerarIlustracao(promptVisual: string): Promise<string | null> {
  if (!OPENAI_KEY) return null
  try {
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model:   'gpt-image-1',
        prompt:  promptVisual,
        n:       1,
        size:    '1024x1024',
        quality: 'low',
      }),
    })
    if (!resp.ok) {
      console.error('DALL-E error:', resp.status, await resp.text())
      return null
    }
    const data = await resp.json() as any
    // gpt-image-1 retorna b64_json; url se disponível
    const img = data.data?.[0]
    if (!img) return null
    if (img.url) return img.url
    if (img.b64_json) return `data:image/png;base64,${img.b64_json}`
    return null
  } catch (e) {
    console.error('gpt-image-1 exception:', e)
    return null
  }
}

function buildPromptDalle(form: any): string {
  const tema      = form.disciplina || form.habilidadeAlvo || 'aprendizado'
  const interesse = form.observacoes ? `, com elementos de: ${form.observacoes}` : ''
  return (
    `Colorful educational illustration for Brazilian children aged 3-6 years. ` +
    `Theme: ${tema}${interesse}. ` +
    `Style: bright flat cartoon, thick outlines, white background, very cheerful and friendly characters. ` +
    `No text. Large simple shapes. Vivid colors: yellow, red, blue, green, orange. ` +
    `Characters with big round eyes and big smiles. Child-safe, warm, inclusive. ` +
    `Full page illustration suitable for a printable activity sheet.`
  )
}

// ─── Labels ───────────────────────────────────────────────────────────────────
const ATIPICIDADES_LABELS: Record<string, string> = {
  tea:      'TEA (Transtorno do Espectro Autista)',
  tdah:     'TDAH (Transtorno do Déficit de Atenção com Hiperatividade)',
  dislexia: 'Dislexia',
  discalc:  'Discalculia',
  dpac:     'DPAC (Desordem do Processamento Auditivo Central)',
  down:     'Síndrome de Down',
  dda:      'Déficit de Atenção',
  altas:    'Altas Habilidades / Superdotação',
  outro:    'Outra condição',
}

const RECURSOS_LABELS: Record<string, string> = {
  papel:   'papel e caneta',
  digital: 'computador ou tablet',
  jogos:   'jogos e materiais lúdicos',
  recorte: 'recorte e colagem',
  imagens: 'imagens e figuras',
  audio:   'áudio e música',
  corpo:   'atividade corporal/movimento',
}

const TIPO_LABELS: Record<string, string> = {
  jogo:      'jogo educativo',
  historia:  'história adaptada',
  exercicio: 'exercício passo a passo',
  arte:      'atividade artística',
  musica:    'música e ritmo',
  rotina:    'rotina visual',
  social:    'dinâmica em grupo',
}

// ─── Prompt Infantil ──────────────────────────────────────────────────────────
function buildPromptInfantil(form: any): string {
  const atipicidades = (form.atipicidade as string[]).map((a: string) => ATIPICIDADES_LABELS[a] ?? a).join(', ')
  const nomeAluno    = form.nomeAluno || 'Aluno(a)'
  const tema         = form.disciplina || 'livre'

  return `Você é a Tia Maria José, neuropsicopedagoga especialista em Educação Infantil inclusiva.
Gere UMA atividade COMPACTA para Educação Infantil que caiba em 1 página A4 impressa.

<perfil>
- Nome: ${nomeAluno}, ${form.idade}
- Condição: ${atipicidades}
- Habilidade: ${form.habilidadeAlvo}
- Tema: ${tema}
${form.observacoes ? `- Interesses: ${form.observacoes}` : ''}
</perfil>

TIPOS DE EXERCÍCIO PERMITIDOS (escolha exatamente 2):
1. CIRCULE: "Circule o(a) [X]: 🐱 🐶 🚗 🍎" — criança circule no papel impresso
2. CONTE E ESCREVA: "Conte e escreva: 🚗🚗🚗 = ___"
3. COMPLETE A LETRA: "Complete: A _ _ _ _ _" ou "Escreva a letra que falta: C_SA"
4. PINTE: "Pinte somente as [X]: 🍎 🚗 🍌 🏠 🍇"
5. VERDADEIRO OU FALSO COM EMOJI: "🐱 faz AU AU? ( ) V ( ) F"

PROIBIDO: exercício "ligue com uma linha" — não funciona bem impresso sem layout gráfico.

REGRAS DE FORMATAÇÃO:
- ZERO linhas em branco entre itens do exercício — sem parágrafo vazio
- Apenas 1 linha em branco entre ATIVIDADE 1 e ATIVIDADE 2
- Espaço de resposta: ___ (3 underscores) — não mais que isso
- NUNCA use &nbsp; ou qualquer entidade HTML

Formato EXATO (copie esta estrutura sem adicionar linhas extras):
**[TÍTULO ALEGRE]**
💬 *[frase curta para ${nomeAluno}]*
---
## [Emoji] ATIVIDADE 1 — [TÍTULO]
**[Instrução direta, 1 linha]**
[linha 1 do exercício com emojis]
[linha 2 do exercício se necessário]
___

## [Emoji] ATIVIDADE 2 — [TÍTULO]
**[Instrução direta, 1 linha]**
[linha 1 do exercício com emojis]
[linha 2 do exercício se necessário]
___
---
✅ **Gabarito:** [respostas em 1 linha]`
}

// ─── Prompt Atividade Pronta ───────────────────────────────────────────────────
function buildPromptAtividadePronta(form: any): string {
  const atipicidades = (form.atipicidade as string[]).map(a => ATIPICIDADES_LABELS[a] ?? a).join(', ')
  const recursos     = (form.recursos as string[]).map(r => RECURSOS_LABELS[r] ?? r).join(', ')
  const tipoAtiv     = TIPO_LABELS[form.tipoAtividade] ?? form.tipoAtividade
  const isAvaliacao  = form.tipoDocumento === 'avaliacao'
  const docTipo      = isAvaliacao ? 'AVALIAÇÃO ADAPTADA' : 'ATIVIDADE ADAPTADA'
  const nomeAluno    = form.nomeAluno || 'Aluno(a)'

  return `Você é a Tia Maria José, neuropsicopedagoga com 40 anos de experiência clínica em educação inclusiva.

Gere uma **folha de ${docTipo} COMPLETA e PRONTA PARA IMPRIMIR**.

<perfil_aluno>
- Nome: ${nomeAluno}
- Idade: ${form.idade}
- Condição(ões): ${atipicidades}
- Habilidade a desenvolver: ${form.habilidadeAlvo}
- Recursos disponíveis: ${recursos}
- Formato preferido: ${tipoAtiv || 'livre'}
${form.disciplina ? `- Disciplina: ${form.disciplina}` : ''}
${form.observacoes ? `- Observações: ${form.observacoes}` : ''}
</perfil_aluno>

**Nome:** ______________________________  **Data:** ___/___/______  **Turma:** _______

---

**📌 Querido(a) ${nomeAluno},**
[frase acolhedora]

---

[5 a 8 exercícios com ## para cada um]

---

**✏️ Gabarito** *(recortar antes de entregar)*

---
*Adaptada para: ${atipicidades} · ${form.idade}*

REGRAS: Use ## para exercícios. NÃO use --- entre exercícios. Linguagem simples adaptada à condição. NUNCA use &nbsp; ou HTML.`
}

// ─── Prompt Roteiro Inclusivo ─────────────────────────────────────────────────
function buildPromptInclusiva(form: any): string {
  const atipicidades = (form.atipicidade as string[]).map(a => ATIPICIDADES_LABELS[a] ?? a).join(', ')
  const tipoAtiv     = TIPO_LABELS[form.tipoAtividade] ?? form.tipoAtividade
  const nomeAluno    = form.nomeAluno || 'o(a) aluno(a)'

  return `Você é a Tia Maria José, neuropsicopedagoga com 40 anos de experiência clínica em educação inclusiva.

Crie um **ROTEIRO DE ATIVIDADE INCLUSIVA** para o professor aplicar com TODA A TURMA.

<perfil>
- Aluno: ${nomeAluno}, ${form.idade}
- Condição(ões): ${atipicidades}
- Habilidade: ${form.habilidadeAlvo}
- Formato: ${tipoAtiv || 'dinâmica em grupo'}
${form.disciplina ? `- Disciplina: ${form.disciplina}` : ''}
${form.observacoes ? `- Observações: ${form.observacoes}` : ''}
</perfil>

Formato:
**[TÍTULO]**
## 🎯 Objetivo pedagógico
## ⏱️ Duração e materiais
## 👣 Passo a passo
## 💜 Como ${nomeAluno} participa
## 🌈 Diferenciação
## 💡 Dica da Tia Maria José

NUNCA use &nbsp; ou HTML.`
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data: { user } } = await sb.auth.getUser(jwt)
    const usuarioId = user?.id

    const { form, usuarioNome } = await req.json()

    if (!form?.atipicidade?.length || !form?.habilidadeAlvo) {
      return new Response(
        JSON.stringify({ error: 'Formulário incompleto' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const isInfantil = form.nivelEnsino === 'infantil'

    // Verificar quota (modo infantil)
    if (isInfantil && usuarioId) {
      const perfil = form.perfil ?? 'professor'
      const quota = await verificarQuota(usuarioId, perfil)
      if (!quota.permitido) {
        return new Response(
          JSON.stringify({
            error: `Limite semanal atingido (${quota.usado}/${quota.limite} atividades). Renova na próxima semana.`,
            quota,
          }),
          { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
    }

    const prompt = isInfantil
      ? buildPromptInfantil(form)
      : form.modoSaida === 'instrucao_inclusiva'
        ? buildPromptInclusiva(form)
        : buildPromptAtividadePronta(form)

    // Claude + DALL-E em paralelo no modo infantil
    const t0 = Date.now()
    const [claudeResp, imagemUrl] = await Promise.all([
      fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      CHAT_MODEL,
          max_tokens: 2048,
          messages:   [{ role: 'user', content: prompt }],
        }),
      }),
      isInfantil ? gerarIlustracao(buildPromptDalle(form)) : Promise.resolve(null),
    ])

    if (!claudeResp.ok) {
      const err = await claudeResp.json().catch(() => ({}))
      throw new Error(`Claude: ${claudeResp.status} ${(err as any)?.error?.message ?? ''}`)
    }

    const data  = await claudeResp.json() as any
    const texto = (data.content?.[0]?.text ?? '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    const latencia = Date.now() - t0

    // Incrementar quota após sucesso
    if (isInfantil && usuarioId) {
      await incrementarQuota(usuarioId).catch(e => console.error('quota increment error:', e))
    }

    // Log assíncrono
    logIA({
      agente:        'dona-maria',
      contexto:      isInfantil ? 'infantil' : (form.modoSaida ?? 'padrao'),
      pergunta:      (form.habilidadeAlvo ?? form.disciplina ?? '').slice(0, 300),
      usuario_id:    usuarioId ?? null,
      turns:         1,
      input_tokens:  data.usage?.input_tokens  ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
      latencia_ms:   latencia,
      erro:          false,
    })

    return new Response(
      JSON.stringify({
        atividade:   texto,
        imagem_url:  imagemUrl,
        ilustracoes: [],
        modo:        isInfantil ? 'infantil' : 'padrao',
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('dona-maria error:', err)
    logIA({ agente: 'dona-maria', erro: true, erro_msg: err.message?.slice(0, 500) })
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
