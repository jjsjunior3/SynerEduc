// src/components/HorarioEscolar.tsx
import { useState, useEffect, Fragment } from 'react';
import { Button } from './ui/button';
import { Calendar, Clock, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Usuario } from '../types/auth';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';

interface HorarioAula {
  id: string;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  disciplina: string;
  professor: string;
  sala: string;
}

interface HorarioEscolarProps {
  className?: string;
  usuario?: Usuario;
  turmaSelecionada?: string;
  onVoltar?: () => void;
}

// Cores por disciplina — classes Tailwind com variantes dark
const coresDisciplinas: Record<string, { bg: string; text: string; border: string }> = {
  'Matemática':         { bg: 'bg-blue-100 dark:bg-blue-900/40',    text: 'text-blue-900 dark:text-blue-200',   border: 'border-blue-300 dark:border-blue-700'   },
  'Português':          { bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-900 dark:text-red-200',     border: 'border-red-300 dark:border-red-700'     },
  'História':           { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-900 dark:text-amber-200', border: 'border-amber-300 dark:border-amber-700' },
  'Geografia':          { bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-900 dark:text-orange-200',border: 'border-orange-300 dark:border-orange-700'},
  'Ciências':           { bg: 'bg-emerald-100 dark:bg-emerald-900/40',text: 'text-emerald-900 dark:text-emerald-200',border: 'border-emerald-300 dark:border-emerald-700'},
  'Inglês':             { bg: 'bg-violet-100 dark:bg-violet-900/40',text: 'text-violet-900 dark:text-violet-200',border: 'border-violet-300 dark:border-violet-700'},
  'Arte':               { bg: 'bg-pink-100 dark:bg-pink-900/40',    text: 'text-pink-900 dark:text-pink-200',   border: 'border-pink-300 dark:border-pink-700'   },
  'Ed. Física':         { bg: 'bg-stone-100 dark:bg-stone-800/60',  text: 'text-stone-800 dark:text-stone-200', border: 'border-stone-300 dark:border-stone-600' },
  'Educação Física':    { bg: 'bg-stone-100 dark:bg-stone-800/60',  text: 'text-stone-800 dark:text-stone-200', border: 'border-stone-300 dark:border-stone-600' },
  'Biologia':           { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-900 dark:text-green-200', border: 'border-green-300 dark:border-green-700' },
  'Física':             { bg: 'bg-sky-100 dark:bg-sky-900/40',      text: 'text-sky-900 dark:text-sky-200',     border: 'border-sky-300 dark:border-sky-700'     },
  'Química':            { bg: 'bg-lime-100 dark:bg-lime-900/40',    text: 'text-lime-900 dark:text-lime-200',   border: 'border-lime-300 dark:border-lime-700'   },
  'Filosofia':          { bg: 'bg-purple-100 dark:bg-purple-900/40',text: 'text-purple-900 dark:text-purple-200',border: 'border-purple-300 dark:border-purple-700'},
  'Sociologia':         { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',text: 'text-fuchsia-900 dark:text-fuchsia-200',border: 'border-fuchsia-300 dark:border-fuchsia-700'},
  'Gramática':          { bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-900 dark:text-orange-200',border: 'border-orange-300 dark:border-orange-700'},
  'Literatura':         { bg: 'bg-yellow-100 dark:bg-yellow-900/40',text: 'text-yellow-900 dark:text-yellow-200',border: 'border-yellow-300 dark:border-yellow-700'},
  'Redação':            { bg: 'bg-cyan-100 dark:bg-cyan-900/40',    text: 'text-cyan-900 dark:text-cyan-200',   border: 'border-cyan-300 dark:border-cyan-700'   },
  'Produção de Texto':  { bg: 'bg-cyan-100 dark:bg-cyan-900/40',    text: 'text-cyan-900 dark:text-cyan-200',   border: 'border-cyan-300 dark:border-cyan-700'   },
};

const corPadrao = {
  bg: 'bg-indigo-100 dark:bg-indigo-900/40',
  text: 'text-indigo-900 dark:text-indigo-200',
  border: 'border-indigo-300 dark:border-indigo-700',
};

function getCorDisciplina(disciplina?: string) {
  if (!disciplina) return corPadrao;
  return coresDisciplinas[disciplina] || corPadrao;
}

export default function HorarioEscolar({ className, usuario, turmaSelecionada, onVoltar }: HorarioEscolarProps) {
  const { segmento, turno } = useSegmento();

  const [horarios, setHorarios] = useState<HorarioAula[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  const diasOrdem = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const serieAlvo = turmaSelecionada || usuario?.serie;
  const horariosUnicos = Array.from(
    new Set(horarios.map(h => `${h.horario_inicio} - ${h.horario_fim}`))
  ).sort();

  useEffect(() => {
    if (serieAlvo) carregarHorario();
  }, [serieAlvo, segmento, turno]);

  const carregarHorario = async () => {
    if (!serieAlvo) return;
    try {
      setLoading(true);
      setError('');
      const termoBusca = serieAlvo.split('-')[0].trim();

      let query = supabase
        .from('horarios_escolar')
        .select('*')
        .ilike('serie', `%${termoBusca}%`)
        .eq('segmento', segmento);          // ← filtro por segmento

      if (turno) {
        query = query.eq('turno', turno);   // ← filtro por turno (quando disponível)
      }

      query = query.order('ordem', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setHorarios(data || []);
    } catch {
      setError('Não foi possível carregar o horário escolar.');
    } finally {
      setLoading(false);
    }
  };

  const getDisciplinaDoDia = (horarioLabel: string, dia: string) => {
    const [inicio] = horarioLabel.split(' - ');
    return horarios.find(h => h.dia_semana === dia && h.horario_inicio.startsWith(inicio));
  };

  if (!serieAlvo) return null;

  return (
    <div className={`space-y-6 ${className || ''}`}>

      {/* ══ MOBILE: Cards por dia da semana (< md) ══ */}
      {!loading && !error && horarios.length > 0 && (
        <div className="md:hidden space-y-3">
          {diasOrdem.map(dia => {
            const aulasDoDia = horariosUnicos
              .map(h => ({ horario: h, aula: getDisciplinaDoDia(h, dia) }))
              .filter(item => item.aula);
            const isOpen = diaAberto === dia;

            return (
              <div key={dia} className="bg-card rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setDiaAberto(isOpen ? null : dia)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{dia}</p>
                      <p className="text-xs text-muted-foreground">{aulasDoDia.length} {aulasDoDia.length === 1 ? 'aula' : 'aulas'}</p>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    {aulasDoDia.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Sem aulas neste dia</p>
                    ) : (
                      aulasDoDia.map((item, idx) => {
                        const cor = getCorDisciplina(item.aula?.disciplina);
                        return (
                          <div
                            key={idx}
                            className={`rounded-lg p-3 border flex items-center gap-3 ${cor.bg} ${cor.border}`}
                          >
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap min-w-[70px]">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {item.horario.split(' - ')[0]}
                            </div>
                            <div className="flex-1">
                              <p className={`font-bold text-xs ${cor.text}`}>{item.aula?.disciplina}</p>
                              {item.aula?.professor && (
                                <p className={`text-[10px] opacity-70 ${cor.text}`}>{item.aula.professor}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ DESKTOP: Tabela (>= md) ══ */}
      <div className="hidden md:block bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-6 m-4 rounded-md">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        ) : horarios.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum horário encontrado para <strong>{serieAlvo}</strong>.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="p-4 text-left font-semibold text-muted-foreground w-36">
                    Horário
                  </th>
                  {diasOrdem.map(dia => (
                    <th
                      key={dia}
                      className="p-4 text-center font-semibold text-muted-foreground border-l border-border"
                    >
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horariosUnicos.map((horarioLabel, idx) => (
                  <Fragment key={idx}>
                    {idx === 3 && (
                      <tr className="border-b border-border">
                        <td
                          colSpan={6}
                          className="p-2 text-center text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                        >
                          INTERVALO — RECREIO
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-muted-foreground bg-muted/20 whitespace-nowrap border-r border-border text-xs">
                        {horarioLabel}
                      </td>
                      {diasOrdem.map(dia => {
                        const aula = getDisciplinaDoDia(horarioLabel, dia);
                        const cor = getCorDisciplina(aula?.disciplina);
                        return (
                          <td key={dia} className="p-2 border-l border-border align-top h-24 w-1/5">
                            {aula ? (
                              <div
                                className={`h-full p-3 rounded-md flex flex-col justify-center items-center text-center gap-1 shadow-sm border ${cor.bg} ${cor.border}`}
                              >
                                <div className={`font-bold leading-tight text-xs ${cor.text}`}>
                                  {aula.disciplina}
                                </div>
                                {aula.professor && (
                                  <div className={`text-[10px] opacity-80 ${cor.text}`}>
                                    {aula.professor}
                                  </div>
                                )}
                                {aula.sala && (
                                  <div className={`text-[9px] mt-1 pt-1 w-full opacity-60 border-t ${cor.border} ${cor.text}`}>
                                    Sala {aula.sala}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted-foreground opacity-30 text-lg">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loading e erro para mobile */}
      <div className="md:hidden">
        {loading && (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-6 rounded-md">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}
        {!loading && !error && horarios.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum horário encontrado para <strong>{serieAlvo}</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
}