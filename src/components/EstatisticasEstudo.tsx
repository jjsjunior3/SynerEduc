import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Target, 
  Book, 
  Award, 
  Zap, 
  BarChart3,
  CheckCircle,
  Flame,
  Star
} from 'lucide-react';
import { motion } from 'motion/react';

interface EstatisticasEstudoProps {
  tempoEstudoHoje: number;
  metaDiariaMinutos: number;
  sequenciaDias: number;
  bimestresCompletos: number;
  tempoMedioSemanal: number;
  darkMode?: boolean;
}

export function EstatisticasEstudo({
  tempoEstudoHoje,
  metaDiariaMinutos = 60, // 1 hora por dia
  sequenciaDias,
  bimestresCompletos,
  tempoMedioSemanal,
  darkMode = false
}: EstatisticasEstudoProps) {
  const [timeUpdater, setTimeUpdater] = useState(0);

  // Atualizar a cada minuto para manter o tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdater(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const progressoMetaDiaria = Math.min((tempoEstudoHoje / metaDiariaMinutos) * 100, 100);
  const metaAtingida = tempoEstudoHoje >= metaDiariaMinutos;

  const getSequenciaColor = (dias: number) => {
    if (dias >= 30) return 'from-purple-500 to-purple-700';
    if (dias >= 14) return 'from-blue-500 to-blue-700';
    if (dias >= 7) return 'from-green-500 to-green-700';
    if (dias >= 3) return 'from-yellow-500 to-yellow-700';
    return 'from-gray-400 to-gray-600';
  };

  const getSequenciaTitle = (dias: number) => {
    if (dias >= 30) return 'Lenda dos Estudos!';
    if (dias >= 14) return 'Estudante Dedicado!';
    if (dias >= 7) return 'Uma Semana Forte!';
    if (dias >= 3) return 'Bom Ritmo!';
    return 'Continue Assim!';
  };

  const estatisticas = [
    {
      titulo: 'Tempo Hoje',
      valor: formatTime(tempoEstudoHoje),
      icone: <Clock className="w-5 h-5" />,
      cor: metaAtingida ? 'text-green-600' : 'text-blue-600',
      progresso: progressoMetaDiaria,
      meta: `Meta: ${formatTime(metaDiariaMinutos)}`,
      metaAtingida
    },
    {
      titulo: 'Sequência',
      valor: `${sequenciaDias} dias`,
      icone: <Flame className="w-5 h-5" />,
      cor: 'text-orange-600',
      subtitle: getSequenciaTitle(sequenciaDias)
    },
    {
      titulo: 'Bimestres Completos',
      valor: bimestresCompletos.toString(),
      icone: <CheckCircle className="w-5 h-5" />,
      cor: 'text-emerald-600',
      subtitle: 'Materiais concluídos'
    },
    {
      titulo: 'Média Semanal',
      valor: formatTime(tempoMedioSemanal),
      icone: <TrendingUp className="w-5 h-5" />,
      cor: 'text-purple-600',
      subtitle: 'Por semana'
    }
  ];

  const achievements = [
    {
      id: 'early-bird',
      title: 'Madrugador',
      condition: new Date().getHours() < 8,
      icon: '🌅'
    },
    {
      id: 'night-owl',
      title: 'Coruja Noturna', 
      condition: new Date().getHours() >= 22,
      icon: '🦉'
    },
    {
      id: 'goal-crusher',
      title: 'Destruidor de Metas',
      condition: metaAtingida,
      icon: '🎯'
    },
    {
      id: 'streak-master',
      title: 'Mestre da Consistência',
      condition: sequenciaDias >= 7,
      icon: '🔥'
    }
  ];

  const activeAchievements = achievements.filter(a => a.condition);

  return (
    <div className="space-y-6">
      {/* Cartão Principal - Meta Diária */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <Target className="w-5 h-5 text-blue-500" />
            Meta de Estudo Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${metaAtingida ? 'text-green-600' : 'text-blue-600'}`}>
                  {formatTime(tempoEstudoHoje)}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  de {formatTime(metaDiariaMinutos)}
                </div>
              </div>
              <div className={`text-4xl ${metaAtingida ? '🎉' : '⏰'}`} />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Progresso
                </span>
                <span className={`text-sm font-medium ${metaAtingida ? 'text-green-600' : 'text-blue-600'}`}>
                  {Math.round(progressoMetaDiaria)}%
                </span>
              </div>
              <Progress value={progressoMetaDiaria} className="h-3" />
            </div>

            {metaAtingida && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className={`font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    Meta atingida! Parabéns! 🎯
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {estatisticas.map((stat, index) => (
          <motion.div
            key={stat.titulo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-lg transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className={stat.cor}>
                      {stat.icone}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {stat.titulo}
                    </h3>
                    <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stat.valor}
                    </div>
                  </div>
                </div>
                
                {stat.progresso !== undefined && (
                  <div className="space-y-1">
                    <Progress value={stat.progresso} className="h-2" />
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stat.meta}
                    </div>
                  </div>
                )}
                
                {stat.subtitle && (
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    {stat.subtitle}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sequência de Dias */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}>
        <CardContent className="p-0">
          <div className={`p-6 bg-gradient-to-r ${getSequenciaColor(sequenciaDias)}`}>
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  🔥 {sequenciaDias} Dias Consecutivos
                </h3>
                <p className="text-white/90 text-sm">
                  {getSequenciaTitle(sequenciaDias)}
                </p>
              </div>
              <div className="text-3xl">
                {sequenciaDias >= 7 ? '🏆' : '💪'}
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
              Continue estudando todos os dias para manter sua sequência!
            </div>
            
            {/* Visualização dos últimos 7 dias */}
            <div className="flex gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const dayOffset = 6 - i;
                const isActiveDay = dayOffset < sequenciaDias;
                const isToday = dayOffset === 0;
                
                return (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      isActiveDay
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'}`
                    } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {isActiveDay ? '✓' : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conquistas Ativas */}
      {activeAchievements.length > 0 && (
        <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <Star className="w-5 h-5 text-yellow-500" />
              Conquistas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeAchievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <h4 className={`font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                        {achievement.title}
                      </h4>
                      <Badge className="bg-yellow-500 text-white text-xs">
                        Ativo agora!
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}