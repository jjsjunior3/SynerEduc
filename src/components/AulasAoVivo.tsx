import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  Link as LinkIcon,
  ExternalLink,
  Lock,
  UserCheck,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AulaAoVivo {
  id: string;
  titulo: string;
  descricao: string;
  dataHora: string;
  duracao: string;
  plataforma: 'google-meet' | 'zoom';
  link: string;
  status: 'agendada' | 'em-andamento' | 'finalizada';
  participantesEsperados: number;
  temAcesso: boolean;
}

interface AulasAoVivoProps {
  disciplinaId: string;
  nomeDisciplina: string;
}

export function AulasAoVivo({ disciplinaId, nomeDisciplina }: AulasAoVivoProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [aulas, setAulas] = useState<AulaAoVivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { usuario } = useAuth();

  // Carregar aulas quando o modal for aberto
  const handleAbrirModal = () => {
    setModalAberto(true);
    if (aulas.length === 0) {
      carregarAulas();
    }
  };

  const carregarAulas = async () => {
    if (!usuario?.id || !disciplinaId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/aulas-ao-vivo/disciplina/${disciplinaId}/aluno/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setAulas([]);
          return;
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAulas(data.aulas || []);
    } catch (error) {
      console.error('Erro ao carregar aulas ao vivo:', error);
      setError('Erro ao carregar aulas ao vivo. Tente novamente mais tarde.');
      setAulas([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Agendada</Badge>;
      case 'em-andamento':
        return <Badge className="bg-green-500 text-white">Em Andamento</Badge>;
      case 'finalizada':
        return <Badge variant="secondary">Finalizada</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getPlataformaIcon = (plataforma: string) => {
    switch (plataforma) {
      case 'google-meet':
        return <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">M</div>;
      case 'zoom':
        return <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">Z</div>;
      default:
        return <Video className="w-5 h-5" />;
    }
  };

  const formatarDataHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleEntrarAula = (aula: AulaAoVivo) => {
    if (aula.temAcesso && aula.status !== 'finalizada') {
      window.open(aula.link, '_blank');
    }
  };

  const aulasAgendadas = aulas.filter(aula => aula.status === 'agendada');
  const aulasFinalizadas = aulas.filter(aula => aula.status === 'finalizada');

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="w-5 h-5 text-blue-500" />
            Aulas ao Vivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Participe das aulas ao vivo para tirar dúvidas e revisar conteúdos importantes.
          </p>
          <Button 
            onClick={handleAbrirModal}
            className="w-full"
          >
            <Video className="w-4 h-4 mr-2" />
            Ver Aulas Disponíveis
          </Button>
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Aulas ao Vivo - {nomeDisciplina}
            </DialogTitle>
            <DialogDescription>
              Acesse as aulas ao vivo para interagir diretamente com o professor e colegas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                <span className="text-gray-600">Carregando aulas...</span>
              </div>
            ) : error ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <p className="text-sm text-red-700 mb-3">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carregarAulas}
                  >
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Aulas Agendadas */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Próximas Aulas ({aulasAgendadas.length})
                  </h3>
                  
                  {aulasAgendadas.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-gray-500">
                        <Video className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhuma aula agendada no momento.</p>
                        <p className="text-sm">As próximas aulas aparecerão aqui quando forem programadas.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {aulasAgendadas.map((aula) => {
                        const { data, hora } = formatarDataHora(aula.dataHora);
                        return (
                          <Card key={aula.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">{aula.titulo}</h4>
                                    {getStatusBadge(aula.status)}
                                  </div>
                                  <p className="text-gray-600 text-sm mb-3">{aula.descricao}</p>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <span>{data}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4 text-gray-400" />
                                      <span>{hora}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4 text-gray-400" />
                                      <span>{aula.participantesEsperados} alunos</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getPlataformaIcon(aula.plataforma)}
                                      <span className="capitalize">{aula.plataforma.replace('-', ' ')}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="ml-4 flex flex-col gap-2">
                                  {aula.temAcesso ? (
                                    <Button
                                      onClick={() => handleEntrarAula(aula)}
                                      className="gap-2"
                                      disabled={aula.status === 'finalizada'}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      Entrar na Aula
                                    </Button>
                                  ) : (
                                    <Button disabled className="gap-2">
                                      <Lock className="w-4 h-4" />
                                      Acesso Restrito
                                    </Button>
                                  )}
                                  <div className="text-xs text-gray-500 text-center">
                                    Duração: {aula.duracao}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {aulasFinalizadas.length > 0 && (
                  <>
                    <Separator />
                    
                    {/* Aulas Finalizadas */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Aulas Anteriores ({aulasFinalizadas.length})
                      </h3>
                      
                      <div className="space-y-3">
                        {aulasFinalizadas.map((aula) => {
                          const { data, hora } = formatarDataHora(aula.dataHora);
                          return (
                            <Card key={aula.id} className="border-l-4 border-l-gray-300">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-gray-700">{aula.titulo}</h4>
                                      {getStatusBadge(aula.status)}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{data}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{hora}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {getPlataformaIcon(aula.plataforma)}
                                        <span className="capitalize">{aula.plataforma.replace('-', ' ')}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Informações de Segurança */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Informações de Segurança
                    </h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Os links das aulas são exclusivos para alunos matriculados na disciplina.</p>
                      <p>• Mantenha seu microfone desligado até ser solicitado pelo professor.</p>
                      <p>• Use o chat para fazer perguntas durante a aula.</p>
                      <p>• As aulas podem ser gravadas para consulta posterior.</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}