import { useState, useEffect, Fragment } from 'react';
import { Button } from './ui/button';
import { Calendar, Clock, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
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
  usuario?: Usuario; // Opcional (usado pelo aluno)
  turmaSelecionada?: string; // Opcional (usado pelo professor)
  onVoltar?: () => void;
}

export default function HorarioEscolar({ className, usuario, turmaSelecionada, onVoltar }: HorarioEscolarProps) {
  const [horarios, setHorarios] = useState<HorarioAula[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const diasOrdem = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  // Lógica inteligente: Se o professor selecionou uma turma, usa ela. 
  // Se não, tenta usar a série do usuário logado (caso seja aluno).
  const serieAlvo = turmaSelecionada || usuario?.serie;

  // Ordena os horários únicos para montar as linhas da tabela
  const horariosUnicos = Array.from(new Set(horarios.map(h => `${h.horario_inicio} - ${h.horario_fim}`))).sort();

  // Cores para deixar o horário visualmente organizado
  const coresDisciplinas: Record<string, string> = {
    'Matemática': 'bg-blue-100 text-blue-800 border-blue-200',
    'Português': 'bg-red-100 text-red-800 border-red-200',
    'História': 'bg-amber-100 text-amber-800 border-amber-200',
    'Geografia': 'bg-orange-100 text-orange-800 border-orange-200',
    'Ciências': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Inglês': 'bg-purple-100 text-purple-800 border-purple-200',
    'Arte': 'bg-pink-100 text-pink-800 border-pink-200',
    'Ed. Física': 'bg-stone-200 text-stone-800 border-stone-300',
  };

  useEffect(() => {
    if (serieAlvo) {
      carregarHorario();
    }
  }, [serieAlvo]);

  const carregarHorario = async () => {
    if (!serieAlvo) return;

    try {
      setLoading(true);
      setError('');

      // Limpa o nome da série para busca (ex: "1ª Série A" -> busca por "1ª Série")
      // Isso ajuda a encontrar o horário mesmo se o nome da turma for um pouco diferente
      const termoBusca = serieAlvo.split('-')[0].trim();

      const { data, error } = await supabase
        .from('horarios_escolar')
        .select('*')
        .ilike('serie', `%${termoBusca}%`) // Busca flexível pelo nome da série
        .order('ordem', { ascending: true });

      if (error) throw error;

      setHorarios(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar horário:', err);
      setError('Não foi possível carregar o horário escolar.');
    } finally {
      setLoading(false);
    }
  };

  const getDisciplinaDoDia = (horarioLabel: string, dia: string) => {
    const [inicio] = horarioLabel.split(' - ');
    // Encontra a aula que bate com o dia e o horário de início
    return horarios.find(h => h.dia_semana === dia && h.horario_inicio.startsWith(inicio));
  };

  const getCorDisciplina = (disciplina?: string) => {
    if (!disciplina) return 'bg-gray-50';
    // Retorna a cor mapeada ou um cinza padrão se não tiver cor definida
    return coresDisciplinas[disciplina] || 'bg-indigo-50 text-indigo-800 border-indigo-200';
  };

  if (!serieAlvo) return null;

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Grade Horária</h2>
            <p className="text-gray-500">Visualizando: {serieAlvo}</p>
          </div>
        </div>

        {onVoltar && (
          <Button variant="outline" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-6 m-4 rounded-md">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        ) : horarios.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum horário encontrado para <strong>{serieAlvo}</strong>.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 text-left font-semibold text-gray-600 w-32">Horário</th>
                  {diasOrdem.map(dia => (
                    <th key={dia} className="p-4 text-center font-semibold text-gray-600 border-l">
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horariosUnicos.map((horarioLabel, idx) => (
                  <Fragment key={idx}>
                    {/* Exemplo de Intervalo Fixo (opcional, pode remover se quiser) */}
                    {idx === 3 && (
                      <tr className="bg-yellow-50 border-b">
                        <td className="p-2 text-center font-bold text-yellow-700 text-xs border-r border-yellow-100">
                          Intervalo
                        </td>
                        <td className="p-2 text-center font-bold text-yellow-700 text-xs" colSpan={5}>
                          RECREIO
                        </td>
                      </tr>
                    )}

                    <tr className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-700 bg-gray-50/30 whitespace-nowrap border-r">
                        {horarioLabel}
                      </td>
                      {diasOrdem.map(dia => {
                        const aula = getDisciplinaDoDia(horarioLabel, dia);
                        return (
                          <td key={dia} className="p-2 border-l align-top h-24 w-1/5">
                            {aula ? (
                              <div className={`h-full p-3 rounded-md flex flex-col justify-center items-center text-center gap-1 shadow-sm border ${getCorDisciplina(aula.disciplina)}`}>
                                <div className="font-bold leading-tight">{aula.disciplina}</div>
                                {aula.professor && (
                                  <div className="text-[10px] opacity-80">{aula.professor}</div>
                                )}
                                {aula.sala && (
                                  <div className="text-[9px] mt-1 pt-1 border-t border-black/10 w-full opacity-60">
                                    Sala {aula.sala}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-gray-300">
                                -
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
    </div>
  );
}
