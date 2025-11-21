import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  MessageCircle, 
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
   import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Comentario {
  id: string;
  usuario_nome: string;
  usuario_tipo: string;
  conteudo: string;
  timestamp: Date;
  respondido: boolean;
  resposta?: string;
  resposta_timestamp?: Date;
}

interface ComentariosPedagogicosProps {
  bimestreId: string;
  disciplinaId: string;
  nomeBimestre: string;
  darkMode?: boolean;
}

export function ComentariosPedagogicos({ 
  bimestreId, 
  disciplinaId,
  nomeBimestre, 
  darkMode = false 
}: ComentariosPedagogicosProps) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [carregandoComentarios, setCarregandoComentarios] = useState(true);
  const { usuario } = useAuth();

  // Carregar comentários existentes
  useEffect(() => {
    carregarComentarios();
  }, [bimestreId]);

  const carregarComentarios = async () => {
    if (!usuario?.id || !bimestreId) return;

    try {
      setCarregandoComentarios(true);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/comentarios-material/${bimestreId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComentarios(data.comentarios || []);
      }
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      // Não mostrar erro para não interromper a experiência
    } finally {
      setCarregandoComentarios(false);
    }
  };

  const formatarTempo = (timestamp: Date) => {
    const agora = new Date();
    const data = new Date(timestamp);
    const diferenca = agora.getTime() - data.getTime();
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

  const handleEnviarComentario = async () => {
    if (!novoComentario.trim() || !usuario?.id) return;
    
    try {
      setLoading(true);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/comentarios-material`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bimestreId,
          disciplinaId,
          usuarioId: usuario.id,
          conteudo: novoComentario.trim()
        })
      });

      if (response.ok) {
        // Adicionar comentário localmente para feedback imediato
        const novoComentarioObj: Comentario = {
          id: Date.now().toString(),
          usuario_nome: usuario.nome || 'Você',
          usuario_tipo: usuario.tipo || 'aluno',
          conteudo: novoComentario.trim(),
          timestamp: new Date(),
          respondido: false
        };
        
        setComentarios(prev => [novoComentarioObj, ...prev]);
        setNovoComentario('');
        
        toast.success("💬 Dúvida enviada!", {
          description: "Sua dúvida foi enviada para o professor. Você receberá uma resposta em breve."
        });
      } else {
        throw new Error('Erro ao enviar comentário');
      }
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      toast.error("Erro ao enviar dúvida", {
        description: "Tente novamente em alguns instantes."
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoUsuarioLabel = (tipo: string) => {
    switch (tipo) {
      case 'professor': return 'Professor';
      case 'coordenador': return 'Coordenador';
      case 'administrador': return 'Administrador';
      default: return 'Aluno';
    }
  };

  const getTipoUsuarioColor = (tipo: string) => {
    switch (tipo) {
      case 'professor': return 'text-blue-600';
      case 'coordenador': return 'text-purple-600';
      case 'administrador': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Área para Nova Dúvida */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <MessageCircle className={`w-5 h-5 mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Tem alguma dúvida sobre este material?
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Envie sua pergunta diretamente para o professor. Sua dúvida aparecerá no sistema de comunicados da disciplina.
              </p>
            </div>
          </div>
          
          <textarea
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Digite sua dúvida sobre o conteúdo do material..."
            className={`w-full h-24 p-3 rounded-lg border resize-none ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'border-gray-300 bg-white'
            }`}
            maxLength={500}
          />
          
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {novoComentario.length}/500 caracteres
            </span>
            
            <Button
              onClick={handleEnviarComentario}
              disabled={!novoComentario.trim() || loading}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Dúvida'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Comentários/Dúvidas */}
      {comentarios.length > 0 && (
        <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <MessageCircle className="w-5 h-5" />
              Dúvidas e Respostas - {nomeBimestre}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {carregandoComentarios ? (
              <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p>Carregando dúvidas...</p>
              </div>
            ) : (
              <AnimatePresence>
                {comentarios.map((comentario, index) => (
                  <motion.div
                    key={comentario.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border rounded-lg p-4 ${
                      darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {/* Pergunta do Aluno */}
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {comentario.usuario_nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {comentario.usuario_nome}
                          </span>
                          <span className={`text-xs ${getTipoUsuarioColor(comentario.usuario_tipo)}`}>
                            {getTipoUsuarioLabel(comentario.usuario_tipo)}
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatarTempo(comentario.timestamp)}
                          </span>
                          {comentario.respondido ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {comentario.conteudo}
                        </p>

                        {/* Resposta do Professor */}
                        {comentario.respondido && comentario.resposta && (
                          <div className={`mt-3 p-3 rounded-lg border-l-4 border-blue-500 ${
                            darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-blue-500" />
                              <span className={`font-medium text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                Resposta do Professor
                              </span>
                              {comentario.resposta_timestamp && (
                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {formatarTempo(comentario.resposta_timestamp)}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                              {comentario.resposta}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {comentarios.length === 0 && !carregandoComentarios && (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma dúvida enviada ainda.</p>
                <p className="text-sm mt-1">Seja o primeiro a fazer uma pergunta sobre este material!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}