import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X, Calendar, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Usuario } from '../types/auth';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface HorarioAula {
  horario: string;
  segunda?: string;
  terca?: string;
  quarta?: string;
  quinta?: string;
  sexta?: string;
}

interface HorarioEscolarProps {
  className?: string;
  usuario: Usuario;
}

export function HorarioEscolar({ className, usuario }: HorarioEscolarProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [horario, setHorario] = useState<HorarioAula[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  if (!usuario) {
    return null;
  }

  useEffect(() => {
    if (modalAberto && horario.length === 0) {
      carregarHorario();
    }
  }, [modalAberto]);

  const carregarHorario = async () => {
    if (!usuario) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/horario/${usuario.serie}/${usuario.turma || 'A'}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Se não encontrou horário específico, usar horário padrão
        setHorario(getHorarioPadrao());
        return;
      }

      const data = await response.json();
      
      if (data.horario && data.horario.length > 0) {
        setHorario(data.horario.map((item: any) => item.value));
      } else {
        setHorario(getHorarioPadrao());
      }
    } catch (error) {
      console.error('Erro ao carregar horário:', error);
      setError('Erro ao carregar horário. Exibindo horário padrão.');
      setHorario(getHorarioPadrao());
    } finally {
      setLoading(false);
    }
  };

  const getHorarioPadrao = (): HorarioAula[] => {
    // Retorna array vazio para forçar uso de dados reais do backend
    return [];
  };

  const getCorDisciplina = (disciplina: string) => {
    if (disciplina === 'INTERVALO') {
      return 'bg-slate-100 text-slate-600 font-semibold';
    }
    
    if (disciplina?.startsWith('Aula ') || !disciplina) {
      return 'bg-gray-100 text-gray-600 italic';
    }

    const cores: { [key: string]: string } = {
      'Matemática': 'bg-blue-100 text-blue-800',
      'Português': 'bg-orange-100 text-orange-800',
      'Química': 'bg-green-100 text-green-800',
      'Física': 'bg-indigo-100 text-indigo-800',
      'História': 'bg-red-100 text-red-800',
      'Biologia': 'bg-yellow-100 text-yellow-800',
      'Literatura': 'bg-purple-100 text-purple-800',
      'Geografia': 'bg-teal-100 text-teal-800',
      'Inglês': 'bg-pink-100 text-pink-800',
      'Arte': 'bg-rose-100 text-rose-800',
      'Ed. Física': 'bg-emerald-100 text-emerald-800',
      'Filosofia': 'bg-gray-100 text-gray-800',
      'Sociologia': 'bg-cyan-100 text-cyan-800',
      'Redação': 'bg-amber-100 text-amber-800'
    };
    return cores[disciplina] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      {/* Componente pequeno para o Dashboard */}
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold">HORÁRIO ESCOLAR</h3>
          </div>
          <div 
            className="flex justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setModalAberto(true)}
          >
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1610888662651-05dbdec7cfae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjB0aW1ldGFibGUlMjBzY2hlZHVsZXxlbnwxfHx8fDE3NTY1NjE0MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Horário Escolar"
              className="w-16 h-12 object-cover rounded border-2 border-dashed border-gray-300"
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">Clique para ampliar</p>
        </CardContent>
      </Card>

      {/* Modal com horário completo */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Horário Escolar - {usuario?.serie || 'Série não informada'} - Turma {usuario?.turma || 'A'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 max-h-[calc(90vh-120px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                <span className="text-gray-600">Carregando horário...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">{error}</span>
                  </div>
                )}

                {horario.length === 0 ? (
                  <div className="text-center p-8">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">Horário não disponível</h3>
                    <p className="text-sm text-gray-600">
                      O horário escolar ainda não foi definido para sua turma.
                      Entre em contato com a secretaria.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 p-3 text-left font-semibold">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Horário
                              </div>
                            </th>
                            <th className="border border-gray-300 p-3 text-center font-semibold">Segunda</th>
                            <th className="border border-gray-300 p-3 text-center font-semibold">Terça</th>
                            <th className="border border-gray-300 p-3 text-center font-semibold">Quarta</th>
                            <th className="border border-gray-300 p-3 text-center font-semibold">Quinta</th>
                            <th className="border border-gray-300 p-3 text-center font-semibold">Sexta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {horario.map((linha, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-3 font-medium bg-gray-50">
                                {linha.horario}
                              </td>
                              <td className="border border-gray-300 p-2">
                                <div className={`p-2 rounded text-center text-sm ${getCorDisciplina(linha.segunda || '')}`}>
                                  {linha.segunda || 'Livre'}
                                </div>
                              </td>
                              <td className="border border-gray-300 p-2">
                                <div className={`p-2 rounded text-center text-sm ${getCorDisciplina(linha.terca || '')}`}>
                                  {linha.terca || 'Livre'}
                                </div>
                              </td>
                              <td className="border border-gray-300 p-2">
                                <div className={`p-2 rounded text-center text-sm ${getCorDisciplina(linha.quarta || '')}`}>
                                  {linha.quarta || 'Livre'}
                                </div>
                              </td>
                              <td className="border border-gray-300 p-2">
                                <div className={`p-2 rounded text-center text-sm ${getCorDisciplina(linha.quinta || '')}`}>
                                  {linha.quinta || 'Livre'}
                                </div>
                              </td>
                              <td className="border border-gray-300 p-2">
                                <div className={`p-2 rounded text-center text-sm ${getCorDisciplina(linha.sexta || '')}`}>
                                  {linha.sexta || 'Livre'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold mb-2 text-blue-800">Informações Importantes:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                        <p>• Início das aulas: 07:00</p>
                        <p>• Término das aulas: 12:20</p>
                        <p>• Intervalo: 08:40 às 09:00</p>
                        <p>• Tolerância: 10 minutos</p>
                        <p>• Total de aulas: 6 por dia</p>
                        <p>• Duração de cada aula: 50 minutos</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}