import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Award, 
  BookOpen, 
  Heart, 
  Star,
  Zap,
  Coffee,
  Sun,
  Moon,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BoasVindasMotivacionalProps {
  nomeUsuario: string;
  disciplina: string;
  darkMode?: boolean;
  onComecar: () => void;
  onPular: () => void;
}

export function BoasVindasMotivacional({
  nomeUsuario,
  disciplina,
  darkMode = false,
  onComecar,
  onPular
}: BoasVindasMotivacionalProps) {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [mostrarAnimacao, setMostrarAnimacao] = useState(true);

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return { texto: 'Bom dia', emoji: '🌅', icone: <Sun className="w-6 h-6" /> };
    if (hora < 18) return { texto: 'Boa tarde', emoji: '☀️', icone: <Sun className="w-6 h-6" /> };
    return { texto: 'Boa noite', emoji: '🌙', icone: <Moon className="w-6 h-6" /> };
  };

  const saudacao = getSaudacao();

  const etapas = [
    {
      id: 'boas-vindas',
      titulo: `${saudacao.texto}, ${nomeUsuario}! ${saudacao.emoji}`,
      subtitulo: 'Que bom ter você aqui estudando conosco!',
      conteudo: (
        <div className="text-center space-y-6">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1, 1.1, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-8xl"
          >
            📚
          </motion.div>
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Bem-vindo ao seu ambiente de estudos!
            </h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Você está prestes a iniciar uma jornada incrível de aprendizado em <strong>{disciplina}</strong>.
            </p>
            <div className="flex justify-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                <BookOpen className="w-3 h-3 mr-1" />
                Material Interativo
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                <TrendingUp className="w-3 h-3 mr-1" />
                Progresso em Tempo Real
              </Badge>
              <Badge className="bg-purple-100 text-purple-800">
                <Award className="w-3 h-3 mr-1" />
                Sistema de Conquistas
              </Badge>
            </div>
          </div>
        </div>
      ),
      cor: 'from-blue-500 to-purple-600'
    },
    {
      id: 'recursos',
      titulo: 'Recursos Incríveis Te Esperam! ✨',
      subtitulo: 'Descubra tudo que preparamos para o seu sucesso',
      conteudo: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Objetivos Claros
              </h3>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Cada material tem objetivos específicos para guiar seu aprendizado
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Progresso Visual
              </h3>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Acompanhe seu desenvolvimento com barras de progresso e estatísticas
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-purple-50'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Sistema de Conquistas
              </h3>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Desbloqueie conquistas e celebre cada marco do seu aprendizado
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-yellow-50'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Suporte Total
              </h3>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Tire dúvidas diretamente com o professor e interaja com a turma
            </p>
          </motion.div>
        </div>
      ),
      cor: 'from-green-500 to-blue-600'
    },
    {
      id: 'motivacao',
      titulo: 'Você É Capaz de Grandes Conquistas! 🌟',
      subtitulo: 'Lembre-se: cada pequeno passo te leva mais perto do seu objetivo',
      conteudo: (
        <div className="text-center space-y-6">
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl"
          >
            🎯
          </motion.div>
          
          <div className="space-y-4">
            <blockquote className={`text-lg italic ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              "O sucesso é a soma de pequenos esforços repetidos dia após dia."
            </blockquote>
            
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl mb-2">📖</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Leia com atenção
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">✍️</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Faça anotações
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🎉</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Celebre o progresso
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      cor: 'from-yellow-500 to-orange-600'
    }
  ];

  const etapa = etapas[etapaAtual];

  const handleProxima = () => {
    if (etapaAtual < etapas.length - 1) {
      setEtapaAtual(etapaAtual + 1);
    } else {
      onComecar();
    }
  };

  const handleAnterior = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1);
    }
  };

  return (
    <AnimatePresence>
      {mostrarAnimacao && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full max-w-4xl"
          >
            <Card className={`overflow-hidden shadow-2xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
              {/* Header com Gradiente */}
              <div className={`h-2 bg-gradient-to-r ${etapa.cor}`} />
              
              <CardContent className="p-8">
                {/* Indicador de Progresso */}
                <div className="flex justify-center mb-6">
                  <div className="flex gap-2">
                    {etapas.map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === etapaAtual
                            ? 'bg-blue-500'
                            : index < etapaAtual
                            ? 'bg-green-500'
                            : `${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Conteúdo da Etapa */}
                <div className="text-center mb-8">
                  <motion.h1 
                    key={etapa.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    {etapa.titulo}
                  </motion.h1>
                  <motion.p
                    key={`${etapa.id}-sub`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                  >
                    {etapa.subtitulo}
                  </motion.p>
                </div>

                {/* Conteúdo Específico da Etapa */}
                <motion.div
                  key={etapa.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  {etapa.conteudo}
                </motion.div>

                {/* Ações */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="ghost"
                    onClick={onPular}
                    className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600'}
                  >
                    Pular apresentação
                  </Button>

                  <div className="flex gap-3">
                    {etapaAtual > 0 && (
                      <Button
                        variant="outline"
                        onClick={handleAnterior}
                      >
                        Anterior
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleProxima}
                      className={`gap-2 bg-gradient-to-r ${etapa.cor} text-white hover:opacity-90`}
                    >
                      {etapaAtual === etapas.length - 1 ? (
                        <>
                          <Zap className="w-4 h-4" />
                          Vamos Começar!
                        </>
                      ) : (
                        <>
                          Próximo
                          <Sparkles className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}