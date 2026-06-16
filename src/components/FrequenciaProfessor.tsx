// src/components/FrequenciaProfessor.tsx
import { useState, useEffect, useCallback } from 'react';
import { AssistenteVoz } from './ai/AssistenteVoz';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  CheckCircle, XCircle, Loader2, Save, AlertCircle,
  Clock, LogOut, Plus, Trash2, CheckCircle2, Edit2,
  ClipboardCheck, Users,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type StatusFreq = 'presente' | 'ausente' | 'atrasado' | 'evadido';

const STATUS_CONFIG: Record<StatusFreq, {
  label: string;
  cor: string;
  icon: React.ReactNode;
}> = {
  presente: {
    label: 'Presente',
    cor: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  ausente: {
    label: 'Ausente',
    cor: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  atrasado: {
    label: 'Atrasado',
    cor: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  evadido: {
    label: 'Evadido',
    cor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700',
    icon: <LogOut className="w-3.5 h-3.5" />,
  },
};

interface RegistroAula {
  numero_aula: number;
  status: StatusFreq;
  observacao: string;
  db_id: string | null;
}

interface AlunoFrequencia {
  aluno_id: string;
  aluno_nome: string;
  aulas: RegistroAula[];
}

interface FrequenciaProfessorProps {
  disciplina: { id: string; nome: string; cor?: string; turma?: string; serie?: string };
  serie: any;
}

function formatarData(d: string) {
  if (!d) return '-';
  const [ano, mes, dia] = d.split('-');
  return `${dia}/${mes}/${ano}`;
}

function novaAula(numero: number): RegistroAula {
  return { numero_aula: numero, status: 'presente', observacao: '', db_id: null };
}

// ── Componente ────────────────────────────────────────────────────────────────
export function FrequenciaProfessor({ disciplina, serie }: FrequenciaProfessorProps) {
  const { usuario } = useAuth();

  const [loading, setLoading]               = useState(true);
  const [dataFrequencia, setDataFrequencia] = useState(new Date().toISOString().split('T')[0]);
  const [listaAlunos, setListaAlunos]       = useState<AlunoFrequencia[]>([]);
  const [turmaIdReal, setTurmaIdReal]       = useState<string | null>(null);
  const [totalAulasDia, setTotalAulasDia]  = useState(1);

  // ── Estados por aula (independentes) ──────────────────────────────────────
  const [aulasSalvas,   setAulasSalvas]   = useState<Set<number>>(new Set());
  const [aulasEmEdicao, setAulasEmEdicao] = useState<Set<number>>(new Set());
  const [salvandoAula,  setSalvandoAula]  = useState<Set<number>>(new Set());

  const serieNome = typeof serie === 'string' ? serie : serie?.nome;

  // ── Ao trocar data, reseta estados por aula ────────────────────────────────
  useEffect(() => {
    setAulasSalvas(new Set());
    setAulasEmEdicao(new Set());
  }, [dataFrequencia]);

  // ── Carrega alunos e registros existentes ─────────────────────────────────
  const carregarDados = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('users').select('id, nome')
        .eq('tipo', 'aluno').order('nome');
      if (serieNome) query = query.eq('serie', serieNome);
      const { data: alunosData, error } = await query;
      if (error) throw error;
      if (!alunosData?.length) { setListaAlunos([]); setLoading(false); return; }

      // Resolve turma_id
      if (!turmaIdReal && alunosData.length > 0) {
        const { data: vinculo } = await supabase
          .from('alunos_turmas').select('turma_id').eq('aluno_id', alunosData[0].id).maybeSingle();
        if (vinculo?.turma_id) {
          setTurmaIdReal(vinculo.turma_id);
        } else {
          const { data: turmaData } = await supabase
            .from('turmas').select('id').ilike('nome', `%${serieNome}%`).limit(1).maybeSingle();
          if (turmaData?.id) setTurmaIdReal(turmaData.id);
        }
      }

      const alunoIds = alunosData.map((a: any) => a.id);

      const { data: freqData } = await supabase
        .from('frequencia_diaria')
        .select('id, aluno_id, presente, status, numero_aula, observacao')
        .eq('disciplina_id', disciplina.id)
        .eq('data_aula', dataFrequencia)
        .in('aluno_id', alunoIds)
        .order('numero_aula');

      const freqMap = new Map<string, typeof freqData>();
      for (const f of freqData ?? []) {
        if (!freqMap.has(f.aluno_id)) freqMap.set(f.aluno_id, []);
        freqMap.get(f.aluno_id)!.push(f);
      }

      let maxAulas = 1;
      for (const registros of freqMap.values()) {
        maxAulas = Math.max(maxAulas, registros.length);
      }
      setTotalAulasDia(maxAulas);

      const lista: AlunoFrequencia[] = alunosData.map((aluno: any) => {
        const registros = freqMap.get(aluno.id) ?? [];
        const aulas: RegistroAula[] = Array.from({ length: maxAulas }, (_, i) => {
          const num = i + 1;
          const reg = registros.find((r: any) => (r.numero_aula ?? 1) === num);
          if (reg) {
            const st: StatusFreq = reg.status ?? (reg.presente ? 'presente' : 'ausente');
            return { numero_aula: num, status: st, observacao: reg.observacao ?? '', db_id: reg.id };
          }
          return novaAula(num);
        });
        return { aluno_id: aluno.id, aluno_nome: aluno.nome, aulas };
      });

      setListaAlunos(lista);

      // ── Detecta quais aulas já estão salvas no banco ──────────────────────
      const salvas = new Set<number>();
      for (let num = 1; num <= maxAulas; num++) {
        const todosTem = alunosData.every((aluno: any) => {
          const regs = freqMap.get(aluno.id) ?? [];
          return regs.some((r: any) => (r.numero_aula ?? 1) === num);
        });
        if (todosTem) salvas.add(num);
      }
      setAulasSalvas(salvas);
      // Ao recarregar, sai do modo edição para aulas que agora estão salvas
      setAulasEmEdicao(prev => {
        const nova = new Set(prev);
        salvas.forEach(n => nova.delete(n));
        return nova;
      });

    } catch {
      toast.error('Erro ao carregar lista de alunos.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, disciplina?.id, serieNome, dataFrequencia, turmaIdReal]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Adicionar / remover aula ───────────────────────────────────────────────
  const adicionarAula = () => {
    if (totalAulasDia >= 5) { toast.error('Máximo de 5 aulas por dia.'); return; }
    const novoNum = totalAulasDia + 1;
    setTotalAulasDia(novoNum);
    setListaAlunos(prev => prev.map(a => ({
      ...a, aulas: [...a.aulas, novaAula(novoNum)],
    })));
  };

  const removerUltimaAula = () => {
    if (totalAulasDia <= 1) return;
    const ultima = totalAulasDia;
    const temSalva = listaAlunos.some(a => a.aulas.find(x => x.numero_aula === ultima)?.db_id !== null);
    if (temSalva) { toast.error('Não é possível remover uma aula já salva no banco.'); return; }
    setTotalAulasDia(ultima - 1);
    setListaAlunos(prev => prev.map(a => ({ ...a, aulas: a.aulas.filter(x => x.numero_aula !== ultima) })));
  };

  // ── Atualiza status/observação de um aluno em uma aula específica ─────────
  const atualizarAula = (alunoId: string, numeroAula: number, campo: 'status' | 'observacao', valor: string) => {
    setListaAlunos(prev => prev.map(a => {
      if (a.aluno_id !== alunoId) return a;
      return { ...a, aulas: a.aulas.map(au => au.numero_aula === numeroAula ? { ...au, [campo]: valor } : au) };
    }));
  };

  const marcarTodosAula = (numeroAula: number, status: StatusFreq) => {
    setListaAlunos(prev => prev.map(a => ({
      ...a, aulas: a.aulas.map(au => au.numero_aula === numeroAula ? { ...au, status } : au),
    })));
  };

  // ── Salvar UMA aula específica ─────────────────────────────────────────────
  const handleSalvarAula = async (numeroAula: number) => {
    if (!turmaIdReal) {
      toast.error('ID da turma não identificado. Aguarde o carregamento.');
      return;
    }
    setSalvandoAula(prev => new Set(prev).add(numeroAula));
    try {
      for (const aluno of listaAlunos) {
        const aula = aluno.aulas.find(x => x.numero_aula === numeroAula);
        if (!aula) continue;

        const payload = {
          aluno_id:      aluno.aluno_id,
          disciplina_id: disciplina.id,
          turma_id:      turmaIdReal,
          data_aula:     dataFrequencia,
          numero_aula:   numeroAula,
          status:        aula.status,
          presente:      aula.status === 'presente' || aula.status === 'atrasado',
          observacao:    aula.observacao || null,
          professor_id:  usuario?.id ?? null,
        };

        if (aula.db_id) {
          const { error } = await supabase
            .from('frequencia_diaria')
            .update({ status: payload.status, presente: payload.presente, observacao: payload.observacao, professor_id: payload.professor_id })
            .eq('id', aula.db_id);
          if (error) throw error;
        } else {
          const { data: existente } = await supabase
            .from('frequencia_diaria').select('id')
            .eq('aluno_id', aluno.aluno_id).eq('disciplina_id', disciplina.id)
            .eq('data_aula', dataFrequencia).eq('numero_aula', numeroAula)
            .maybeSingle();

          if (existente?.id) {
            const { error } = await supabase
              .from('frequencia_diaria')
              .update({ status: payload.status, presente: payload.presente, observacao: payload.observacao, professor_id: payload.professor_id })
              .eq('id', existente.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('frequencia_diaria').insert(payload);
            if (error) throw error;
          }
        }
      }

      toast.success(`${numeroAula}ª aula registrada com sucesso!`);
      // Marca esta aula como salva e sai do modo edição
      setAulasSalvas(prev => new Set(prev).add(numeroAula));
      setAulasEmEdicao(prev => { const s = new Set(prev); s.delete(numeroAula); return s; });
      await carregarDados();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSalvandoAula(prev => { const s = new Set(prev); s.delete(numeroAula); return s; });
    }
  };

  // ── Contadores por aula ───────────────────────────────────────────────────
  const contagemPorAula = (numero: number) => {
    const aulas = listaAlunos.map(a => a.aulas.find(x => x.numero_aula === numero));
    return {
      presentes: aulas.filter(a => a?.status === 'presente').length,
      ausentes:  aulas.filter(a => a?.status === 'ausente').length,
      atrasados: aulas.filter(a => a?.status === 'atrasado').length,
      evadidos:  aulas.filter(a => a?.status === 'evadido').length,
    };
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">

          {/* ── Controles de data e aulas ───────────────────────────────── */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Data da Aula</Label>
                <Input type="date" value={dataFrequencia}
                  onChange={e => setDataFrequencia(e.target.value)}
                  className="w-44" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Aulas no dia: <span className="font-bold text-foreground">{totalAulasDia}</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"
                    onClick={removerUltimaAula}
                    disabled={totalAulasDia <= 1}
                    className="h-9 px-3 gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={adicionarAula}
                    disabled={totalAulasDia >= 5}
                    className="h-9 px-3 gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                    <Plus className="w-3.5 h-3.5" /> Mais uma aula
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">{listaAlunos.length} alunos</span>
            </div>
          </div>

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* ── Sem alunos ──────────────────────────────────────────────── */}
          {!loading && listaAlunos.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">Nenhum aluno encontrado para esta série.</p>
            </div>
          )}

          {/* ── Cards por aula — cada uma independente ───────────────────── */}
          {!loading && listaAlunos.length > 0 && (
            <div className="space-y-5">
              {Array.from({ length: totalAulasDia }, (_, i) => i + 1).map(num => {
                const c           = contagemPorAula(num);
                const salva       = aulasSalvas.has(num);
                const emEdicao    = aulasEmEdicao.has(num);
                const salvandoEst = salvandoAula.has(num);
                const modoExibir  = salva && !emEdicao; // exibe resumo

                return (
                  <Card key={num} className={`border-2 transition-colors ${
                    modoExibir
                      ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20'
                      : salva && emEdicao
                        ? 'border-amber-300 dark:border-amber-600'
                        : 'border-border'
                  }`}>

                    {/* ── Cabeçalho da aula ───────────────────────────────── */}
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                          {num}ª Aula
                          {modoExibir ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Registrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <Clock className="w-2.5 h-2.5" /> Pendente
                            </span>
                          )}
                        </CardTitle>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Assistente de voz — só aparece quando a aula está em edição */}
                          {!modoExibir && (
                            <AssistenteVoz
                              contexto="frequencia"
                              alunos={listaAlunos.map(a => ({ id: a.aluno_id, nome: a.nome }))}
                              labelBotao="Marcar faltas por voz"
                              onFrequencia={(ausentes, _numeroAula) => {
                                // Aplica 'ausente' para os alunos identificados nesta aula
                                ausentes.forEach(aluno => {
                                  atualizarAula(aluno.id, num, 'status', 'ausente')
                                })
                                toast.success(
                                  `${ausentes.length} falta(s) marcada(s) — revise e salve`
                                )
                              }}
                            />
                          )}

                          {/* Contadores */}
                          {[
                            { v: c.presentes, label: 'presente(s)',  cor: 'text-green-600 dark:text-green-400' },
                            { v: c.ausentes,  label: 'ausente(s)',   cor: 'text-red-500 dark:text-red-400'    },
                            { v: c.atrasados, label: 'atrasado(s)', cor: 'text-yellow-600 dark:text-yellow-400' },
                            { v: c.evadidos,  label: 'evadido(s)',  cor: 'text-orange-600 dark:text-orange-400' },
                          ].map(ct => (
                            <span key={ct.label} className={`text-xs font-semibold ${ct.cor}`}>
                              {ct.v} {ct.label}
                            </span>
                          ))}

                          {/* Botões "Marcar todos" — só no modo edição */}
                          {!modoExibir && (
                            <div className="flex gap-1 ml-2">
                              {(['presente', 'ausente'] as StatusFreq[]).map(st => (
                                <Button key={st} variant="outline" size="sm"
                                  onClick={() => marcarTodosAula(num, st)}
                                  className={`h-7 px-2 text-xs gap-1 ${
                                    st === 'presente'
                                      ? 'text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20'
                                      : 'text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20'
                                  }`}>
                                  {STATUS_CONFIG[st].icon}
                                  Todos {STATUS_CONFIG[st].label}s
                                </Button>
                              ))}
                            </div>
                          )}

                          {/* Botão Editar — só quando registrada */}
                          {modoExibir && (
                            <Button variant="outline" size="sm"
                              onClick={() => setAulasEmEdicao(prev => new Set(prev).add(num))}
                              className="h-7 px-3 text-xs gap-1.5 border-green-400 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/50">
                              <Edit2 className="w-3 h-3" /> Editar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Banner modo edição */}
                      {salva && emEdicao && (
                        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700">
                          <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
                            <strong>Editando</strong> — alterações substituirão o registro existente desta aula.
                          </p>
                          <Button variant="ghost" size="sm"
                            onClick={() => { setAulasEmEdicao(prev => { const s = new Set(prev); s.delete(num); return s; }); carregarDados(); }}
                            className="text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-xs h-6 px-2">
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardHeader>

                    {/* ── MODO EXIBIÇÃO: resumo compacto ──────────────────── */}
                    {modoExibir ? (
                      <CardContent className="p-0">
                        <div className="divide-y divide-border">
                          {listaAlunos.map((aluno, idx) => {
                            const aula = aluno.aulas.find(x => x.numero_aula === num);
                            if (!aula) return null;
                            const cfg = STATUS_CONFIG[aula.status];
                            return (
                              <div key={aluno.aluno_id}
                                className={`flex items-center gap-3 px-5 py-2.5 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground flex-shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 text-sm text-foreground">{aluno.aluno_nome}</span>
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cor}`}>
                                  {cfg.icon} {cfg.label}
                                </span>
                                {aula.observacao && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[180px] hidden sm:block">
                                    {aula.observacao}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>

                    ) : (
                    /* ── MODO EDIÇÃO: selects + observação ─────────────── */
                      <>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border">
                            {listaAlunos.map((aluno, index) => {
                              const aula = aluno.aulas.find(x => x.numero_aula === num);
                              if (!aula) return null;
                              const cfg = STATUS_CONFIG[aula.status];

                              return (
                                <div key={aluno.aluno_id}
                                  className={`flex items-center gap-3 px-5 py-3 ${index % 2 === 0 ? '' : 'bg-muted/20'}`}>
                                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <span className="flex-1 text-sm font-medium text-foreground min-w-[140px]">
                                    {aluno.aluno_nome}
                                  </span>
                                  <Select
                                    value={aula.status}
                                    onValueChange={v => atualizarAula(aluno.aluno_id, num, 'status', v)}>
                                    <SelectTrigger className={`h-8 w-36 text-xs border font-medium ${cfg.cor}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(Object.entries(STATUS_CONFIG) as [StatusFreq, typeof STATUS_CONFIG[StatusFreq]][]).map(
                                        ([val, c]) => (
                                          <SelectItem key={val} value={val}>
                                            <span className="flex items-center gap-1.5">{c.icon} {c.label}</span>
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <Textarea
                                    value={aula.observacao}
                                    onChange={e => atualizarAula(aluno.aluno_id, num, 'observacao', e.target.value)}
                                    placeholder={
                                      aula.status === 'atrasado' ? 'Motivo do atraso...' :
                                      aula.status === 'evadido'  ? 'Motivo da evasão...' :
                                      aula.status === 'ausente'  ? 'Motivo (opcional)...' : 'Observação...'
                                    }
                                    className="resize-none text-xs min-h-[32px] h-8 py-1.5 flex-1 max-w-[220px]"
                                    rows={1}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>

                        {/* ── Botão salvar desta aula ───────────────────── */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {listaAlunos.length} alunos · {formatarData(dataFrequencia)}
                          </p>
                          <Button
                            onClick={() => handleSalvarAula(num)}
                            disabled={salvandoEst}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 ml-auto">
                            {salvandoEst
                              ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                              : <><Save className="w-4 h-4" />Salvar {num}ª Aula</>}
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
