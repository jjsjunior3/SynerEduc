import { useState, useEffect, Fragment } from 'react';
import { Button } from './ui/button';
import { Calendar, Clock, Loader2, AlertTriangle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Usuario } from '../types/auth';
import { supabase } from '../supabase/supabaseClient';

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

const coresDisciplinas: Record<string, { bg: string; text: string; border: string }> = {
  'Matemática':        { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },
  'Português':         { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' },
  'História':          { bg: '#fef3c7', text: '#78350f', border: '#fcd34d' },
  'Geografia':         { bg: '#ffedd5', text: '#7c2d12', border: '#fdba74' },
  'Ciências':          { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
  'Inglês':            { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd' },
  'Arte':              { bg: '#fce7f3', text: '#831843', border: '#f9a8d4' },
  'Ed. Física':        { bg: '#f5f5f4', text: '#292524', border: '#d6d3d1' },
  'Educação Física':   { bg: '#f5f5f4', text: '#292524', border: '#d6d3d1' },
  'Biologia':          { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  'Física':            { bg: '#e0f2fe', text: '#0c4a6e', border: '#7dd3fc' },
  'Química':           { bg: '#f0fdf4', text: '#14532d', border: '#86efac' },
  'Filosofia':         { bg: '#f5f3ff', text: '#4c1d95', border: '#ddd6fe' },
  'Sociologia':        { bg: '#fdf2f8', text: '#701a75', border: '#f0abfc' },
  'Gramática':         { bg: '#fff7ed', text: '#7c2d12', border: '#fdba74' },
  'Literatura':        { bg: '#fef9c3', text: '#713f12', border: '#fde047' },
  'Redação':           { bg: '#f0f9ff', text: '#0c4a6e', border: '#7dd3fc' },
  'Produção de Texto': { bg: '#f0f9ff', text: '#0c4a6e', border: '#7dd3fc' },
};

const corPadrao = { bg: '#eef2ff', text: '#312e81', border: '#a5b4fc' };

function getCorDisciplina(disciplina?: string) {
  if (!disciplina) return corPadrao;
  return coresDisciplinas[disciplina] || corPadrao;
}

export default function HorarioEscolar({ className, usuario, turmaSelecionada, onVoltar }: HorarioEscolarProps) {
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
  }, [serieAlvo]);

  const carregarHorario = async () => {
    if (!serieAlvo) return;
    try {
      setLoading(true);
      setError('');
      const termoBusca = serieAlvo.split('-')[0].trim();
      const { data, error } = await supabase
        .from('horarios_escolar')
        .select('*')
        .ilike('serie', `%${termoBusca}%`)
        .order('ordem', { ascending: true });
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
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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
                            className="rounded-lg p-3 border flex items-center gap-3"
                            style={{ backgroundColor: cor.bg, borderColor: cor.border }}
                          >
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap min-w-[70px]">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {item.horario.split(' - ')[0]}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-xs" style={{ color: cor.text }}>{item.aula?.disciplina}</p>
                              {item.aula?.professor && (
                                <p className="text-[10px] opacity-70" style={{ color: cor.text }}>{item.aula.professor}</p>
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
                                className="h-full p-3 rounded-md flex flex-col justify-center items-center text-center gap-1 shadow-sm border"
                                style={{
                                  backgroundColor: cor.bg,
                                  color: cor.text,
                                  borderColor: cor.border,
                                }}
                              >
                                <div className="font-bold leading-tight text-xs">
                                  {aula.disciplina}
                                </div>
                                {aula.professor && (
                                  <div className="text-[10px] opacity-80">
                                    {aula.professor}
                                  </div>
                                )}
                                {aula.sala && (
                                  <div
                                    className="text-[9px] mt-1 pt-1 w-full opacity-60"
                                    style={{ borderTop: `1px solid ${cor.border}` }}
                                  >
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

      {/* Loading e erro para mobile (quando tabela está hidden) */}
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