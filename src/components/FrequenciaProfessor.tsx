import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, UserCheck, Save, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface FrequenciaProfessorProps {
  disciplina: any;
  serie: any;
}

interface Aluno {
  id: string;
  nome: string;
  presente: boolean;
}

interface RegistroFrequencia {
  data: string;
  disciplina: string;
  totalAlunos: number;
  presentes: number;
  faltas: number;
}

export function FrequenciaProfessor({ disciplina, serie }: FrequenciaProfessorProps) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [alunos, setAlunos] = useState<Aluno[]>([
    { id: '1', nome: 'Ana Carolina Silva', presente: true },
    { id: '2', nome: 'Bruno Santos Costa', presente: true },
    { id: '3', nome: 'Carlos Eduardo Lima', presente: false },
    { id: '4', nome: 'Daniel Oliveira', presente: true },
    { id: '5', nome: 'Eduardo Pereira', presente: true },
    { id: '6', nome: 'Fernanda Costa', presente: true },
    { id: '7', nome: 'Gabriel Santos', presente: false },
    { id: '8', nome: 'Helena Silva', presente: true },
    { id: '9', nome: 'Igor Ferreira', presente: true },
    { id: '10', nome: 'Juliana Lima', presente: true },
    { id: '11', nome: 'Leonardo Costa', presente: true },
    { id: '12', nome: 'Mariana Santos', presente: true },
    { id: '13', nome: 'Nicolas Oliveira', presente: false },
    { id: '14', nome: 'Otávio Silva', presente: true },
    { id: '15', nome: 'Patrícia Lima', presente: true },
    { id: '16', nome: 'Rafael Santos', presente: true },
    { id: '17', nome: 'Sofia Costa', presente: true },
    { id: '18', nome: 'Thiago Oliveira', presente: true },
    { id: '19', nome: 'Valentina Silva', presente: true },
    { id: '20', nome: 'William Santos', presente: true },
    { id: '21', nome: 'Yasmin Lima', presente: true },
    { id: '22', nome: 'Zeca Costa', presente: true },
    { id: '23', nome: 'Amanda Oliveira', presente: true },
    { id: '24', nome: 'Bernardo Silva', presente: true },
    { id: '25', nome: 'Catarina Santos', presente: true },
    { id: '26', nome: 'Diego Lima', presente: true },
    { id: '27', nome: 'Erica Costa', presente: true },
    { id: '28', nome: 'Felipe Oliveira', presente: true }
  ]);

  const [historicoFrequencia] = useState<RegistroFrequencia[]>([
    {
      data: '2025-01-10',
      disciplina: disciplina.nome,
      totalAlunos: 28,
      presentes: 26,
      faltas: 2
    },
    {
      data: '2025-01-09',
      disciplina: disciplina.nome,
      totalAlunos: 28,
      presentes: 25,
      faltas: 3
    },
    {
      data: '2025-01-08',
      disciplina: disciplina.nome,
      totalAlunos: 28,
      presentes: 27,
      faltas: 1
    }
  ]);

  const handlePresencaChange = (alunoId: string, presente: boolean) => {
    setAlunos(prev => prev.map(aluno => 
      aluno.id === alunoId ? { ...aluno, presente } : aluno
    ));
  };

  const handleMarcarTodos = (presente: boolean) => {
    setAlunos(prev => prev.map(aluno => ({ ...aluno, presente })));
  };

  const handleSalvarFrequencia = () => {
    const presentes = alunos.filter(a => a.presente).length;
    const faltas = alunos.length - presentes;
    
    toast.success(`Frequência salva! ${presentes} presentes, ${faltas} faltas`);
  };

  const calcularEstatisticas = () => {
    const presentes = alunos.filter(a => a.presente).length;
    const faltas = alunos.length - presentes;
    const percentualPresenca = (presentes / alunos.length) * 100;
    
    return { presentes, faltas, percentualPresenca };
  };

  const { presentes, faltas, percentualPresenca } = calcularEstatisticas();

  const getPercentualColor = (percentual: number) => {
    if (percentual >= 90) return 'text-green-600';
    if (percentual >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Registro de Frequência</h2>
        <Button onClick={handleSalvarFrequencia}>
          <Save className="w-4 h-4 mr-2" />
          Salvar Frequência
        </Button>
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data da Aula</label>
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ações Rápidas</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleMarcarTodos(true)}>
                    Marcar Todos Presentes
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleMarcarTodos(false)}>
                    Marcar Todos Ausentes
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{presentes}</div>
                  <div className="text-xs text-gray-600">Presentes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{faltas}</div>
                  <div className="text-xs text-gray-600">Faltas</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${getPercentualColor(percentualPresenca)}`}>
                    {percentualPresenca.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">Presença</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Presença - {serie?.nome} Turma {serie?.turma}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alunos.map((aluno, index) => (
              <div
                key={aluno.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  aluno.presente ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 min-w-8">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-medium text-gray-900">{aluno.nome}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    className={aluno.presente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                  >
                    {aluno.presente ? 'Presente' : 'Ausente'}
                  </Badge>
                  <Checkbox
                    checked={aluno.presente}
                    onCheckedChange={(checked) => handlePresencaChange(aluno.id, checked as boolean)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Frequência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Histórico de Frequência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {historicoFrequencia.map((registro, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(registro.data).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">{registro.disciplina}</p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-green-600">{registro.presentes}</div>
                    <div className="text-gray-600">Presentes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600">{registro.faltas}</div>
                    <div className="text-gray-600">Faltas</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getPercentualColor((registro.presentes / registro.totalAlunos) * 100)}`}>
                      {((registro.presentes / registro.totalAlunos) * 100).toFixed(0)}%
                    </div>
                    <div className="text-gray-600">Presença</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}