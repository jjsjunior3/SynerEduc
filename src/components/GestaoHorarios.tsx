// src/components/GestaoHorarios.tsx
import { useState, useEffect, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Save, Loader2, Clock } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';
import { toast } from 'sonner';

interface GestaoHorarioProps { onVoltar: () => void; }

interface AulaGrade {
  id?: string;
  dia_semana: string;
  ordem: number;
  horario_inicio: string;
  horario_fim: string;
  disciplina: string;
  sala: string;
}

interface Serie { id: string; nome: string; }

const horariosPadrao = [
  { ordem: 1, inicio: '07:35', fim: '08:25' },
  { ordem: 2, inicio: '08:25', fim: '09:15' },
  { ordem: 3, inicio: '09:15', fim: '10:05' },
  { ordem: 4, inicio: '10:20', fim: '11:10' },
  { ordem: 5, inicio: '11:10', fim: '12:00' },
];

const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export default function GestaoHorario({ onVoltar }: GestaoHorarioProps) {
  const { segmento, turno } = useSegmento();

  const [seriesDisponiveis, setSeriesDisponiveis] = useState<Serie[]>([]);
  const [serie, setSerie] = useState('');
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [grade, setGrade] = useState<AulaGrade[]>([]);
  const [gradeOriginal, setGradeOriginal] = useState<AulaGrade[]>([]);

  // Computed: true apenas quando há diferença real em relação ao banco
  const houveMudanca = JSON.stringify(grade) !== JSON.stringify(gradeOriginal);

  // ── Carrega séries filtradas pelo segmento ──
  // Migration rodada em 2026-05-28:
  //   UPDATE series SET segmento = 'ead' WHERE segmento = 'fundamental';
  // Workaround segmentoBanco removido — banco usa 'ead'/'presencial' diretamente.
  useEffect(() => {
    if (!segmento) return;

    supabase
      .from('series')
      .select('id, nome')
      .eq('segmento', segmento)
      .eq('ativa', true)
      .order('nome')
      .then(({ data }) => { if (data) setSeriesDisponiveis(data); });
  }, [segmento]);

  // ── Auto-carrega grade quando série muda ──
  useEffect(() => {
    if (!serie) {
      setGrade([]);
      setGradeOriginal([]);
      return;
    }
    carregarGrade();
  }, [serie]); // eslint-disable-line react-hooks/exhaustive-deps

  const inicializarGradeVazia = (): AulaGrade[] => {
    const novaGrade: AulaGrade[] = [];
    diasSemana.forEach(dia =>
      horariosPadrao.forEach(h =>
        novaGrade.push({
          dia_semana: dia, ordem: h.ordem,
          horario_inicio: h.inicio, horario_fim: h.fim,
          disciplina: '', sala: '',
        })
      )
    );
    return novaGrade;
  };

  const carregarGrade = async () => {
    // horarios_escolar já usa segmento correto ('ead'/'presencial') — sem conversão
    setLoading(true);
    setGrade([]);
    setGradeOriginal([]);
    try {
      let query = supabase
        .from('horarios_escolar')
        .select('*')
        .eq('serie', serie)
        .eq('segmento', segmento);

      if (turno) query = query.eq('turno', turno);

      const { data, error } = await query;
      if (error) throw error;

      const gradeCompleta = inicializarGradeVazia();
      if (data && data.length > 0) {
        const gradePreenchida = gradeCompleta.map(celula => {
          const salva = data.find(
            d => d.dia_semana === celula.dia_semana && Number(d.ordem) === celula.ordem
          );
          return salva ? { ...celula, ...salva, ordem: celula.ordem } : celula;
        });
        setGrade(gradePreenchida);
        setGradeOriginal(gradePreenchida);
        toast.success('Grade carregada!');
      } else {
        setGrade(gradeCompleta);
        setGradeOriginal(gradeCompleta);
        toast.info('Nenhuma grade encontrada. Preencha e salve.');
      }
    } catch { toast.error('Erro ao carregar grade.'); }
    finally { setLoading(false); }
  };

  const atualizarAula = (dia: string, ordem: number, campo: keyof AulaGrade, valor: string) => {
    setGrade(prev => prev.map(a =>
      a.dia_semana === dia && a.ordem === ordem ? { ...a, [campo]: valor } : a
    ));
  };

  const salvarGrade = async () => {
    if (!serie || !houveMudanca) return;
    setSalvando(true);
    try {
      // horarios_escolar usa segmento direto ('ead'/'presencial') — sem conversão
      let deleteQuery = supabase
        .from('horarios_escolar')
        .delete()
        .eq('serie', serie)
        .eq('segmento', segmento);

      if (turno) deleteQuery = deleteQuery.eq('turno', turno);
      await deleteQuery;

      const dados = grade
        .filter(g => g.disciplina.trim() !== '')
        .map(({ id, ...resto }) => ({
          ...resto,
          serie,
          turma: 'A',
          professor: '',
          segmento,
          turno: turno || null,
        }));

      if (!dados.length) {
        toast.info('Grade vazia, nada para salvar.');
        setSalvando(false);
        return;
      }

      const { error } = await supabase.from('horarios_escolar').insert(dados);
      if (error) throw error;

      setGradeOriginal([...grade]); // zera houveMudanca
      toast.success('Horário salvo com sucesso!');
    } catch { toast.error('Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const getAula = (dia: string, ordem: number) =>
    grade.find(g => g.dia_semana === dia && g.ordem === ordem) || { disciplina: '', sala: '' };

  return (
    <div className="space-y-6">

      {/* Seletor de série */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-blue-600" /> Grade Curricular
            </CardTitle>
            <div className="flex gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium border
                bg-blue-100 text-blue-800 border-blue-300
                dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700 capitalize">
                {segmento}
              </span>
              {turno && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium border
                  bg-muted text-muted-foreground border-border capitalize">
                  {turno}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-col md:flex-row gap-5 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-muted-foreground text-xs">Série</Label>
              <Select value={serie} onValueChange={setSerie}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série para carregar a grade" />
                </SelectTrigger>
                <SelectContent>
                  {seriesDisponiveis.length === 0 ? (
                    <SelectItem value="_vazio" disabled>Nenhuma série cadastrada</SelectItem>
                  ) : (
                    seriesDisponiveis.map(s => (
                      <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {grade.length > 0 && (
              <Button
                onClick={salvarGrade}
                disabled={!houveMudanca || salvando}
                className="bg-green-600 hover:bg-green-700 text-white gap-2
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Save className="w-4 h-4" />Salvar Grade</>
                }
              </Button>
            )}
          </div>

          {/* Feedback de estado */}
          {serie && !loading && grade.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {houveMudanca
                ? '⚠️ Há alterações não salvas.'
                : '✅ Grade sincronizada com o banco.'}
            </p>
          )}
          {serie && loading && (
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Carregando grade...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabela da grade */}
      {grade.length > 0 && !loading && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-6 text-left text-sm font-semibold text-foreground bg-muted/50 w-28">
                      Horário
                    </th>
                    {diasSemana.map(dia => (
                      <th key={dia} className="py-4 px-3 text-center text-sm font-semibold text-foreground bg-muted/50 border-l border-border">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horariosPadrao.map((h, index) => (
                    <Fragment key={h.ordem}>
                      {index === 3 && (
                        <tr>
                          <td colSpan={6} className="py-2 text-center text-xs font-semibold
                            bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200">
                            INTERVALO — 10:05 às 10:20
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 bg-muted/30">
                          <p className="text-sm font-semibold text-foreground">{h.inicio}</p>
                          <p className="text-xs text-muted-foreground">às {h.fim}</p>
                        </td>
                        {diasSemana.map(dia => {
                          const aula = getAula(dia, h.ordem);
                          return (
                            <td key={dia} className="py-3 px-2 border-l border-border">
                              <Input
                                placeholder="Disciplina"
                                className="h-9 text-sm text-center"
                                value={aula.disciplina}
                                onChange={e => atualizarAula(dia, h.ordem, 'disciplina', e.target.value)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Série: <span className="font-semibold text-foreground">{serie}</span>
                {' '}— Turma A
                {' '}— <span className="capitalize">{segmento}</span>
                {turno ? ` — ${turno}` : ''}
              </p>
              <Button
                onClick={salvarGrade}
                disabled={!houveMudanca || salvando}
                className="bg-green-600 hover:bg-green-700 text-white gap-2
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Save className="w-4 h-4" />Salvar Grade</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}