import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  FileText, 
  Book, 
  Clock, 
  Users,
  Target,
  Zap,
  RefreshCw,
  Calendar,
  Star
} from 'lucide-react';

interface EstatisticasConteudistaProps {
  estatisticas: {
    totalConteudos: number;
    conteudosPublicados: number;
    pendentesRevisao: number;
    downloadsTotais: number;
    visualizacoesSemana: number;
    disciplinasAtivas: number;
    seriesAtendidas: number;
    crescimentoSemanal: number;
    ultimaAtualizacao: string;
  };
  onAtualizar: () => void;
}

export function EstatisticasConteudista({ 
  estatisticas, 
  onAtualizar 
}: EstatisticasConteudistaProps) {
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(new Date());
  const [tempoDecorrido, setTempoDecorrido] = useState('agora mesmo');

  // Calcular percentuais e métricas derivadas
  const percentualPublicado = estatisticas.totalConteudos > 0 
    ? (estatisticas.conteudosPublicados / estatisticas.totalConteudos) * 100 
    : 0;
  
  const mediaDownloadsPorConteudo = estatisticas.conteudosPublicados > 0 
    ? Math.floor(estatisticas.downloadsTotais / estatisticas.conteudosPublicados) 
    : 0;

  const eficienciaPublicacao = percentualPublicado >= 80 ? 'Excelente' : 
                               percentualPublicado >= 60 ? 'Boa' : 
                               percentualPublicado >= 40 ? 'Regular' : 'Baixa';

  const corEficiencia = percentualPublicado >= 80 ? 'bg-green-500' : 
                        percentualPublicado >= 60 ? 'bg-blue-500' : 
                        percentualPublicado >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  // Atualizar tempo decorrido
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = new Date();
      const diferenca = agora.getTime() - ultimaAtualizacao.getTime();
      const minutos = Math.floor(diferenca / 60000);
      
      if (minutos < 1) {
        setTempoDecorrido('agora mesmo');
      } else if (minutos === 1) {
        setTempoDecorrido('há 1 minuto');
      } else if (minutos < 60) {
        setTempoDecorrido(`há ${minutos} minutos`);
      } else {
        const horas = Math.floor(minutos / 60);
        setTempoDecorrido(`há ${horas}h`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ultimaAtualizacao]);

  const handleAtualizar = () => {
    setUltimaAtualizacao(new Date());
    onAtualizar();
  };

  // Dados para métricas avançadas
  const metricas = [
    {
      nome: 'Taxa de Publicação',
      valor: `${percentualPublicado.toFixed(1)}%`,
      descricao: `${estatisticas.conteudosPublicados} de ${estatisticas.totalConteudos} conteúdos`,
      icone: Target,
      cor: corEficiencia,
      tendencia: percentualPublicado >= 75 ? 'up' : percentualPublicado >= 50 ? 'stable' : 'down'
    },
    {
      nome: 'Média Downloads/Conteúdo',
      valor: mediaDownloadsPorConteudo.toString(),
      descricao: 'Downloads por material',
      icone: TrendingUp,
      cor: 'bg-purple-500',
      tendencia: 'up'
    },
    {
      nome: 'Eficiência',
      valor: eficienciaPublicacao,
      descricao: 'Qualidade da publicação',
      icone: Star,
      cor: corEficiencia,
      tendencia: percentualPublicado >= 70 ? 'up' : 'stable'
    },
    {
      nome: 'Crescimento Semanal',
      valor: `+${(estatisticas.crescimentoSemanal * 100).toFixed(1)}%`,
      descricao: 'Novos downloads',
      icone: Zap,
      cor: 'bg-green-500',
      tendencia: 'up'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estatísticas em Tempo Real</h2>
          <p className="text-gray-600">Acompanhe o desempenho do seu conteúdo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Atualizado {tempoDecorrido}
          </div>
          <Button onClick={handleAtualizar} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total de Conteúdos</p>
                <p className="text-3xl font-bold">{estatisticas.totalConteudos}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-200" />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-blue-100">
                <span>Publicados</span>
                <span>{estatisticas.conteudosPublicados}</span>
              </div>
              <Progress 
                value={percentualPublicado} 
                className="mt-2 bg-blue-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Downloads Totais</p>
                <p className="text-3xl font-bold">{estatisticas.downloadsTotais.toLocaleString()}</p>
              </div>
              <Download className="w-8 h-8 text-green-200" />
            </div>
            <p className="text-green-100 text-xs mt-4">
              +{estatisticas.visualizacoesSemana} esta semana
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Disciplinas Ativas</p>
                <p className="text-3xl font-bold">{estatisticas.disciplinasAtivas}</p>
              </div>
              <Book className="w-8 h-8 text-purple-200" />
            </div>
            <p className="text-purple-100 text-xs mt-4">
              Em {estatisticas.seriesAtendidas} séries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Pendente Revisão</p>
                <p className="text-3xl font-bold">{estatisticas.pendentesRevisao}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
            <p className="text-orange-100 text-xs mt-4">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Métricas Avançadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metricas.map((metrica, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 ${metrica.cor} rounded-lg flex items-center justify-center`}>
                    <metrica.icone className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    {metrica.tendencia === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                  </div>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{metrica.valor}</p>
                  <p className="text-sm font-medium text-gray-700">{metrica.nome}</p>
                  <p className="text-xs text-gray-500">{metrica.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo de atividade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {estatisticas.visualizacoesSemana} novos downloads esta semana
                </p>
                <p className="text-xs text-gray-600">
                  Crescimento de {(estatisticas.crescimentoSemanal * 100).toFixed(1)}% comparado à semana anterior
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {estatisticas.conteudosPublicados} conteúdos publicados
                </p>
                <p className="text-xs text-gray-600">
                  Taxa de publicação de {percentualPublicado.toFixed(1)}% - {eficienciaPublicacao}
                </p>
              </div>
            </div>

            {estatisticas.pendentesRevisao > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {estatisticas.pendentesRevisao} conteúdos aguardando revisão
                  </p>
                  <p className="text-xs text-gray-600">
                    Verifique os materiais que precisam de aprovação
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}