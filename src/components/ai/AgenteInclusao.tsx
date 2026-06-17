// src/components/ai/AgenteInclusao.tsx
// Agente de Inclusão — Tia Maria José
// Homenagem à Maria José, neurocientista e neuropsicopedagoga
//
// Fluxo: botão flutuante → formulário guiado → IA gera atividade → exibe/imprime

import React, { useState, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, Printer, RotateCcw, Loader2, Search, UserCheck } from 'lucide-react'
import { AvatarDonaMaria } from './AvatarDonaMaria'
import { Button } from '../ui/button'
import { supabase } from '../../supabase/supabaseClient'
import logoEscola from '../../assets/logo-escola.png'

// ─── Conversor Markdown → HTML para impressão ────────────────────────────────
// Garante que questões não quebrem entre páginas e remove artefatos de markdown

function markdownParaHtml(md: string): string {
  const linhas = md.split('\n')
  const partes: string[] = []
  let emQuestao = false

  for (const linha of linhas) {
    const t = linha.trim()

    // Header ## ou ### → inicia bloco de questão com page-break-inside: avoid
    if (t.startsWith('## ') || t.startsWith('### ')) {
      if (emQuestao) partes.push('</div>')
      const titulo = t
        .replace(/^#{2,3}\s+/, '')
        // Remove "EXERCÍCIO N -" ou "EXERCÍCIO N–" caso a IA inclua
        .replace(/^EXERCÍCIO\s+\d+\s*[-–:]\s*/i, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
      partes.push(`<div class="questao"><p class="q-titulo">${titulo}</p>`)
      emQuestao = true
      continue
    }

    // Separador --- ou ━━━ → linha decorativa
    if (t === '---' || t.startsWith('━━━')) {
      if (emQuestao) { partes.push('</div>'); emQuestao = false }
      partes.push('<hr class="sep"/>')
      continue
    }

    // Linha vazia → espaçamento sutil
    if (t === '') {
      partes.push('<div style="height:5px"></div>')
      continue
    }

    // Conteúdo: processa negrito e itálico
    const html = t
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')

    partes.push(emQuestao
      ? `<p class="q-linha">${html}</p>`
      : `<p class="linha">${html}</p>`
    )
  }

  if (emQuestao) partes.push('</div>')
  return partes.join('')
}

// ─── Renderizador de Markdown para o chat ────────────────────────────────────

function MarkdownChat({ texto }: { texto: string }) {
  const linhas = texto.split('\n')
  const elementos: React.ReactNode[] = []
  let listaItems: React.ReactNode[] = []
  let listaNum:   React.ReactNode[] = []

  const inline = (linha: string, key: number) =>
    linha.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
      if (p.startsWith('*')  && p.endsWith('*'))  return <em      key={i}>{p.slice(1, -1)}</em>
      return p
    })

  const flushLista = () => {
    if (listaItems.length) {
      elementos.push(<ul key={`ul-${elementos.length}`} className="list-disc pl-4 space-y-0.5 my-1">{listaItems}</ul>)
      listaItems = []
    }
    if (listaNum.length) {
      elementos.push(<ol key={`ol-${elementos.length}`} className="list-decimal pl-4 space-y-0.5 my-1">{listaNum}</ol>)
      listaNum = []
    }
  }

  linhas.forEach((linha, i) => {
    const t = linha.trim()
    if (t === '---') { flushLista(); elementos.push(<hr key={i} className="border-gray-300 dark:border-gray-600 my-2" />); return }
    if (t.startsWith('### ')) { flushLista(); elementos.push(<p key={i} className="font-semibold mt-2">{inline(t.slice(4), i)}</p>); return }
    if (t.startsWith('## '))  { flushLista(); elementos.push(<p key={i} className="font-bold text-emerald-700 dark:text-emerald-400 mt-3">{inline(t.slice(3), i)}</p>); return }
    if (/^[-•]\s/.test(t))   { listaNum.length && flushLista(); listaItems.push(<li key={i}>{inline(t.slice(2), i)}</li>); return }
    if (/^\d+\.\s/.test(t))  { listaItems.length && flushLista(); listaNum.push(<li key={i}>{inline(t.replace(/^\d+\.\s/, ''), i)}</li>); return }
    if (t === '')             { flushLista(); elementos.push(<div key={i} className="h-2" />); return }
    flushLista()
    elementos.push(<p key={i} className="leading-relaxed">{inline(t, i)}</p>)
  })

  flushLista()
  return <div className="space-y-0.5">{elementos}</div>
}

// ─── Impressão isolada ────────────────────────────────────────────────────────

function imprimirAtividade(atividade: string, form: FormData, imagemUrl?: string | null) {
  const nomeAluno   = form.nomeAluno || 'Criança'
  const dataHoje    = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })
  const ehInfantil  = form.nivelEnsino === 'infantil'
  const ehInclusiva = form.modoSaida === 'instrucao_inclusiva'
  const subtitulo   = ehInfantil
    ? 'Atividade de Educação Infantil'
    : ehInclusiva
      ? 'Roteiro de Atividade Inclusiva para a Turma'
      : 'Atividade de Inclusão Educacional'
  const conteudo    = markdownParaHtml(atividade)

  const blocoImagem = ehInfantil && imagemUrl
    ? `<div class="ilustracao-principal"><img src="${imagemUrl}" alt="Ilustração da atividade" /></div>`
    : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8"/>
      <title>${subtitulo} — ${nomeAluno}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: Arial, sans-serif;
          max-width: 760px;
          margin: 28px auto;
          color: #1a1a1a;
          line-height: 1.7;
          font-size: 13.5px;
          position: relative;
        }

        /* ── Marca d'água ── */
        body::before {
          content: '';
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          width: 420px; height: 420px;
          background: url('${logoEscola}') center/contain no-repeat;
          opacity: 0.07;
          pointer-events: none;
          z-index: 0;
        }

        /* ── Cabeçalho ── */
        .cabecalho {
          display: flex;
          align-items: center;
          gap: 18px;
          border-bottom: 3px solid #059669;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .cabecalho img { height: 68px; width: auto; object-fit: contain; }
        .cab-texto h1  { font-size: 16px; color: #065f46; font-weight: bold; }
        .cab-texto p   { font-size: 11.5px; color: #6b7280; margin-top: 2px; }
        .cab-texto .sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }

        /* ── Badges ── */
        .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .badge  { font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 9999px; }
        .badge-verde { background: #d1fae5; color: #065f46; }
        .badge-azul  { background: #dbeafe; color: #1e40af; }
        .badge-roxo  { background: #ede9fe; color: #5b21b6; }

        /* ── Conteúdo ── */
        .conteudo { position: relative; z-index: 1; }

        /* ── Parágrafos soltos ── */
        .linha { margin: 4px 0; }
        strong { color: #065f46; }

        /* ── Bloco de questão — não quebra entre páginas ── */
        .questao {
          page-break-inside: avoid;
          break-inside: avoid;
          margin: 10px 0;
          padding: 10px 14px;
          background: #f0fdf4;
          border-left: 4px solid #059669;
          border-radius: 0 8px 8px 0;
        }
        .q-titulo {
          font-weight: bold;
          color: #065f46;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 6px;
        }
        .q-linha { margin: 3px 0; }

        /* ── Separador ── */
        .sep { border: none; border-top: 1px solid #e5e7eb; margin: 14px 0; }

        /* ── Rodapé ── */
        .rodape {
          margin-top: 32px;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
          font-size: 10.5px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
        }

        /* ── Ilustração (modo infantil) — topo compacto ── */
        .ilustracao-principal {
          display: flex;
          justify-content: center;
          margin: 8px 0 12px;
          page-break-inside: avoid;
        }
        .ilustracao-principal img {
          width: auto;
          max-width: 320px;
          max-height: 220px;
          height: auto;
          border-radius: 12px;
          display: block;
          object-fit: cover;
        }

        /* ── Modo infantil: compacto, cabe em 1 página ── */
        ${ehInfantil ? `
        body { font-size: 16px; line-height: 1.6; }
        .questao { padding: 10px 16px; margin: 8px 0; }
        .q-titulo { font-size: 17px; letter-spacing: 0.5px; }
        .q-linha  { font-size: 18px; line-height: 2.2; }
        .linha    { font-size: 18px; line-height: 2.2; }
        strong    { font-size: 17px; }
        /* Tabela para exercício "ligue" */
        table.ligue { width: 70%; margin: 8px auto; border-collapse: separate; border-spacing: 0 10px; }
        table.ligue td.esq { font-size: 2em; width: 20%; text-align: center; }
        table.ligue td.meio { border-bottom: 2px dashed #aaa; width: 45%; }
        table.ligue td.dir { font-size: 1.1em; font-weight: bold; width: 35%; padding-left: 12px; }
        ` : ''}

        @media print {
          body { margin: 12mm 15mm; }
          body::before { position: fixed; }
          .questao { page-break-inside: avoid; break-inside: avoid; }
          .svg-bloco { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>

      <div class="cabecalho">
        <img src="${logoEscola}" alt="Logo Colégio Conexão Maranhense"/>
        <div class="cab-texto">
          <h1>Colégio Conexão Maranhense</h1>
          <p>${subtitulo}</p>
          <p class="sub">Gerada por <strong>Tia Maria José</strong> · Agente de Inclusão — SynerEduc</p>
        </div>
      </div>

      <div class="badges">
        ${ehInfantil
          ? `<span class="badge badge-verde">🎨 Educação Infantil</span>`
          : ehInclusiva
            ? `<span class="badge badge-roxo">👥 Atividade para toda a turma</span>`
            : `<span class="badge badge-verde">👦 ${nomeAluno} · ${form.idade}</span>`
        }
        <span class="badge badge-azul">📅 ${dataHoje}</span>
        ${form.disciplina ? `<span class="badge badge-roxo">📚 ${form.disciplina}</span>` : ''}
      </div>

      ${blocoImagem}
      <div class="conteudo">${conteudo}</div>

      <div class="rodape">
        <span>Colégio Conexão Maranhense · SynerEduc</span>
        <span>Tia Maria José — Agente de Inclusão Educacional</span>
      </div>

    </body>
    </html>
  `

  const janela = window.open('', '_blank', 'width=820,height=750')
  if (!janela) return
  janela.document.write(html)
  janela.document.close()
  janela.focus()
  setTimeout(() => { janela.print(); janela.close() }, 600)
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Perfil = 'professor' | 'coordenador' | 'responsavel'

interface FormData {
  perfil:          Perfil | ''
  nomeAluno:       string
  idade:           string
  atipicidade:     string[]
  habilidadeAlvo:  string
  recursos:        string[]
  tipoAtividade:   string
  tipoDocumento:   'atividade' | 'avaliacao'
  modoSaida:       'atividade_pronta' | 'instrucao_inclusiva'
  nivelEnsino:     'infantil' | 'fundamental' | 'medio'
  disciplina:      string
  observacoes:     string
}

const FORM_INICIAL: FormData = {
  perfil:          '',
  nomeAluno:       '',
  idade:           '',
  atipicidade:     [],
  habilidadeAlvo:  '',
  recursos:        [],
  tipoAtividade:   '',
  tipoDocumento:   'atividade',
  modoSaida:       'atividade_pronta',
  nivelEnsino:     'fundamental',
  disciplina:      '',
  observacoes:     '',
}

// ─── Opções do formulário ─────────────────────────────────────────────────────

const ATIPICIDADES = [
  { id: 'tea',       label: 'TEA (Autismo)' },
  { id: 'tdah',      label: 'TDAH' },
  { id: 'dislexia',  label: 'Dislexia' },
  { id: 'discalc',   label: 'Discalculia' },
  { id: 'dpac',      label: 'DPAC' },
  { id: 'down',      label: 'Síndrome de Down' },
  { id: 'dda',       label: 'Déficit de Atenção' },
  { id: 'altas',     label: 'Altas Habilidades' },
  { id: 'outro',     label: 'Outra condição' },
]

const HABILIDADES = [
  'Comunicação e linguagem',
  'Leitura e escrita',
  'Matemática e raciocínio lógico',
  'Atenção e concentração',
  'Memória e aprendizagem',
  'Socialização e interação',
  'Coordenação motora',
  'Autonomia e independência',
  'Regulação emocional',
]

const RECURSOS = [
  { id: 'papel',    label: '📄 Papel e caneta' },
  { id: 'digital',  label: '💻 Computador / tablet' },
  { id: 'jogos',    label: '🎲 Jogos e materiais lúdicos' },
  { id: 'recorte',  label: '✂️ Recorte e colagem' },
  { id: 'imagens',  label: '🖼️ Imagens e figuras' },
  { id: 'audio',    label: '🎵 Áudio e música' },
  { id: 'corpo',    label: '🤸 Atividade corporal' },
]

const TIPOS_ATIVIDADE = [
  { id: 'jogo',      label: '🎮 Jogo educativo' },
  { id: 'historia',  label: '📖 História adaptada' },
  { id: 'exercicio', label: '📝 Exercício passo a passo' },
  { id: 'arte',      label: '🎨 Atividade artística' },
  { id: 'musica',    label: '🎵 Música e ritmo' },
  { id: 'rotina',    label: '📅 Rotina visual' },
  { id: 'social',    label: '🤝 Dinâmica em grupo' },
]

// ─── Avatar flutuante ─────────────────────────────────────────────────────────

export function BotaoDonaMaria({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-4 sm:left-6 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all duration-300 hover:scale-105 p-1 sm:pr-4"
      aria-label="Abrir Agente de Inclusão Tia Maria José"
    >
      <div className="rounded-full bg-white p-0.5 shrink-0">
        <AvatarDonaMaria size={44} />
      </div>
      {/* Label só aparece em sm+ */}
      <div className="hidden sm:flex flex-col items-start leading-tight">
        <span className="text-xs font-semibold opacity-80">Inclusão</span>
        <span className="text-sm font-bold flex items-center gap-1.5">
          Tia Maria José
          <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
        </span>
      </div>
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  usuario?: { nome?: string; email?: string; tipo?: string; perfil?: string }
}

// Mapeia perfil do sistema para o tipo do formulário
function perfilParaTipo(usuario?: { tipo?: string; perfil?: string }): Perfil {
  const raw = (usuario?.tipo ?? usuario?.perfil ?? '').toLowerCase()
  if (raw.includes('coordenador') || raw.includes('coord')) return 'coordenador'
  if (raw.includes('responsavel') || raw.includes('pai') || raw.includes('mae')) return 'responsavel'
  return 'professor' // professor, administrador, secretaria, etc
}

export function AgenteInclusao({ usuario }: Props) {
  const perfilDetectado = perfilParaTipo(usuario)

  const [aberto,    setAberto]    = useState(false)
  const [etapa,       setEtapa]       = useState(1)
  const [form,        setForm]        = useState<FormData>({ ...FORM_INICIAL, perfil: perfilDetectado })
  const [gerando,     setGerando]     = useState(false)
  const [atividade,   setAtividade]   = useState<string | null>(null)
  const [imagemUrl,   setImagemUrl]   = useState<string | null>(null)
  const [erro,        setErro]        = useState<string | null>(null)

  // ── Busca de aluno ──────────────────────────────────────────────────────────
  const [buscaAluno,      setBuscaAluno]      = useState('')
  const [resultadosAluno, setResultadosAluno] = useState<any[]>([])
  const [buscandoAluno,   setBuscandoAluno]   = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null)

  const buscarAluno = useCallback(async (termo: string) => {
    if (termo.length < 2) { setResultadosAluno([]); return }
    setBuscandoAluno(true)
    try {
      const { data, error } = await supabase
        .from('fichas_matricula')
        .select('id, nome_aluno, data_nascimento, serie, turma')
        .ilike('nome_aluno', `%${termo}%`)
        .limit(6)
      if (error) console.error('buscarAluno erro:', error)
      setResultadosAluno(data ?? [])
    } finally {
      setBuscandoAluno(false)
    }
  }, [])

  // Mapeia texto livre de necessidades_especiais para os ids de atipicidade
  function mapearAtipicidade(texto: string | null): string[] {
    if (!texto) return []
    const t = texto.toLowerCase()
    const ids: string[] = []
    if (t.includes('autis') || t.includes('tea')) ids.push('tea')
    if (t.includes('tdah') || t.includes('hiperativ')) ids.push('tdah')
    if (t.includes('dislexia')) ids.push('dislexia')
    if (t.includes('discalcul')) ids.push('discalc')
    if (t.includes('dpac') || t.includes('processamento auditivo')) ids.push('dpac')
    if (t.includes('down') || t.includes('trissomia')) ids.push('down')
    if (t.includes('déficit') || t.includes('deficit') || t.includes('atenção')) ids.push('dda')
    if (t.includes('altas habilidades') || t.includes('superdotad')) ids.push('altas')
    if (ids.length === 0 && t.length > 2) ids.push('outro')
    return ids
  }

  // Calcula idade a partir da data de nascimento
  function calcularIdade(dataNasc: string | null): string {
    if (!dataNasc) return ''
    const anos = Math.floor((Date.now() - new Date(dataNasc).getTime()) / (365.25 * 24 * 3600 * 1000))
    return anos >= 4 && anos <= 17 ? `${anos} anos` : ''
  }

  function selecionarAluno(aluno: any) {
    const idade = calcularIdade(aluno.data_nascimento)
    setForm(f => ({
      ...f,
      nomeAluno: aluno.nome_aluno ?? '',
      idade:     idade || f.idade,
    }))
    setAlunoSelecionado(aluno.nome_aluno)
    setBuscaAluno(aluno.nome_aluno)
    setResultadosAluno([])
  }

  function resetar() {
    setEtapa(1)
    setForm({ ...FORM_INICIAL, perfil: perfilDetectado })
    setAtividade(null)
    setImagemUrl(null)
    setErro(null)
    setBuscaAluno('')
    setResultadosAluno([])
    setAlunoSelecionado(null)
  }

  function toggleMulti(campo: 'atipicidade' | 'recursos', valor: string) {
    setForm(f => {
      const atual = f[campo]
      return {
        ...f,
        [campo]: atual.includes(valor)
          ? atual.filter(v => v !== valor)
          : [...atual, valor],
      }
    })
  }

  async function gerarAtividade() {
    setGerando(true)
    setErro(null)
    try {
      const { data, error } = await supabase.functions.invoke('dona-maria', {
        body: { form, usuarioNome: usuario?.nome },
      })
      if (error) {
        // Quota esgotada
        if (error.message?.includes('429') || data?.quota) {
          setErro(data?.error ?? 'Limite semanal de atividades atingido. Disponível na próxima semana.')
          return
        }
        throw new Error(error.message)
      }
      setAtividade(data.atividade)
      setImagemUrl(data.imagem_url ?? null)
      if (data.dalle_erro) console.warn('[DALL-E]', data.dalle_erro, '| key:', data.dalle_key)
      setEtapa(5)
    } catch (e: any) {
      setErro('Não consegui gerar a atividade. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  const podeAvancar = (): boolean => {
    if (etapa === 1) return !!form.idade && form.atipicidade.length > 0
    if (etapa === 2) return !!form.habilidadeAlvo
    if (etapa === 3) {
      // Atividade inclusiva: só precisa do modo selecionado (campos são opcionais)
      if (form.modoSaida === 'instrucao_inclusiva') return true
      // Atividade pronta: precisa de recursos e tipo
      return form.recursos.length > 0 && !!form.tipoAtividade
    }
    return true
  }

  if (!aberto) return <BotaoDonaMaria onClick={() => setAberto(true)} />

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-emerald-600 rounded-t-2xl shrink-0">
          <div className="rounded-full bg-white p-0.5 shrink-0">
            <AvatarDonaMaria size={40} />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold leading-tight flex items-center gap-1.5">
              Tia Maria José
              <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded-full leading-none">Beta</span>
            </p>
            <p className="text-emerald-100 text-xs">Agente de Inclusão Educacional</p>
          </div>
          <button onClick={() => { setAberto(false); resetar() }} className="text-emerald-100 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Progresso */}
        {etapa < 5 && (
          <div className="px-5 pt-4 shrink-0">
            <div className="flex gap-1.5 mb-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= etapa ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-400">Etapa {etapa} de 4</p>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Etapa 1 — Sobre a criança */}
          {etapa === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-0.5">
                  Olá{usuario?.nome && !usuario.nome.includes('@') ? `, ${usuario.nome.split(' ')[0]}` : ''}! Eu sou a Tia Maria José 👩‍⚕️
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">
                  {perfilDetectado === 'professor' ? '👨‍🏫 Identificado como Professor(a)' :
                   perfilDetectado === 'coordenador' ? '📋 Identificado como Coordenador(a)' :
                   '👨‍👩‍👧 Identificado como Responsável'}
                </p>
              </div>

              {/* Busca de aluno cadastrado */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                  Buscar aluno cadastrado no portal
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={buscaAluno}
                    onChange={e => { setBuscaAluno(e.target.value); setAlunoSelecionado(null); buscarAluno(e.target.value) }}
                    placeholder="Digite o nome do aluno..."
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-8 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {buscandoAluno && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                  {alunoSelecionado && <UserCheck size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                </div>

                {/* Lista de resultados */}
                {resultadosAluno.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 shadow-md">
                    {resultadosAluno.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => selecionarAluno(a)}
                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.nome_aluno}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {a.serie ?? '—'}{a.turma ? ` · ${a.turma}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Confirmação do aluno selecionado */}
                {alunoSelecionado && (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                    <UserCheck size={14} className="text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      <strong>{alunoSelecionado}</strong> selecionado — campos preenchidos automaticamente
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Sobre a criança 👦👧</p>
                <p className="text-sm text-gray-500">Confirme ou ajuste os dados abaixo</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Nome (opcional)</label>
                  <input
                    type="text"
                    value={form.nomeAluno}
                    onChange={e => setForm(f => ({ ...f, nomeAluno: e.target.value }))}
                    placeholder="Ex: Lucas"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Idade *</label>
                  <select
                    value={form.idade}
                    onChange={e => setForm(f => ({ ...f, idade: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecione</option>
                    {Array.from({ length: 14 }, (_, i) => i + 4).map(n => (
                      <option key={n} value={`${n} anos`}>{n} anos</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                  Condição / atipicidade * <span className="text-gray-400">(pode marcar mais de uma)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ATIPICIDADES.map(op => (
                    <button
                      key={op.id}
                      onClick={() => toggleMulti('atipicidade', op.id)}
                      className={`px-3 py-2 rounded-lg text-sm text-left border transition-all ${
                        form.atipicidade.includes(op.id)
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2 — Habilidade alvo */}
          {etapa === 2 && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">O que queremos desenvolver? 🎯</p>
                <p className="text-sm text-gray-500">Qual habilidade a atividade deve trabalhar?</p>
              </div>
              <div className="grid gap-2">
                {HABILIDADES.map(h => (
                  <button
                    key={h}
                    onClick={() => setForm(f => ({ ...f, habilidadeAlvo: h }))}
                    className={`px-4 py-3 rounded-xl text-sm text-left border-2 transition-all ${
                      form.habilidadeAlvo === h
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 3 — Modo de saída + configuração */}
          {etapa === 3 && (
            <div className="space-y-5">

              {/* Nível de ensino */}
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Nível de ensino 🎓</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'infantil',    label: 'Ed. Infantil', emoji: '🎨', desc: '3–6 anos' },
                    { id: 'fundamental', label: 'Fundamental',  emoji: '📚', desc: '6–14 anos' },
                    { id: 'medio',       label: 'Médio',        emoji: '🎓', desc: '14–18 anos' },
                  ] as const).map(op => (
                    <button
                      key={op.id}
                      onClick={() => setForm(f => ({ ...f, nivelEnsino: op.id }))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${
                        form.nivelEnsino === op.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{op.emoji}</span>
                      <span className={`text-xs font-semibold ${form.nivelEnsino === op.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>{op.label}</span>
                      <span className="text-xs text-gray-400">{op.desc}</span>
                    </button>
                  ))}
                </div>
                {form.nivelEnsino === 'infantil' && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                    🎨 A IA vai gerar atividade com <strong>ilustrações coloridas e grandes</strong> — ideal para impressão e crianças pequenas.
                  </p>
                )}
              </div>

              {/* Seletor principal: o que gerar — oculto no modo infantil */}
              {form.nivelEnsino !== 'infantil' && <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">O que você quer gerar? 🎯</p>
                <p className="text-xs text-gray-500 mb-3">Escolha o tipo de documento</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      id: 'atividade_pronta',
                      emoji: '📄',
                      label: 'Atividade ou Avaliação Pronta',
                      desc: 'Folha completa para imprimir e entregar ao aluno. Exercícios reais adaptados para a criança.',
                      cor: 'emerald',
                    },
                    {
                      id: 'instrucao_inclusiva',
                      emoji: '👥',
                      label: 'Roteiro de Atividade Inclusiva',
                      desc: 'Atividade para TODA A TURMA — onde alunos atípicos e neurotípicos participam juntos. Isso é inclusão real.',
                      cor: 'violet',
                    },
                  ].map(op => (
                    <button
                      key={op.id}
                      onClick={() => setForm(f => ({ ...f, modoSaida: op.id as any }))}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        form.modoSaida === op.id
                          ? op.cor === 'violet'
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{op.emoji}</span>
                      <div>
                        <p className={`font-semibold text-sm ${
                          form.modoSaida === op.id
                            ? op.cor === 'violet' ? 'text-violet-700 dark:text-violet-300' : 'text-emerald-700 dark:text-emerald-300'
                            : 'text-gray-800 dark:text-gray-100'
                        }`}>{op.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{op.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>}

              {/* Se atividade pronta: Atividade ou Avaliação — oculto no modo infantil */}
              {form.nivelEnsino !== 'infantil' && form.modoSaida === 'atividade_pronta' && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Tipo de documento *</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'atividade', emoji: '✏️', label: 'Atividade', desc: 'Exercícios para praticar' },
                      { id: 'avaliacao', emoji: '📋', label: 'Avaliação', desc: 'Questões para avaliar' },
                    ].map(op => (
                      <button
                        key={op.id}
                        onClick={() => setForm(f => ({ ...f, tipoDocumento: op.id as any }))}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${
                          form.tipoDocumento === op.id
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        <span className="text-xl">{op.emoji}</span>
                        <span className={`font-semibold text-sm ${form.tipoDocumento === op.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-100'}`}>{op.label}</span>
                        <span className="text-xs text-gray-500">{op.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Disciplina (ambos os modos) */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Disciplina <span className="text-gray-400">(opcional)</span>
                </label>
                <select
                  value={form.disciplina}
                  onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Não especificada / Multidisciplinar</option>
                  <option>Língua Portuguesa</option>
                  <option>Matemática</option>
                  <option>Ciências</option>
                  <option>História</option>
                  <option>Geografia</option>
                  <option>Arte</option>
                  <option>Educação Física</option>
                  <option>Inglês</option>
                  <option>Biologia</option>
                  <option>Física</option>
                  <option>Química</option>
                  <option>Filosofia</option>
                  <option>Sociologia</option>
                </select>
              </div>

              {/* Recursos: só para atividade pronta */}
              {form.modoSaida === 'atividade_pronta' && (
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Recursos disponíveis 🛠️ *</p>
                  <p className="text-xs text-gray-500 mb-3">O que você tem à mão para o aluno usar?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {RECURSOS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => toggleMulti('recursos', r.id)}
                        className={`px-3 py-2.5 rounded-lg text-sm text-left border transition-all ${
                          form.recursos.includes(r.id)
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipo de atividade: ambos os modos */}
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                  {form.modoSaida === 'instrucao_inclusiva' ? 'Formato da dinâmica 🎨' : 'Tipo de atividade preferida 🎨'}
                  {form.modoSaida === 'instrucao_inclusiva' && <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_ATIVIDADE.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setForm(f => ({ ...f, tipoAtividade: f.tipoAtividade === t.id ? '' : t.id }))}
                      className={`px-3 py-2.5 rounded-lg text-sm text-left border-2 transition-all ${
                        form.tipoAtividade === t.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 4 — Observações + gerar */}
          {etapa === 4 && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Alguma observação adicional? 💬</p>
                <p className="text-sm text-gray-500 mb-3">
                  Contexto extra, preferências da criança, o que já foi tentado... (opcional)
                </p>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Ex: Lucas gosta muito de dinossauros e tem dificuldade em ficar parado por mais de 10 minutos..."
                  maxLength={1000}
                  rows={4}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Resumo */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-2">Resumo do que será gerado</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Modo:</span>{' '}
                  {form.modoSaida === 'instrucao_inclusiva'
                    ? '👥 Roteiro Inclusivo para toda a turma'
                    : form.tipoDocumento === 'avaliacao' ? '📋 Avaliação Adaptada pronta para imprimir' : '✏️ Atividade Adaptada pronta para imprimir'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Criança:</span> {form.nomeAluno || 'não informado'}, {form.idade}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Condição:</span> {form.atipicidade.map(a => ATIPICIDADES.find(x => x.id === a)?.label).join(', ')}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Foco:</span> {form.habilidadeAlvo}
                </p>
                {form.disciplina && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Disciplina:</span> {form.disciplina}
                  </p>
                )}
                {form.tipoAtividade && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Formato:</span> {TIPOS_ATIVIDADE.find(t => t.id === form.tipoAtividade)?.label}
                  </p>
                )}
              </div>

              {erro && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{erro}</p>
              )}
            </div>
          )}

          {/* Etapa 5 — Resultado */}
          {etapa === 5 && atividade && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AvatarDonaMaria size={32} />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {form.nivelEnsino === 'infantil'
                      ? 'Atividade Infantil gerada por Tia Maria José ✨'
                      : form.modoSaida === 'instrucao_inclusiva'
                        ? 'Roteiro inclusivo gerado por Tia Maria José ✨'
                        : 'Atividade gerada por Tia Maria José ✨'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {form.nivelEnsino === 'infantil'
                      ? 'Com ilustrações coloridas — pronta para imprimir'
                      : form.modoSaida === 'instrucao_inclusiva'
                        ? 'Para aplicar com toda a turma'
                        : 'Pronta para imprimir e entregar ao aluno'}
                  </p>
                </div>
              </div>

              {/* Ilustração DALL-E — só no modo infantil */}
              {form.nivelEnsino === 'infantil' && imagemUrl && (
                <div className="rounded-2xl overflow-hidden border border-emerald-100 dark:border-emerald-900 shadow-sm">
                  <img
                    src={imagemUrl}
                    alt="Ilustração gerada por IA"
                    className="w-full h-auto block"
                  />
                </div>
              )}
              {form.nivelEnsino === 'infantil' && !imagemUrl && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Ilustração não gerada (verifique a chave OpenAI nas variáveis de ambiente)
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                <MarkdownChat texto={atividade} />
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 flex gap-3">
          {etapa === 5 ? (
            <>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => { resetar(); setAberto(true) }}
              >
                <RotateCcw size={15} /> Nova atividade
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => imprimirAtividade(atividade!, form, imagemUrl)}
              >
                <Printer size={15} /> Imprimir
              </Button>
            </>
          ) : (
            <>
              {etapa > 1 && (
                <Button variant="outline" onClick={() => setEtapa(e => e - 1)} className="gap-1">
                  <ChevronLeft size={15} /> Voltar
                </Button>
              )}
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={!podeAvancar() || gerando}
                onClick={() => etapa === 4 ? gerarAtividade() : setEtapa(e => e + 1)}
              >
                {gerando ? (
                  <><Loader2 size={15} className="animate-spin" />
                    {form.nivelEnsino === 'infantil'
                      ? 'Criando atividade e ilustração...'
                      : 'Tia Maria José está criando...'
                    }
                  </>
                ) : etapa === 4 ? (
                  <><Sparkles size={15} /> {form.modoSaida === 'instrucao_inclusiva' ? 'Gerar roteiro inclusivo' : 'Gerar atividade'}</>
                ) : (
                  <>Continuar <ChevronRight size={15} /></>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
