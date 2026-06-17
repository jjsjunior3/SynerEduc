// ArquivoMorto.tsx — F2.3
// Gestão de documentos de alunos inativos/egressos
// Fluxo: Gerenciamento → Pré-visualização editável → Impressão

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { toast } from 'sonner'
import {
  Archive, Plus, Printer, Trash2, CheckCircle, XCircle,
  RefreshCw, Search, AlertTriangle, X,
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog'
import ArquivoHistorico from './ArquivoHistorico'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string
  nome: string
  tipo: string
  segmento: 'ead' | 'presencial'
}

interface AlunoMorto {
  id: string
  nome: string
  data_nascimento?: string
  cpf?: string
  filiacao?: string
  serie_saida?: string
  ano_saida?: number
  motivo_saida?: string
  segmento: string
  arquivo_ficha_url?: string
  criado_em: string
  qtd_boletins:      number
  anos_boletins:     number[]
  tem_historico_ext: boolean
  escola_anterior?:  string
}

// Coluna da tabela unificada: cada série = uma coluna
interface SerieCol {
  label:     string   // "1ª Série", "2ª Série", etc.
  num:       number   // 1, 2, 3...
  escola:    string   // qual escola o aluno frequentou nesta série
  municipio: string
  uf:        string
  ano:       number   // ano letivo
}

// Linha da tabela unificada: uma disciplina, com notas de cada série
interface LinhaGrade {
  disciplina: string
  notas:      (number | null)[]  // uma por SerieCol
}

// Linha da tabela de escolas cursadas (2ª página do documento)
interface EntradaHistorico {
  ano:       number
  serie:     string
  escola:    string
  municipio: string
  uf:        string
  situacao:  string
}

// Dados completos do histórico — usados na pré-visualização e na geração do HTML
interface DadosHistorico {
  nomeAluno:     string
  rg:            string
  cpf:           string
  nascData:      string
  nascMunicipio: string
  nascUF:        string
  nacionalidade: string
  filiacao:      string
  nivelEnsino:   'medio' | 'fundamental'
  series:        SerieCol[]
  linhas:        LinhaGrade[]
  historico:     EntradaHistorico[]
  observacao:    string
  certificado:   boolean
}

interface Props { usuario: Usuario }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PODE_DELETAR = (tipo: string) =>
  ['administrador', 'gestor_geral'].includes(tipo)

function motivoLabel(m?: string | null) {
  const map: Record<string, string> = {
    conclusao: 'Conclusão', transferencia: 'Transferência',
    desistencia: 'Desistência', outro: 'Outro',
  }
  return map[m ?? ''] ?? '—'
}

function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function normKey(s: string) {
  return s.trim().toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normSerie(s: string): { label: string; num: number; nivel: 'medio' | 'fundamental' } {
  const lower = s.toLowerCase().trim()
  if (lower.includes('médio') || lower.includes('medio') ||
      lower.match(/^\d+[aª°]?\s*s[eé]rie/)) {
    const match = lower.match(/(\d+)/)
    const n = match ? parseInt(match[1]) : 1
    const labels: Record<number, string> = { 1: '1ª Série', 2: '2ª Série', 3: '3ª Série' }
    return { label: labels[n] ?? `${n}ª Série`, num: n, nivel: 'medio' }
  }
  const fundMatch = lower.match(/(\d+)[°º]?\s*ano/)
  if (fundMatch) {
    const n = parseInt(fundMatch[1])
    return { label: `${n}º Ano`, num: n, nivel: 'fundamental' }
  }
  const numMatch = lower.match(/(\d+)/)
  return { label: s.trim(), num: numMatch ? parseInt(numMatch[1]) : 1, nivel: 'fundamental' }
}

// ─── Constantes da escola ─────────────────────────────────────────────────────

const ESCOLA = {
  nome:        'Colégio Conexão Maranhense',
  cnpj:        '08.660.860/0001-63',
  cee:         '67/2019',
  endereco:    'Avenida João Pessoa, 262 - Outeiro Da Cruz',
  cidade:      'São Luís/MA',
  fone:        '3243 2720',
  inep:        '21612668',
  diretora:    'Ariane M.S.S Alencar',
  ie_diretora: '252/2018',
  coordenador: 'José João Santos Júnior',
  cargo_coord: 'Coordenador Ensino Médio',
  logo_url:    '/logo-colegio-conexao.png',
}

// ─── Tipos das fontes de dados ────────────────────────────────────────────────

type BoletimsRow = {
  disciplina: string; serie: string; ano_letivo: number
  media_final: number; situacao: string
}

type ExternoRow = {
  nome_escola_anterior: string; municipio_escola: string; uf_escola: string
  nivel_ensino: string; disciplinas: BoletimsRow[]; observacoes?: string
}

// ─── Construção dos dados históricos unificados ───────────────────────────────

function buildDadosHistorico(
  aluno: AlunoMorto,
  boletins: BoletimsRow[],
  externos: ExternoRow[],
): DadosHistorico {

  // ── Nível de ensino ───────────────────────────────────────────────────────
  const nivelEnsino: 'medio' | 'fundamental' =
    externos.some(e => e.nivel_ensino === 'medio') ||
    boletins.some(b => normSerie(b.serie).nivel === 'medio')
      ? 'medio' : 'fundamental'

  // ── Coletar todas as séries únicas com informação da escola ───────────────
  // Externos primeiro (séries mais antigas), depois Conexão
  const seriesMap = new Map<string, SerieCol>()

  for (const ext of externos) {
    for (const d of (ext.disciplinas ?? [])) {
      const { label, num } = normSerie(d.serie)
      if (!seriesMap.has(label))
        seriesMap.set(label, {
          label, num, escola: ext.nome_escola_anterior,
          municipio: ext.municipio_escola, uf: ext.uf_escola, ano: d.ano_letivo,
        })
    }
  }

  for (const b of boletins) {
    const { label, num } = normSerie(b.serie)
    if (!seriesMap.has(label))
      seriesMap.set(label, {
        label, num, escola: ESCOLA.nome,
        municipio: 'São Luís', uf: 'MA', ano: b.ano_letivo,
      })
  }

  const series = Array.from(seriesMap.values()).sort((a, b) => a.num - b.num)
  const seriesLabels = series.map(s => s.label)

  // ── Deduplicar boletins: (disc, serie) → maior nota ──────────────────────
  const boletinsDedup = new Map<string, BoletimsRow>()
  for (const b of boletins) {
    const { label } = normSerie(b.serie)
    const k = `${normKey(b.disciplina)}||${label}`
    const ex = boletinsDedup.get(k)
    if (!ex || b.media_final > ex.media_final) boletinsDedup.set(k, b)
  }

  // ── Tabela unificada de disciplinas ───────────────────────────────────────
  type DiscEntry = LinhaGrade & { _key: string }
  const discMap = new Map<string, DiscEntry>()

  function ensureDisc(nome: string) {
    const key = normKey(nome)
    if (!discMap.has(key))
      discMap.set(key, { _key: key, disciplina: nome.trim(), notas: new Array(series.length).fill(null) })
  }

  // Preenche com boletins do Conexão (prioridade)
  for (const b of boletinsDedup.values()) {
    const { label } = normSerie(b.serie)
    const si = seriesLabels.indexOf(label)
    if (si === -1) continue
    ensureDisc(b.disciplina)
    discMap.get(normKey(b.disciplina))!.notas[si] = b.media_final
  }

  // Preenche com externos (não sobrescreve dados internos)
  for (const ext of externos) {
    const extDedup = new Map<string, BoletimsRow>()
    for (const d of (ext.disciplinas ?? [])) {
      const { label } = normSerie(d.serie)
      const k = `${normKey(d.disciplina)}||${label}`
      const ex = extDedup.get(k)
      if (!ex || d.media_final > ex.media_final) extDedup.set(k, d)
    }
    for (const d of extDedup.values()) {
      const { label } = normSerie(d.serie)
      const si = seriesLabels.indexOf(label)
      if (si === -1) continue
      ensureDisc(d.disciplina)
      const entry = discMap.get(normKey(d.disciplina))!
      if (entry.notas[si] === null) entry.notas[si] = d.media_final
    }
  }

  const linhas: LinhaGrade[] = Array.from(discMap.values())
    .sort((a, b) => a._key.localeCompare(b._key))
    .map(({ _key: _k, ...rest }) => rest)

  // ── Tabela de escolas cursadas ────────────────────────────────────────────
  const historicoMap = new Map<string, EntradaHistorico>()

  // Das externas
  for (const ext of externos) {
    const serieAnoMap = new Map<string, { ano: number; serie: string; situacoes: string[] }>()
    for (const d of (ext.disciplinas ?? [])) {
      const { label } = normSerie(d.serie)
      const k = `${d.ano_letivo}||${label}`
      if (!serieAnoMap.has(k)) serieAnoMap.set(k, { ano: d.ano_letivo, serie: label, situacoes: [] })
      serieAnoMap.get(k)!.situacoes.push(d.situacao ?? '')
    }
    for (const { ano, serie, situacoes } of serieAnoMap.values()) {
      const reprov = situacoes.some(s => s.toLowerCase().includes('reprov'))
      historicoMap.set(`${ano}||${serie}||${ext.nome_escola_anterior}`, {
        ano, serie, escola: ext.nome_escola_anterior,
        municipio: ext.municipio_escola, uf: ext.uf_escola,
        situacao: reprov ? 'Reprovado (a)' : 'Aprovado (a)',
      })
    }
  }

  // Dos boletins do Conexão
  const bSerieMap = new Map<string, { ano: number; serie: string; situacoes: string[] }>()
  for (const b of boletinsDedup.values()) {
    const { label } = normSerie(b.serie)
    const k = `${b.ano_letivo}||${label}`
    if (!bSerieMap.has(k)) bSerieMap.set(k, { ano: b.ano_letivo, serie: label, situacoes: [] })
    bSerieMap.get(k)!.situacoes.push(b.situacao ?? '')
  }
  for (const { ano, serie, situacoes } of bSerieMap.values()) {
    const reprov = situacoes.some(s => s.toLowerCase().includes('reprov'))
    historicoMap.set(`${ano}||${serie}||${ESCOLA.nome}`, {
      ano, serie, escola: ESCOLA.nome,
      municipio: 'São Luís', uf: 'MA',
      situacao: reprov ? 'Reprovado (a)' : 'Aprovado (a)',
    })
  }

  const historico = Array.from(historicoMap.values())
    .sort((a, b) => a.ano - b.ano || a.serie.localeCompare(b.serie))

  // ── Observação mesclada ───────────────────────────────────────────────────
  const observacao = externos.map(e => e.observacoes).filter(Boolean).join(' ')

  // ── Aluno concluiu o Ensino Médio? ────────────────────────────────────────
  const certificado = nivelEnsino === 'medio' &&
    historico.some(h => h.serie.includes('3') && h.situacao.toLowerCase().includes('aprov'))

  return {
    nomeAluno:     aluno.nome,
    rg:            '',
    cpf:           aluno.cpf ?? '',
    nascData:      aluno.data_nascimento ? fmtData(aluno.data_nascimento) : '',
    nascMunicipio: '',
    nascUF:        '',
    nacionalidade: 'Brasileiro (a)',
    filiacao:      aluno.filiacao ?? '',
    nivelEnsino,
    series,
    linhas,
    historico,
    observacao,
    certificado,
  }
}

// ─── Gerador de HTML do histórico (formato oficial) ──────────────────────────

function gerarHTMLHistorico(dados: DadosHistorico): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const nivel = dados.nivelEnsino === 'medio' ? 'Médio' : 'Fundamental'
  const nivelUP = nivel.toUpperCase()

  // Colunas de série (header duplo)
  const thSeries = dados.series.map(s =>
    `<th colspan="2" class="th-serie">${s.label}</th>`
  ).join('')
  const thSub = dados.series.map(() =>
    `<th class="th-nota">Nota</th><th class="th-ch">C.H.</th>`
  ).join('')

  // Linhas de disciplinas
  const rows = dados.linhas.map(linha => {
    const cells = dados.series.map((_, si) => {
      const nota = linha.notas[si]
      return nota === null
        ? '<td class="td-nota td-vazio">—</td><td class="td-ch td-vazio">—</td>'
        : `<td class="td-nota">${Number(nota).toFixed(1)}</td><td class="td-ch">---</td>`
    }).join('')
    return `<tr><td class="td-disc">${linha.disciplina.toUpperCase()}</td>${cells}</tr>`
  }).join('')

  const chRow = dados.series.map(() =>
    `<td class="td-nota td-ch-total">---</td><td class="td-ch td-ch-total"></td>`
  ).join('')

  // Tabela de escolas cursadas
  const historicoRows = dados.historico.map(h => `
    <tr>
      <td class="tc-center">${h.ano}</td>
      <td class="tc-center">${h.serie}</td>
      <td>${h.escola}</td>
      <td class="tc-center">${h.municipio}/${h.uf}</td>
      <td class="tc-center tc-bold">${h.situacao}</td>
    </tr>`).join('')

  // Observação: mescla externa + texto padrão
  const obsPrefix = dados.observacao ? `${dados.observacao} ` : ''
  const obsCompleta = `${obsPrefix}Nada consta em nossos arquivos que desabone a conduta do (a) referido (a) aluno (a). Fica convalidado os estudos das séries cursadas, no CENTRO DE ENSINO CONEXÃO EIRELE em cumprimento ao parecer nº ${ESCOLA.cee} do Conselho Estadual de Educação, ao dispositivo no Artigo CEE/MA, 1º inciso "A" da resolução da inspeção escolar nº. 252/2018.`

  // Município/Estado de nascimento
  const nascMunUF = dados.nascMunicipio
    ? `${dados.nascMunicipio}${dados.nascUF ? `/${dados.nascUF}` : ''}`
    : '—'

  // Certificado
  const anoFim = dados.historico.filter(h => h.situacao.toLowerCase().includes('aprov')).at(-1)?.ano ?? ''
  const certificadoHTML = dados.certificado ? `
    <div class="certificado">
      <h3 class="cert-titulo">CERTIFICADO</h3>
      <p class="cert-texto">
        O diretor do Centro de Ensino Conexão Maranhense de acordo com o CEE ${ESCOLA.cee},
        certifica que <u>${dados.nomeAluno}</u>, concluiu o Ensino Médio no ano letivo ${anoFim},
        estando apto ao prosseguimento de estudos no Ensino Superior.
      </p>
      <div class="cert-lacre">
        <div class="cert-box">
          <p>ESTADO DO MARANHÃO</p>
          <p><strong><u>${ESCOLA.nome.toUpperCase()}</u></strong></p>
          <p>INEP: ${ESCOLA.inep}_</p>
          <p>CEE/MA: ${ESCOLA.cee}</p>
          <br/>
          <p>Nº do ato de Reconhecimento Certificado</p>
          <p>Registro dos n° _________ – CEE/MA</p>
          <p>Livro_______ Fls. ________</p>
          <p>Em:____ /____/____</p>
          <br/><br/>
          <p>____________________________</p>
          <p><strong>${ESCOLA.diretora}</strong></p>
          <p>IE Nº ${ESCOLA.ie_diretora}</p>
          <p>Diretora</p>
        </div>
      </div>
    </div>` : ''

  const CSS = `<style>
    @page { size: A4; margin: 10mm 14mm 8mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; background: #fff; }

    /* ── Marca d'água ── */
    .marca-dagua {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 58%; opacity: 0.06; z-index: -1; pointer-events: none;
    }
    .marca-dagua img { width: 100%; height: auto; }

    .topo { display: flex; align-items: flex-start; gap: 10px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 3px; }
    .topo img { width: 48px; height: 48px; object-fit: contain; flex-shrink: 0; }
    .topo-info { flex: 1; text-align: center; }
    .topo-info h1 { font-size: 12pt; font-weight: bold; }
    .topo-info p { font-size: 7.5pt; line-height: 1.4; }

    .titulo-doc { text-align: center; font-size: 11pt; font-weight: bold; margin: 4px 0 5px 0; }

    .dados-aluno { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9pt; }
    .dados-aluno td { border: 1px solid #555; padding: 2.5px 5px; }
    .dados-aluno .lbl { font-weight: bold; background: #efefef; white-space: nowrap; }

    .reconhecimento { font-size: 7pt; line-height: 1.4; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 5px; text-align: justify; }

    .nivel-titulo { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; text-align: center; border-bottom: 1.5px solid #444; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; }

    .tabela-matriz { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 8pt; }
    .col-disc { width: 38%; }
    .col-nota { width: 7%; }
    .col-ch   { width: 6%; }
    .th-disc { background: #c8c8c8; border: 1px solid #777; padding: 2.5px 5px; font-weight: bold; text-align: left; font-size: 8pt; vertical-align: middle; }
    .th-serie { background: #c8c8c8; border: 1px solid #777; padding: 2.5px 4px; font-weight: bold; text-align: center; font-size: 8pt; }
    .th-nota, .th-ch { background: #dcdcdc; border: 1px solid #777; padding: 2.5px 3px; font-weight: bold; text-align: center; font-size: 7.5pt; }
    .td-disc { border: 1px solid #777; padding: 2px 5px; font-size: 8pt; }
    .td-nota { border: 1px solid #777; padding: 2px 3px; text-align: center; font-size: 8pt; }
    .td-ch   { border: 1px solid #777; padding: 2px 3px; text-align: center; font-size: 7.5pt; color: #555; }
    .td-vazio { color: #bbb; }
    .tabela-matriz tr:nth-child(even) td { background: #f5f5f5; }
    .tr-ch-total td { background: #dcdcdc !important; border: 1px solid #777; padding: 2px 5px; font-weight: bold; font-size: 8pt; }
    .td-ch-total { text-align: center; color: #555; }

    .obs-texto { font-size: 7.2pt; line-height: 1.45; color: #333; margin: 4px 0 6px 0; text-align: justify; }

    /* Pagina 2: flex para empurrar rodapé ao final da folha */
    .pagina2 {
      page-break-before: always;
      padding-top: 6px;
      min-height: 277mm;
      display: flex;
      flex-direction: column;
    }
    .p2-conteudo { flex: 1; }
    .p2-rodape   { margin-top: auto; }

    .tabela-cursadas { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14px; }
    .tabela-cursadas th { background: #c8c8c8; border: 1px solid #777; padding: 3px 6px; font-weight: bold; text-align: center; }
    .tabela-cursadas td { border: 1px solid #777; padding: 3px 6px; }
    .tc-center { text-align: center; }
    .tc-bold { font-weight: bold; }

    .certificado { margin-top: 20px; }
    .cert-titulo { font-size: 11pt; font-weight: bold; text-align: center; margin-bottom: 14px; letter-spacing: 1px; }
    .cert-texto { font-size: 10pt; line-height: 1.8; text-align: justify; margin-bottom: 20px; }
    .cert-lacre { display: flex; justify-content: flex-end; }
    .cert-box { border: 1.5px solid #000; padding: 10px 18px; text-align: center; font-size: 9pt; line-height: 1.7; min-width: 260px; }

    .rodape-doc { margin-top: 22px; }
    .data { text-align: right; font-size: 10pt; margin-bottom: 36px; }
    .assinaturas { display: flex; justify-content: space-around; }
    .ass-bloco { text-align: center; min-width: 200px; }
    .ass-linha { border-top: 1px solid #000; padding-top: 4px; font-size: 10pt; font-weight: bold; }
    .ass-sub { font-size: 9pt; font-weight: normal; }

    .rodape-legal { margin-top: 12px; padding-top: 6px; border-top: 1px solid #bbb; font-size: 7pt; line-height: 1.4; color: #555; text-align: justify; }

    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Histórico Escolar — ${dados.nomeAluno}</title>${CSS}</head>
<body>

  <div class="marca-dagua">
    <img src="${ESCOLA.logo_url}" alt="" onerror="this.style.display='none'" />
  </div>

  <div class="topo">
    <img src="${ESCOLA.logo_url}" alt="Logo" onerror="this.style.display='none'" />
    <div class="topo-info">
      <h1>${ESCOLA.nome.toUpperCase()}</h1>
      <p>${ESCOLA.endereco} – Fone: ${ESCOLA.fone}</p>
      <p>${ESCOLA.cidade} - CNPJ ${ESCOLA.cnpj}</p>
      <p>Inep: ${ESCOLA.inep}</p>
    </div>
  </div>

  <h2 class="titulo-doc">Histórico Escolar – Ensino ${nivel}</h2>

  <table class="dados-aluno">
    <tr>
      <td class="lbl" style="width:28%">Nome do(a) aluno(a)</td>
      <td colspan="3">${dados.nomeAluno}</td>
    </tr>
    <tr>
      <td class="lbl">RG</td><td style="width:22%">${dados.rg || '—'}</td>
      <td class="lbl" style="width:10%">CPF</td><td>${dados.cpf || '—'}</td>
    </tr>
    <tr>
      <td class="lbl" rowspan="2">Nascimento</td>
      <td class="lbl" style="text-align:center">Município/Estado</td>
      <td class="lbl" style="text-align:center">Nacionalidade</td>
      <td class="lbl" style="text-align:center">Data</td>
    </tr>
    <tr>
      <td style="text-align:center">${nascMunUF}</td>
      <td style="text-align:center">${dados.nacionalidade}</td>
      <td style="text-align:center">${dados.nascData || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">Filiação</td>
      <td colspan="3">${dados.filiacao || '—'}</td>
    </tr>
  </table>

  <p class="reconhecimento">
    Reconhecimento pelo conselho Estadual de Educação sobre o cumprimento do nº ${ESCOLA.cee} CEE/MA.
    Centro de Ensino Conexão Eirele. Ens. Fundamental 1º ao 9º ano. Ens. Médio Regular e Modalidade de
    Jovens e Adultos-EJA. Documento isento de autenticação pela inspeção escolar com base na resolução
    nº 252/2018-CEE/MA de 21/03/2019.
  </p>

  <h3 class="nivel-titulo">RESULTADOS DOS ESTUDOS REALIZADOS NO ENSINO ${nivelUP}</h3>
  <table class="tabela-matriz">
    <colgroup>
      <col class="col-disc"/>
      ${dados.series.map(() => '<col class="col-nota"/><col class="col-ch"/>').join('')}
    </colgroup>
    <thead>
      <tr><th class="th-disc" rowspan="2">CONTEÚDOS CURRICULARES</th>${thSeries}</tr>
      <tr>${thSub}</tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="tr-ch-total">
        <td class="td-disc">Carga Horária Total</td>${chRow}
      </tr>
    </tbody>
  </table>

  <p class="obs-texto">${obsCompleta}</p>

  <div class="pagina2">

    <div class="p2-conteudo">
      <table class="tabela-cursadas">
        <thead>
          <tr>
            <th>Ano letivo</th><th>Série</th><th>Estabelecimento</th>
            <th>Município/Estado</th><th>Situação</th>
          </tr>
        </thead>
        <tbody>${historicoRows}</tbody>
      </table>

      ${certificadoHTML}
    </div>

    <div class="p2-rodape">
      <div class="rodape-doc">
        <div class="data">São Luís, ${hoje}.</div>
        <div class="assinaturas">
          <div class="ass-bloco">
            <div class="ass-linha">
              ${ESCOLA.diretora}<br/>
              <span class="ass-sub">IE Nº ${ESCOLA.ie_diretora}<br/>Diretora Geral<br/>CNPJ: ${ESCOLA.cnpj}</span>
            </div>
          </div>
          <div class="ass-bloco">
            <div class="ass-linha">
              ${ESCOLA.coordenador}<br/>
              <span class="ass-sub">IE Nº 252/2018<br/>${ESCOLA.cargo_coord}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rodape-legal">
        Documento isento de autenticação pela Inspeção Escolar com base na Resolução nº 252/2018 – CEE – MA
        de 21 de março de 2019. Reconhecido pelo Conselho Estadual de Educação, CEE/MA nº ${ESCOLA.cee}.
      </div>
    </div>

  </div>

</body></html>`
}

// ─── Pré-visualização editável ────────────────────────────────────────────────

function HistoricoPreview({
  dados: dadosInicial,
  onImprimir,
  onCancelar,
}: {
  dados: DadosHistorico
  onImprimir: (d: DadosHistorico) => void
  onCancelar: () => void
}) {
  const [dados, setDados] = useState<DadosHistorico>(dadosInicial)

  function updStr(field: string, valor: string) {
    setDados(prev => ({ ...prev, [field]: valor }))
  }

  function updNascMunUF(valor: string) {
    const sep = valor.lastIndexOf('/')
    setDados(prev => ({
      ...prev,
      nascMunicipio: sep >= 0 ? valor.slice(0, sep).trim() : valor,
      nascUF:        sep >= 0 ? valor.slice(sep + 1).trim() : '',
    }))
  }

  function updNota(li: number, si: number, valor: string) {
    const n = valor === '' ? null : parseFloat(valor)
    setDados(prev => ({
      ...prev,
      linhas: prev.linhas.map((l, idx) =>
        idx !== li ? l : { ...l, notas: l.notas.map((nota, sidx) => sidx === si ? n : nota) }
      ),
    }))
  }

  function updDisc(li: number, nome: string) {
    setDados(prev => ({
      ...prev,
      linhas: prev.linhas.map((l, idx) => idx !== li ? l : { ...l, disciplina: nome }),
    }))
  }

  function addLinha() {
    setDados(prev => ({
      ...prev,
      linhas: [...prev.linhas, { disciplina: '', notas: new Array(prev.series.length).fill(null) }],
    }))
  }

  function removeLinha(idx: number) {
    setDados(prev => ({ ...prev, linhas: prev.linhas.filter((_, i) => i !== idx) }))
  }

  function updHist(hi: number, field: string, valor: string | number) {
    setDados(prev => ({
      ...prev,
      historico: prev.historico.map((h, idx) => idx !== hi ? h : { ...h, [field]: valor }),
    }))
  }

  function updHistMunUF(hi: number, valor: string) {
    const sep = valor.lastIndexOf('/')
    setDados(prev => ({
      ...prev,
      historico: prev.historico.map((h, idx) =>
        idx !== hi ? h : {
          ...h,
          municipio: sep >= 0 ? valor.slice(0, sep).trim() : valor,
          uf:        sep >= 0 ? valor.slice(sep + 1).trim() : '',
        }
      ),
    }))
  }

  const inputCls = 'w-full px-3 py-1.5 rounded border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500'
  const cellCls  = 'w-full px-1 py-1 rounded border border-transparent hover:border-border focus:border-blue-400 bg-transparent text-xs focus:outline-none focus:bg-background transition-colors'

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Sticky header */}
        <div className="sticky top-0 bg-background border-b border-border py-3 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Pré-visualização do Histórico</h2>
            <p className="text-sm text-muted-foreground">Revise e corrija antes de imprimir. Todos os campos são editáveis.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancelar}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button onClick={() => onImprimir(dados)}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Printer className="w-4 h-4" />
              Imprimir Histórico
            </button>
          </div>
        </div>

        {/* Seção 1 — Dados do aluno */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Dados do Aluno</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Nome completo</label>
              <input value={dados.nomeAluno} onChange={e => updStr('nomeAluno', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">RG</label>
              <input value={dados.rg} onChange={e => updStr('rg', e.target.value)} placeholder="Nº do RG" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">CPF</label>
              <input value={dados.cpf} onChange={e => updStr('cpf', e.target.value)} placeholder="000.000.000-00" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Data de Nascimento</label>
              <input value={dados.nascData} onChange={e => updStr('nascData', e.target.value)} placeholder="DD/MM/AAAA" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Município/Estado Nasc.</label>
              <input
                value={dados.nascMunicipio + (dados.nascUF ? `/${dados.nascUF}` : '')}
                onChange={e => updNascMunUF(e.target.value)}
                placeholder="Ex: Aracaju/SE"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nacionalidade</label>
              <input value={dados.nacionalidade} onChange={e => updStr('nacionalidade', e.target.value)} className={inputCls} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs text-muted-foreground mb-1">Filiação</label>
              <input value={dados.filiacao} onChange={e => updStr('filiacao', e.target.value)} placeholder="Nome do pai e da mãe" className={inputCls} />
            </div>
          </div>
        </section>

        {/* Seção 2 — Tabela unificada de notas */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Notas — Ensino {dados.nivelEnsino === 'medio' ? 'Médio' : 'Fundamental'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tabela única: disciplinas de todas as escolas mescladas na mesma linha.
              </p>
            </div>
            <button onClick={addLinha}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30
                               text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700
                               hover:bg-blue-100 transition-colors">
              + Disciplina
            </button>
          </div>

          {/* Legenda das séries */}
          <div className="flex flex-wrap gap-2">
            {dados.series.map(s => (
              <span key={s.label} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                {s.label}: {s.escola} ({s.ano})
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2 text-left font-semibold min-w-[200px]">
                    CONTEÚDOS CURRICULARES
                  </th>
                  {dados.series.flatMap(s => [
                    <th key={`${s.label}-th`} colSpan={2}
                        className="border border-border px-2 py-2 text-center font-semibold min-w-[90px]">
                      {s.label}
                    </th>,
                  ])}
                  <th className="border border-border px-2 py-2 w-8"></th>
                </tr>
                <tr className="bg-muted/60 text-muted-foreground">
                  <th className="border border-border px-3 py-1"></th>
                  {dados.series.flatMap((s) => [
                    <th key={`${s.label}-nh`} className="border border-border px-2 py-1 text-center font-medium">Nota</th>,
                    <th key={`${s.label}-ch`} className="border border-border px-2 py-1 text-center font-medium">C.H.</th>,
                  ])}
                  <th className="border border-border"></th>
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((linha, li) => (
                  <tr key={li} className="hover:bg-muted/30 transition-colors">
                    <td className="border border-border px-1 py-0.5">
                      <input value={linha.disciplina} onChange={e => updDisc(li, e.target.value)} className={cellCls} />
                    </td>
                    {dados.series.flatMap((_, si) => [
                      <td key={`${li}-${si}-n`} className="border border-border px-1 py-0.5 text-center">
                        <input
                          type="number" step="0.1" min="0" max="10"
                          value={linha.notas[si] ?? ''}
                          onChange={e => updNota(li, si, e.target.value)}
                          placeholder="—"
                          className="w-14 px-1 py-1 rounded border border-transparent hover:border-border focus:border-blue-400 bg-transparent text-xs text-center focus:outline-none focus:bg-background transition-colors"
                        />
                      </td>,
                      <td key={`${li}-${si}-c`} className="border border-border px-1 py-0.5 text-center text-muted-foreground">
                        ---
                      </td>,
                    ])}
                    <td className="border border-border px-1 py-0.5 text-center">
                      <button onClick={() => removeLinha(li)} className="text-muted-foreground hover:text-red-500 transition-colors p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Seção 3 — Observação */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Observação</h3>
          <p className="text-xs text-muted-foreground">
            Informações da escola anterior. Será combinada com o texto padrão de convalidação de estudos.
          </p>
          <textarea
            value={dados.observacao}
            onChange={e => updStr('observacao', e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Observações da escola anterior (opcional)..."
            className="w-full px-3 py-2 rounded border border-border text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>

        {/* Seção 4 — Escolas cursadas (2ª página) */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Escolas Cursadas — tabela da 2ª página
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  {['Ano Letivo', 'Série', 'Estabelecimento', 'Município/Estado', 'Situação'].map(h => (
                    <th key={h} className="border border-border px-3 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.historico.map((h, hi) => (
                  <tr key={hi} className="hover:bg-muted/30 transition-colors">
                    <td className="border border-border px-1 py-0.5">
                      <input type="number" value={h.ano}
                             onChange={e => updHist(hi, 'ano', parseInt(e.target.value) || h.ano)}
                             className="w-16 px-1 py-1 rounded border border-transparent hover:border-border focus:border-blue-400 bg-transparent text-xs text-center focus:outline-none focus:bg-background" />
                    </td>
                    <td className="border border-border px-1 py-0.5">
                      <input value={h.serie} onChange={e => updHist(hi, 'serie', e.target.value)}
                             className="w-20 px-1 py-1 rounded border border-transparent hover:border-border focus:border-blue-400 bg-transparent text-xs focus:outline-none focus:bg-background" />
                    </td>
                    <td className="border border-border px-1 py-0.5">
                      <input value={h.escola} onChange={e => updHist(hi, 'escola', e.target.value)}
                             className={cellCls} />
                    </td>
                    <td className="border border-border px-1 py-0.5">
                      <input value={`${h.municipio}${h.uf ? `/${h.uf}` : ''}`}
                             onChange={e => updHistMunUF(hi, e.target.value)}
                             placeholder="Ex: São Luís/MA"
                             className="w-full px-1 py-1 rounded border border-transparent hover:border-border focus:border-blue-400 bg-transparent text-xs focus:outline-none focus:bg-background" />
                    </td>
                    <td className="border border-border px-1 py-0.5">
                      <select value={h.situacao} onChange={e => updHist(hi, 'situacao', e.target.value)}
                              className="px-2 py-1 rounded border border-border text-xs bg-background focus:outline-none">
                        <option>Aprovado (a)</option>
                        <option>Reprovado (a)</option>
                        <option>Cursando</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Rodapé */}
        <div className="flex justify-end gap-3 pb-8">
          <button onClick={onCancelar}
                  className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={() => onImprimir(dados)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" />
            Imprimir Histórico
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ArquivoMorto({ usuario }: Props) {
  const [aba, setAba]                         = useState<'gerenciar' | 'digitalizar'>('gerenciar')
  const [alunos, setAlunos]                   = useState<AlunoMorto[]>([])
  const [carregando, setCarregando]           = useState(true)
  const [busca, setBusca]                     = useState('')
  const [imprimindo, setImprimindo]           = useState<string | null>(null)
  const [alunoParaDelete, setAlunoParaDelete] = useState<AlunoMorto | null>(null)
  const [confirmNome, setConfirmNome]         = useState('')
  const [deletando, setDeletando]             = useState(false)
  const [alunoPreSelecionado, setAlunoPreSelecionado] = useState<AlunoMorto | null>(null)
  const [previewDados, setPreviewDados]       = useState<DadosHistorico | null>(null)

  const podeDelete = PODE_DELETAR(usuario.tipo)

  // ─── Carregar alunos ──────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const { data: alunosData, error } = await supabase
        .from('alunos_historicos')
        .select('*')
        .eq('segmento', usuario.segmento)
        .is('deletado_em', null)
        .order('nome')

      if (error) throw error
      if (!alunosData?.length) { setAlunos([]); return }

      const ids = alunosData.map(a => a.id)

      const [{ data: bData }, { data: hData }] = await Promise.all([
        supabase.from('boletins_historicos').select('aluno_id, ano_letivo').in('aluno_id', ids),
        supabase.from('historico_externo').select('aluno_historico_id, nome_escola_anterior').in('aluno_historico_id', ids),
      ])

      const boletinsMap: Record<string, { count: number; anos: number[] }> = {}
      for (const b of (bData ?? [])) {
        if (!boletinsMap[b.aluno_id]) boletinsMap[b.aluno_id] = { count: 0, anos: [] }
        boletinsMap[b.aluno_id].count++
        if (!boletinsMap[b.aluno_id].anos.includes(b.ano_letivo))
          boletinsMap[b.aluno_id].anos.push(b.ano_letivo)
      }

      const externoMap: Record<string, string> = {}
      for (const h of (hData ?? []))
        if (h.aluno_historico_id) externoMap[h.aluno_historico_id] = h.nome_escola_anterior

      setAlunos(alunosData.map(a => ({
        ...a,
        qtd_boletins:      boletinsMap[a.id]?.count ?? 0,
        anos_boletins:     (boletinsMap[a.id]?.anos ?? []).sort(),
        tem_historico_ext: !!externoMap[a.id],
        escola_anterior:   externoMap[a.id],
      })))
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar arquivo morto.')
    } finally {
      setCarregando(false)
    }
  }, [usuario.segmento])

  useEffect(() => { carregar() }, [carregar])

  // ─── Abrir pré-visualização ───────────────────────────────────────────────

  async function abrirPreview(aluno: AlunoMorto) {
    setImprimindo(aluno.id)
    try {
      const [{ data: boletins }, { data: externosRaw }] = await Promise.all([
        supabase.from('boletins_historicos')
          .select('disciplina, serie, ano_letivo, media_final, situacao')
          .eq('aluno_id', aluno.id)
          .order('ano_letivo').order('disciplina'),
        supabase.from('historico_externo')
          .select('nome_escola_anterior, municipio_escola, uf_escola, nivel_ensino, disciplinas, observacoes, criado_em')
          .eq('aluno_historico_id', aluno.id)
          .order('criado_em', { ascending: false }),
      ])

      // Deduplica externos por escola — mantém o registro com mais disciplinas
      const escolaMap = new Map<string, NonNullable<typeof externosRaw>[0]>()
      for (const ext of (externosRaw ?? [])) {
        const key = (ext.nome_escola_anterior ?? '').toLowerCase().trim()
        const existing = escolaMap.get(key)
        if (!existing || (ext.disciplinas?.length ?? 0) > (existing.disciplinas?.length ?? 0))
          escolaMap.set(key, ext)
      }

      const dados = buildDadosHistorico(aluno, boletins ?? [], Array.from(escolaMap.values()))
      setPreviewDados(dados)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar dados do histórico.')
    } finally {
      setImprimindo(null)
    }
  }

  // ─── Confirmar e imprimir ─────────────────────────────────────────────────

  function confirmarImpressao(dados: DadosHistorico) {
    const html = gerarHTMLHistorico(dados)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { toast.error('Permita pop-ups para imprimir.'); return }
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 600)
    setPreviewDados(null)
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────

  async function confirmarDelete() {
    if (!alunoParaDelete || confirmNome.trim().toLowerCase() !== alunoParaDelete.nome.trim().toLowerCase()) {
      toast.error('Nome digitado incorreto.')
      return
    }
    setDeletando(true)
    try {
      const { error } = await supabase
        .from('alunos_historicos')
        .update({ deletado_em: new Date().toISOString(), deletado_por: usuario.id })
        .eq('id', alunoParaDelete.id)

      if (error) throw error
      toast.success(`Registro de "${alunoParaDelete.nome}" removido.`)
      setAlunoParaDelete(null)
      setConfirmNome('')
      await carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao remover registro.')
    } finally {
      setDeletando(false)
    }
  }

  const alunosFiltrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.serie_saida ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  const totalAlunos = alunos.length
  const comBoletins = alunos.filter(a => a.qtd_boletins > 0).length
  const comHistExt  = alunos.filter(a => a.tem_historico_ext).length
  const completos   = alunos.filter(a => a.qtd_boletins > 0 && a.tem_historico_ext).length

  // ─── Render ───────────────────────────────────────────────────────────────

  // Pré-visualização (full-screen overlay)
  if (previewDados) {
    return (
      <HistoricoPreview
        dados={previewDados}
        onImprimir={confirmarImpressao}
        onCancelar={() => setPreviewDados(null)}
      />
    )
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Archive className="w-6 h-6 text-muted-foreground" />
            Arquivo Morto
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de documentos de alunos inativos, egressos e transferidos.
          </p>
        </div>
        <button onClick={carregar} disabled={carregando}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { id: 'gerenciar', label: 'Gerenciamento' },
          { id: 'digitalizar', label: '+ Digitalizar' },
        ].map(t => (
          <button key={t.id}
                  onClick={() => { setAba(t.id as any); setAlunoPreSelecionado(null) }}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-all
                    ${aba === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ABA GERENCIAMENTO ──────────────────────────────────────────── */}
      {aba === 'gerenciar' && (
        <div className="space-y-5">

          {/* Cards resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total de alunos', valor: totalAlunos, cor: 'text-foreground' },
              { label: 'Com boletins',    valor: comBoletins,  cor: 'text-blue-600 dark:text-blue-400' },
              { label: 'Com hist. ext.',  valor: comHistExt,   cor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Completos',       valor: completos,    cor: 'text-green-600 dark:text-green-400' },
            ].map(c => (
              <div key={c.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                   placeholder="Buscar por nome ou série..."
                   className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Tabela */}
          {carregando ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Archive className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">
                {busca ? 'Nenhum aluno encontrado.' : 'Nenhum aluno no arquivo morto. Use "+ Digitalizar" para começar.'}
              </p>
              {!busca && (
                <button onClick={() => setAba('digitalizar')}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                  Digitalizar primeiro aluno
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Nome', 'Série / Ano', 'Motivo', 'Ficha', 'Boletins', 'Hist. Ext.', 'Ações'].map((h, i) => (
                      <th key={h} className={`py-3 font-semibold text-muted-foreground text-xs
                        ${i === 0 ? 'text-left px-4' : i === 6 ? 'text-right px-4' : 'text-left px-3'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {alunosFiltrados.map(a => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{a.nome}</p>
                        {a.escola_anterior && (
                          <p className="text-xs text-muted-foreground mt-0.5">Esc. ant.: {a.escola_anterior}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">
                        <p>{a.serie_saida ?? '—'}</p>
                        {a.ano_saida && <p className="font-medium">{a.ano_saida}</p>}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{motivoLabel(a.motivo_saida)}</td>
                      <td className="px-3 py-3 text-center">
                        {a.arquivo_ficha_url
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle    className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {a.qtd_boletins > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-muted-foreground">
                              {a.qtd_boletins} disc.{a.anos_boletins.length > 0 && ` · ${a.anos_boletins.join(', ')}`}
                            </span>
                          </div>
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {a.tem_historico_ext
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle    className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => abrirPreview(a)}
                            disabled={imprimindo === a.id}
                            title="Pré-visualizar e imprimir histórico"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30
                                       text-blue-700 dark:text-blue-300 text-xs font-medium
                                       hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50">
                            <Printer className="w-3.5 h-3.5" />
                            {imprimindo === a.id ? 'Carregando...' : 'Imprimir'}
                          </button>
                          <button
                            onClick={() => { setAlunoPreSelecionado(a); setAba('digitalizar') }}
                            title="Adicionar mais documentos"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {podeDelete && (
                            <button
                              onClick={() => { setAlunoParaDelete(a); setConfirmNome('') }}
                              title="Remover do arquivo morto"
                              className="p-1.5 rounded-lg border border-red-200 dark:border-red-800
                                         text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA DIGITALIZAR ────────────────────────────────────────────── */}
      {aba === 'digitalizar' && (
        <div>
          {alunoPreSelecionado && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20
                            border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Adicionando dados para <strong>{alunoPreSelecionado.nome}</strong>.</span>
              <button onClick={() => setAlunoPreSelecionado(null)} className="ml-auto text-xs hover:underline">Mudar aluno</button>
            </div>
          )}
          <ArquivoHistorico usuario={usuario} />
        </div>
      )}

      {/* ─── AlertDialog de delete ──────────────────────────────────────── */}
      <AlertDialog open={!!alunoParaDelete} onOpenChange={open => { if (!open) { setAlunoParaDelete(null); setConfirmNome('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Remover do arquivo morto
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a remover <strong>{alunoParaDelete?.nome}</strong> do arquivo morto.
                Os registros serão marcados como deletados — nenhum dado é apagado permanentemente.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-amber-800 dark:text-amber-200 text-xs">
                <strong>Atenção:</strong> Para recuperar, acesse o Supabase Dashboard.
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-foreground">Para confirmar, digite o nome do aluno:</label>
                <input
                  type="text"
                  value={confirmNome}
                  onChange={e => setConfirmNome(e.target.value)}
                  placeholder={alunoParaDelete?.nome}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); confirmarDelete() }}
              disabled={deletando || confirmNome.trim().toLowerCase() !== alunoParaDelete?.nome.trim().toLowerCase()}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40">
              {deletando ? 'Removendo...' : 'Confirmar remoção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
