// src/components/AgendaCoordenador.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSegmento } from '../hooks/useSegmento';
import AgendaProfessores from './AgendaProfessores';

import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from './ui/select';
import {
  Calendar, ClipboardCheck, Settings2,
  CheckCircle2, XCircle, Loader2, Save,
  RefreshCw, AlertTriangle, BookOpen, GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Constantes ────────────────────────────────────────────────
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'] as const;
const ORDENS      = [1, 2, 3, 4, 5] as const;

type DiaSemana = typeof DIAS_SEMANA[number];
type AbaType   = 'acompanhar' | 'rastreio' | 'grade';

// ── Tipos ─────────────────────────────────────────────────────
interface AgendaCoordenadorProps { onVoltar: () => void; }
interface Serie      { id: string; nome: string; }
interface Professor  { id: string; nome: string; }
interface Disciplina { id: string; nome: string; }
interface GradeCell  { professor_id: string; disciplina_id: string; }
interface RastreioItem {
  professor_nome:  string;
  disciplina_nome: string;
  serie_nome:      string;
  professor_id:    string;
  disciplina_id:   string;
  lancou:          boolean;
}

// ── Helpers ───────────────────────────────────────────────────
function diaSemanaHoje(): string {
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return dias[new Date().getDay()];
}
function dataHojeISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────
export default function AgendaCoordenador({ onVoltar }: AgendaCoordenadorProps) {
  const { usuario }  = useAuth();
  const { segmento } = useSegmento();
  const [aba, setAba] = useState<AbaType>('acompanhar');

  // ── Estado: Rastreio ──────────────────────────────────────
  const [rastreio,           setRastreio]           = useState<RastreioItem[]>([]);
  const [carregandoRastreio, setCarregandoRastreio] = useState(false);
  const [filtroSerieRastreio, setFiltroSerieRastreio] = useState<string>('todas');

  // ── Estado: Grade ─────────────────────────────────────────
  const [series,           setSeries]           = useState<Serie[]>([]);
  const [professores,      setProfessores]      = useState<Professor[]>([]);
  const [disciplinas,      setDisciplinas]      = useState<Disciplina[]>([]);
  const [serieSelecionada, setSerieSelecionada] = useState<Serie | null>(null);
  const [grade,            setGrade]            = useState<Record<string, GradeCell>>({});
  const [carregandoGrade,  setCarregandoGrade]  = useState(false);
  const [salvandoGrade,    setSalvandoGrade]    = useState(false);

  // ══════════════════════════════════════════════════════════
  // ABA 2 — RASTREIO
  // ══════════════════════════════════════════════════════════
  const carregarRastreio = useCallback(async () => {
    const dia = diaSemanaHoje();
    if (dia === 'Sábado' || dia === 'Domingo') { setRastreio([]); return; }

    setCarregandoRastreio(true);
    try {
      const hoje = dataHojeISO();
      const [
        { data: gradeHoje,   error: erroGrade },
        { data: agendasHoje, error: erroAgenda },
      ] = await Promise.all([
        supabase
          .from('grade_horaria')
          .select(`
            professor_id, disciplina_id,
            series      ( nome ),
            professor:users!grade_horaria_professor_id_fkey ( nome ),
            disciplina:disciplinas ( nome )
          `)
          .eq('dia_semana', dia)
          .eq('segmento',   segmento),
        supabase
          .from('agenda_professor')
          .select('professor_id, disciplina_id, serie')
          .eq('data_aula', hoje)
          .eq('segmento',  segmento),
      ]);
      if (erroGrade)  throw erroGrade;
      if (erroAgenda) throw erroAgenda;

      // Deduplica professor + disciplina + série
      const combosMap = new Map<string, RastreioItem>();
      (gradeHoje || []).forEach((g: any) => {
        const serieNome = g.series?.nome || '';
        const key = `${g.professor_id}|${g.disciplina_id}|${serieNome}`;
        if (!combosMap.has(key)) {
          combosMap.set(key, {
            professor_id:    g.professor_id,
            professor_nome:  g.professor?.nome   || 'Professor',
            disciplina_id:   g.disciplina_id,
            disciplina_nome: g.disciplina?.nome  || 'Disciplina',
            serie_nome:      serieNome,
            lancou:          false,
          });
        }
      });

      const lancados = new Set(
        (agendasHoje || []).map(
          (a: any) => `${a.professor_id}|${a.disciplina_id}|${a.serie}`
        )
      );

      const resultado = Array.from(combosMap.values()).map(item => ({
        ...item,
        lancou: lancados.has(`${item.professor_id}|${item.disciplina_id}|${item.serie_nome}`),
      }));

      resultado.sort((a, b) => Number(a.lancou) - Number(b.lancou));
      setRastreio(resultado);
    } catch (err: any) {
      toast.error('Erro ao carregar rastreio: ' + err.message);
    } finally {
      setCarregandoRastreio(false);
    }
  }, [segmento]);

  useEffect(() => {
    if (aba === 'rastreio') carregarRastreio();
  }, [aba, carregarRastreio]);

  // ══════════════════════════════════════════════════════════
  // ABA 3 — GRADE
  // ══════════════════════════════════════════════════════════

  // Carrega séries e professores ao entrar na aba
  useEffect(() => {
    if (aba !== 'grade') return;
    async function carregar() {
      try {
        // ── SÉRIES ──────────────────────────────────────────
        // Séries EAD têm segmento='fundamental', presencial têm segmento='presencial'
        const qSeries = supabase.from('series').select('id, nome').eq('ativa', true).order('nome');
        const querySeries = segmento === 'presencial'
          ? qSeries.eq('segmento', 'presencial')
          : qSeries.neq('segmento', 'presencial');

        // ── PROFESSORES ──────────────────────────────────────
        // Professores sempre filtram por segmento 'ead' ou 'presencial'
        const queryProfs = supabase
          .from('users')
          .select('id, nome')
          .in('tipo', ['professor', 'professor_conteudista'])
          .eq('segmento', segmento)
          .eq('status', 'ativo')
          .order('nome');

        const [{ data: s, error: erroS }, { data: p, error: erroP }] =
          await Promise.all([querySeries, queryProfs]);

        if (erroS) throw erroS;
        if (erroP) throw erroP;

        setSeries(s    || []);
        setProfessores(p || []);
      } catch (err: any) {
        toast.error('Erro ao carregar dados: ' + err.message);
      }
    }
    carregar();
  }, [aba, segmento]);

  // Carrega grade + disciplinas da série selecionada
  const carregarGradeSerie = useCallback(async (serie: Serie) => {
    setCarregandoGrade(true);
    setDisciplinas([]);
    try {
      const [
        { data: gradeData,  error: erroGrade },
        { data: discData,   error: erroDisc  },
      ] = await Promise.all([
        // Grade salva para a série
        supabase
          .from('grade_horaria')
          .select('dia_semana, ordem, professor_id, disciplina_id')
          .eq('serie_id',  serie.id)
          .eq('segmento',  segmento),

        // ── DISCIPLINAS via professores_disciplinas_series ──
        // Busca apenas as disciplinas vinculadas a essa série
        supabase
          .from('professores_disciplinas_series')
          .select('disciplinas(id, nome)')
          .eq('serie_id', serie.id),
      ]);

      if (erroGrade) throw erroGrade;
      if (erroDisc)  throw erroDisc;

      // Reconstrói grade no formato local
      const novaGrade: Record<string, GradeCell> = {};
      (gradeData || []).forEach((row: any) => {
        novaGrade[`${row.dia_semana}-${row.ordem}`] = {
          professor_id:  row.professor_id  || '',
          disciplina_id: row.disciplina_id || '',
        };
      });
      setGrade(novaGrade);

      // Deduplica disciplinas (pode haver mesmo id em vínculos diferentes)
      const discMap = new Map<string, Disciplina>();
      (discData || []).forEach((row: any) => {
        const d = row.disciplinas;
        if (d?.id && !discMap.has(d.id)) {
          discMap.set(d.id, { id: d.id, nome: d.nome });
        }
      });
      const discOrdenadas = Array.from(discMap.values())
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setDisciplinas(discOrdenadas);

    } catch (err: any) {
      toast.error('Erro ao carregar grade: ' + err.message);
    } finally {
      setCarregandoGrade(false);
    }
  }, [segmento]);

  useEffect(() => {
    if (serieSelecionada) carregarGradeSerie(serieSelecionada);
    else { setGrade({}); setDisciplinas([]); }
  }, [serieSelecionada, carregarGradeSerie]);

  // Atualiza uma célula localmente
  const atualizarCelula = (
    dia: string, ordem: number,
    campo: 'professor_id' | 'disciplina_id',
    valor: string
  ) => {
    const key = `${dia}-${ordem}`;
    setGrade(prev => ({
      ...prev,
      [key]: { ...prev[key], [campo]: valor },
    }));
  };

  // Salva toda a grade (upsert + delete para células limpas)
  const salvarGrade = async () => {
    if (!serieSelecionada) return;
    setSalvandoGrade(true);
    try {
      const upserts: any[] = [];
      const deletes: { dia: string; ordem: number }[] = [];

      for (const dia of DIAS_SEMANA) {
        for (const ordem of ORDENS) {
          const key    = `${dia}-${ordem}`;
          const celula = grade[key];
          const temDados = celula?.professor_id && celula?.disciplina_id;

          if (temDados) {
            upserts.push({
              serie_id:      serieSelecionada.id,
              disciplina_id: celula.disciplina_id,
              professor_id:  celula.professor_id,
              dia_semana:    dia,
              ordem,
              segmento,
            });
          } else {
            deletes.push({ dia, ordem });
          }
        }
      }

      const ops: Promise<any>[] = [];

      if (upserts.length > 0) {
        ops.push(
          supabase
            .from('grade_horaria')
            .upsert(upserts, { onConflict: 'serie_id,dia_semana,ordem' })
        );
      }

      for (const { dia, ordem } of deletes) {
        ops.push(
          supabase
            .from('grade_horaria')
            .delete()
            .eq('serie_id',   serieSelecionada.id)
            .eq('dia_semana', dia)
            .eq('ordem',      ordem)
        );
      }

      const resultados = await Promise.all(ops);
      const erros = resultados.filter((r: any) => r.error).map((r: any) => r.error);
      if (erros.length > 0) throw erros[0];

      toast.success('Grade salva com sucesso!');
      await carregarGradeSerie(serieSelecionada);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSalvandoGrade(false);
    }
  };

  // ── Derivados do rastreio ─────────────────────────────────
  const seriesDoRastreio = ['todas', ...Array.from(new Set(rastreio.map(r => r.serie_nome).filter(Boolean))).sort()];
  const rastreioFiltrado = filtroSerieRastreio === 'todas'
    ? rastreio
    : rastreio.filter(r => r.serie_nome === filtroSerieRastreio);
  const totalLancaram  = rastreioFiltrado.filter(r =>  r.lancou).length;
  const totalPendentes = rastreioFiltrado.filter(r => !r.lancou).length;

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ── Abas ── */}
      <div className="flex gap-0 border-b border-border">
        {([
          { id: 'acompanhar', label: 'Acompanhar',       icon: <Calendar       className="w-4 h-4" /> },
          { id: 'rastreio',   label: 'Rastreio do Dia',  icon: <ClipboardCheck className="w-4 h-4" /> },
          { id: 'grade',      label: 'Configurar Grade', icon: <Settings2      className="w-4 h-4" /> },
        ] as { id: AbaType; label: string; icon: React.ReactNode }[]).map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`
              flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors
              ${aba === a.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
            `}
          >
            {a.icon}{a.label}
          </button>
        ))}
      </div>

      {/* ── ABA 1: Acompanhar ── */}
      {aba === 'acompanhar' && (
        <AgendaProfessores onVoltar={onVoltar} />
      )}

      {/* ── ABA 2: Rastreio do Dia ── */}
      {aba === 'rastreio' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-base">Rastreio de Hoje</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {diaSemanaHoje()},{' '}
                {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted capitalize">{segmento}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroSerieRastreio} onValueChange={setFiltroSerieRastreio}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Filtrar por série" />
                </SelectTrigger>
                <SelectContent>
                  {seriesDoRastreio.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s === 'todas' ? 'Todas as séries' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={carregarRastreio} disabled={carregandoRastreio} className="gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${carregandoRastreio ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Esperados hoje', value: rastreioFiltrado.length, bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300'   },
              { label: 'Lançaram ✅',    value: totalLancaram,           bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' },
              { label: 'Pendentes 🔴',   value: totalPendentes,          bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-800',     text: 'text-red-700 dark:text-red-300'     },
            ].map(c => (
              <div key={c.label} className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
                <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.text}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          {carregandoRastreio ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : rastreio.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  {['Sábado','Domingo'].includes(diaSemanaHoje())
                    ? 'Sem aulas no fim de semana.'
                    : 'Nenhuma grade configurada para hoje.'}
                </p>
                {!['Sábado','Domingo'].includes(diaSemanaHoje()) && (
                  <p className="text-xs text-muted-foreground">
                    Configure a grade na aba{' '}
                    <button className="text-blue-600 underline" onClick={() => setAba('grade')}>
                      Configurar Grade
                    </button>.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rastreioFiltrado.map((item, i) => (
                <div key={i} className={`
                  flex items-center justify-between p-4 rounded-xl border
                  ${item.lancou
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-red-50   dark:bg-red-900/10   border-red-200   dark:border-red-800'}
                `}>
                  <div className="flex items-center gap-3">
                    {item.lancou
                      ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      : <XCircle      className="w-5 h-5 text-red-500 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.professor_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.disciplina_nome}<span className="mx-1.5">·</span>{item.serie_nome}
                      </p>
                    </div>
                  </div>
                  <Badge className={`text-xs ${item.lancou
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200'
                    : 'bg-red-100   text-red-800   dark:bg-red-900/30   dark:text-red-300   border-red-200'}`}>
                    {item.lancou ? 'Lançou' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 3: Configurar Grade ── */}
      {aba === 'grade' && (
        <div className="space-y-5">

          <div>
            <h3 className="font-semibold text-foreground text-base">Configurar Grade Horária</h3>
            <p className="text-sm text-muted-foreground">
              Configure uma vez por série — será usada para rastrear os lançamentos de agenda diariamente.
            </p>
          </div>

          {/* Seletor de série + botão salvar */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Série</p>
                  <Select
                    value={serieSelecionada?.id || ''}
                    onValueChange={id => {
                      const s = series.find(x => x.id === id) || null;
                      setSerieSelecionada(s);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue placeholder="Selecione uma série..." />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                            {s.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {serieSelecionada && (
                  <Button onClick={salvarGrade} disabled={salvandoGrade} className="gap-2 sm:mt-5 w-full sm:w-auto">
                    {salvandoGrade
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                      : <><Save    className="w-4 h-4" />Salvar Grade</>
                    }
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grade 5×5 */}
          {!serieSelecionada ? (
            <Card>
              <CardContent className="py-14 text-center">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-muted-foreground text-sm">Selecione uma série para visualizar e editar a grade.</p>
              </CardContent>
            </Card>
          ) : carregandoGrade ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="p-3 text-xs font-semibold text-muted-foreground text-center w-14 border-r border-border">
                      Aula
                    </th>
                    {DIAS_SEMANA.map(dia => (
                      <th key={dia} className="p-3 text-xs font-semibold text-foreground text-center border-r border-border last:border-r-0">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ORDENS.map(ordem => (
                    <tr key={ordem} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-center border-r border-border">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                          {ordem}º
                        </span>
                      </td>

                      {DIAS_SEMANA.map(dia => {
                        const key    = `${dia}-${ordem}`;
                        const celula = grade[key] || { professor_id: '', disciplina_id: '' };
                        const temAmbos = !!(celula.professor_id && celula.disciplina_id);

                        return (
                          <td key={dia} className="p-2 border-r border-border last:border-r-0 align-top">
                            <div className={`space-y-1.5 min-w-[170px] p-1 rounded-lg transition-colors ${temAmbos ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>

                              {/* Disciplina — filtrada pela série */}
                              <Select
                                value={celula.disciplina_id || '__vazio__'}
                                onValueChange={val =>
                                  atualizarCelula(dia, ordem, 'disciplina_id', val === '__vazio__' ? '' : val)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Disciplina" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__vazio__">
                                    <span className="text-muted-foreground">— Disciplina —</span>
                                  </SelectItem>
                                  {disciplinas.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Professor — filtrado por segmento */}
                              <Select
                                value={celula.professor_id || '__vazio__'}
                                onValueChange={val =>
                                  atualizarCelula(dia, ordem, 'professor_id', val === '__vazio__' ? '' : val)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Professor" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__vazio__">
                                    <span className="text-muted-foreground">— Professor —</span>
                                  </SelectItem>
                                  {professores.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legenda */}
          {serieSelecionada && !carregandoGrade && (
            <div className="flex items-start gap-2 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Células em <strong>azul claro</strong> já têm professor e disciplina configurados.
                Células em branco serão <strong>removidas</strong> da grade ao salvar.
                Configure todas as séries antes de usar o rastreio diário.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}