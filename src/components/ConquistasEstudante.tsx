import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Trophy, 
  Star, 
  Award, 
  Target, 
  Book, 
  Calendar, 
  Zap, 
  TrendingUp,
  CheckCircle,
  Flame,
  Medal,
  Crown,
  Sparkles,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface Conquista {
  id: string;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  conquistada: boolean;
  progresso: number;
  meta: number;
  categoria: 'estudo' | 'tempo' | 'disciplina' | 'especial';
  cor: string;
}

interface ConquistasEstudanteProps {
  bimestresCompletos: number;
  tempoEstudo: number;
  disciplinasCompletas: number;
}

export function ConquistasEstudante({
  bimestresCompletos,
  tempoEstudo,
  disciplinasCompletas,
}: ConquistasEstudanteProps) {
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
  const [conquistasDesbloqueadas, setConquistasDesbloqueadas] = useState<string[]>([]);
  const [showNewConquista, setShowNewConquista] = useState<Conquista | null>(null);

  // Sistema de conquistas
  const conquistas: Conquista[] = [
    {
      id: 'primeiro-bimestre',
      titulo: 'Primeiro Passo',
      descricao: 'Complete seu primeiro bimestre',
      icone: <Star className="w-6 h-6" />,
      conquistada: bimestresCompletos >= 1,
      progresso: Math.min(bimestresCompletos, 1),
      meta: 1,
      categoria: 'estudo',
      cor: 'from-yellow-400 to-yellow-600'
    },
    {
      id: 'cinco-bimestres',
      titulo: 'Estudante Dedicado',
      descricao: 'Complete 5 bimestres',
      icone: <Trophy className="w-6 h-6" />,
      conquistada: bimestresCompletos >= 5,
      progresso: Math.min(bimestresCompletos, 5),
      meta: 5,
      categoria: 'estudo',
      cor: 'from-blue-400 to-blue-600'
    },
    {
      id: 'dez-bimestres',
      titulo: 'Mestre dos Estudos',
      descricao: 'Complete 10 bimestres',
      icone: <Crown className="w-6 h-6" />,
      conquistada: bimestresCompletos >= 10,
      progresso: Math.min(bimestresCompletos, 10),
      meta: 10,
      categoria: 'estudo',
      cor: 'from-purple-400 to-purple-600'
    },
    {
      id: 'uma-hora-estudo',
      titulo: 'Hora de Foco',
      descricao: 'Estude por 1 hora consecutiva',
      icone: <Clock className="w-6 h-6" />,
      conquistada: tempoEstudo >= 3600,
      progresso: Math.min(tempoEstudo, 3600),
      meta: 3600,
      categoria: 'tempo',
      cor: 'from-green-400 to-green-600'
    },
    {
      id: 'sequencia-sete-dias',
      titulo: 'Sequência Perfeita',
      descricao: 'Estude 7 dias consecutivos',
      icone: <Flame className="w-6 h-6" />,
      conquistada: false, // Seria calculado com base na sequência real
      progresso: 5, // Simulado
      meta: 7,
      categoria: 'especial',
      cor: 'from-red-400 to-red-600'
    },
    {
      id: 'primeira-disciplina',
      titulo: 'Especialista',
      descricao: 'Complete uma disciplina inteira',
      icone: <Medal className="w-6 h-6" />,
      conquistada: disciplinasCompletas >= 1,
      progresso: Math.min(disciplinasCompletas, 1),
      meta: 1,
      categoria: 'disciplina',
      cor: 'from-emerald-400 to-emerald-600'
    }
  ];

  // Verificar novas conquistas
  useEffect(() => {
    const novasConquistas = conquistas.filter(c => 
      c.conquistada && !conquistasDesbloqueadas.includes(c.id)
    );

    if (novasConquistas.length > 0) {
      const novaConquista = novasConquistas[0];
      setConquistasDesbloqueadas(prev => [...prev, novaConquista.id]);
      setShowNewConquista(novaConquista);
      
      setTimeout(() => {
        setShowNewConquista(null);
      }, 4000);
    }
  }, [bimestresCompletos, tempoEstudo, disciplinasCompletas]);

  const conquistasConquistadas = conquistas.filter(c => c.conquistada).length;
  const progressoGeral = (conquistasConquistadas / conquistas.length) * 100;

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria) {
      case 'estudo': return <Book className="w-4 h-4" />;
      case 'tempo': return <Calendar className="w-4 h-4" />;
      case 'disciplina': return <Target className="w-4 h-4" />;
      case 'especial': return <Sparkles className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Notificação de Nova Conquista */}
      <AnimatePresence>
        {showNewConquista && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            className="fixed top-4 right-4 z-50 max-w-sm"
          >
            <Card className={`border-2 border-yellow-400 shadow-lg ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${showNewConquista.cor} flex items-center justify-center`}>
                    {showNewConquista.icone}
                  </div>
                  <div>
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      🎉 Nova Conquista!
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {showNewConquista.titulo}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {showNewConquista.descricao}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Painel de Conquistas */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <Trophy className="w-5 h-5 text-yellow-500" />
            Suas Conquistas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Progress value={progressoGeral} className="flex-1" />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {conquistasConquistadas}/{conquistas.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {conquistas.map((conquista, index) => (
            <motion.div
              key={conquista.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                conquista.conquistada
                  ? `${darkMode ? 'bg-gray-700 border-green-500' : 'bg-green-50 border-green-200'} shadow-md`
                  : `${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  conquista.conquistada
                    ? `bg-gradient-to-r ${conquista.cor} text-white`
                    : `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-500'}`
                }`}>
                  {conquista.conquistada ? (
                    conquista.icone
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-current" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${
                      conquista.conquistada
                        ? (darkMode ? 'text-green-300' : 'text-green-800')
                        : (darkMode ? 'text-gray-300' : 'text-gray-700')
                    }`}>
                      {conquista.titulo}
                    </h4>
                    
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {getCategoriaIcon(conquista.categoria)}
                      <span className="ml-1 capitalize">{conquista.categoria}</span>
                    </Badge>
                    
                    {conquista.conquistada && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {conquista.descricao}
                  </p>
                  
                  {!conquista.conquistada && (
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(conquista.progresso / conquista.meta) * 100} 
                        className="flex-1 h-2" 
                      />
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {conquista.progresso}/{conquista.meta}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}