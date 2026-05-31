// ArquivoMorto.tsx — F2.3
// Gestão de documentos de alunos inativos/egressos
// Abas: Gerenciamento | Digitalizar

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { toast } from 'sonner'
import {
  Archive, Plus, Printer, Trash2, CheckCircle, XCircle,
  Clock, RefreshCw, Search, ChevronRight, AlertTriangle,
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
  // Calculados no carregamento
  qtd_boletins:         number
  anos_boletins:        number[]
  tem_historico_ext:    boolean
  escola_anterior?:     string
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

// ─── Constantes da escola (para impressão) ────────────────────────────────────

const ESCOLA = {
  nome:      'Colégio Conexão Maranhense',
  cnpj:      '08.660.860/0001-63',
  cee:       '67/2019',
  endereco:  'Avenida João Pessoa, 262 - Outeiro Da Cruz',
  cidade:    'São Luís – Maranhão',
  inep:      '21612668',
  diretora:  'Ariane M.S.S Alencar',
  coordenador: 'José João Santos Júnior',
  cargo_coord: 'Coordenador Ensino Médio',
  logo_url:  '/logo-colegio-conexao.png',
}

// ─── Gerador de HTML do histórico retroativo ──────────────────────────────────

function gerarHTMLHistorico(
  aluno: AlunoMorto,
  boletins: { disciplina: string; serie: string; ano_letivo: number; media_final: number; situacao: string }[],
  externos: { nome_escola_anterior: string; municipio_escola: string; uf_escola: string; nivel_ensino: string; disciplinas: { disciplina: string; serie: string; ano_letivo: number; media_final: number; situacao: string }[] }[],
): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Boletins da Conexão agrupados por ano
  const anosConexao = [...new Set(boletins.map(b => b.ano_letivo))].sort()
  const tabelaConexao = anosConexao.length > 0 ? anosConexao.map(ano => {
    const disc = boletins.filter(b => b.ano_letivo === ano)
    const serie = disc[0]?.serie ?? '—'
    return `
      <tr class="ano-header">
        <td colspan="4">Ano Letivo: ${ano} — ${serie}</td>
      </tr>
      ${disc.map(d => `
        <tr>
          <td>${d.disciplina}</td>
          <td class="center">${Number(d.media_final).toFixed(1)}</td>
          <td class="center">—</td>
          <td class="center status-${d.situacao}">${d.situacao.charAt(0).toUpperCase() + d.situacao.slice(1)}</td>
        </tr>`).join('')}`
  }).join('') : `<tr><td colspan="4" class="center vazio">Nenhum registro da Conexão digitalizado.</td></tr>`

  // Histórico escola anterior
  const tabelaExterna = externos.length > 0
    ? externos.map(ext => `
        <div class="secao-ext">
          <h4>${ext.nome_escola_anterior} — ${ext.municipio_escola}/${ext.uf_escola}
            (${ext.nivel_ensino === 'fundamental' ? 'Ensino Fundamental' : 'Ensino Médio'})</h4>
          <table class="tabela">
            <thead><tr>
              <th>Conteúdos Curriculares</th>
              <th class="center">Série</th>
              <th class="center">Ano</th>
              <th class="center">Média Final</th>
              <th class="center">Resultado</th>
            </tr></thead>
            <tbody>
              ${ext.disciplinas.map(d => `
                <tr>
                  <td>${d.disciplina}</td>
                  <td class="center">${d.serie}</td>
                  <td class="center">${d.ano_letivo}</td>
                  <td class="center">${Number(d.media_final).toFixed(1)}</td>
                  <td class="center status-${d.situacao}">${d.situacao.charAt(0).toUpperCase() + d.situacao.slice(1)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`).join('')
    : '<p class="vazio">Nenhum histórico de escola anterior digitalizado.</p>'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Histórico Escolar — ${aluno.nome}</title>
  <style>
    @page { size: A4; margin: 18mm 22mm 15mm 22mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; background: #fff; }
    .topo { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
    .topo img { width: 64px; height: 64px; object-fit: contain; }
    .topo-info h1 { font-size: 15pt; font-weight: bold; }
    .topo-info p { font-size: 9pt; line-height: 1.5; }
    .titulo { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 14px 0; text-decoration: underline; }
    .dados-aluno { border: 1px solid #888; padding: 9px 12px; margin-bottom: 14px; font-size: 10.5pt; line-height: 1.9; }
    .dados-aluno strong { font-weight: bold; }
    h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #555; padding-bottom: 4px; margin: 16px 0 8px; }
    h4 { font-size: 10pt; font-weight: bold; margin: 10px 0 6px; color: #333; }
    .tabela { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10pt; }
    .tabela th { background: #ccc; border: 1px solid #888; padding: 4px 7px; font-weight: bold; }
    .tabela td { border: 1px solid #888; padding: 4px 7px; }
    .tabela tr:nth-child(even) td { background: #f2f2f2; }
    .ano-header td { background: #ddd !important; font-weight: bold; padding: 5px 7px; }
    .center { text-align: center; }
    .status-aprovado { color: #155724; font-weight: bold; }
    .status-reprovado { color: #721c24; font-weight: bold; }
    .status-recuperacao { color: #856404; font-weight: bold; }
    .vazio { color: #888; font-style: italic; text-align: center; padding: 10px; }
    .secao-ext { margin-bottom: 12px; }
    .rodape { margin-top: 30px; }
    .data { text-align: right; margin-bottom: 40px; font-size: 11pt; }
    .assinaturas { display: flex; justify-content: space-around; }
    .ass-bloco { text-align: center; min-width: 200px; }
    .ass-linha { border-top: 1px solid #000; padding-top: 4px; font-size: 10pt; font-weight: bold; }
    .ass-sub { font-size: 9pt; font-weight: normal; }
    .rodape-legal { margin-top: 20px; padding-top: 8px; border-top: 1px solid #aaa; font-size: 8pt; color: #555; line-height: 1.5; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="topo">
    <img src="${ESCOLA.logo_url}" alt="Logo" onerror="this.style.display='none'" />
    <div class="topo-info">
      <h1>${ESCOLA.nome}</h1>
      <p>CNPJ ${ESCOLA.cnpj} — Reconhecido pelo CEE Nº ${ESCOLA.cee}</p>
      <p>${ESCOLA.endereco} — ${ESCOLA.cidade}</p>
      <p>INEP: ${ESCOLA.inep}</p>
    </div>
  </div>

  <div class="titulo">Histórico Escolar Retroativo</div>

  <div class="dados-aluno">
    <p><strong>Aluno(a):</strong> ${aluno.nome}</p>
    <p><strong>Data de Nascimento:</strong> ${fmtData(aluno.data_nascimento)}&nbsp;&nbsp;
       <strong>CPF:</strong> ${aluno.cpf || '—'}</p>
    <p><strong>Filiação:</strong> ${aluno.filiacao || '—'}</p>
    <p><strong>Última série na Conexão:</strong> ${aluno.serie_saida || '—'}&nbsp;&nbsp;
       <strong>Ano de saída:</strong> ${aluno.ano_saida || '—'}&nbsp;&nbsp;
       <strong>Motivo:</strong> ${motivoLabel(aluno.motivo_saida)}</p>
  </div>

  ${externos.length > 0 ? `
  <h3>Histórico — Escola Anterior</h3>
  ${tabelaExterna}` : ''}

  <h3>Histórico — Colégio Conexão Maranhense</h3>
  <table class="tabela">
    <thead>
      <tr>
        <th>Conteúdos Curriculares</th>
        <th class="center">Média Final</th>
        <th class="center">Faltas</th>
        <th class="center">Resultado</th>
      </tr>
    </thead>
    <tbody>${tabelaConexao}</tbody>
  </table>

  <div class="rodape">
    <div class="data">São Luís, ${hoje}.</div>
    <div class="assinaturas">
      <div class="ass-bloco">
        <div class="ass-linha">
          ${ESCOLA.diretora}<br/>
          <span class="ass-sub">Diretora Geral<br/>CNPJ: ${ESCOLA.cnpj}</span>
        </div>
      </div>
      <div class="ass-bloco">
        <div class="ass-linha">
          ${ESCOLA.coordenador}<br/>
          <span class="ass-sub">${ESCOLA.cargo_coord}</span>
        </div>
      </div>
    </div>
    <div class="rodape-legal">
      Documento isento de autenticação pela Inspeção Escolar com base na Resolução nº 252/2018 – CEE – MA de 21 de março de 2019.
      Reconhecido pelo Conselho Estadual de Educação, CEE/MA nº ${ESCOLA.cee}.
    </div>
  </div>
</body>
</html>`
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ArquivoMorto({ usuario }: Props) {
  const [aba, setAba]                   = useState<'gerenciar' | 'digitalizar'>('gerenciar')
  const [alunos, setAlunos]             = useState<AlunoMorto[]>([])
  const [carregando, setCarregando]     = useState(true)
  const [busca, setBusca]               = useState('')
  const [imprimindo, setImprimindo]     = useState<string | null>(null)
  const [alunoParaDelete, setAlunoParaDelete] = useState<AlunoMorto | null>(null)
  const [confirmNome, setConfirmNome]   = useState('')
  const [deletando, setDeletando]       = useState(false)
  const [alunoPreSelecionado, setAlunoPreSelecionado] = useState<AlunoMorto | null>(null)

  const podeDelete = PODE_DELETAR(usuario.tipo)

  // ─── Carregar alunos ────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      // 1. Alunos históricos ativos (não deletados)
      const { data: alunosData, error } = await supabase
        .from('alunos_historicos')
        .select('*')
        .eq('segmento', usuario.segmento)
        .is('deletado_em', null)
        .order('nome')

      if (error) throw error
      if (!alunosData || alunosData.length === 0) { setAlunos([]); return }

      const ids = alunosData.map(a => a.id)

      // 2. Contagem de boletins por aluno
      const { data: bData } = await supabase
        .from('boletins_historicos')
        .select('aluno_id, ano_letivo')
        .in('aluno_id', ids)

      const boletinsMap: Record<string, { count: number; anos: number[] }> = {}
      for (const b of (bData ?? [])) {
        if (!boletinsMap[b.aluno_id]) boletinsMap[b.aluno_id] = { count: 0, anos: [] }
        boletinsMap[b.aluno_id].count++
        if (!boletinsMap[b.aluno_id].anos.includes(b.ano_letivo))
          boletinsMap[b.aluno_id].anos.push(b.ano_letivo)
      }

      // 3. Histórico externo por aluno
      const { data: hData } = await supabase
        .from('historico_externo')
        .select('aluno_historico_id, nome_escola_anterior')
        .in('aluno_historico_id', ids)

      const externoMap: Record<string, string> = {}
      for (const h of (hData ?? [])) {
        if (h.aluno_historico_id) externoMap[h.aluno_historico_id] = h.nome_escola_anterior
      }

      // 4. Juntar
      const resultado: AlunoMorto[] = alunosData.map(a => ({
        ...a,
        qtd_boletins:      boletinsMap[a.id]?.count ?? 0,
        anos_boletins:     (boletinsMap[a.id]?.anos ?? []).sort(),
        tem_historico_ext: !!externoMap[a.id],
        escola_anterior:   externoMap[a.id],
      }))

      setAlunos(resultado)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar arquivo morto.')
    } finally {
      setCarregando(false)
    }
  }, [usuario.segmento])

  useEffect(() => { carregar() }, [carregar])

  // ─── Imprimir histórico ─────────────────────────────────────────────────────

  async function imprimirHistorico(aluno: AlunoMorto) {
    setImprimindo(aluno.id)
    try {
      const [{ data: boletins }, { data: externos }] = await Promise.all([
        supabase.from('boletins_historicos')
          .select('disciplina, serie, ano_letivo, media_final, situacao')
          .eq('aluno_id', aluno.id)
          .order('ano_letivo').order('disciplina'),
        supabase.from('historico_externo')
          .select('nome_escola_anterior, municipio_escola, uf_escola, nivel_ensino, disciplinas')
          .eq('aluno_historico_id', aluno.id),
      ])

      const html = gerarHTMLHistorico(aluno, boletins ?? [], externos ?? [])
      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) { toast.error('Permita pop-ups para imprimir.'); return }
      win.document.write(html)
      win.document.close()
      setTimeout(() => { win.focus(); win.print() }, 600)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao gerar histórico.')
    } finally {
      setImprimindo(null)
    }
  }

  // ─── Soft delete ───────────────────────────────────────────────────────────

  async function confirmarDelete() {
    if (!alunoParaDelete || confirmNome.trim().toLowerCase() !== alunoParaDelete.nome.trim().toLowerCase()) {
      toast.error('Nome digitado incorreto. Digite exatamente o nome do aluno.')
      return
    }
    setDeletando(true)
    try {
      const { error } = await supabase
        .from('alunos_historicos')
        .update({ deletado_em: new Date().toISOString(), deletado_por: usuario.id })
        .eq('id', alunoParaDelete.id)

      if (error) throw error
      toast.success(`Registro de "${alunoParaDelete.nome}" removido do arquivo morto.`)
      setAlunoParaDelete(null)
      setConfirmNome('')
      await carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao remover registro.')
    } finally {
      setDeletando(false)
    }
  }

  // ─── Filtro de busca ────────────────────────────────────────────────────────

  const alunosFiltrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.serie_saida ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  // ─── Indicadores de status ──────────────────────────────────────────────────

  const totalAlunos    = alunos.length
  const comFicha       = alunos.filter(a => a.arquivo_ficha_url).length
  const comBoletins    = alunos.filter(a => a.qtd_boletins > 0).length
  const comHistExt     = alunos.filter(a => a.tem_historico_ext).length
  const completos      = alunos.filter(a => a.qtd_boletins > 0 && a.tem_historico_ext).length

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
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
        <div className="flex gap-2">
          <button onClick={carregar} disabled={carregando}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { id: 'gerenciar', label: 'Gerenciamento' },
          { id: 'digitalizar', label: '+ Digitalizar' },
        ].map(t => (
          <button key={t.id} onClick={() => { setAba(t.id as any); setAlunoPreSelecionado(null) }}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-all
                    ${aba === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ABA GERENCIAMENTO ──────────────────────────────────────────── */}
      {aba === 'gerenciar' && (
        <div className="space-y-5">

          {/* Cards de resumo */}
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
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Nome</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Série / Ano</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Motivo</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Ficha</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Boletins</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Hist. Ext.</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">Ações</th>
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
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {motivoLabel(a.motivo_saida)}
                      </td>
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
                              {a.qtd_boletins} disc.
                              {a.anos_boletins.length > 0 && ` · ${a.anos_boletins.join(', ')}`}
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
                          {/* Imprimir */}
                          <button
                            onClick={() => imprimirHistorico(a)}
                            disabled={imprimindo === a.id}
                            title="Imprimir histórico retroativo"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50">
                            <Printer className="w-3.5 h-3.5" />
                            {imprimindo === a.id ? 'Gerando...' : 'Imprimir'}
                          </button>

                          {/* Adicionar dados */}
                          <button
                            onClick={() => { setAlunoPreSelecionado(a); setAba('digitalizar') }}
                            title="Adicionar mais documentos"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Deletar — somente admin/gestor */}
                          {podeDelete && (
                            <button
                              onClick={() => { setAlunoParaDelete(a); setConfirmNome('') }}
                              title="Remover do arquivo morto"
                              className="p-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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

      {/* ─── ABA DIGITALIZAR ──────────────────────────────────────────────── */}
      {aba === 'digitalizar' && (
        <div>
          {alunoPreSelecionado && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Adicionando dados para <strong>{alunoPreSelecionado.nome}</strong>.</span>
              <button onClick={() => setAlunoPreSelecionado(null)} className="ml-auto text-xs hover:underline">Mudar aluno</button>
            </div>
          )}
          <ArquivoHistorico usuario={usuario} />
        </div>
      )}

      {/* ─── AlertDialog de confirmação de delete ─────────────────────────── */}
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
                <strong>Atenção:</strong> Esta ação remove a visibilidade do registro. Para recuperar, acesse o Supabase Dashboard.
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-foreground">
                  Para confirmar, digite o nome do aluno:
                </label>
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
