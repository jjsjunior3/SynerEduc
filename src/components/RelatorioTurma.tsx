import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ArrowLeft, Download, BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { Chart, ChartContainer } from './ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface RelatorioTurmaProps {
  onVoltar: () => void;
}

export function RelatorioTurma({ onVoltar }: RelatorioTurmaProps) {
  const [serieSelecionada, setSerieSelecionada] = useState('3-a');
  const [bimestreSelecionado, setBimestreSelecionado] = useState('2025-1');

  const dadosDesempenho = [
    { disciplina: 'Matemática', media: 7.2, aprovados: 24, reprovados: 4 },
    { disciplina: 'Português', media: 8.1, aprovados: 26, reprovados: 2 },
    { disciplina: 'Física', media: 6.8, aprovados: 22, reprovados: 6 },
    { disciplina: 'Química', media: 7.5, aprovados: 25, reprovados: 3 },
    { disciplina: 'História', media: 8.0, aprovados: 27, reprovados: 1 },
    { disciplina: 'Geografia', media: 7.8, aprovados: 26, reprovados: 2 },
  ];

  const dadosFrequencia = [
    { name: 'Presença', value: 92, color: '#10b981' },
    { name: 'Faltas', value: 8, color: '#ef4444' },
  ];

  const evolucaoNotas = [
    { bimestre: '1º Bim', media: 7.1 },
    { bimestre: '2º Bim', media: 7.4 },
    { bimestre: '3º Bim', media: 7.6 },
    { bimestre: '4º Bim', media: 7.8 },
  ];

  const estatisticasTurma = {
    totalAlunos: 28,
    mediaGeral: 7.6,
    aprovados: 25,
    recuperacao: 2,
    reprovados: 1,
    frequenciaMedia: 92
  };

  const alunosDestaque = [
    { nome: 'Maria Silva', media: 9.2, posicao: 1 },
    { nome: 'João Santos', media: 8.9, posicao: 2 },
    { nome: 'Ana Costa', media: 8.7, posicao: 3 },
  ];

  const alunosAtencao = [
    { nome: 'Pedro Oliveira', media: 5.8, faltas: 12, motivo: 'Baixa frequência e notas' },
    { nome: 'Lucas Lima', media: 6.2, faltas: 8, motivo: 'Notas abaixo da média' },
  ];

  const turmasDisponiveis = [
    { id: '1-a', label: '1ª série A' },
    { id: '1-b', label: '1ª série B' },
    { id: '2-a', label: '2ª série A' },
    { id: '2-b', label: '2ª série B' },
    { id: '3-a', label: '3ª série A' },
    { id: '3-b', label: '3ª série B' },
  ];

  const handleGerarRelatorio = () => {
    console.log('Gerando relatório da turma...');
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
            <h1 className="font-semibold text-gray-900">Relatório de Turma</h1>
            <p className="text-sm text-gray-600">Análise detalhada do desempenho da turma</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Turma</label>
                  <Select value={serieSelecionada} onValueChange={setSerieSelecionada}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {turmasDisponiveis.map((turma) => (
                        <SelectItem key={turma.id} value={turma.id}>
                          {turma.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Período</label>
                  <Select value={bimestreSelecionado} onValueChange={setBimestreSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-1">1º Bimestre 2025</SelectItem>
                      <SelectItem value="2025-2">2º Bimestre 2025</SelectItem>
                      <SelectItem value="2025-3">3º Bimestre 2025</SelectItem>
                      <SelectItem value="2025-4">4º Bimestre 2025</SelectItem>
                      <SelectItem value="2025-ano">Ano Completo 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleGerarRelatorio}>
                    <Download className="w-4 h-4 mr-2" />
                    Gerar PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{estatisticasTurma.totalAlunos}</div>
                <div className="text-sm text-gray-600">Total de Alunos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{estatisticasTurma.mediaGeral}</div>
                <div className="text-sm text-gray-600">Média Geral</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{estatisticasTurma.aprovados}</div>
                <div className="text-sm text-gray-600">Aprovados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{estatisticasTurma.recuperacao}</div>
                <div className="text-sm text-gray-600">Recuperação</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{estatisticasTurma.frequenciaMedia}%</div>
                <div className="text-sm text-gray-600">Freq. Média</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desempenho por Disciplina */}
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por Disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosDesempenho}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="disciplina" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="media" fill="#3b82f6" name="Média" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Evolução das Notas */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução das Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolucaoNotas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bimestre" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="media" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Destaques e Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alunos Destaque */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Alunos Destaque
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alunosDestaque.map((aluno, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                          {aluno.posicao}
                        </div>
                        <div>
                          <p className="font-medium">{aluno.nome}</p>
                          <p className="text-sm text-gray-600">Média: {aluno.media}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Excelente</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alunos que Precisam de Atenção */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Alunos que Precisam de Atenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alunosAtencao.map((aluno, index) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">{aluno.nome}</p>
                        <Badge className="bg-yellow-100 text-yellow-700">Atenção</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Média: {aluno.media} • Faltas: {aluno.faltas}
                      </p>
                      <p className="text-xs text-gray-500">{aluno.motivo}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhamento por Disciplina */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Disciplina</th>
                      <th className="text-center py-2">Média</th>
                      <th className="text-center py-2">Aprovados</th>
                      <th className="text-center py-2">Reprovados</th>
                      <th className="text-center py-2">Taxa Aprovação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosDesempenho.map((disciplina, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 font-medium">{disciplina.disciplina}</td>
                        <td className="text-center">
                          <span className={`font-bold ${
                            disciplina.media >= 7 ? 'text-green-600' : 
                            disciplina.media >= 5 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {disciplina.media.toFixed(1)}
                          </span>
                        </td>
                        <td className="text-center text-green-600">{disciplina.aprovados}</td>
                        <td className="text-center text-red-600">{disciplina.reprovados}</td>
                        <td className="text-center">
                          {Math.round((disciplina.aprovados / (disciplina.aprovados + disciplina.reprovados)) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}