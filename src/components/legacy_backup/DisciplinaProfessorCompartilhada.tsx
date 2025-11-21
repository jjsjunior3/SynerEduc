import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { PDFViewer } from './PDFViewer';
import { ForumProfessor } from './ForumProfessor';
import { AtividadesProfessor } from './AtividadesProfessor';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  MessageSquare,
  Calendar,
  User,
  Book,
  Target,
  Menu,
  X,
  Download,
  Loader2,
  Users,
  Eye
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Usuario } from '../types/auth';

interface Disciplina {
  id: string;
  nome: string;
  professor: string;
  cor: string;
  icone: React.ReactNode;
  progresso: number;
}

interface Serie {
  id: string;
  nome: string;
  turma: string;
  totalAlunos: number;
}

interface BimestrePDF {
  id: string;
  nome: string;
  progresso: number;
  pdfUrl?: string;
  descricao: string;
  atividades: any[];
  conteudo?: any; // Dados do conteúdo original do backend
}

interface DisciplinaProfessorCompartilhadaProps {
  disciplina: Disciplina;
  serie: Serie;
  onVoltar: () => void;
  usuario?: Usuario;
}

export function DisciplinaProfessorCompartilhada({ disciplina, serie, onVoltar, usuario }: DisciplinaProfessorCompartilhadaProps) {
  const [activeTab, setActiveTab] = useState('conteudo');
  const [bimestreSelecionado, setBimestreSelecionado] = useState<BimestrePDF | null>(null);
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [bimestres, setBimestres] = useState<BimestrePDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Detectar se é mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarAberta(false);
      }
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Carregar dados da disciplina compartilhada
  useEffect(() => {
    carregarConteudoCompartilhado();
  }, [disciplina.id, usuario?.id]);

  const carregarConteudoCompartilhado = async () => {
    if (!usuario?.id || !disciplina.id) return;

    try {
      setLoading(true);
      setError('');

      console.log(`[DISCIPLINA_PROFESSOR_COMPARTILHADA] Carregando conteúdo compartilhado para professor ${usuario.id}, disciplina ${disciplina.id}`);

      // Usar a nova rota para buscar conteúdo compartilhado
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/usuario/${usuario.id}/disciplina/${disciplina.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setBimestres([]);
          setError('Conteúdo desta disciplina ainda não foi disponibilizado pelos professores conteudistas.');
        } else {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        return;
      }

      const data = await response.json();
      console.log('[DISCIPLINA_PROFESSOR_COMPARTILHADA] Resposta do servidor:', data);
      
      // A API retorna { disciplina, serie, bimestres }
      const bimestresData = data.bimestres || [];
      
      setBimestres(bimestresData);
      
      // Se não há bimestres, mostrar mensagem apropriada
      if (bimestresData.length === 0) {
        setError('Nenhum conteúdo compartilhado disponível para esta disciplina no momento.');
      }
    } catch (error) {
      console.error('Erro ao carregar conteúdo compartilhado:', error);
      setError('Erro ao carregar o conteúdo compartilhado. Tente novamente mais tarde.');
      setBimestres([]);
    } finally {
      setLoading(false);
    }
  };

  const progressoGeral = bimestres.length > 0 
    ? bimestres.reduce((acc, bim) => acc + bim.progresso, 0) / bimestres.length 
    : 0;

  const handleBimestreClick = (bimestre: BimestrePDF) => {
    setBimestreSelecionado(bimestre);
    if (isMobile) {
      setSidebarAberta(false);
    }
  };

  const handleProximoBimestre = () => {
    if (!bimestreSelecionado) return;
    
    const currentIndex = bimestres.findIndex(b => b.id === bimestreSelecionado.id);
    if (currentIndex < bimestres.length - 1) {
      setBimestreSelecionado(bimestres[currentIndex + 1]);
    }
  };

  const handleAnteriorBimestre = () => {
    if (!bimestreSelecionado) return;
    
    const currentIndex = bimestres.findIndex(b => b.id === bimestreSelecionado.id);
    if (currentIndex > 0) {
      setBimestreSelecionado(bimestres[currentIndex - 1]);
    }
  };

  const currentIndex = bimestreSelecionado ? 
    bimestres.findIndex(b => b.id === bimestreSelecionado.id) : -1;

  const contarConteudoDisponivel = () => {
    return bimestres.filter(b => b.progresso > 0).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header da Disciplina */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onVoltar}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                {disciplina.icone}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{disciplina.nome}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Conteúdo compartilhado - {serie.nome}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Progresso Geral</div>
              <div className="flex items-center gap-2">
                <Progress value={progressoGeral} className="w-32" />
                <span className="text-sm font-medium">{Math.round(progressoGeral)}%</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {contarConteudoDisponivel()}/4 bimestres disponíveis
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar - Lista de Bimestres */}
        <div className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300' : 'relative'}
          ${isMobile && !sidebarAberta ? '-translate-x-full' : 'translate-x-0'}
          ${!isMobile ? (sidebarAberta ? 'w-80' : 'w-16') : ''}
          border-r border-gray-200 flex flex-col transition-all duration-300
        `}>
          
          {/* Header da Sidebar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {(!isMobile || sidebarAberta) && (
                <h3 className="font-semibold text-gray-900">Material Compartilhado</h3>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarAberta(!sidebarAberta)}
                className={isMobile ? '' : 'ml-auto'}
              >
                {isMobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Conteúdo da Sidebar */}
          {(!isMobile || sidebarAberta) && (
            <div className="flex-1 overflow-y-auto p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                  <TabsTrigger value="atividades">Atividades</TabsTrigger>
                  <TabsTrigger value="forum">Fórum</TabsTrigger>
                </TabsList>

                <TabsContent value="conteudo" className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-600 text-sm">Carregando conteúdo...</span>
                    </div>
                  ) : error ? (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardContent className="p-4 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                        <p className="text-sm text-yellow-700">{error}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={carregarConteudoCompartilhado}
                          className="mt-3"
                        >
                          Tentar novamente
                        </Button>
                      </CardContent>
                    </Card>
                  ) : bimestres.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Book className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="font-semibold text-gray-700 mb-2">Nenhum conteúdo compartilhado</h3>
                        <p className="text-sm text-gray-600">
                          O material desta disciplina ainda não foi disponibilizado pelos professores conteudistas.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {/* Informações do conteúdo */}
                      <Card className="mb-4">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-700">Para Professores</span>
                            </div>
                            <p className="text-xs text-gray-600">
                              Este conteúdo foi compartilhado pelos professores conteudistas para sua disciplina.
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {bimestres.map((bimestre) => (
                        <Card 
                          key={bimestre.id} 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            bimestreSelecionado?.id === bimestre.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => handleBimestreClick(bimestre)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-red-500" />
                                <span className="font-medium text-sm">{bimestre.nome}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {bimestre.progresso > 0 ? (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Disponível
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1">
                                    <Clock className="w-3 h-3" />
                                    Aguardando
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">{bimestre.descricao}</p>
                            <div className="flex items-center gap-2">
                              <Progress value={bimestre.progresso} className="flex-1 h-2" />
                              <span className="text-xs text-gray-600">{bimestre.progresso}%</span>
                            </div>
                            {bimestre.conteudo && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Por: {bimestre.conteudo.autorNome}</span>
                                  <span>{new Date(bimestre.conteudo.dataUpload).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="atividades" className="space-y-4">
                  <AtividadesProfessor 
                    disciplina={disciplina} 
                    serie={serie} 
                  />
                </TabsContent>

                <TabsContent value="forum" className="space-y-4">
                  <ForumProfessor 
                    disciplina={disciplina} 
                    serie={serie} 
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Área de Visualização do PDF */}
        <div className="flex-1 flex flex-col">
          <PDFViewer
            bimestre={bimestreSelecionado}
            onClose={() => setBimestreSelecionado(null)}
            onProximo={handleProximoBimestre}
            onAnterior={handleAnteriorBimestre}
            hasProximo={currentIndex >= 0 && currentIndex < bimestres.length - 1}
            hasAnterior={currentIndex > 0}
          />
        </div>

        {/* Botão Flutuante Mobile */}
        {isMobile && !sidebarAberta && (
          <Button
            onClick={() => setSidebarAberta(true)}
            className="fixed bottom-6 left-6 z-40 rounded-full w-14 h-14 shadow-lg"
            size="lg"
          >
            <Menu className="w-6 h-6" />
          </Button>
        )}

        {/* Overlay Mobile */}
        {isMobile && sidebarAberta && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarAberta(false)}
          />
        )}
      </div>
    </div>
  );
}