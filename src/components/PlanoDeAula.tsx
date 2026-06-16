// src/components/PlanoDeAula.tsx  v2
// Professor preenche um plano por período (semana/mês) com uma entrada por dia de aula.
// A IA gera o detalhamento de cada dia individualmente.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  Sparkles, Loader2, Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, BookOpen, Send, Eye,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Turma {
  id: string; nomeTurma: string; nomeSerie: string; serieId: string
  disciplinas: { id: string; nome: string }[]
}

interface DiaForm {
  id?: string            // planos_aula_dias.id se já existe no banco
  data_aula: string      // YYYY-MM-DD
  tema: string
  tipo: string
  recursos: string
  observacoes: string
  plano_gerado?: Record<string, unknown>
  ia_usada: boolean
  gerando: boolean       // loading local
  expandido: boolean     // mostrar plano gerado
}

type Periodicidade = 'semanal' | 'mensal'
type StatusPlano = 'rascunho' | 'entregue' | 'aprovado' | 'atrasado'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodoBounds(periodicidade: Periodicidade) {
  const hoje = new Date()
  if (periodicidade === 'semanal') {
    const dow = hoje.getDay()
    const diffSeg = dow === 0 ? -6 : 1 - dow
    const seg = new Date(hoje); seg.setDate(hoje.getDate() + diffSeg)
    const sex = new Date(seg);  sex.setDate(seg.getDate() + 4)
    return { inicio: seg.toISOString().split('T')[0], fim: sex.toISOString().split('T')[0] }
  } else {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    return { inicio: ini.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] }
  }
}

function formatarPeriodo(inicio: string, fim: string, periodicidade: Periodicidade) {
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const fmtMes = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return periodicidade === 'semanal'
    ? `Semana ${fmt(inicio)} a ${fmt(fim)}`
    : `${fmtMes(inicio).charAt(0).toUpperCase()}${fmtMes(inicio).slice(1)}`
}

function formatarDataPtBR(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

const TIPOS = ['Expositiva dialogada', 'Aula prática', 'Revisão', 'Avaliação', 'Trabalho em grupo', 'Projeto', 'Seminário']

const STATUS_BADGE: Record<StatusPlano, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  entregue:  { label: 'Entregue',  cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  aprovado:  { label: 'Aprovado',  cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  atrasado:  { label: 'Atrasado',  cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface PlanoDeAulaProps {
  turmas: Turma[]
  nomeProfessor: string
  segmento: string
}

export function PlanoDeAula({ turmas, nomeProfessor, segmento }: PlanoDeAulaProps) {
  const [turmaSel, setTurmaSel]         = useState<Turma | null>(null)
  const [discSel, setDiscSel]           = useState<{ id: string; nome: string } | null>(null)
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('semanal')
  const [periodo, setPeriodo]           = useState(getPeriodoBounds('semanal'))
  const [planoId, setPlanoId]           = useState<string | null>(null)
  const [status, setStatus]             = useState<StatusPlano>('rascunho')
  const [obsCoord, setObsCoord]         = useState<string | null>(null)
  const [dias, setDias]                 = useState<DiaForm[]>([])
  const [carregando, setCarregando]     = useState(false)
  const [salvando, setSalvando]         = useState(false)
  const [entregando, setEntregando]     = useState(false)
  const [erro, setErro]                 = useState<string | null>(null)

  // Carrega config de periodicidade do banco
  useEffect(() => {
    supabase
      .from('plano_aula_config')
      .select('periodicidade')
      .eq('segmento', segmento || 'presencial')
      .maybeSingle()
      .then(({ data }) => {
        const p: Periodicidade = (data?.periodicidade as Periodicidade) ?? 'semanal'
        setPeriodicidade(p)
        setPeriodo(getPeriodoBounds(p))
      })
  }, [segmento])

  // Carrega plano existente quando turma+disciplina selecionados
  useEffect(() => {
    if (!turmaSel || !discSel) return
    carregarPlano()
  }, [turmaSel, discSel, periodo.inicio])

  async function carregarPlano() {
    if (!turmaSel || !discSel) return
    setCarregando(true)
    setErro(null)

    const { data: plano } = await supabase
      .from('planos_aula')
      .select('id, status, obs_coord')
      .eq('turma_id', turmaSel.id)
      .eq('disciplina_id', discSel.id)
      .eq('periodo_inicio', periodo.inicio)
      .maybeSingle()

    if (plano) {
      setPlanoId(plano.id)
      setStatus(plano.status as StatusPlano)
      setObsCoord(plano.obs_coord ?? null)

      const { data: diasDB } = await supabase
        .from('planos_aula_dias')
        .select('*')
        .eq('plano_id', plano.id)
        .order('data_aula')

      setDias((diasDB ?? []).map(d => ({
        id:           d.id,
        data_aula:    d.data_aula,
        tema:         d.tema,
        tipo:         d.tipo ?? '',
        recursos:     d.recursos ?? '',
        observacoes:  d.observacoes ?? '',
        plano_gerado: d.plano_gerado ?? undefined,
        ia_usada:     d.ia_usada ?? false,
        gerando:      false,
        expandido:    false,
      })))
    } else {
      setPlanoId(null)
      setStatus('rascunho')
      setObsCoord(null)
      setDias([])
    }
    setCarregando(false)
  }

  // Garante que o plano existe no banco (cria se não existir)
  async function garantirPlano(): Promise<string> {
    if (planoId) return planoId
    if (!turmaSel || !discSel) throw new Error('Selecione turma e disciplina')

    const { data, error } = await supabase
      .from('planos_aula')
      .insert({
        turma_id:      turmaSel.id,
        disciplina_id: discSel.id,
        periodo_inicio: periodo.inicio,
        periodo_fim:    periodo.fim,
        periodicidade,
        status: 'rascunho',
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    setPlanoId(data.id)
    return data.id
  }

  function adicionarDia() {
    // Sugere o próximo dia útil após o último registrado, dentro do período
    const ultimaData = dias.length > 0 ? dias[dias.length - 1].data_aula : periodo.inicio
    const proxData = new Date(ultimaData + 'T12:00:00')
    proxData.setDate(proxData.getDate() + 1)
    // Pula fim de semana
    if (proxData.getDay() === 6) proxData.setDate(proxData.getDate() + 2)
    if (proxData.getDay() === 0) proxData.setDate(proxData.getDate() + 1)
    const dataStr = proxData.toISOString().split('T')[0]
    // Não ultrapassa o fim do período
    const dataFinal = dataStr > periodo.fim ? periodo.fim : dataStr

    setDias(prev => [...prev, {
      data_aula: dataFinal, tema: '', tipo: '', recursos: '', observacoes: '',
      ia_usada: false, gerando: false, expandido: false,
    }])
  }

  function removerDia(idx: number) {
    const dia = dias[idx]
    if (dia.id) {
      supabase.from('planos_aula_dias').delete().eq('id', dia.id).then(() => {})
    }
    setDias(prev => prev.filter((_, i) => i !== idx))
  }

  function atualizarDia(idx: number, campo: Partial<DiaForm>) {
    setDias(prev => prev.map((d, i) => i === idx ? { ...d, ...campo } : d))
  }

  async function salvarDia(idx: number) {
    const dia = dias[idx]
    if (!dia.tema.trim()) return
    setSalvando(true)
    try {
      const pid = await garantirPlano()
      if (dia.id) {
        await supabase.from('planos_aula_dias').update({
          data_aula: dia.data_aula, tema: dia.tema, tipo: dia.tipo,
          recursos: dia.recursos, observacoes: dia.observacoes,
        }).eq('id', dia.id)
      } else {
        const { data } = await supabase.from('planos_aula_dias').insert({
          plano_id: pid, data_aula: dia.data_aula, tema: dia.tema,
          tipo: dia.tipo, recursos: dia.recursos, observacoes: dia.observacoes,
        }).select('id').single()
        if (data) atualizarDia(idx, { id: data.id })
      }
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  async function gerarIAParaDia(idx: number) {
    const dia = dias[idx]
    if (!dia.tema.trim() || !turmaSel || !discSel) return

    // Salva primeiro
    await salvarDia(idx)
    atualizarDia(idx, { gerando: true })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-plano-aula`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            disciplina: discSel.nome,
            serie:      turmaSel.nomeSerie,
            turma:      turmaSel.nomeTurma,
            tema:       dia.tema,
            tipo:       dia.tipo || 'Expositiva dialogada',
            duracao:    '1 aula (50 min)',
            recursos:   dia.recursos || 'Quadro e giz/pincel, Livro didático',
            observacoes: dia.observacoes,
          }),
        }
      )
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error)

      // Persiste plano_gerado no banco
      if (dia.id) {
        await supabase.from('planos_aula_dias').update({
          plano_gerado: json.plano, ia_usada: true,
        }).eq('id', dia.id)
      }
      atualizarDia(idx, { plano_gerado: json.plano, ia_usada: true, gerando: false, expandido: true })
    } catch (e: any) {
      setErro(e.message)
      atualizarDia(idx, { gerando: false })
    }
  }

  async function entregar() {
    if (!planoId) return
    const diasSemTema = dias.filter(d => !d.tema.trim())
    if (diasSemTema.length > 0 || dias.length === 0) {
      setErro('Preencha o tema de todos os dias antes de entregar.')
      return
    }
    setEntregando(true)
    // Salva todos os dias pendentes
    for (let i = 0; i < dias.length; i++) await salvarDia(i)

    const { error } = await supabase.from('planos_aula').update({
      status: 'entregue', entregue_em: new Date().toISOString(),
    }).eq('id', planoId)

    if (!error) setStatus('entregue')
    else setErro(error.message)
    setEntregando(false)
  }

  // ── Render: seleção de turma/disciplina ─────────────────────────────────────
  if (!turmaSel || !discSel) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Plano de Aula com IA</h2>
            <p className="text-sm text-muted-foreground">Planejamento por período · {periodicidade}</p>
          </div>
        </div>

        {/* Turma */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Selecione a Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {turmas.map(t => (
                <button key={t.id} onClick={() => { setTurmaSel(t); setDiscSel(null) }}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    turmaSel?.id === t.id ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-border text-foreground hover:border-indigo-400'}`}>
                  {t.nomeSerie} — {t.nomeTurma}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disciplina */}
        {turmaSel && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Selecione a Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {turmaSel.disciplinas.map(d => (
                  <button key={d.id} onClick={() => setDiscSel(d)}
                    className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors border-border text-foreground hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                    {d.nome}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ── Render: multi-dias ───────────────────────────────────────────────────────
  const periodoLabel = formatarPeriodo(periodo.inicio, periodo.fim, periodicidade)
  const podeEntregar = dias.length > 0 && dias.every(d => d.tema.trim()) && status === 'rascunho'
  const st = STATUS_BADGE[status]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho do plano */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => { setTurmaSel(null); setDiscSel(null) }}
            className="text-xs text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            ← Trocar turma/disciplina
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            {discSel.nome} · {turmaSel.nomeSerie} {turmaSel.nomeTurma}
          </h2>
          <p className="text-sm text-muted-foreground">{periodoLabel}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      {/* Notificação da coordenação */}
      {obsCoord && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span><strong>Coordenação:</strong> {obsCoord}</span>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {erro}
          <button onClick={() => setErro(null)} className="ml-auto text-xs underline">Fechar</button>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando plano...
        </div>
      ) : (
        <>
          {/* Dias de aula */}
          {dias.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Nenhum dia de aula adicionado ainda.</p>
                <p className="text-xs mt-1">Clique em "+ Adicionar dia de aula" para começar.</p>
              </CardContent>
            </Card>
          )}

          {dias.map((dia, idx) => (
            <Card key={idx} className={`transition-all ${dia.gerando ? 'opacity-70' : ''}`}>
              <CardContent className="pt-4 pb-4 space-y-3">
                {/* Linha 1: data + tipo + remover */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Data da aula</label>
                    <input
                      type="date"
                      value={dia.data_aula}
                      min={periodo.inicio}
                      max={periodo.fim}
                      disabled={status !== 'rascunho'}
                      onChange={e => atualizarDia(idx, { data_aula: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de aula</label>
                    <select
                      value={dia.tipo}
                      disabled={status !== 'rascunho'}
                      onChange={e => atualizarDia(idx, { tipo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                    >
                      <option value="">Selecionar...</option>
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {status === 'rascunho' && (
                    <button onClick={() => removerDia(idx)}
                      className="mt-5 p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Tema */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Tema / Conteúdo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Fotossíntese — O processo de produção de energia nas plantas"
                    value={dia.tema}
                    disabled={status !== 'rascunho'}
                    onChange={e => atualizarDia(idx, { tema: e.target.value })}
                    onBlur={() => salvarDia(idx)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>

                {/* Recursos */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Recursos (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Datashow, livro pág. 45, material impresso"
                    value={dia.recursos}
                    disabled={status !== 'rascunho'}
                    onChange={e => atualizarDia(idx, { recursos: e.target.value })}
                    onBlur={() => salvarDia(idx)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Turma com 2 alunos com TEA"
                    value={dia.observacoes}
                    disabled={status !== 'rascunho'}
                    onChange={e => atualizarDia(idx, { observacoes: e.target.value })}
                    onBlur={() => salvarDia(idx)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>

                {/* Ações da IA */}
                <div className="flex items-center gap-2 pt-1">
                  {status === 'rascunho' && (
                    <Button size="sm" variant="outline" disabled={!dia.tema.trim() || dia.gerando}
                      onClick={() => gerarIAParaDia(idx)}
                      className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                      {dia.gerando
                        ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Gerando...</>
                        : <><Sparkles className="w-4 h-4 mr-1.5" /> {dia.ia_usada ? 'Regenerar com IA' : 'Gerar com IA'}</>
                      }
                    </Button>
                  )}
                  {dia.plano_gerado && (
                    <Button size="sm" variant="ghost"
                      onClick={() => atualizarDia(idx, { expandido: !dia.expandido })}>
                      <Eye className="w-4 h-4 mr-1.5" />
                      {dia.expandido ? 'Ocultar plano' : 'Ver plano gerado'}
                      {dia.expandido ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                  )}
                  {dia.ia_usada && !dia.expandido && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Plano IA gerado
                    </span>
                  )}
                </div>

                {/* Plano gerado expandido */}
                {dia.expandido && dia.plano_gerado && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
                    {dia.plano_gerado.titulo && (
                      <p className="font-semibold text-foreground">{dia.plano_gerado.titulo as string}</p>
                    )}
                    {dia.plano_gerado.objetivo_geral && (
                      <p className="text-muted-foreground"><strong>Objetivo:</strong> {dia.plano_gerado.objetivo_geral as string}</p>
                    )}
                    {(dia.plano_gerado.sequencia_didatica as any)?.desenvolvimento?.descricao && (
                      <p className="text-muted-foreground">
                        <strong>Desenvolvimento:</strong> {(dia.plano_gerado.sequencia_didatica as any).desenvolvimento.descricao}
                      </p>
                    )}
                    {dia.plano_gerado.avaliacao && (
                      <p className="text-muted-foreground"><strong>Avaliação:</strong> {dia.plano_gerado.avaliacao as string}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Adicionar dia */}
          {status === 'rascunho' && (
            <button onClick={adicionarDia}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Adicionar dia de aula
            </button>
          )}

          {/* Rodapé */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {dias.length} {dias.length === 1 ? 'aula planejada' : 'aulas planejadas'}
              {salvando && <span className="text-xs">&nbsp;· salvando...</span>}
            </div>
            {status === 'rascunho' && (
              <Button onClick={entregar} disabled={!podeEntregar || entregando}
                className="bg-green-600 hover:bg-green-700 text-white">
                {entregando
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entregando...</>
                  : <><Send className="w-4 h-4 mr-2" /> Entregar Plano</>
                }
              </Button>
            )}
            {status === 'entregue' && (
              <span className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Plano entregue · aguardando aprovação
              </span>
            )}
            {status === 'aprovado' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Aprovado pela coordenação
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PlanoDeAula
