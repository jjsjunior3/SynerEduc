import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ArrowLeft, MessageSquare, Calendar, User, Loader2, Eye } from 'lucide-react';
   import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  autorNome: string;
  dataPublicacao: string;
  tipo: 'geral' | 'urgente' | 'aviso' | 'evento';
  destinatarios: string[];
  ativo: boolean;
}

interface ComunicadosPageProps {
  onVoltar: () => void;
}

export function ComunicadosPage({ onVoltar }: ComunicadosPageProps) {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuth();

  useEffect(() => {
    carregarComunicados();
  }, [usuario?.id]);

  const carregarComunicados = async () => {
    if (!usuario?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/comunicados/usuario/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComunicados(data.comunicados || []);
      }
    } catch (error) {
      console.error('Erro ao carregar comunicados:', error);
      setComunicados([]);
    } finally {
      setLoading(false);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'urgente':
        return 'bg-red-100 text-red-800';
      case 'evento':
        return 'bg-purple-100 text-purple-800';
      case 'aviso':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'urgente':
        return 'Urgente';
      case 'evento':
        return 'Evento';
      case 'aviso':
        return 'Aviso';
      default:
        return 'Geral';
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <h1 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comunicados
            </h1>
            <p className="text-sm text-gray-600">
              Comunicados e avisos importantes da escola
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Carregando comunicados...</span>
            </div>
          ) : comunicados.length === 0 ? (
            <Card className="p-12 text-center">
              <CardContent>
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum comunicado disponível
                </h3>
                <p className="text-gray-600">
                  Quando houver novos comunicados, eles aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {comunicados.map((comunicado) => (
                <Card key={comunicado.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{comunicado.titulo}</CardTitle>
                          <Badge className={getTipoColor(comunicado.tipo)}>
                            {getTipoLabel(comunicado.tipo)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{comunicado.autorNome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatarData(comunicado.dataPublicacao)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {comunicado.conteudo}
                      </p>
                    </div>
                    
                    {comunicado.destinatarios && comunicado.destinatarios.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Destinatários:</span>
                          <div className="flex gap-1">
                            {comunicado.destinatarios.map((dest, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {dest === 'todos' ? 'Todos' : 
                                 dest === 'aluno' ? 'Alunos' :
                                 dest === 'professor' ? 'Professores' :
                                 dest === 'coordenador' ? 'Coordenadores' :
                                 dest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}