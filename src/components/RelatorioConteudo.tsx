import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Eye, 
  FileText, 
  Video, 
  Users, 
  Calendar,
  BookOpen,
  PlayCircle,
  Image,
  Target,
  Award,
  Activity
} from 'lucide-react';

export function RelatorioConteudo() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState('30');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('');

  // Dados mockados para demonstração
  const estatisticas = [
    {
      titulo: 'Total de Conteúdos',
      valor: '247',
      mudanca: '+12%',
      tipo: 'positivo',
      icone: <FileText className="w-5 h-5" />,
      cor: 'text-blue-600'
    },
    {
      titulo: 'Videoaulas',
      valor: '89',
      mudanca: '+8%',
      tipo: 'positivo',
      icone: <Video className="w-5 h-5" />,
      cor: 'text-red-600'
    },
    {
      titulo: 'Downloads Totais',
      valor: '1,542',
      mudanca: '+25%',
      tipo: 'positivo',
      icone: <Download className="w-5 h-5" />,
      cor: 'text-green-600'
    },
    {
      titulo: 'Visualizações',
      valor: '4,328',
      mudanca: '+18%',
      tipo: 'positivo',
      icone: <Eye className="w-5 h-5" />,
      cor: 'text-purple-600'
    }
  ];

  const conteudoPorDisciplina = [
    { disciplina: 'Matemática', total: 45, videos: 18, materiais: 27 },
    { disciplina: 'Português', total: 38, videos: 12, materiais: 26 },
    { disciplina: 'História', total: 32, videos: 8, materiais: 24 },
    { disciplina: 'Geografia', total: 28, videos: 10, materiais: 18 },
    { disciplina: 'Ciências', total: 35, videos: 15, materiais: 20 },
    { disciplina: 'Física', total: 25, videos: 12, materiais: 13 },
    { disciplina: 'Química', total: 22, videos: 9, materiais: 13 },
    { disciplina: 'Biologia', total: 22, videos: 5, materiais: 17 }
  ];

  const engajamentoPorSerie = [
    { serie: '1ª EM', downloads: 320, visualizacoes: 1200, engajamento: 85 },
    { serie: '2ª EM', downloads: 280, visualizacoes: 980, engajamento: 78 },
    { serie: '3ª EM', downloads: 450, visualizacoes: 1850, engajamento: 92 },
    { serie: '9º EF', downloads: 190, visualizacoes: 650, engajamento: 65 },
    { serie: '8º EF', downloads: 150, visualizacoes: 480, engajamento: 58 },
    { serie: '7º EF', downloads: 120, visualizacoes: 380, engajamento: 52 }
  ];

  const tiposConteudo = [
    { tipo: 'PDFs', quantidade: 145, cor: '#3B82F6' },
    { tipo: 'Vídeos', quantidade: 89, cor: '#EF4444' },
    { tipo: 'Imagens', quantidade: 67, cor: '#10B981' },
    { tipo: 'Slides', quantidade: 34, cor: '#F59E0B' }
  ];

  const conteudosMaisAcessados = [
    {
      id: 1,
      titulo: 'Funções Quadráticas - Teoria Completa',
      disciplina: 'Matemática',
      serie: '1ª série EM',
      tipo: 'PDF',
      downloads: 156,
      visualizacoes: 523,
      nota: 4.8
    },
    {
      id: 2,
      titulo: 'Reações Químicas Inorgânicas',
      disciplina: 'Química',
      serie: '2ª série EM',
      tipo: 'Vídeo',
      downloads: 134,
      visualizacoes: 445,
      nota: 4.6
    },
    {
      id: 3,
      titulo: 'Segunda Guerra Mundial - Resumo',
      disciplina: 'História',
      serie: '3ª série EM',
      tipo: 'PDF',
      downloads: 128,
      visualizacoes: 389,
      nota: 4.7
    },
    {
      id: 4,
      titulo: 'Interpretação de Texto - ENEM',
      disciplina: 'Português',
      serie: '3ª série EM',
      tipo: 'PDF',
      downloads: 118,
      visualizacoes: 367,
      nota: 4.9
    },
    {
      id: 5,
      titulo: 'Experimentos de Física - Mecânica',
      disciplina: 'Física',
      serie: '2ª série EM',
      tipo: 'Vídeo',
      downloads: 95,
      visualizacoes: 298,
      nota: 4.5
    }
  ];

  const tendenciasUso = [
    { mes: 'Ago', uploads: 12, downloads: 245, visualizacoes: 890 },
    { mes: 'Set', uploads: 18, downloads: 356, visualizacoes: 1120 },
    { mes: 'Out', uploads: 24, downloads: 489, visualizacoes: 1456 },
    { mes: 'Nov', uploads: 31, downloads: 623, visualizacoes: 1789 },
    { mes: 'Dez', uploads: 28, downloads: 578, visualizacoes: 1654 },
    { mes: 'Jan', uploads: 35, downloads: 698, visualizacoes: 1923 }
  ];

  const disciplinas = [
    'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
    'Física', 'Química', 'Biologia', 'Inglês', 'Educação Física'
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Relatórios e Estatísticas</h3>
          <p className="text-sm text-gray-600">
            Acompanhe o desempenho e engajamento do conteúdo
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {estatisticas.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.titulo}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.valor}
                  </p>
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.tipo === 'positivo' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.tipo === 'positivo' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {stat.mudanca}
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-gray-50 ${stat.cor}`}>
                  {stat.icone}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conteúdo por Disciplina */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Conteúdo por Disciplina
            </CardTitle>
            <CardDescription>
              Distribuição de materiais e vídeos por disciplina
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conteudoPorDisciplina}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="disciplina" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="materiais" stackId="a" fill="#3B82F6" name="Materiais" />
                <Bar dataKey="videos" stackId="a" fill="#EF4444" name="Vídeos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tipos de Conteúdo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Tipos de Conteúdo
            </CardTitle>
            <CardDescription>
              Distribuição por formato de arquivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tiposConteudo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tipo, quantidade }) => `${tipo}: ${quantidade}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantidade"
                >
                  {tiposConteudo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engajamento por Série */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Engajamento por Série
          </CardTitle>
          <CardDescription>
            Downloads, visualizações e taxa de engajamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engajamentoPorSerie}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="serie" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="downloads" fill="#3B82F6" name="Downloads" />
              <Bar dataKey="visualizacoes" fill="#10B981" name="Visualizações" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tendências de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Tendências de Uso
          </CardTitle>
          <CardDescription>
            Evolução de uploads, downloads e visualizações ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tendenciasUso}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="uploads" stroke="#F59E0B" strokeWidth={2} name="Uploads" />
              <Line type="monotone" dataKey="downloads" stroke="#3B82F6" strokeWidth={2} name="Downloads" />
              <Line type="monotone" dataKey="visualizacoes" stroke="#10B981" strokeWidth={2} name="Visualizações" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conteúdos Mais Acessados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Conteúdos Mais Acessados
          </CardTitle>
          <CardDescription>
            Top 5 materiais com maior engajamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conteudosMaisAcessados.map((conteudo, index) => (
              <div key={conteudo.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{conteudo.titulo}</h4>
                  <p className="text-sm text-gray-600">
                    {conteudo.disciplina} • {conteudo.serie}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <Badge variant="outline">
                    {conteudo.tipo === 'PDF' ? <FileText className="w-3 h-3 mr-1" /> : <PlayCircle className="w-3 h-3 mr-1" />}
                    {conteudo.tipo}
                  </Badge>
                  
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {conteudo.downloads}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {conteudo.visualizacoes}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-500" />
                    {conteudo.nota}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Engajamento por Série */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {engajamentoPorSerie.map((serie) => (
          <Card key={serie.serie}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">{serie.serie}</h4>
                <Badge className={`${
                  serie.engajamento >= 80 ? 'bg-green-100 text-green-800' :
                  serie.engajamento >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {serie.engajamento}%
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Taxa de Engajamento</span>
                    <span>{serie.engajamento}%</span>
                  </div>
                  <Progress value={serie.engajamento} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Downloads</p>
                    <p className="font-semibold">{serie.downloads}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Visualizações</p>
                    <p className="font-semibold">{serie.visualizacoes}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}