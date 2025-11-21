import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Heart, 
  Star, 
  Users, 
  BookOpen,
  TrendingUp,
  Clock,
  Award,
  Send,
  Smile,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Feedback {
  id: string;
  tipo: 'like' | 'duvida' | 'compartilhamento' | 'comentario';
  usuario: string;
  avatar?: string;
  conteudo?: string;
  timestamp: Date;
  bimestreId: string;
}

interface FeedbacksSociaisProps {
  bimestreId: string;
  nomeBimestre: string;
  darkMode?: boolean;
  onEnviarFeedback?: (tipo: string, conteudo?: string) => void;
}

export function FeedbacksSociais({ 
  bimestreId, 
  nomeBimestre, 
  darkMode = false,
  onEnviarFeedback 
}: FeedbacksSociaisProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [showComentarios, setShowComentarios] = useState(false);
  const [likes, setLikes] = useState(Math.floor(Math.random() * 50 + 10));
  const [userLiked, setUserLiked] = useState(false);
  const [compartilhamentos, setCompartilhamentos] = useState(Math.floor(Math.random() * 20 + 5));

  // Feedbacks fictícios para demonstração
  const feedbacksIniciais: Feedback[] = [
    {
      id: '1',
      tipo: 'comentario',
      usuario: 'Ana Silva',
      avatar: 'AS',
      conteudo: 'Este material me ajudou muito a entender o conceito! Muito obrigada professor! 📚',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      bimestreId
    },
    {
      id: '2',
      tipo: 'duvida',
      usuario: 'João Pedro',
      avatar: 'JP',
      conteudo: 'Tenho uma dúvida na página 15 sobre os exercícios. Alguém pode me ajudar?',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      bimestreId
    },
    {
      id: '3',
      tipo: 'like',
      usuario: 'Maria Santos',
      avatar: 'MS',
      conteudo: 'Curtiu este material',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      bimestreId
    }
  ];

  useEffect(() => {
    setFeedbacks(feedbacksIniciais);
  }, [bimestreId]);

  const formatarTempo = (timestamp: Date) => {
    const agora = new Date();
    const diferenca = agora.getTime() - timestamp.getTime();
    const horas = Math.floor(diferenca / (1000 * 60 * 60));
    
    if (horas < 1) {
      const minutos = Math.floor(diferenca / (1000 * 60));
      return `${minutos}m atrás`;
    }
    if (horas < 24) {
      return `${horas}h atrás`;
    }
    const dias = Math.floor(horas / 24);
    return `${dias}d atrás`;
  };

  const handleLike = () => {
    setUserLiked(!userLiked);
    setLikes(prev => userLiked ? prev - 1 : prev + 1);
    
    if (!userLiked) {
      toast.success("👍 Material curtido!", {
        description: "Você demonstrou que gostou deste conteúdo!"
      });
      
      onEnviarFeedback?.('like');
    }
  };

  const handleCompartilhar = () => {
    setCompartilhamentos(prev => prev + 1);
    toast.success("🔗 Material compartilhado!", {
      description: "Link copiado para a área de transferência!"
    });
    
    onEnviarFeedback?.('compartilhamento');
  };

  const handleEnviarComentario = () => {
    if (!novoComentario.trim()) return;
    
    const novoFeedback: Feedback = {
      id: Date.now().toString(),
      tipo: 'comentario',
      usuario: 'Você',
      avatar: 'EU',
      conteudo: novoComentario,
      timestamp: new Date(),
      bimestreId
    };
    
    setFeedbacks(prev => [novoFeedback, ...prev]);
    setNovoComentario('');
    setShowComentarios(false);
    
    toast.success("💬 Comentário enviado!", {
      description: "Sua mensagem foi publicada com sucesso!"
    });
    
    onEnviarFeedback?.('comentario', novoComentario);
  };

  const getIconeFeedback = (tipo: string) => {
    switch (tipo) {
      case 'like': return <ThumbsUp className="w-4 h-4 text-blue-500" />;
      case 'duvida': return <MessageCircle className="w-4 h-4 text-yellow-500" />;
      case 'compartilhamento': return <Share2 className="w-4 h-4 text-green-500" />;
      case 'comentario': return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default: return <Star className="w-4 h-4 text-gray-500" />;
    }
  };

  const estatisticasEngajamento = [
    {
      label: 'Curtidas',
      valor: likes,
      icone: <ThumbsUp className="w-4 h-4" />,
      cor: 'text-blue-600'
    },
    {
      label: 'Comentários',
      valor: feedbacks.filter(f => f.tipo === 'comentario').length,
      icone: <MessageCircle className="w-4 h-4" />,
      cor: 'text-purple-600'
    },
    {
      label: 'Compartilhamentos',
      valor: compartilhamentos,
      icone: <Share2 className="w-4 h-4" />,
      cor: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Ações Rápidas */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                userLiked 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${userLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likes}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowComentarios(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Comentar</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCompartilhar}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">Compartilhar</span>
            </motion.button>
          </div>

          {/* Estatísticas de Engajamento */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {estatisticasEngajamento.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className={`flex items-center justify-center gap-1 ${stat.cor} mb-1`}>
                  {stat.icone}
                  <span className="font-bold">{stat.valor}</span>
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Feedbacks */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <Users className="w-5 h-5" />
            Atividade da Turma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {feedbacks.slice(0, 5).map((feedback, index) => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.1 }}
                className={`flex gap-3 p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={feedback.avatar} />
                  <AvatarFallback className="text-xs">
                    {feedback.avatar}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {feedback.usuario}
                    </span>
                    {getIconeFeedback(feedback.tipo)}
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatarTempo(feedback.timestamp)}
                    </span>
                  </div>
                  
                  {feedback.conteudo && (
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {feedback.conteudo}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {feedbacks.length === 0 && (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Seja o primeiro a comentar neste material!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Comentário */}
      {showComentarios && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Comentar Material
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComentarios(false)}
                className={darkMode ? 'text-gray-400 hover:text-white' : ''}
              >
                ✕
              </Button>
            </div>
            
            <div className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {nomeBimestre}
            </div>
            
            <textarea
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder="Compartilhe suas impressões, dúvidas ou elogios sobre este material..."
              className={`w-full h-32 p-3 rounded-lg border resize-none ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'border-gray-300'
              }`}
              maxLength={300}
            />
            
            <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {novoComentario.length}/300 caracteres
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowComentarios(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEnviarComentario}
                disabled={!novoComentario.trim()}
                className="flex-1 gap-2"
              >
                <Send className="w-4 h-4" />
                Publicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}