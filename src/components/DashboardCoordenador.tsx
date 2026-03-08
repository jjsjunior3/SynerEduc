// src/components/DashboardCoordenador.tsx
import { lazy, Suspense, useState } from 'react';
import {
  Clock,
  Loader2,
  Bell,
  Calendar,
  FileText,
  BarChart3,
  UserCheck,
  Send,
  MessageSquare,
  ArrowLeft,
  ChevronDown,
  Users,
  Eye,
} from 'lucide-react';

import { Card, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

import { Notificacoes } from './Notificacoes';
import { PerfilUsuario } from './PerfilUsuario';
import { SchoolHeader } from './SchoolHeader';
import { Usuario } from '../types/auth';

// ---------- Lazy imports dos subpainéis ----------
const BoletinsGerais = lazy(() => import('./BoletinsGerais'));
const RelatorioTurma = lazy(() => import('./RelatorioTurma'));
const FrequenciaAlunos = lazy(() => import('./FrequenciaAluno'));
const EnviarComunicado = lazy(() => import('./EnviarComunicado'));
const ForumCoordenador = lazy(() => import('./ForumCoordenador'));
const AgendaProfessores = lazy(() => import('./AgendaProfessores'));
const GestaoHorarios = lazy(() => import('./GestaoHorarios'));

// ---------- Props ----------
interface DashboardCoordenadorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
}

// ---------- Componente principal ----------
export default function DashboardCoordenador({
  onBackToSite,
  usuario,
  logout,
}: DashboardCoordenadorProps) {
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [viewAtual, setViewAtual] = useState<
    | 'dashboard'
    | 'boletins'
    | 'relatorio'
    | 'frequencia'
    | 'comunicado'
    | 'agenda'
    | 'horarios'
    | 'forum'
  >('dashboard');

  // ----------------- Itens de menu -----------------
  const menuItems = [
    {
      id: 'boletins',
      title: 'Boletins Gerais',
      description: 'Visualizar boletins de todos os alunos',
      icon: <FileText className="w-8 h-8" />,
      color: 'bg-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      id: 'relatorio',
      title: 'Relatório de Turma',
      description: 'Relatórios detalhados por turma',
      icon: <BarChart3 className="w-8 h-8" />,
      color: 'bg-green-200',
      iconColor: 'text-green-600',
    },
    {
      id: 'frequencia',
      title: 'Frequência de Alunos',
      description: 'Verificar frequência e faltas',
      icon: <UserCheck className="w-8 h-8" />,
      color: 'bg-purple-200',
      iconColor: 'text-purple-600',
    },
    {
      id: 'comunicado',
      title: 'Enviar Comunicado',
      description: 'Enviar mensagens para alunos e professores',
      icon: <Send className="w-8 h-8" />,
      color: 'bg-orange-200',
      iconColor: 'text-orange-600',
    },
    {
      id: 'agenda',
      title: 'Agenda dos Professores',
      description: 'Visualizar agendas de todos os professores',
      icon: <Calendar className="w-8 h-8" />,
      color: 'bg-pink-200',
      iconColor: 'text-pink-600',
    },
    {
      id: 'horarios',
      title: 'Gestão de Horários',
      description: 'Cadastrar e editar grade horária das turmas',
      icon: <Clock className="w-8 h-8" />,
      color: 'bg-cyan-200',
      iconColor: 'text-cyan-600',
    },
    {
      id: 'forum',
      title: 'Fórum das Disciplinas',
      description: 'Visualizar mensagens dos fóruns',
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'bg-indigo-200',
      iconColor: 'text-indigo-600',
    },
  ];

  const handleVoltar = () => setViewAtual('dashboard');
  const handleMenuClick = (id: string) => setViewAtual(id as any);

  // ----------------- Renderização dos módulos -----------------
  const renderConteudo = () => {
    switch (viewAtual) {
      case 'boletins':
        return <BoletinsGerais onVoltar={handleVoltar} />;
      case 'relatorio':
        return <RelatorioTurma onVoltar={handleVoltar} />;
      case 'frequencia':
        return <FrequenciaAlunos onVoltar={handleVoltar} />;
      case 'comunicado':
        return <EnviarComunicado onVoltar={handleVoltar} />;
      case 'agenda':
        return <AgendaProfessores onVoltar={handleVoltar} />;
      case 'horarios':
        return <GestaoHorarios onVoltar={handleVoltar} />;
      case 'forum':
        return <ForumCoordenador onVoltar={handleVoltar} />;
      default:
        return null;
    }
  };

  // ----------------- VIEW: SUBPAINÉIS (Agenda, Boletins etc.) -----------------
  if (viewAtual !== 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header fixo, sempre igual e na mesma largura */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
            {/* Escola + subtítulo */}
            <SchoolHeader subtitle="Painel do Coordenador" />

            {/* Ações à direita */}
            <div className="flex items-center gap-3">
              {onBackToSite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBackToSite}
                  className="hidden sm:inline-flex"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar ao site
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setMostrarNotificacoes(prev => !prev)
                }
              >
                <Bell className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarPerfil(true)}
                className="flex items-center gap-2"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario?.avatar} />
                  <AvatarFallback>
                    {usuario?.nome?.slice(0, 2).toUpperCase() || 'CO'}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Dropdown de notificações */}
          {mostrarNotificacoes && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="absolute right-0 mt-2 w-80 z-50">
                <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
              </div>
            </div>
          )}
        </header>

        {/* Conteúdo dos módulos – mesma largura do header */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Carregando módulo...</span>
              </div>
            }
          >
            {renderConteudo()}
          </Suspense>
        </main>

        {/* Perfil */}
        <PerfilUsuario
          open={mostrarPerfil}
          onOpenChange={setMostrarPerfil}
          usuario={usuario}
          logout={logout}
        />
      </div>
    );
  }

  // ----------------- VIEW: DASHBOARD PRINCIPAL -----------------
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header principal reaproveitando o mesmo padrão */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <SchoolHeader subtitle="Painel do Coordenador" />

          <div className="flex items-center gap-3">
            {onBackToSite && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToSite}
                className="hidden sm:inline-flex"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar ao site
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setMostrarNotificacoes(prev => !prev)
              }
            >
              <Bell className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarPerfil(true)}
              className="flex items-center gap-2"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={usuario?.avatar} />
                <AvatarFallback>
                  {usuario?.nome?.slice(0, 2).toUpperCase() || 'CO'}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>

        {mostrarNotificacoes && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute right-0 mt-2 w-80 z-50">
              <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo principal do Dashboard - mesma largura do header */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Menu Principal */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
              <Card
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`${item.color} cursor-pointer border-0 hover:shadow-lg transition-all duration-200 hover:scale-105`}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div
                    className={`w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center ${item.iconColor} shadow-md`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <CardTitle className="font-semibold text-gray-800 text-base mb-1">
                      {item.title}
                    </CardTitle>
                    <p className="text-xs text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Eye className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  Nenhum alerta no momento
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Sistema funcionando normalmente
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  Nenhuma atividade recente
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Histórico será exibido aqui
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Professores online</p>
                <p className="text-xs text-gray-400 mt-1">
                  Em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <PerfilUsuario
        open={mostrarPerfil}
        onOpenChange={setMostrarPerfil}
        usuario={usuario}
        logout={logout}
      />
    </div>
  );
}
