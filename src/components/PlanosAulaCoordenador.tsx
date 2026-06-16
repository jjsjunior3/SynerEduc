// src/components/PlanosAulaCoordenador.tsx
// Painel da coordenação: acompanhar entregas de planos, configurar periodicidade, notificar professores

import { useState, useEffect } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import {
  Settings, Bell, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Eye, RefreshCw, Loader2,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Periodicidade = 'semanal' | 'mensal'
type StatusPlano = 'rascunho' | 'entregue' | 'aprovado' | 'atrasado'

interface PlanoResumo {
  id: string
  professor_id: string
  professor_nome: string
  disciplina_nome: string
  turma_nome: string
  serie_nome: string
  periodo_inicio: string
  periodo_fim: string
  status: StatusPlano
  entregue_em: string | null
  obs_coord: string | null
  total_dias: number
}

interface DiaPlano {
  id: string
  data_aula: string
  tema: string
  tipo: string | null
  recursos: string | null
  ia_usada: boolean
  plano_gerado: Record<string, unknown> | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodoBounds(periodicidade: Periodicidade) {
  const hoje = new Date()
  if (periodicidade === 'semanal') {
    const dow = hoje.getDay()
    const diff = dow === 0 ? -6 : 1 - dow
    const seg = new Date(hoje); seg.setDate(hoje.getDate() + diff)
    const sex = new Date(seg);  sex.setDate(seg.getDate() + 4)
    return { inicio: seg.toISOString().split('T')[0], fim: sex.toISOString().split('T')[0] }
  } else {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    return { inicio: ini.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] }
  }
}

function formatarData(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatarPeriodo(ini: string, fim: string, p: Periodicidade) {
  if (p === 'semanal') return `${formatarData(ini)} a ${formatarData(fim)}`
  return new Date(ini + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const STATUS_CONFIG: Record<StatusPlano, { label: string; cls: string; icon: React.ReactNode }> = {
  rascunho: { label: 'Rascunho',  cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
  entregue: { label: 'Entregue',  cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',   icon: <CheckCircle2 className="w-3 h-3" /> },
  aprovado: { label: 'Aprovado',  cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle2 className="w-3 h-3" /> },
  atrasado: { label: 'Atrasado',  cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',    icon: <AlertCircle className="w-3 h-3" /> },
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PlanosAulaCoordenadorProps {
  segmento: string
}

export function PlanosAulaCoordenador({ segmento }: PlanosAulaCoordenadorProps) {
  const [aba, setAba]                   = useState<'planos' | 'config'>('planos')
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('semanal')
  const [configId, setConfigId]         = useState<string | null>(null)
  const [periodo, setPeriodo]           = useState(getPeriodoBounds('semanal'))
  const [planos, setPlanos]             = useState<PlanoResumo[]>([])
  const [carregando, setCarregando]     = useState(true)
  const [expandido, setExpandido]       = useState<string | null>(null)
  const [diasExpandido, setDiasExpandido] = useState<DiaPlano[]>([])
  const [carregandoDias, setCarregandoDias] = useState(false)
  const [notifMsg, setNotifMsg]         = useState<Record<string, string>>({})
  const [enviandoNotif, setEnviandoNotif] = useState<string | null>(null)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [msgSucesso, setMsgSucesso]     = useState<string | null>(null)

  useEffect(() => { carregarConfig() }, [segmento])
  useEffect(() => { if (periodicidade) carregarPlanos() }, [periodicidade, segmento])

  async function carregarConfig() {
    const { data } = await supabase
      .from('plano_aula_config')
      .select('id, periodicidade')
      .eq('segmento', segmento || 'presencial')
      .maybeSingle()

    if (data) {
      setConfigId(data.id)
      const p = data.periodicidade as Periodicidade
      setPeriodicidade(p)
      setPeriodo(getPeriodoBounds(p))
    }
  }

  async function carregarPlanos() {
    setCarregando(true)
    const per = getPeriodoBounds(periodicidade)
    setPeriodo(per)

    // Busca planos do período atual com joins
    const { data } = await supabase
      .from('planos_aula')
      .select(`
        id, professor_id, status, entregue_em, obs_coord, periodo_inicio, periodo_fim,
        users!planos_aula_professor_id_fkey (nome),
        disciplinas!planos_aula_disciplina_id_fkey (nome),
        turmas!planos_aula_turma_id_fkey (nome, series(nome)),
        planos_aula_dias (id)
      `)
      .eq('periodo_inicio', per.inicio)
      .order('status')

    setPlanos((data ?? []).map((p: any) => ({
      id:              p.id,
      professor_id:    p.professor_id,
      professor_nome:  p.users?.nome ?? '—',
      disciplina_nome: p.disciplinas?.nome ?? '—',
      turma_nome:      p.turmas?.nome ?? '—',
      serie_nome:      p.turmas?.series?.nome ?? '—',
      periodo_inicio:  p.periodo_inicio,
      periodo_fim:     p.periodo_fim,
      status:          p.status as StatusPlano,
      entregue_em:     p.entregue_em ?? null,
      obs_coord:       p.obs_coord ?? null,
      total_dias:      (p.planos_aula_dias ?? []).length,
    })))
    setCarregando(false)
  }

  async function verDias(planoId: string) {
    if (expandido === planoId) { setExpandido(null); return }
    setExpandido(planoId)
    setCarregandoDias(true)
    const { data } = await supabase
      .from('planos_aula_dias')
      .select('id, data_aula, tema, tipo, recursos, ia_usada, plano_gerado')
      .eq('plano_id', planoId)
      .order('data_aula')
    setDiasExpandido(data ?? [])
    setCarregandoDias(false)
  }

  async function aprovar(planoId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('planos_aula').update({
      status: 'aprovado', aprovado_em: new Date().toISOString(), aprovado_por: user?.id,
    }).eq('id', planoId)
    setPlanos(prev => prev.map(p => p.id === planoId ? { ...p, status: 'aprovado' } : p))
    setMsgSucesso('Plano aprovado!'); setTimeout(() => setMsgSucesso(null), 3000)
  }

  async function notificar(plano: PlanoResumo) {
    const msg = notifMsg[plano.id] || `Olá! Seu plano de aula (${plano.disciplina_nome} · ${plano.serie_nome} ${plano.turma_nome}) está pendente de entrega para o período ${formatarPeriodo(plano.periodo_inicio, plano.periodo_fim, periodicidade)}.`
    setEnviandoNotif(plano.id)

    // Salva obs_coord no plano
    await supabase.from('planos_aula').update({ obs_coord: msg }).eq('id', plano.id)

    // Cria notificação no painel do professor
    await supabase.from('notificacoes').insert({
      user_id: plano.professor_id,
      titulo:  'Plano de Aula — Pendente',
      mensagem: msg,
      tipo:    'aviso',
      lida:    false,
    })

    setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, obs_coord: msg } : p))
    setMsgSucesso('Notificação enviada ao professor!')
    setTimeout(() => setMsgSucesso(null), 3000)
    setEnviandoNotif(null)
  }

  async function salvarConfig() {
    setSalvandoConfig(true)
    if (configId) {
      await supabase.from('plano_aula_config').update({ periodicidade, atualizado_em: new Date().toISOString() }).eq('id', configId)
    } else {
      await supabase.from('plano_aula_config').insert({ segmento: segmento || 'presencial', periodicidade })
    }
    setPeriodo(getPeriodoBounds(periodicidade))
    await carregarPlanos()
    setMsgSucesso('Configuração salva!')
    setTimeout(() => setMsgSucesso(null), 3000)
    setSalvandoConfig(false)
    setAba('planos')
  }

  // Estatísticas
  const totalEsperado = planos.length
  const entregues = planos.filter(p => p.status === 'entregue' || p.status === 'aprovado').length
  const aprovados = planos.filter(p => p.status === 'aprovado').length
  const pendentes = planos.filter(p => p.status === 'rascunho' || p.status === 'atrasado').length

  return (
    <div className="space-y-5">
      {/* Header + abas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <div className="w-1 h-6 bg-indigo-500 rounded-full" />
            Planos de Aula · {formatarPeriodo(periodo.inicio, periodo.fim, periodicidade)}
          </h2>
          <p className="text-sm text-muted-foreground ml-3">Periodicidade: {periodicidade}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={carregarPlanos}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant={aba === 'planos' ? 'default' : 'outline'} onClick={() => setAba('planos')}>
            Acompanhamento
          </Button>
          <Button size="sm" variant={aba === 'config' ? 'default' : 'outline'} onClick={() => setAba('config')}>
            <Settings className="w-4 h-4 mr-1.5" /> Configurar
          </Button>
        </div>
      </div>

      {msgSucesso && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" /> {msgSucesso}
        </div>
      )}

      {/* ── Aba configuração ── */}
      {aba === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração de Periodicidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Define se os professores devem entregar o plano semanalmente ou mensalmente.
              Ao alterar, a mudança vale para o próximo período.
            </p>
            <div className="flex gap-3">
              {(['semanal', 'mensal'] as Periodicidade[]).map(p => (
                <button key={p} onClick={() => setPeriodicidade(p)}
                  className={`flex-1 py-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    periodicidade === p
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-border text-muted-foreground hover:border-indigo-300'
                  }`}>
                  {p === 'semanal' ? '📅 Semanal' : '🗓️ Mensal'}
                  <p className="text-xs font-normal mt-1 opacity-70">
                    {p === 'semanal' ? 'Professor entrega toda segunda-feira' : 'Professor entrega todo dia 1º do mês'}
                  </p>
                </button>
              ))}
            </div>
            {periodicidade === 'mensal' && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-sm text-amber-800 dark:text-amber-300">
                <strong>Plano mensal:</strong> o professor precisa preencher uma entrada para cada dia de aula no mês.
                Ex: 3 aulas/semana → ~12 entradas por disciplina/turma.
              </div>
            )}
            <Button onClick={salvarConfig} disabled={salvandoConfig}>
              {salvandoConfig ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar configuração'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Aba acompanhamento ── */}
      {aba === 'planos' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total esperado', value: totalEsperado, cls: 'text-foreground' },
              { label: 'Entregues', value: entregues, cls: 'text-blue-600 dark:text-blue-400' },
              { label: 'Aprovados', value: aprovados, cls: 'text-green-600 dark:text-green-400' },
              { label: 'Pendentes', value: pendentes, cls: 'text-red-600 dark:text-red-400' },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {carregando ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando planos...
            </div>
          ) : planos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum plano registrado para este período ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {planos.map(plano => {
                const st = STATUS_CONFIG[plano.status]
                const isExp = expandido === plano.id
                return (
                  <Card key={plano.id} className={`transition-all ${plano.status === 'atrasado' ? 'border-red-200 dark:border-red-800' : ''}`}>
                    <CardContent className="pt-4 pb-4">
                      {/* Linha principal */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                              {st.icon} {st.label}
                            </span>
                            {plano.obs_coord && (
                              <span className="text-xs text-amber-600 dark:text-amber-400">⚠ Notificado</span>
                            )}
                          </div>
                          <p className="font-semibold text-foreground text-sm">
                            {plano.professor_nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {plano.disciplina_nome} · {plano.serie_nome} {plano.turma_nome}
                            {plano.total_dias > 0 && ` · ${plano.total_dias} dias planejados`}
                          </p>
                          {plano.entregue_em && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Entregue em {new Date(plano.entregue_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {plano.status === 'entregue' && (
                            <Button size="sm" variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => aprovar(plano.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Aprovar
                            </Button>
                          )}
                          {(plano.status === 'rascunho' || plano.status === 'atrasado') && (
                            <Button size="sm" variant="outline"
                              className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              disabled={enviandoNotif === plano.id}
                              onClick={() => notificar(plano)}>
                              {enviandoNotif === plano.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <><Bell className="w-3.5 h-3.5 mr-1.5" /> Notificar</>
                              }
                            </Button>
                          )}
                          {plano.total_dias > 0 && (
                            <Button size="sm" variant="ghost" onClick={() => verDias(plano.id)}>
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              {isExp ? 'Fechar' : 'Ver plano'}
                              {isExp ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Mensagem de notificação customizável */}
                      {(plano.status === 'rascunho' || plano.status === 'atrasado') && (
                        <div className="mt-3">
                          <input type="text"
                            placeholder="Mensagem para o professor (opcional — deixe em branco para usar a padrão)"
                            value={notifMsg[plano.id] ?? ''}
                            onChange={e => setNotifMsg(prev => ({ ...prev, [plano.id]: e.target.value }))}
                            className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                      )}

                      {/* Dias expandidos */}
                      {isExp && (
                        <div className="mt-4 space-y-2">
                          {carregandoDias ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Carregando dias...
                            </div>
                          ) : diasExpandido.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum dia registrado.</p>
                          ) : (
                            diasExpandido.map(dia => (
                              <div key={dia.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border text-sm">
                                <div className="text-xs font-mono text-muted-foreground w-16 flex-shrink-0 pt-0.5">
                                  {new Date(dia.data_aula + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">{dia.tema}</p>
                                  {dia.tipo && <p className="text-xs text-muted-foreground">{dia.tipo}</p>}
                                  {dia.recursos && <p className="text-xs text-muted-foreground">{dia.recursos}</p>}
                                </div>
                                {dia.ia_usada && (
                                  <span className="text-xs text-indigo-500 flex-shrink-0">✨ IA</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PlanosAulaCoordenador
