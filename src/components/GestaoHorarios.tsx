import { useState, useEffect, Fragment } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Save, Search, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import { toast } from 'sonner';

interface GestaoHorarioProps {
  onVoltar: () => void;
}

interface AulaGrade {
  id?: string;
  dia_semana: string;
  ordem: number;
  horario_inicio: string;
  horario_fim: string;
  disciplina: string;
  sala: string;
}

interface Serie {
  id: string;
  nome: string;
}

export default function GestaoHorario({ onVoltar }: GestaoHorarioProps) {
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<Serie[]>([]);
  const [serie, setSerie] = useState('');
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [grade, setGrade] = useState<AulaGrade[]>([]);

  // Configuração EXATA dos horários solicitados
  const horariosPadrao = [
    { ordem: 1, inicio: '07:35', fim: '08:25' },
    { ordem: 2, inicio: '08:25', fim: '09:15' },
    { ordem: 3, inicio: '09:15', fim: '10:05' },
    // Intervalo (10:05 - 10:20) não entra como aula editável, é visual
    { ordem: 4, inicio: '10:20', fim: '11:10' },
    { ordem: 5, inicio: '11:10', fim: '12:00' },
  ];

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  // Busca as séries do banco ao carregar a tela
  useEffect(() => {
    const fetchSeries = async () => {
      const { data } = await supabase.from('series').select('id, nome').order('nome');
      if (data) setSeriesDisponiveis(data);
    };
    fetchSeries();
  }, []);

  const carregarGrade = async () => {
    if (!serie) {
      toast.warning("Selecione a Série primeiro.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('horarios_escolar')
        .select('*')
        .eq('serie', serie) // Busca pelo nome da série
        .eq('turma', 'A'); // Padrão fixo já que só tem 1 turma

      if (error) throw error;

      if (data && data.length > 0) {
        setGrade(data);
      } else {
        inicializarGradeVazia();
      }
      toast.success("Grade carregada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar grade.");
    } finally {
      setLoading(false);
    }
  };

  const inicializarGradeVazia = () => {
    const novaGrade: AulaGrade[] = [];
    diasSemana.forEach(dia => {
      horariosPadrao.forEach(h => {
        novaGrade.push({
          dia_semana: dia,
          ordem: h.ordem,
          horario_inicio: h.inicio,
          horario_fim: h.fim,
          disciplina: '',
          sala: ''
        });
      });
    });
    setGrade(novaGrade);
  };

  const atualizarAula = (dia: string, ordem: number, campo: keyof AulaGrade, valor: string) => {
    setGrade(prev => prev.map(aula => {
      if (aula.dia_semana === dia && aula.ordem === ordem) {
        return { ...aula, [campo]: valor };
      }
      return aula;
    }));
  };

  const salvarGrade = async () => {
    if (!serie) return;
    setSalvando(true);

    try {
      // 1. Limpa grade anterior desta série
      await supabase
        .from('horarios_escolar')
        .delete()
        .eq('serie', serie)
        .eq('turma', 'A');

      // 2. Prepara dados (sem professor)
      const dadosParaSalvar = grade
        .filter(g => g.disciplina.trim() !== '')
        .map(({ id, ...resto }) => ({
          ...resto,
          serie,
          turma: 'A', // Valor fixo
          professor: '' // Campo vazio pois não usamos mais
        }));

      if (dadosParaSalvar.length === 0) {
        toast.info("Grade vazia, nada para salvar.");
        setSalvando(false);
        return;
      }

      const { error } = await supabase.from('horarios_escolar').insert(dadosParaSalvar);
      if (error) throw error;

      toast.success("Horário salvo com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const getAula = (dia: string, ordem: number) => {
    return grade.find(g => g.dia_semana === dia && g.ordem === ordem) || { disciplina: '', sala: '' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestão de Horários</h2>
            <p className="text-gray-500">Defina a grade curricular das turmas</p>
          </div>
        </div>
        <Button onClick={salvarGrade} disabled={salvando || grade.length === 0} className="bg-green-600 hover:bg-green-700">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Alterações
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="text-sm font-medium mb-2 block">Série</label>
            <Select value={serie} onValueChange={setSerie}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a série" />
              </SelectTrigger>
              <SelectContent>
                {seriesDisponiveis.map((s) => (
                  <SelectItem key={s.id} value={s.nome}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botão menor e mais compacto */}
          <Button onClick={carregarGrade} disabled={!serie || loading} size="default" className="w-auto px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Buscar Grade
          </Button>
        </CardContent>
      </Card>

      {grade.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 text-left font-semibold text-gray-600 w-28">Horário</th>
                {diasSemana.map(dia => (
                  <th key={dia} className="p-4 text-center font-semibold text-gray-600 border-l w-1/5">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horariosPadrao.map((h, index) => (
                <Fragment key={h.ordem}>
                  {/* Linha de Intervalo (Visual) */}
                  {index === 3 && (
                    <tr className="bg-yellow-50 border-b">
                      <td className="p-2 text-center font-bold text-yellow-700 text-xs" colSpan={6}>
                        INTERVALO (10:05 - 10:20)
                      </td>
                    </tr>
                  )}

                  <tr key={h.ordem} className="border-b last:border-0">
                    <td className="p-4 font-medium text-gray-700 bg-gray-50/30">
                      <div className="text-sm">{h.inicio}</div>
                      <div className="text-xs text-gray-400">às {h.fim}</div>
                    </td>
                    {diasSemana.map(dia => {
                      const aula = getAula(dia, h.ordem);
                      return (
                        <td key={dia} className="p-2 border-l">
                          <Input 
                            placeholder="Disciplina" 
                            className="h-9 text-sm font-medium border-blue-100 focus:border-blue-500 text-center"
                            value={aula.disciplina}
                            onChange={(e) => atualizarAula(dia, h.ordem, 'disciplina', e.target.value)}
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
      )}
    </div>
  );
}
