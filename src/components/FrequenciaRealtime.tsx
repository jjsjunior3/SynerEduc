// src/components/FrequenciaRealtime.tsx
// Painel de faltas em tempo real — Coordenador

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import {
  UserX, CheckCircle, MessageCircle, Clock,
  Wifi, WifiOff, Bell, ChevronDown, ChevronUp, Filter,
} from 'lucide-react'

interface Falta {
  id:               string
  aluno_id:         string
  aluno_nome:       string
  turma_nome:       string
  serie_nome:       string
  disciplina_nome:  string
  criado_em:        string
  status:           string | null
  justificada:      boolean
  notificado_em:    string | null
  responsavel_nome: string | null
  telefone:         string | null
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function badgeFalta(justificada: boolean, notificado_em: string | null) {
  if (justificada)
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Justificada</span>
  if (notificado_em)
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Notificado</span>
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Pendente</span>
}

export function FrequenciaRealtime() {
  const { usuario } = useAuth()
  const segmento = usuario?.segmento ?? null

  const [faltas,     setFaltas]     = useState<Falta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [conectado,  setConectado]  = useState(false)
  const [novas,      setNovas]      = useState<Set<string>>(new Set())
  const [expandido,  setExpandido]  = useState(true)
  const [acoes,      setAcoes]      = useState<Record<string, boolean>>({})

  // Filtros
  const [filtroSerie, setFiltroSerie]   = useState('todas')
  const [filtroTurma, setFiltroTurma]   = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState('pendentes')

  const carregarFaltas = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from('frequencia_diaria')
      .select(`
        id, aluno_id, criado_em, status, notificado_em, justificada,
        users!frequencia_diaria_aluno_id_fkey ( nome, status ),
        turmas!frequencia_diaria_turma_id_fkey ( nome, segmento, series ( nome ) ),
        disciplinas!frequencia_diaria_disciplina_id_fkey ( nome )
      `)
      .eq('presente', false)
      .eq('data_aula', hoje)
      .order('criado_em', { ascending: false })

    if (!data) { setCarregando(false); return }

    const filtrado = data.filter((f: any) =>
      (!segmento || f.turmas?.segmento === segmento) &&
      f.users?.status === 'ativo'
    )

    const alunoIds = [...new Set(filtrado.map((f: any) => f.aluno_id))]
    let fichasMap: Record<string, { nome_responsavel: string | null; telefone: string | null }> = {}
    if (alunoIds.length > 0) {
      const { data: fichas } = await supabase
        .from('fichas_matricula')
        .select('aluno_id, nome_responsavel, telefone')
        .in('aluno_id', alunoIds)
      if (fichas) {
        fichas.forEach((f: any) => { fichasMap[f.aluno_id] = { nome_responsavel: f.nome_responsavel, telefone: f.telefone } })
      }
    }

    setFaltas(filtrado.map((f: any) => ({
      id:               f.id,
      aluno_id:         f.aluno_id,
      aluno_nome:       f.users?.nome ?? 'Aluno',
      turma_nome:       f.turmas?.nome ?? '—',
      serie_nome:       f.turmas?.series?.nome ?? f.turmas?.nome ?? '—',
      disciplina_nome:  f.disciplinas?.nome ?? '—',
      criado_em:        f.criado_em,
      status:           f.status ?? null,
      justificada:      f.justificada ?? false,
      notificado_em:    f.notificado_em ?? null,
      responsavel_nome: fichasMap[f.aluno_id]?.nome_responsavel ?? null,
      telefone:         fichasMap[f.aluno_id]?.telefone ?? null,
    })))
    setCarregando(false)
  }, [segmento])

  useEffect(() => { carregarFaltas() }, [carregarFaltas])

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10)

    const channel = supabase
      .channel('coord-faltas-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'frequencia_diaria' }, async (payload) => {
        const novo = payload.new as any
        if (novo.presente !== false) return
        if (novo.data_aula && novo.data_aula !== hoje) return

        const { data } = await supabase
          .from('frequencia_diaria')
          .select(`
            id, aluno_id, criado_em, status, notificado_em, justificada,
            users!frequencia_diaria_aluno_id_fkey ( nome ),
            turmas!frequencia_diaria_turma_id_fkey ( nome, segmento ),
            disciplinas!frequencia_diaria_disciplina_id_fkey ( nome ),
            series!frequencia_diaria_turma_id_fkey ( nome )
          `)
          .eq('id', novo.id)
          .single()

        if (!data) return
        if (segmento && (data as any).turmas?.segmento !== segmento) return

        let fichaResp = { nome_responsavel: null as string | null, telefone: null as string | null }
        const { data: ficha } = await supabase
          .from('fichas_matricula')
          .select('nome_responsavel, telefone')
          .eq('aluno_id', (data as any).aluno_id)
          .maybeSingle()
        if (ficha) fichaResp = ficha

        const falta: Falta = {
          id:               (data as any).id,
          aluno_id:         (data as any).aluno_id,
          aluno_nome:       (data as any).users?.nome ?? 'Aluno',
          turma_nome:       (data as any).turmas?.nome ?? '—',
          serie_nome:       (data as any).series?.nome ?? (data as any).turmas?.nome ?? '—',
          disciplina_nome:  (data as any).disciplinas?.nome ?? '—',
          criado_em:        (data as any).criado_em,
          status:           (data as any).status ?? null,
          justificada:      (data as any).justificada ?? false,
          notificado_em:    (data as any).notificado_em ?? null,
          responsavel_nome: fichaResp.nome_responsavel,
          telefone:         fichaResp.telefone,
        }
        setFaltas(prev => [falta, ...prev.filter(f => f.id !== falta.id)])
        setNovas(prev => new Set([...prev, falta.id]))
        setTimeout(() => setNovas(prev => { const n = new Set(prev); n.delete(falta.id); return n }), 4000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'frequencia_diaria' }, (payload) => {
        const upd = payload.new as any
        setFaltas(prev => prev.map(f =>
          f.id === upd.id
            ? { ...f, status: upd.status ?? null, justificada: upd.justificada ?? false, notificado_em: upd.notificado_em ?? null }
            : f,
        ))
      })
      .subscribe((status) => { setConectado(status === 'SUBSCRIBED') })

    return () => { supabase.removeChannel(channel) }
  }, [segmento])

  const justificar = async (id: string) => {
    setAcoes(a => ({ ...a, [id]: true }))
    const agora = new Date().toISOString()
    await supabase.from('frequencia_diaria').update({ justificada: true, justificada_em: agora }).eq('id', id)
    setFaltas(prev => prev.map(f => f.id === id ? { ...f, justificada: true } : f))
    setAcoes(a => ({ ...a, [id]: false }))
  }

  const notificarResponsavel = async (falta: Falta) => {
    setAcoes(a => ({ ...a, [falta.id]: true }))

    await supabase.from('notificacoes').insert({
      user_id:    falta.aluno_id,
      titulo:     'Falta registrada',
      descricao:  `Você teve uma falta registrada na disciplina ${falta.disciplina_nome} em ${new Date().toLocaleDateString('pt-BR')}. Em caso de dúvidas, procure a coordenação.`,
      tipo:       'falta',
      lida:       false,
      acao_texto: 'Ver frequência',
    })

    const agora = new Date().toISOString()
    await supabase.from('frequencia_diaria').update({ notificado_em: agora }).eq('id', falta.id)
    setFaltas(prev => prev.map(f => f.id === falta.id ? { ...f, notificado_em: agora } : f))

    if (falta.telefone) {
      const tel = falta.telefone.replace(/\D/g, '')
      const data = new Date().toLocaleDateString('pt-BR')
      const msg  =
        `Olá ${falta.responsavel_nome ?? 'Responsável'}, ` +
        `informamos que *${falta.aluno_nome}* teve uma falta registrada ` +
        `na disciplina *${falta.disciplina_nome}* em ${data}. ` +
        `Em caso de dúvidas, entre em contato com a coordenação do Colégio Conexão Maranhense.`
      window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    setAcoes(a => ({ ...a, [falta.id]: false }))
  }

  // Opções de filtro derivadas dos dados
  const series = useMemo(() => ['todas', ...Array.from(new Set(faltas.map(f => f.serie_nome))).sort()], [faltas])
  const turmas = useMemo(() => {
    const base = faltas.filter(f => filtroSerie === 'todas' || f.serie_nome === filtroSerie)
    return ['todas', ...Array.from(new Set(base.map(f => f.turma_nome))).sort()]
  }, [faltas, filtroSerie])

  // Lista filtrada
  const faltasFiltradas = useMemo(() => {
    return faltas.filter(f => {
      if (filtroSerie !== 'todas' && f.serie_nome !== filtroSerie) return false
      if (filtroTurma !== 'todas' && f.turma_nome !== filtroTurma) return false
      if (filtroStatus === 'pendentes' && (f.justificada || f.notificado_em)) return false
      if (filtroStatus === 'justificadas' && !f.justificada) return false
      if (filtroStatus === 'notificados' && !f.notificado_em) return false
      return true
    })
  }, [faltas, filtroSerie, filtroTurma, filtroStatus])

  // Contadores (sem filtro de status)
  const faltasFiltroBase = useMemo(() =>
    faltas.filter(f =>
      (filtroSerie === 'todas' || f.serie_nome === filtroSerie) &&
      (filtroTurma === 'todas' || f.turma_nome === filtroTurma)
    ), [faltas, filtroSerie, filtroTurma])

  const pendentes    = faltasFiltroBase.filter(f => !f.justificada && !f.notificado_em).length
  const justificadas = faltasFiltroBase.filter(f => f.justificada).length
  const notificados  = faltasFiltroBase.filter(f => f.notificado_em && !f.justificada).length

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <UserX size={16} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Faltas de Hoje
              {pendentes > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendentes}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conectado
            ? <><Wifi size={12} className="text-green-500" /><span className="text-xs text-green-600 dark:text-green-400 hidden sm:inline">Ao vivo</span></>
            : <><WifiOff size={12} className="text-gray-400" /><span className="text-xs text-gray-400 hidden sm:inline">Conectando…</span></>
          }
          <button
            onClick={() => setExpandido(e => !e)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expandido && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setFiltroStatus(filtroStatus === 'pendentes' ? 'todos' : 'pendentes')}
              className={`rounded-xl px-3 py-2.5 text-center transition-all ${filtroStatus === 'pendentes' ? 'ring-2 ring-red-400' : ''}`}
              style={{ background: '#fee2e2' }}
            >
              <p className="text-2xl font-bold text-red-700">{pendentes}</p>
              <p className="text-[11px] font-medium text-red-600 mt-0.5">Pendentes</p>
            </button>
            <button
              onClick={() => setFiltroStatus(filtroStatus === 'notificados' ? 'todos' : 'notificados')}
              className={`rounded-xl px-3 py-2.5 text-center transition-all ${filtroStatus === 'notificados' ? 'ring-2 ring-blue-400' : ''}`}
              style={{ background: '#dbeafe' }}
            >
              <p className="text-2xl font-bold text-blue-700">{notificados}</p>
              <p className="text-[11px] font-medium text-blue-600 mt-0.5">Notificados</p>
            </button>
            <button
              onClick={() => setFiltroStatus(filtroStatus === 'justificadas' ? 'todos' : 'justificadas')}
              className={`rounded-xl px-3 py-2.5 text-center transition-all ${filtroStatus === 'justificadas' ? 'ring-2 ring-green-400' : ''}`}
              style={{ background: '#dcfce7' }}
            >
              <p className="text-2xl font-bold text-green-700">{justificadas}</p>
              <p className="text-[11px] font-medium text-green-600 mt-0.5">Justificadas</p>
            </button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <Filter size={13} className="text-gray-400 shrink-0" />
            <select
              value={filtroSerie}
              onChange={e => { setFiltroSerie(e.target.value); setFiltroTurma('todas') }}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {series.map(s => <option key={s} value={s}>{s === 'todas' ? 'Todas as séries' : s}</option>)}
            </select>
            <select
              value={filtroTurma}
              onChange={e => setFiltroTurma(e.target.value)}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {turmas.map(t => <option key={t} value={t}>{t === 'todas' ? 'Todas as turmas' : t}</option>)}
            </select>
            {(filtroSerie !== 'todas' || filtroTurma !== 'todas' || filtroStatus !== 'pendentes') && (
              <button
                onClick={() => { setFiltroSerie('todas'); setFiltroTurma('todas'); setFiltroStatus('pendentes') }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1"
              >
                Limpar
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">{faltasFiltradas.length} registro{faltasFiltradas.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Lista compacta */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">

            {carregando && (
              <div className="py-6 flex items-center justify-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                <span className="text-sm">Carregando…</span>
              </div>
            )}

            {!carregando && faltasFiltradas.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2">
                <CheckCircle size={24} className="text-green-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {faltas.length === 0 ? 'Nenhuma falta registrada hoje' : 'Nenhum resultado para este filtro'}
                </p>
              </div>
            )}

            {!carregando && faltasFiltradas.map(falta => (
              <div
                key={falta.id}
                className={`px-4 py-2.5 flex items-center gap-3 transition-all duration-300 ${
                  novas.has(falta.id)
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {/* Info — compacta em uma linha */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                      {falta.aluno_nome}
                    </p>
                    {badgeFalta(falta.justificada, falta.notificado_em)}
                    {novas.has(falta.id) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 animate-pulse">NOVO</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {falta.turma_nome} · {falta.disciplina_nome} · <Clock size={10} className="inline mb-0.5" /> {hora(falta.criado_em)}
                    {falta.notificado_em && <span className="text-blue-500 ml-2"><Bell size={10} className="inline mb-0.5" /> {hora(falta.notificado_em)}</span>}
                  </p>
                </div>

                {/* Ações */}
                {!falta.justificada && !falta.notificado_em && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => justificar(falta.id)}
                      disabled={acoes[falta.id]}
                      title="Justificar falta"
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle size={12} /> Justificar
                    </button>
                    <button
                      onClick={() => notificarResponsavel(falta)}
                      disabled={acoes[falta.id]}
                      title={falta.telefone ? 'Notificar no painel + WhatsApp' : 'Notificar no painel'}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
                    >
                      <MessageCircle size={12} /> {falta.telefone ? 'WhatsApp' : 'Notificar'}
                    </button>
                  </div>
                )}

                {/* Re-notificar */}
                {falta.notificado_em && !falta.justificada && falta.telefone && (
                  <button
                    onClick={() => {
                      const tel = falta.telefone!.replace(/\D/g, '')
                      const msg = `Olá ${falta.responsavel_nome ?? 'Responsável'}, reiteramos que *${falta.aluno_nome}* teve uma falta registrada na disciplina *${falta.disciplina_nome}*. Em caso de dúvidas, entre em contato com a coordenação do Colégio Conexão Maranhense.`
                      window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
                    }}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors shrink-0"
                  >
                    <MessageCircle size={12} /> Reenviar
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
