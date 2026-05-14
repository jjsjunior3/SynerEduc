// src/components/FrequenciaProfessor.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  CheckCircle, XCircle, Loader2, Save, AlertCircle,
  Clock, LogOut, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type StatusFreq = 'presente' | 'ausente' | 'atrasado' | 'evadido';

const STATUS_CONFIG: Record<StatusFreq, {
  label: string;
  cor: string;         // classes Tailwind para badge
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

// ── Registro de frequência por aula ──────────────────────────────────────────
// Cada aluno pode ter múltiplos registros no dia (um por aula ministrada)
interface RegistroAula {
  numero_aula: number;    // 1-5
  status: StatusFreq;
  observacao: string;
  db_id: string | null;   // null = ainda não salvo
}

interface AlunoFrequencia {
  aluno_id: string;
  aluno_nome: string;
  // Lista de registros de aulas do dia para este aluno
  aulas: RegistroAula[];
}

interface FrequenciaProfessorProps {
  disciplina: { id: string; nome: string; cor?: string; turma?: string; serie?: string };
  serie: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

  const [loading, setLoading]       = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [dataFrequencia, setDataFrequencia] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [listaAlunos, setListaAlunos] = useState<AlunoFrequencia[]>([]);
  const [turmaIdReal, setTurmaIdReal] = useState<string | null>(null);
  // Quantas aulas o professor ministra neste dia (padrão 1, pode adicionar até 5)
  const [totalAulasDia, setTotalAulasDia] = useState(1);

  const serieNome = typeof serie === 'string' ? serie : serie?.nome;

  // ── Carrega alunos e registros existentes ─────────────────────────────────
  const carregarDados = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id) return;
    setLoading(true);
    try {
      // Busca alunos da série
      let query = supabase
        .from('users').select('id, nome')
        .eq('tipo', 'aluno').order('nome');
      if (serieNome) query = query.eq('serie', serieNome);
      const { data: alunosData, error } = await query;
      if (error) throw error;
      if (!alunosData?.length) { setListaAlunos([]); return; }

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

      // Busca TODOS os registros do dia para essa disciplina
      // (múltiplos por aluno — um por aula)
      const { data: freqData } = await supabase
        .from('frequencia_diaria')
        .select('id, aluno_id, presente, status, numero_aula, observacao')
        .eq('disciplina_id', disciplina.id)
        .eq('data_aula', dataFrequencia)
        .in('aluno_id', alunoIds)
        .order('numero_aula');

      // Mapa: aluno_id → registros existentes
      const freqMap = new Map<string, typeof freqData>();
      for (const f of freqData ?? []) {
        if (!freqMap.has(f.aluno_id)) freqMap.set(f.aluno_id, []);
        freqMap.get(f.aluno_id)!.push(f);
      }

      // Descobre quantas aulas já foram lançadas (máximo entre alunos)
      let maxAulas = 1;
      for (const registros of freqMap.values()) {
        maxAulas = Math.max(maxAulas, registros.length);
      }
      setTotalAulasDia(maxAulas);

      // Monta lista
      const lista: AlunoFrequencia[] = alunosData.map((aluno: any) => {
        const registros = freqMap.get(aluno.id) ?? [];

        // Garante que temos maxAulas registros para cada aluno
        const aulas: RegistroAula[] = Array.from({ length: maxAulas }, (_, i) => {
          const num = i + 1;
          const reg = registros.find((r: any) => (r.numero_aula ?? 1) === num);
          if (reg) {
            // Compatibilidade: registros antigos têm status null
            const st: StatusFreq = reg.status ?? (reg.presente ? 'presente' : 'ausente');
            return { numero_aula: num, status: st, observacao: reg.observacao ?? '', db_id: reg.id };
          }
          return novaAula(num);
        });

        return { aluno_id: aluno.id, aluno_nome: aluno.nome, aulas };
      });

      setListaAlunos(lista);
    } catch {
      toast.error('Erro ao carregar lista de alunos.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, disciplina?.id, serieNome, dataFrequencia, turmaIdReal]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Adicionar mais uma aula ao dia ─────────────────────────────────────────
  const adicionarAula = () => {
    if (totalAulasDia >= 5) { toast.error('Máximo de 5 aulas por dia.'); return; }
    const novoNum = totalAulasDia + 1;
    setTotalAulasDia(novoNum);
    setListaAlunos(prev => prev.map(a => ({
      ...a,
      aulas: [...a.aulas, novaAula(novoNum)],
    })));
  };

  // ── Remover última aula (se não salva) ────────────────────────────────────
  const removerUltimaAula = () => {
    if (totalAulasDia <= 1) return;
    const ultima = totalAulasDia;
    // Verifica se algum aluno tem a última aula já salva no banco
    const temSalva = listaAlunos.some(a => {
      const aula = a.aulas.find(x => x.numero_aula === ultima);
      return aula?.db_id !== null;
    });
    if (temSalva) {
      toast.error('Não é possível remover uma aula já salva no banco.');
      return;
    }
    setTotalAulasDia(ultima - 1);
    setListaAlunos(prev => prev.map(a => ({
      ...a,
      aulas: a.aulas.filter(x => x.numero_aula !== ultima),
    })));
  };

  // ── Atualiza status/observação de um aluno em uma aula ────────────────────
  const atualizarAula = (
    alunoId: string,
    numeroAula: number,
    campo: 'status' | 'observacao',
    valor: string
  ) => {
    setListaAlunos(prev => prev.map(a => {
      if (a.aluno_id !== alunoId) return a;
      return {
        ...a,
        aulas: a.aulas.map(au =>
          au.numero_aula === numeroAula ? { ...au, [campo]: valor } : au
        ),
      };
    }));
  };

  // ── Marcar todos de uma aula ───────────────────────────────────────────────
  const marcarTodosAula = (numeroAula: number, status: StatusFreq) => {
    setListaAlunos(prev => prev.map(a => ({
      ...a,
      aulas: a.aulas.map(au =>
        au.numero_aula === numeroAula ? { ...au, status } : au
      ),
    })));
  };

  // ── Salvar frequência ─────────────────────────────────────────────────────
  const handleSalvarFrequencia = async () => {
    if (!turmaIdReal) {
      toast.error('ID da turma não identificado. Aguarde o carregamento.');
      return;
    }

    setSalvando(true);
    try {
      // Monta todos os registros para upsert
      const registros: any[] = [];

      for (const aluno of listaAlunos) {
        for (const aula of aluno.aulas) {
          const reg: any = {
            aluno_id:     aluno.aluno_id,
            disciplina_id: disciplina.id,
            turma_id:     turmaIdReal,
            data_aula:    dataFrequencia,
            numero_aula:  aula.numero_aula,
            status:       aula.status,
            // Campo legado — compatibilidade com código antigo
            presente:     aula.status === 'presente' || aula.status === 'atrasado',
            observacao:   aula.observacao || null,
            professor_id: usuario?.id ?? null,
          };
          if (aula.db_id) reg.id = aula.db_id;
          registros.push(reg);
        }
      }

      // Registros COM id → update individual (evita conflito de UNIQUE antigo)
      const comId    = registros.filter(r => r.id);
      const semId    = registros.filter(r => !r.id);

      // Updates
      for (const r of comId) {
        const { error } = await supabase
          .from('frequencia_diaria').update({
            status: r.status, presente: r.presente,
            observacao: r.observacao, professor_id: r.professor_id,
          }).eq('id', r.id);
        if (error) throw error;
      }

      // Inserts novos — usa o índice parcial novo (numero_aula IS NOT NULL)
      if (semId.length) {
        const { error } = await supabase
          .from('frequencia_diaria')
          .upsert(semId, {
            onConflict: 'aluno_id, disciplina_id, data_aula, numero_aula',
            ignoreDuplicates: false,
          });
        if (error) throw error;
      }

      toast.success(`Frequência de ${formatarData(dataFrequencia)} salva!`);
      await carregarDados();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
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

          {/* Controles de data e aulas */}
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

            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total de alunos</p>
              <p className="text-2xl font-bold text-foreground">{listaAlunos.length}</p>
            </div>
          </div>

          {/* Cards de contagem por aula */}
          {!loading && listaAlunos.length > 0 && (
            <div className="space-y-4">
              {Array.from({ length: totalAulasDia }, (_, i) => i + 1).map(num => {
                const c = contagemPorAula(num);
                return (
                  <Card key={num} className="border-border bg-muted/30">
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {num}ª Aula
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Contadores */}
                          {[
                            { label: `${c.presentes} presente(s)`,  cor: 'text-green-600 dark:text-green-400' },
                            { label: `${c.ausentes}  ausente(s)`,   cor: 'text-red-500 dark:text-red-400' },
                            { label: `${c.atrasados} atrasado(s)`,  cor: 'text-yellow-600 dark:text-yellow-400' },
                            { label: `${c.evadidos}  evadido(s)`,   cor: 'text-orange-600 dark:text-orange-400' },
                          ].map(ct => (
                            <span key={ct.label} className={`text-xs font-semibold ${ct.cor}`}>
                              {ct.label}
                            </span>
                          ))}
                          {/* Marcar todos */}
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
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {listaAlunos.map((aluno, index) => {
                          const aula = aluno.aulas.find(x => x.numero_aula === num);
                          if (!aula) return null;
                          const cfg = STATUS_CONFIG[aula.status];

                          return (
                            <div key={aluno.aluno_id}
                              className={`flex items-center gap-3 px-5 py-3 ${
                                index % 2 === 0 ? '' : 'bg-muted/20'
                              }`}>

                              {/* Número */}
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                                {index + 1}
                              </span>

                              {/* Nome */}
                              <span className="flex-1 text-sm font-medium text-foreground min-w-[140px]">
                                {aluno.aluno_nome}
                              </span>

                              {/* Select de status */}
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
                                        <span className="flex items-center gap-1.5">
                                          {c.icon} {c.label}
                                        </span>
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>

                              {/* Badge atual */}
                              <Badge className={`${cfg.cor} border text-xs hidden sm:flex items-center gap-1`}>
                                {cfg.icon} {cfg.label}
                              </Badge>

                              {/* Observação */}
                              <Textarea
                                value={aula.observacao}
                                onChange={e => atualizarAula(aluno.aluno_id, num, 'observacao', e.target.value)}
                                placeholder={
                                  aula.status === 'atrasado' ? 'Motivo do atraso...' :
                                  aula.status === 'evadido'  ? 'Observação de evasão...' :
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
                  </Card>
                );
              })}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && listaAlunos.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">Nenhum aluno encontrado para esta série.</p>
            </div>
          )}

          {/* Botão salvar */}
          {!loading && listaAlunos.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground hidden md:block">
                Registrando{' '}
                <span className="font-semibold text-foreground">{totalAulasDia}</span>{' '}
                aula(s) de{' '}
                <span className="font-semibold text-foreground">{formatarData(dataFrequencia)}</span>
                {' '}· {listaAlunos.length} alunos
              </div>
              <Button onClick={handleSalvarFrequencia} disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full md:w-auto">
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Save className="w-4 h-4" />Salvar Frequência</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}