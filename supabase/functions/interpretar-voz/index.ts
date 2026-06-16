// supabase/functions/interpretar-voz/index.ts
// Interpreta comandos de voz do professor e retorna JSON estruturado
// Suporta: criar agenda, marcar frequência (faltas), adicionar observação

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

function buildPrompt(texto: string, contexto: string, alunos: any[]): string {
  const listaAlunos = alunos.length
    ? `\nAlunos disponíveis na turma:\n${alunos.map(a => `- "${a.nome}" (id: ${a.id})`).join('\n')}`
    : ''

  return `Você é um assistente escolar que interpreta comandos de voz de professores brasileiros.
O professor está usando o sistema SynerEduc no celular, dentro de sala de aula.

Contexto atual da tela: ${
    contexto === 'agenda'     ? 'AGENDA DO PROFESSOR — o professor quer registrar o conteúdo da aula de hoje' :
    contexto === 'frequencia' ? 'FREQUÊNCIA — o professor quer marcar quem faltou' :
    'GERAL'
  }
${listaAlunos}

Fala do professor: "${texto}"

Interprete a intenção e retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois):

--- Se for criar/registrar agenda:
{
  "acao": "criar_agenda",
  "confianca": "alta",
  "resumo": "frase curta e clara do que foi entendido",
  "dados": {
    "titulo_unidade": "título ou tema da aula (ex: Unidade 3 - Fotossíntese)",
    "conteudo_sala": "o que foi feito/visto em sala",
    "atividade_casa": "tarefa de casa (se mencionada, senão null)",
    "observacao": "recado ou observação extra (se mencionada, senão null)"
  }
}

--- Se for marcar faltas/frequência:
{
  "acao": "marcar_frequencia",
  "confianca": "alta",
  "resumo": "frase curta do que foi entendido",
  "dados": {
    "alunos_ausentes": [
      {"id": "id-exato-da-lista", "nome": "Nome completo como está na lista"}
    ],
    "numero_aula": 1
  }
}

--- Se for observação sobre aluno específico:
{
  "acao": "adicionar_observacao",
  "confianca": "alta",
  "resumo": "frase curta",
  "dados": {
    "aluno_id": "id-do-aluno-ou-null",
    "aluno_nome": "nome identificado",
    "observacao": "texto da observação"
  }
}

--- Se não entender:
{
  "acao": "desconhecido",
  "confianca": "baixa",
  "resumo": "Não entendi bem. Pode repetir dizendo 'agenda', 'falta' ou 'observação'?",
  "dados": {}
}

REGRAS IMPORTANTES:
- Para frequência: cruze os nomes falados com a lista de alunos. Use correspondência parcial (ex: "Pedro" → "Pedro Henrique Santos").
- Se um nome bater com mais de um aluno, inclua todos os possíveis na lista.
- "título" / "unidade" / "tema" / "assunto" → titulo_unidade
- "em sala" / "vimos" / "estudamos" / "conteúdo" → conteudo_sala
- "para casa" / "tarefa" / "exercício" / "página X questão Y" → atividade_casa
- Número da aula: se o professor disser "1ª aula" ou "segunda aula" → numero_aula. Padrão: 1.
- O JSON deve ser 100% válido — sem aspas erradas, sem campos extras.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { texto, contexto, alunos } = await req.json()

    if (!texto?.trim()) {
      return new Response(
        JSON.stringify({ acao: 'desconhecido', confianca: 'baixa', resumo: 'Nenhum texto recebido.', dados: {} }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: buildPrompt(texto, contexto ?? 'geral', alunos ?? []) }],
      }),
    })

    if (!resp.ok) throw new Error(`Claude: ${resp.status}`)

    const claude = await resp.json() as any
    const raw    = (claude.content?.[0]?.text ?? '{}').trim()

    // Garante JSON limpo mesmo que Claude adicione markdown acidentalmente
    const jsonStr = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const resultado = JSON.parse(jsonStr)

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('interpretar-voz error:', err)
    return new Response(
      JSON.stringify({ acao: 'desconhecido', confianca: 'baixa', resumo: 'Erro ao interpretar. Tente novamente.', dados: {} }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
