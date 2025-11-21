import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Bell, User, MessageSquare, Calendar, BarChart3, ArrowLeft, ChevronRight, Book, Palette, Users, Zap, ChevronDown, Loader2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import logoEscola from 'figma:asset/e339c695d5503d560f7e53d2039456d52fd95ea5.png';
import { NotificacoesReal } from './NotificacoesReal';
import { HorarioEscolar } from './HorarioEscolar';
import { PerfilUsuario } from './PerfilUsuario';
import { getDisciplinasPorSerie, DisciplinaConfig } from '../utils/disciplinasPorSerie';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Usuario } from '../types/auth';

interface Disciplina {
  id: string;
  nome: string;
  professor: string;
  cor: string;
  icone: React.ReactNode;
  progresso: number;
  proximaAula?: string;
}

interface DashboardProps {
  onDisciplinaClick: (disciplina: Disciplina) => void;
  onBoletimClick: () => void;
  onBackToSite?: () => void;
  onComunicadosClick?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
}

export function Dashboard({ onDisciplinaClick, onBoletimClick, onBackToSite, onComunicadosClick, usuario, logout, atualizarUsuario }: DashboardProps) {
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [loadingComunicados, setLoadingComunicados] = useState(true);
  const [contadorNotificacoes, setContadorNotificacoes] = useState(0);

  const carregarContadorNotificacoes = async () => {
    if (!usuario?.id) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/notificacoes/${usuario.id}/count`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContadorNotificacoes(data.count || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar contador de notificações:', error);
      setContadorNotificacoes(0);
    }
  };

  useEffect(() => {
    const carregarDisciplinas = async () => {
      try {
        setLoading(true);
        
        // Verificação de segurança para prevenir erro "Cannot read properties of undefined"
        if (!usuario) {
          console.warn('[DASHBOARD] Usuário não está disponível, aguardando...');
          setLoading(false);
          return;
        }
        
        const serieUsuario = usuario?.serie || '3ª série - Ensino Médio';
        console.log(`[DASHBOARD] Carregando disciplinas para usuário:`, { 
          nome: usuario?.nome, 
          serie: serieUsuario,
          usuarioCompleto: usuario 
        });
        
        // Verificação adicional antes de chamar a função
        if (!serieUsuario || serieUsuario.trim() === '') {
          console.warn('[DASHBOARD] Série do usuário está vazia, usando padrão');
          const seriePadrao = '3ª série - Ensino Médio';
          const disciplinasConfig = await getDisciplinasPorSerie(seriePadrao);
          
          const disciplinasComIcones: Disciplina[] = disciplinasConfig.map((disc) => ({
            ...disc,
            icone: <div className={`w-8 h-8 ${disc.cor.replace('bg-', 'bg-').replace('-200', '-500')} rounded flex items-center justify-center text-white`}>{disc.icone}</div>
          }));
          
          setDisciplinas(disciplinasComIcones);
          console.log(`[DASHBOARD] ${disciplinasComIcones.length} disciplinas configuradas com série padrão`);
          return;
        }
        
        const disciplinasConfig = await getDisciplinasPorSerie(serieUsuario);
        console.log(`[DASHBOARD] Disciplinas carregadas:`, disciplinasConfig);
        
        const disciplinasComIcones: Disciplina[] = disciplinasConfig.map((disc) => ({
          ...disc,
          icone: <div className={`w-8 h-8 ${disc.cor.replace('bg-', 'bg-').replace('-200', '-500')} rounded flex items-center justify-center text-white`}>{disc.icone}</div>
        }));
        
        setDisciplinas(disciplinasComIcones);
        console.log(`[DASHBOARD] ${disciplinasComIcones.length} disciplinas configuradas com ícones`);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        // Definir disciplinas vazias em caso de erro para evitar crash
        setDisciplinas([]);
      } finally {
        setLoading(false);
      }
    };

    const carregarComunicados = async () => {
      if (!usuario?.id) return;

      try {
        setLoadingComunicados(true);
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
        setLoadingComunicados(false);
      }
    };

    carregarDisciplinas();
    carregarComunicados();
    carregarContadorNotificacoes();
  }, [usuario?.serie, usuario?.id]);

  const handleNotificacaoClose = () => {
    setMostrarNotificacoes(false);
    // Recarregar contador após fechar notificações
    carregarContadorNotificacoes();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logoEscola}
              alt="Colégio Conexão EAD Maranhense"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="font-semibold text-gray-900">Colégio Conexão EAD Maranhense</h1>
              <p className="text-sm text-gray-600">
                {usuario?.serie || '3ª Série - Ensino Médio'} • Turma {usuario?.turma || 'A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {onBackToSite && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onBackToSite}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Site
              </Button>
            )}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
              >
                <Bell className="w-4 h-4" />
                {contadorNotificacoes > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">{contadorNotificacoes}</span>
                  </div>
                )}
              </Button>
              
              {mostrarNotificacoes && (
                <div className="absolute top-full right-0 mt-2 z-50">
                  <NotificacoesReal onClose={handleNotificacaoClose} />
                </div>
              )}
            </div>
            <div className="relative">
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 h-auto p-2"
                onClick={() => setMostrarPerfil(true)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario?.avatar} alt={usuario?.nome} />
                  <AvatarFallback className="text-sm">
                    {usuario?.nome ? usuario.nome.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">{usuario?.nome || 'Usuário'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Carregando disciplinas...</span>
              </div>
            ) : (
              <div>
                {disciplinas.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CardContent>
                      <div className="text-gray-500">
                        <Book className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhuma disciplina encontrada</h3>
                        <p className="text-sm mb-2">
                          Não há disciplinas cadastradas para a série <strong>"{usuario?.serie}"</strong>.
                        </p>
                        <p className="text-xs text-gray-400 mb-4">
                          Usuário: {usuario?.nome} • Tipo: {usuario?.tipo} • Série: {usuario?.serie}
                        </p>
                        <p className="text-sm">
                          Entre em contato com a secretaria ou verifique se a série está configurada corretamente.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {disciplinas.map((disciplina) => (
                      <Card
                        key={disciplina.id}
                        className={`${disciplina.cor} border-0 cursor-pointer hover:shadow-lg transition-shadow duration-200`}
                        onClick={() => onDisciplinaClick(disciplina)}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center gap-4">
                            {disciplina.icone}
                            <div>
                              <h3 className="font-semibold text-gray-800 mb-1">
                                {disciplina.nome}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {disciplina.professor}
                              </p>
                              <div className="space-y-2">
                                <Progress value={disciplina.progresso} className="h-2" />
                                <p className="text-xs text-gray-600">
                                  {disciplina.progresso}% concluído
                                </p>
                                {disciplina.proximaAula && (
                                  <Badge variant="secondary" className="text-xs">
                                    Próxima: {disciplina.proximaAula}
                                  </Badge>
                                )}
                                {disciplina.progresso === 0 && (
                                  <Badge variant="outline" className="text-xs text-amber-600">
                                    Aguardando conteúdo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Comunicados */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold">COMUNICADOS</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-3">
                  {loadingComunicados ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-4 h-4 mx-auto mb-2 animate-spin" />
                      <p className="text-gray-500 text-xs">Carregando comunicados...</p>
                    </div>
                  ) : comunicados.length === 0 ? (
                    <div className="text-center py-4">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-gray-500 text-xs">Nenhum comunicado disponível no momento.</p>
                    </div>
                  ) : (
                    comunicados.slice(0, 3).map((comunicado, index) => (
                      <div key={index} className="border-l-4 border-blue-400 pl-3 py-2">
                        <h4 className="font-medium text-gray-800 mb-1">{comunicado.titulo}</h4>
                        <p className="text-xs mb-2">{comunicado.conteudo}</p>
                        <span className="text-xs text-gray-500">
                          Publicado em {new Date(comunicado.dataPublicacao).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))
                  )}
                  {comunicados.length > 0 && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-blue-500 text-xs"
                      onClick={onComunicadosClick}
                    >
                      Ver todos os comunicados <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Boletim */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onBoletimClick}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold">BOLETIM</h3>
                </div>
                <div className="flex justify-center">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1560719887-fe3105fa1e55?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMHN0dWR5aW5nJTIwYm9va3N8ZW58MXx8fHwxNzU2NTU5NzA3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Boletim"
                    className="w-16 h-12 object-cover rounded"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">Clique para ver as notas</p>
              </CardContent>
            </Card>

            {/* Horário Escolar */}
            <HorarioEscolar usuario={usuario} />
          </div>
        </div>
      </div>

      {/* Modal de Perfil */}
      <PerfilUsuario 
        open={mostrarPerfil} 
        onOpenChange={setMostrarPerfil}
        usuario={usuario}
        logout={logout}
        atualizarUsuario={atualizarUsuario}
      />
    </div>
  );
}