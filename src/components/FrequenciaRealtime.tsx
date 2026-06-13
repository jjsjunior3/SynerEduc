// src/components/FrequenciaRealtime.tsx
// Painel de faltas em tempo real — Coordenador
// Professor lança falta → aparece aqui instantaneamente via Supabase Realtime
// Coordenador pode justificar ou notificar o responsável (painel do aluno + WhatsApp)

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import {
  UserX, CheckCircle, MessageCircle, Clock,
  Wifi, WifiOff, Bell, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Falta {
  id:               string
  aluno_id:         string
  aluno_nome:       string
  turma_nome:       string
  disciplina_nome:  string
  criado_em:        string
  status:           string | null
  notificado_em:    string | null
  responsavel_nome: string | null
  telefone:         string | null
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function badgeStatus(status: string | null) {
  if (status === 'justificada')
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Justificada</span>
  if (status === 'notificado')
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Responsável notificado</span>
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

  const montarFalta = (f: any): Falta => ({
    id:               f.id,
    aluno_id:         f.aluno_id,
    aluno_nome:       f.users?.nome ?? 'Aluno',
    turma_nome:       f.turmas?.nome ?? '—',
    disciplina_nome:  f.disciplinas?.nome ?? '—',
    criado_em:        f.criado_em,
    status:           f.status ?? null,
    notificado_em:    f.notificado_em ?? null,
    responsavel_nome: Array.isArray(f.fichas_matricula) ? f.fichas_matricula[0]?.nome_responsavel ?? null : f.fichas_matricula?.nome_responsavel ?? null,
    telefone:         Array.isArray(f.fichas_matricula) ? f.fichas_matricula[0]?.telefone ?? null : f.fichas_matricula?.telefone ?? null,
  })

  const carregarFaltas = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('frequencia_diaria')
      .select(`
        id, aluno_id, criado_em, status, notificado_em,
        users!frequencia_diaria_aluno_id_fkey ( nome ),
        turmas!frequencia_diaria_turma_id_fkey ( nome, segmento ),
        disciplinas!frequencia_diaria_disciplina_id_fkey ( nome ),
        fichas_matricula ( nome_responsavel, telefone )
      `)
      .eq('presente', false)
      .eq('data_aula', hoje)
      .order('criado_em', { ascending: false })

    if (!data) { setCarregando(false); return }

    const filtrado = data
      .filter((f: any) => !segmento || f.turmas?.segmento === segmento)
      .map(montarFalta)

    setFaltas(filtrado)
    setCarregando(false)
  }, [segmento])

  // Carrega ao montar
  useEffect(() => { carregarFaltas() }, [carregarFaltas])

  // Realtime — escuta novos lançamentos de falta
  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10)

    const channel = supabase
      .channel('coord-faltas-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'frequencia_diaria' },
        async (payload) => {
          const novo = payload.new as any
          if (novo.presente !== false) return
          if (novo.data_aula && novo.data_aula !== hoje) return

          // Busca dados completos da linha inserida
          const { data } = await supabase
            .from('frequencia_diaria')
            .select(`
              id, aluno_id, criado_em, status, notificado_em,
              users!frequencia_diaria_aluno_id_fkey ( nome ),
              turmas!frequencia_diaria_turma_id_fkey ( nome, segmento ),
              disciplinas!frequencia_diaria_disciplina_id_fkey ( nome ),
              fichas_matricula ( nome_responsavel, telefone )
            `)
            .eq('id', novo.id)
            .single()

          if (!data) return
          if (segmento && (data as any).turmas?.segmento !== segmento) return

          const falta = montarFalta(data)
          setFaltas(prev => [falta, ...prev.filter(f => f.id !== falta.id)])
          setNovas(prev => new Set([...prev, falta.id]))
          setTimeout(() => setNovas(prev => { const n = new Set(prev); n.delete(falta.id); return n }), 4000)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'frequencia_diaria' },
        (payload) => {
          const upd = payload.new as any
          setFaltas(prev => prev.map(f =>
            f.id === upd.id
              ? { ...f, status: upd.status ?? null, notificado_em: upd.notificado_em ?? null }
              : f,
          ))
        },
      )
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [segmento])

  const justificar = async (id: string) => {
    setAcoes(a => ({ ...a, [id]: true }))
    await supabase.from('frequencia_diaria').update({ status: 'justificada' }).eq('id', id)
    setFaltas(prev => prev.map(f => f.id === id ? { ...f, status: 'justificada' } : f))
    setAcoes(a => ({ ...a, [id]: false }))
  }

  const notificarResponsavel = async (falta: Falta) => {
    setAcoes(a => ({ ...a, [falta.id]: true }))

    // 1. Notificação no painel do aluno
    await supabase.from('notificacoes').insert({
      user_id:      falta.aluno_id,
      titulo:       'Falta registrada',
      descricao:    `Você teve uma falta registrada na disciplina ${falta.disciplina_nome} em ${new Date().toLocaleDateString('pt-BR')}. Em caso de dúvidas, procure a coordenação.`,
      tipo:         'falta',
      lida:         false,
      acao_texto:   'Ver frequência',
    })

    // 2. Marca como notificado
    const agora = new Date().toISOString()
    await supabase
      .from('frequencia_diaria')
      .update({ status: 'notificado', notificado_em: agora })
      .eq('id', falta.id)
    setFaltas(prev => prev.map(f =>
      f.id === falta.id ? { ...f, status: 'notificado', notificado_em: agora } : f,
    ))

    // 3. Abre WhatsApp do responsável
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

  const pendentes = faltas.filter(f => !f.status || f.status === 'pendente').length

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
          {/* Indicador Realtime */}
          <div className="flex items-center gap-1.5 text-xs">
            {conectado
              ? <><Wifi size={12} className="text-green-500" /><span className="text-green-600 dark:text-green-400 hidden sm:inline">Ao vivo</span></>
              : <><WifiOff size={12} className="text-gray-400" /><span className="text-gray-400 hidden sm:inline">Conectando…</span></>
            }
          </div>
          <button
            onClick={() => setExpandido(e => !e)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Lista */}
      {expandido && (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">

          {carregando && (
            <div className="py-8 flex items-center justify-center gap-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
              <span className="text-sm">Carregando faltas…</span>
            </div>
          )}

          {!carregando && faltas.length === 0 && (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2">
              <CheckCircle size={28} className="text-green-400" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma falta registrada hoje</p>
              <p className="text-xs">As faltas aparecerão aqui assim que os professores lançarem</p>
            </div>
          )}

          {!carregando && faltas.map(falta => (
            <div
              key={falta.id}
              className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-all duration-500 ${
                novas.has(falta.id)
                  ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {/* Pulse para novas faltas */}
              {novas.has(falta.id) && (
                <span className="hidden sm:flex w-2 h-2 rounded-full bg-amber-400 animate-ping absolute" />
              )}

              {/* Info do aluno */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {falta.aluno_nome}
                  </p>
                  {badgeStatus(falta.status)}
                  {novas.has(falta.id) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 animate-pulse">
                      NOVO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{falta.turma_nome}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{falta.disciplina_nome}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} />
                    {hora(falta.criado_em)}
                  </span>
                  {falta.notificado_em && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <Bell size={10} />
                        Notificado às {hora(falta.notificado_em)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Ações */}
              {!falta.status && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => justificar(falta.id)}
                    disabled={acoes[falta.id]}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle size={13} />
                    Justificar
                  </button>
                  <button
                    onClick={() => notificarResponsavel(falta)}
                    disabled={acoes[falta.id]}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 disabled:opacity-50 transition-colors"
                  >
                    <MessageCircle size={13} />
                    {falta.telefone ? 'Notificar + WhatsApp' : 'Notificar'}
                  </button>
                </div>
              )}

              {/* Ação de re-notificar se já notificou */}
              {falta.status === 'notificado' && falta.telefone && (
                <button
                  onClick={() => {
                    const tel = falta.telefone!.replace(/\D/g, '')
                    const msg =
                      `Olá ${falta.responsavel_nome ?? 'Responsável'}, ` +
                      `reiteramos que *${falta.aluno_nome}* teve uma falta registrada ` +
                      `na disciplina *${falta.disciplina_nome}*. ` +
                      `Em caso de dúvidas, entre em contato com a coordenação do Colégio Conexão Maranhense.`
                    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-colors shrink-0"
                >
                  <MessageCircle size={13} />
                  Reenviar WhatsApp
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
