// src/components/GestaoHorarios.tsx
import { useState, useEffect, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Save, Search, Loader2, Clock } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
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
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<Serie[]>([]);
  const [serie, setSerie] = useState('');
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [grade, setGrade] = useState<AulaGrade[]>([]);

  useEffect(() => {
    supabase.from('series').select('id, nome').order('nome')
      .then(({ data }) => { if (data) setSeriesDisponiveis(data); });
  }, []);

  const inicializarGradeVazia = () => {
    const novaGrade: AulaGrade[] = [];
    diasSemana.forEach(dia =>
      horariosPadrao.forEach(h =>
        novaGrade.push({ dia_semana: dia, ordem: h.ordem, horario_inicio: h.inicio, horario_fim: h.fim, disciplina: '', sala: '' })
      )
    );
    setGrade(novaGrade);
  };

  const carregarGrade = async () => {
    if (!serie) { toast.warning('Selecione a série primeiro.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('horarios_escolar').select('*').eq('serie', serie).eq('turma', 'A');
      if (error) throw error;
      if (data && data.length > 0) { setGrade(data); toast.success('Grade carregada!'); }
      else { inicializarGradeVazia(); toast.info('Nenhuma grade encontrada. Preencha e salve.'); }
    } catch { toast.error('Erro ao carregar grade.'); }
    finally { setLoading(false); }
  };

  const atualizarAula = (dia: string, ordem: number, campo: keyof AulaGrade, valor: string) => {
    setGrade(prev => prev.map(a =>
      a.dia_semana === dia && a.ordem === ordem ? { ...a, [campo]: valor } : a
    ));
  };

  const salvarGrade = async () => {
    if (!serie) return;
    setSalvando(true);
    try {
      await supabase.from('horarios_escolar').delete().eq('serie', serie).eq('turma', 'A');

      const dados = grade
        .filter(g => g.disciplina.trim() !== '')
        .map(({ id, ...resto }) => ({ ...resto, serie, turma: 'A', professor: '' }));

      if (!dados.length) { toast.info('Grade vazia, nada para salvar.'); setSalvando(false); return; }

      const { error } = await supabase.from('horarios_escolar').insert(dados);
      if (error) throw error;
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
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-blue-600" /> Grade Curricular
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-col md:flex-row gap-5 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-muted-foreground text-xs">Série</Label>
              <Select value={serie} onValueChange={setSerie}>
                <SelectTrigger><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                <SelectContent>
                  {seriesDisponiveis.map(s => (
                    <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={carregarGrade}
              disabled={!serie || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Buscando...</>
                : <><Search className="w-4 h-4" />Buscar Grade</>
              }
            </Button>
            {grade.length > 0 && (
              <Button
                onClick={salvarGrade}
                disabled={salvando}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Save className="w-4 h-4" />Salvar Grade</>
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela da grade */}
      {grade.length > 0 && (
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
                      {/* Intervalo visual */}
                      {index === 3 && (
                        <tr>
                          <td colSpan={6} className="py-2 text-center text-xs font-semibold"
                            style={{ backgroundColor: '#fef9c3', color: '#713f12' }}>
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

            {/* Rodapé com botão salvar */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Série: <span className="font-semibold text-foreground">{serie}</span> — Turma A
              </p>
              <Button
                onClick={salvarGrade}
                disabled={salvando}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
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