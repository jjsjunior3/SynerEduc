// src/components/DashboardCoordenador.tsx
import { lazy, Suspense, useState } from 'react';
import {
  Card,
  CardContent,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
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

import {Notificacoes} from './Notificacoes';
import { PerfilUsuario } from './PerfilUsuario';
import { Usuario } from '../types/auth';

// ---------- Lazy imports dos subpainéis ----------
const BoletinsGerais = lazy(() => import('./BoletinsGerais'));
const RelatorioTurma = lazy(() => import('./RelatorioTurma'));
const FrequenciaAlunos = lazy(() => import('./FrequenciaAlunos'));
const EnviarComunicado = lazy(() => import('./EnviarComunicado'));
const ForumCoordenador = lazy(() => import('./ForumCoordenador'));
const AgendaProfessores = lazy(() => import('./AgendaProfessores'));

// ---------- Props ----------
interface DashboardCoordenadorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
}

// ---------- Componente principal ----------
export default function DashboardCoordenador({
  onBackToSite,
  usuario,
  logout,
  atualizarUsuario,
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
      case 'forum':
        return <ForumCoordenador onVoltar={handleVoltar} />;
      default:
        return null;
    }
  };

  // ----------------- Caso não seja “dashboard”, renderiza o módulo escolhido -----------------
  if (viewAtual !== 'dashboard') {
    return (
      <Suspense fallback={<div className="p-10 text-center text-gray-600">Carregando módulo...</div>}>
        {renderConteudo()}
      </Suspense>
    );
  }

  // ----------------- Dashboard principal -----------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">
              Colégio Conexão EAD
            </h1>
            <p className="text-sm text-gray-600">
              Painel de Coordenação Pedagógica
            </p>
          </div>

          <div className="flex items-center gap-4">
            {onBackToSite && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToSite}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao site
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
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
                  {usuario?.nome?.slice(0, 2).toUpperCase() || "CO"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>

        {/* Notificações */}
        {mostrarNotificacoes && (
          <div className="absolute right-4 top-16 w-80 z-50">
            <Notificacoes
              usuario={usuario}
              onClose={() => setMostrarNotificacoes(false)}
            />
          </div>
        )}
      </header>

      {/* Conteúdo principal */}
      <main className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* -------- Menu Principal -------- */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <Card
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`${item.color} cursor-pointer border-0 hover:shadow-lg transition-all duration-200`}
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className={`w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center ${item.iconColor}`}>
                  {item.icon}
                </div>
                <div>
                  <CardTitle className="font-semibold text-gray-800">
                    {item.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* -------- Sidebar -------- */}
        <aside className="space-y-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Nenhum alerta no momento</p>
              <p className="text-xs text-gray-400 mt-1">Sistema funcionando normalmente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Nenhuma atividade recente</p>
              <p className="text-xs text-gray-400 mt-1">Histórico será exibido aqui</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Professores online</p>
              <p className="text-xs text-gray-400 mt-1">Em desenvolvimento</p>
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Perfil */}
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
