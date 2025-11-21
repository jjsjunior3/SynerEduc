import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { MessageSquare, BarChart3, UserPlus, School, FileText, 
    Zap, Book, Settings, Users, UserCog, User, Loader2, Bell, ArrowLeft, ChevronDown, AlertTriangle, Plus } from 'lucide-react';
import { StatusSistema } from './StatusSistema';
import { PerfilUsuario } from './PerfilUsuario';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { RelatoriosAdmin } from './RelatoriosAdmin';
import { GestaoEscolaSimplificada } from './GestaoEscolaSimplificada';
import { CadastrarUsuarioNovo } from './CadastrarUsuarioNovo';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import logoEscola from 'figma:asset/e339c695d5503d560f7e53d2039456d52fd95ea5.png';
import { Usuario } from '../types/auth';
import { PainelAdministrativoCompleto } from './PainelAdministrativoCompleto';
import { GerenciadorUsuarios } from './GerenciadorUsuarios';
import { PreparacaoProducao } from './PreparacaoProducao';
import { TesteProducaoCompleto } from './TesteProducaoCompleto';
import { DiagnosticoSalvamento } from './DiagnosticoSalvamento';
import { InicializarDadosBasicos } from './InicializarDadosBasicos';

// Definição de props
interface DashboardAdministradorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
}

interface EstatisticasGerais {
  totalAlunos: number;
  totalProfessores: number;
  totalDisciplinas: number;
  totalTurmas: number;
}

// Id dos menus possíveis (type-safe)
type ViewType = 
  | 'dashboard'
  | 'cadastrar-usuario'
  | 'gestao'
  | 'relatorios'
  | 'painel-admin'
  | 'admin-usuarios'
  | 'preparacao-producao'
  | 'teste-producao'
  | 'diagnostico-salvamento'
  | 'inicializar-dados';

export function DashboardAdministrador({ onBackToSite, usuario, logout, atualizarUsuario }: DashboardAdministradorProps) {
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [viewAtual, setViewAtual] = useState<ViewType>('dashboard');
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais>({
    totalAlunos: 0,
    totalProfessores: 0,
    totalDisciplinas: 0,
    totalTurmas: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [criandoDemo, setCriandoDemo] = useState(false);

  useEffect(() => {
    if (viewAtual === 'dashboard') {
      carregarEstatisticas();
    }
    // eslint-disable-next-line
  }, [viewAtual]);

  const carregarEstatisticas = async () => {
    setLoadingStats(true);
    try {
      console.log('[ADMIN] Carregando estatísticas...');
      
      // Usar a nova rota de estatísticas rápidas
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/estatisticas-rapidas`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ADMIN] Estatísticas recebidas:', data);
        
        // Nova estrutura da API de estatísticas
        const stats = data.estatisticas || {};
        
        setEstatisticas({
          totalAlunos: stats.usuarios?.alunos || 0,
          totalProfessores: (stats.usuarios?.professores || 0) + (stats.usuarios?.conteudistas || 0),
          totalDisciplinas: stats.disciplinas?.total || 13,
          totalTurmas: stats.series?.total || 8,
        });
      } else {
        console.error('[ADMIN] Erro na resposta da API:', response.status, response.statusText);
        
        // Fallback com valores padrão
        setEstatisticas({
          totalAlunos: 0,
          totalProfessores: 0,
          totalDisciplinas: 13,
          totalTurmas: 8,
        });
      }
    } catch (error) {
      console.error('[ADMIN] Erro ao carregar estatísticas:', error);
      
      // Fallback com valores padrão em caso de erro
      setEstatisticas({
        totalAlunos: 0,
        totalProfessores: 0,
        totalDisciplinas: 13,
        totalTurmas: 8,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const criarConteudoDemo = async () => {
    alert('⚠️ ATENÇÃO: Esta funcionalidade foi desabilitada para ambiente de produção. Use o sistema de "Preparar para Produção" para configurar o ambiente adequadamente.');
  };

  // Array dos menus
  const menuItems: Array<{
    id: ViewType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    iconColor: string;
  }> = [
    {
      id: 'cadastrar-usuario',
      title: '✨ Cadastrar Usuário',
      description: 'Novo fluxo centralizado Professor → Disciplinas → Séries',
      icon: <UserPlus className="w-8 h-8" />,
      color: 'bg-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      id: 'gestao',
      title: '✨ Gestão Escolar',
      description: 'Cadastros simplificados + visualização de vínculos',
      icon: <School className="w-8 h-8" />,
      color: 'bg-green-200',
      iconColor: 'text-green-600',
    },
    {
      id: 'relatorios',
      title: 'Relatórios',
      description: 'Gerar relatórios de alunos e professores',
      icon: <FileText className="w-8 h-8" />,
      color: 'bg-purple-200',
      iconColor: 'text-purple-600',
    },
    {
      id: 'painel-admin',
      title: 'Painel Administrativo',
      description: 'Diagnóstico completo e gerenciamento do sistema',
      icon: <Settings className="w-8 h-8" />,
      color: 'bg-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      id: 'admin-usuarios',
      title: 'Gerenciar Usuários',
      description: 'Visualizar, editar e gerenciar todos os usuários',
      icon: <Users className="w-8 h-8" />,
      color: 'bg-green-200',
      iconColor: 'text-green-600',
    },
    {
      id: 'preparacao-producao',
      title: 'Preparar para Produção',
      description: 'Remover dados de teste e preparar sistema para dados reais',
      icon: <Zap className="w-8 h-8" />,
      color: 'bg-red-200',
      iconColor: 'text-red-600',
    },
    {
      id: 'teste-producao',
      title: 'Teste Final do Sistema',
      description: 'Executar testes completos para validar funcionamento',
      icon: <Bell className="w-8 h-8" />,
      color: 'bg-orange-200',
      iconColor: 'text-orange-600',
    },
    {
      id: 'diagnostico-salvamento',
      title: 'Diagnóstico de Salvamento',
      description: 'Identificar problemas de conectividade e salvamento',
      icon: <AlertTriangle className="w-8 h-8" />,
      color: 'bg-yellow-200',
      iconColor: 'text-yellow-600',
    },
    {
      id: 'inicializar-dados',
      title: 'Inicializar Dados Básicos',
      description: 'Criar disciplinas e séries padrão para o sistema',
      icon: <Plus className="w-8 h-8" />,
      color: 'bg-cyan-200',
      iconColor: 'text-cyan-600',
    },
  ];

  // Tipagem correta, sem `any`
  const handleMenuClick = (itemId: ViewType) => {
    console.log('[ADMIN] Navegando para:', itemId);
    setViewAtual(itemId);
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
                Painel Administrativo
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
                className="flex items-center gap-2 h-auto p-2"
                onClick={() => setMostrarPerfil(true)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario?.avatar} alt={usuario?.nome} />
                  <AvatarFallback className="text-sm">
                    {usuario?.nome ? usuario.nome.split(' ').map(n => n[0]).join('').toUpperCase() : 'A'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">{usuario?.nome || 'Administrador'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-full w-full">
        {viewAtual === 'dashboard' ? (
          <>
            {/* Sidebar */}
            <aside className="md:w-1/4 p-4 space-y-4 bg-gray-50">
              <StatusSistema />
              {/* Atividades Recentes */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold">ATIVIDADES RECENTES</h3>
                  </div>
                  <div className="text-sm text-gray-600 space-y-3">
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-xs">Nenhuma atividade recente.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Alertas */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    <h3 className="font-semibold">ALERTAS</h3>
                  </div>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-xs">Nenhum alerta no momento.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Conteúdo principal */}
            <main className="flex-1 p-8">
              {/* Menu Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {menuItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-lg ${item.color}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <span className={`rounded-full p-2 ${item.iconColor} bg-white`}>{item.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Estatísticas rápidas */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Visão Geral</h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={carregarEstatisticas}
                    disabled={loadingStats}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {loadingStats ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <BarChart3 className="w-4 h-4 mr-2" />
                    )}
                    Atualizar
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      {loadingStats ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                      ) : (
                        <div className="text-2xl font-bold text-blue-600">{estatisticas.totalAlunos}</div>
                      )}
                      <div className="text-sm text-gray-600 mt-1">Total de Alunos</div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      {loadingStats ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
                      ) : (
                        <div className="text-2xl font-bold text-green-600">{estatisticas.totalProfessores}</div>
                      )}
                      <div className="text-sm text-gray-600 mt-1">Professores</div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      {loadingStats ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                      ) : (
                        <div className="text-2xl font-bold text-purple-600">{estatisticas.totalDisciplinas}</div>
                      )}
                      <div className="text-sm text-gray-600 mt-1">Disciplinas</div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      {loadingStats ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" />
                      ) : (
                        <div className="text-2xl font-bold text-orange-600">{estatisticas.totalTurmas}</div>
                      )}
                      <div className="text-sm text-gray-600 mt-1">Turmas</div>
                    </CardContent>
                  </Card>
                </div>
                {!loadingStats && (
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Última atualização: {new Date().toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>

              {/* Modal de Perfil */}
              <PerfilUsuario 
                open={mostrarPerfil} 
                onOpenChange={setMostrarPerfil}
                usuario={usuario}
                logout={logout}
                atualizarUsuario={atualizarUsuario}
              />
            </main>
          </>
        ) : (
          <div className="w-full">
            {viewAtual === 'cadastrar-usuario' && (
              <CadastrarUsuarioNovo 
                onVoltar={() => setViewAtual('dashboard')} 
                onUsuarioCriado={() => {
                  // Recarregar estatísticas quando um usuário for criado
                  carregarEstatisticas();
                }}
              />
            )}
            {viewAtual === 'gestao' && <GestaoEscolaSimplificada onVoltar={() => setViewAtual('dashboard')} />}
            {viewAtual === 'relatorios' && <RelatoriosAdmin onVoltar={() => setViewAtual('dashboard')} />}
            {viewAtual === 'painel-admin' && (
              <PainelAdministrativoCompleto onVoltar={() => setViewAtual('dashboard')} />
            )}
            {viewAtual === 'admin-usuarios' && (
              <GerenciadorUsuarios onVoltar={() => setViewAtual('dashboard')} />
            )}
            {viewAtual === 'preparacao-producao' && (
              <PreparacaoProducao onVoltar={() => setViewAtual('dashboard')} />
            )}
            {viewAtual === 'teste-producao' && (
              <TesteProducaoCompleto onVoltar={() => setViewAtual('dashboard')} />
            )}
            {viewAtual === 'diagnostico-salvamento' && (
              <DiagnosticoSalvamento onVoltar={() => setViewAtual('dashboard')} />
            )}
            {viewAtual === 'inicializar-dados' && (
              <InicializarDadosBasicos onVoltar={() => setViewAtual('dashboard')} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}