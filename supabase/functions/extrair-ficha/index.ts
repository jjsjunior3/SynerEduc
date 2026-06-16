// supabase/functions/extrair-ficha/index.ts
// Extrai dados de ficha de matrícula via Claude Vision (PDF/imagem em base64)
// Retorna JSON estruturado com todos os campos da ficha

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

const PROMPT_FICHA = `Você é um assistente especializado em leitura de fichas de matrícula do Colégio Conexão Maranhense.
Analise o documento fornecido e extraia os dados conforme a estrutura da ficha padrão da escola.

A ficha possui exatamente estes campos:
- NOME DO ALUNO
- SÉRIE
- DATA DE NASCIMENTO
- FILIAÇÃO (nome do pai e da mãe, num campo único)
- RESPONSÁVEL FINANCEIRO (nome)
- RG do responsável
- CPF do responsável
- ENDEREÇO (campo único com rua, número, bairro, cidade/UF e CEP)
- TELEFONE DE CONTATO
- E-MAIL
- Há uma FOTO 3x4 do aluno no canto superior direito — informe se ela existe

Retorne APENAS um JSON válido com esta estrutura (use null para campos não encontrados):

{
  "aluno": {
    "nome_completo": "string ou null",
    "data_nascimento": "YYYY-MM-DD ou null",
    "serie": "string (ex: 2ª série, 6º ano) ou null",
    "filiacao": "string com nome do pai e da mãe ou null"
  },
  "responsavel": {
    "nome": "string ou null",
    "rg": "string ou null",
    "cpf": "string ou null",
    "endereco": "string completa como está na ficha ou null",
    "telefone": "string ou null",
    "email": "string ou null"
  },
  "tem_foto": true ou false,
  "confianca": "alta, media ou baixa"
}

REGRAS:
- Datas sempre no formato YYYY-MM-DD
- Endereço: copie exatamente como está escrito na ficha (ex: "R. José Deodoro, n.170 - Luzia - Aracaju/SE - CEP: 49048-390")
- confianca: "alta" se leu tudo claramente, "media" se algum campo duvidoso, "baixa" se documento com muita dificuldade
- Não invente dados — use null se não encontrar`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { imagem, tipo_mime } = await req.json()
    // imagem: string base64 do arquivo
    // tipo_mime: 'image/jpeg', 'image/png', 'application/pdf'

    if (!imagem) {
      return new Response(
        JSON.stringify({ erro: 'imagem base64 é obrigatória' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const isPdf = tipo_mime === 'application/pdf'

    // PDF → type: "document" | Imagem → type: "image"
    const conteudoArquivo = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imagem } }
      : { type: 'image',    source: { type: 'base64', media_type: tipo_mime ?? 'image/jpeg', data: imagem } }

    const headers: Record<string, string> = {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    }
    if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            conteudoArquivo,
            { type: 'text', text: PROMPT_FICHA },
          ],
        }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`Claude: ${resp.status} — ${err}`)
    }

    const claude  = await resp.json() as any
    const raw     = (claude.content?.[0]?.text ?? '{}').trim()
    const jsonStr = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const dados   = JSON.parse(jsonStr)

    return new Response(
      JSON.stringify(dados),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('extrair-ficha error:', err)
    return new Response(
      JSON.stringify({ erro: err.message ?? 'Erro ao processar documento' }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
