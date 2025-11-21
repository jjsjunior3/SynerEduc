import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Search, Calendar, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface FrequenciaAlunosProps {
  onVoltar: () => void;
}

interface AlunoFrequencia {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  totalAulas: number;
  presencas: number;
  faltas: number;
  percentualFrequencia: number;
  ultimasFaltas: string[];
  situacao: 'regular' | 'atencao' | 'critica';
}

export function FrequenciaAlunos({ onVoltar }: FrequenciaAlunosProps) {
  const [filtroSerie, setFiltroSerie] = useState('todas');
  const [filtroTurma, setFiltroTurma] = useState('todas');
  const [filtroSituacao, setFiltroSituacao] = useState('todas');
  const [busca, setBusca] = useState('');

  const alunos: AlunoFrequencia[] = [
    {
      id: '1',
      nome: 'Maria Silva Santos',
      serie: '3ª série',
      turma: 'A',
      totalAulas: 120,
      presencas: 115,
      faltas: 5,
      percentualFrequencia: 95.8,
      ultimasFaltas: ['2025-01-08', '2025-01-03'],
      situacao: 'regular'
    },
    {
      id: '2',
      nome: 'João Pedro Oliveira',
      serie: '3ª série',
      turma: 'A',
      totalAulas: 120,
      presencas: 95,
      faltas: 25,
      percentualFrequencia: 79.2,
      ultimasFaltas: ['2025-01-10', '2025-01-09', '2025-01-08', '2025-01-05'],
      situacao: 'atencao'
    },
    {
      id: '3',
      nome: 'Ana Carolina Lima',
      serie: '2ª série',
      turma: 'B',
      totalAulas: 115,
      presencas: 113,
      faltas: 2,
      percentualFrequencia: 98.3,
      ultimasFaltas: ['2025-01-05'],
      situacao: 'regular'
    },
    {
      id: '4',
      nome: 'Pedro Santos Costa',
      serie: '3ª série',
      turma: 'B',
      totalAulas: 120,
      presencas: 85,
      faltas: 35,
      percentualFrequencia: 70.8,
      ultimasFaltas: ['2025-01-10', '2025-01-09', '2025-01-08', '2025-01-07', '2025-01-06'],
      situacao: 'critica'
    },
    {
      id: '5',
      nome: 'Lucas Oliveira Lima',
      serie: '1ª série',
      turma: 'A',
      totalAulas: 110,
      presencas: 92,
      faltas: 18,
      percentualFrequencia: 83.6,
      ultimasFaltas: ['2025-01-09', '2025-01-07', '2025-01-04'],
      situacao: 'atencao'
    }
  ];

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'regular': return 'bg-green-100 text-green-700';
      case 'atencao': return 'bg-yellow-100 text-yellow-700';
      case 'critica': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSituacaoIcon = (situacao: string) => {
    switch (situacao) {
      case 'regular': return <CheckCircle className="w-4 h-4" />;
      case 'atencao': return <AlertTriangle className="w-4 h-4" />;
      case 'critica': return <X className="w-4 h-4" />;
      default: return null;
    }
  };

  const getSituacaoTexto = (situacao: string) => {
    switch (situacao) {
      case 'regular': return 'Regular';
      case 'atencao': return 'Atenção';
      case 'critica': return 'Crítica';
      default: return 'Desconhecida';
    }
  };

  const alunosFiltrados = alunos.filter(aluno => {
    const matchBusca = aluno.nome.toLowerCase().includes(busca.toLowerCase());
    const matchSerie = filtroSerie === 'todas' || aluno.serie === filtroSerie;
    const matchTurma = filtroTurma === 'todas' || aluno.turma === filtroTurma;
    const matchSituacao = filtroSituacao === 'todas' || aluno.situacao === filtroSituacao;
    return matchBusca && matchSerie && matchTurma && matchSituacao;
  });

  const estatisticas = {
    totalAlunos: alunos.length,
    frequenciaMedia: alunos.reduce((acc, aluno) => acc + aluno.percentualFrequencia, 0) / alunos.length,
    alunosRegulares: alunos.filter(a => a.situacao === 'regular').length,
    alunosAtencao: alunos.filter(a => a.situacao === 'atencao').length,
    alunosCriticos: alunos.filter(a => a.situacao === 'critica').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Frequência dos Alunos</h1>
            <p className="text-sm text-gray-600">Monitoramento de presença e faltas</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{estatisticas.totalAlunos}</div>
                <div className="text-sm text-gray-600">Total de Alunos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{estatisticas.frequenciaMedia.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Freq. Média</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{estatisticas.alunosRegulares}</div>
                <div className="text-sm text-gray-600">Regulares</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{estatisticas.alunosAtencao}</div>
                <div className="text-sm text-gray-600">Atenção</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{estatisticas.alunosCriticos}</div>
                <div className="text-sm text-gray-600">Críticos</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Aluno</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Nome do aluno..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as séries</SelectItem>
                      <SelectItem value="1ª série">1ª série</SelectItem>
                      <SelectItem value="2ª série">2ª série</SelectItem>
                      <SelectItem value="3ª série">3ª série</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turma</label>
                  <Select value={filtroTurma} onValueChange={setFiltroTurma}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as turmas</SelectItem>
                      <SelectItem value="A">Turma A</SelectItem>
                      <SelectItem value="B">Turma B</SelectItem>
                      <SelectItem value="C">Turma C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Situação</label>
                  <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Relatório
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Alunos */}
          <div className="space-y-4">
            {alunosFiltrados.map((aluno) => (
              <Card key={aluno.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{aluno.nome}</h3>
                        <Badge className={getSituacaoColor(aluno.situacao)}>
                          <div className="flex items-center gap-1">
                            {getSituacaoIcon(aluno.situacao)}
                            {getSituacaoTexto(aluno.situacao)}
                          </div>
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {aluno.serie} - Turma {aluno.turma}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total de Aulas:</span>
                          <span className="font-medium ml-1">{aluno.totalAulas}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Presenças:</span>
                          <span className="font-medium ml-1 text-green-600">{aluno.presencas}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Faltas:</span>
                          <span className="font-medium ml-1 text-red-600">{aluno.faltas}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Frequência:</span>
                          <span className={`font-bold ml-1 ${
                            aluno.percentualFrequencia >= 85 ? 'text-green-600' :
                            aluno.percentualFrequencia >= 75 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {aluno.percentualFrequencia.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {aluno.ultimasFaltas.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="text-sm text-gray-600">Últimas faltas: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {aluno.ultimasFaltas.slice(0, 5).map((data, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {new Date(data).toLocaleDateString('pt-BR')}
                              </Badge>
                            ))}
                            {aluno.ultimasFaltas.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{aluno.ultimasFaltas.length - 5} mais
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center border-gray-200 relative">
                        <div 
                          className={`absolute inset-0 rounded-full border-4 ${
                            aluno.percentualFrequencia >= 85 ? 'border-green-500' :
                            aluno.percentualFrequencia >= 75 ? 'border-yellow-500' : 'border-red-500'
                          }`}
                          style={{
                            background: `conic-gradient(${
                              aluno.percentualFrequencia >= 85 ? '#10b981' :
                              aluno.percentualFrequencia >= 75 ? '#f59e0b' : '#ef4444'
                            } ${aluno.percentualFrequencia * 3.6}deg, #e5e7eb 0deg)`
                          }}
                        ></div>
                        <span className="relative text-sm font-bold">
                          {aluno.percentualFrequencia.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {alunosFiltrados.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhum aluno encontrado</h3>
                <p className="text-gray-600">
                  Tente ajustar os filtros para encontrar os alunos desejados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}