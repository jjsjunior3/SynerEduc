// src/components/DashboardCoordenador.tsx
import { lazy, Suspense, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock, Loader2, Bell, Calendar, FileText, BarChart3,
  UserCheck, Send, MessageSquare, Sun, Moon, User, LogOut,
} from 'lucide-react';

import { Card, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTheme } from '../contexts/ThemeContext';

import { Notificacoes } from './Notificacoes';
import { PerfilUsuario } from './PerfilUsuario';
import { SchoolHeader } from './SchoolHeader';
import { Usuario } from '../types/auth';

const BoletinsGerais     = lazy(() => import('./BoletinsGerais'));
const RelatorioTurma     = lazy(() => import('./RelatorioTurma'));
const FrequenciaAlunos   = lazy(() => import('./FrequenciaAluno'));
const EnviarComunicado   = lazy(() => import('./EnviarComunicado'));
const ForumCoordenador   = lazy(() => import('./ForumCoordenador'));
const AgendaProfessores  = lazy(() => import('./AgendaProfessores'));
const GestaoHorarios     = lazy(() => import('./GestaoHorarios'));

interface DashboardCoordenadorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
}

type ViewType = 'dashboard' | 'boletins' | 'relatorio' | 'frequencia' | 'comunicado' | 'agenda' | 'horarios' | 'forum';

export default function DashboardCoordenador({ onBackToSite, usuario, logout }: DashboardCoordenadorProps) {
  const { theme, toggleTheme } = useTheme();
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [viewAtual, setViewAtual] = useState<ViewType>('dashboard');
  const avatarRef = useRef<HTMLButtonElement>(null);

  const getDropdownPos = () => {
    if (!avatarRef.current) return { top: 68, right: 16 };
    const rect = avatarRef.current.getBoundingClientRect();
    return { top: rect.bottom + 8, right: window.innerWidth - rect.right };
  };

  const menuItems = [
    {
      id: 'boletins', title: 'Boletins Gerais',
      description: 'Visualizar boletins de todos os alunos',
      icon: FileText, bg: '#dbeafe', iconColor: '#2563eb',
    },
    {
      id: 'relatorio', title: 'Relatório de Turma',
      description: 'Relatórios detalhados por turma',
      icon: BarChart3, bg: '#dcfce7', iconColor: '#16a34a',
    },
    {
      id: 'frequencia', title: 'Frequência de Alunos',
      description: 'Verificar frequência e faltas',
      icon: UserCheck, bg: '#ede9fe', iconColor: '#7c3aed',
    },
    {
      id: 'comunicado', title: 'Enviar Comunicado',
      description: 'Enviar mensagens para alunos e professores',
      icon: Send, bg: '#ffedd5', iconColor: '#ea580c',
    },
    {
      id: 'agenda', title: 'Agenda dos Professores',
      description: 'Visualizar agendas de todos os professores',
      icon: Calendar, bg: '#fce7f3', iconColor: '#db2777',
    },
    {
      id: 'horarios', title: 'Gestão de Horários',
      description: 'Cadastrar e editar grade horária das turmas',
      icon: Clock, bg: '#cffafe', iconColor: '#0891b2',
    },
    {
      id: 'forum', title: 'Fórum das Disciplinas',
      description: 'Visualizar mensagens dos fóruns',
      icon: MessageSquare, bg: '#e0e7ff', iconColor: '#4f46e5',
    },
  ];

  const tituloPorView: Record<string, string> = {
    boletins: 'Boletins Gerais', relatorio: 'Relatório de Turma',
    frequencia: 'Frequência de Alunos', comunicado: 'Enviar Comunicado',
    agenda: 'Agenda dos Professores', horarios: 'Gestão de Horários',
    forum: 'Fórum das Disciplinas',
  };

  const renderConteudo = () => {
    switch (viewAtual) {
      case 'boletins':    return <BoletinsGerais onVoltar={() => setViewAtual('dashboard')} />;
      case 'relatorio':   return <RelatorioTurma onVoltar={() => setViewAtual('dashboard')} />;
      case 'frequencia':  return <FrequenciaAlunos onVoltar={() => setViewAtual('dashboard')} />;
      case 'comunicado':  return <EnviarComunicado onVoltar={() => setViewAtual('dashboard')} />;
      case 'agenda':      return <AgendaProfessores onVoltar={() => setViewAtual('dashboard')} />;
      case 'horarios':    return <GestaoHorarios onVoltar={() => setViewAtual('dashboard')} />;
      case 'forum':       return <ForumCoordenador onVoltar={() => setViewAtual('dashboard')} />;
      default: return null;
    }
  };

  const pos = getDropdownPos();

  // ── Header padrão ──
  const Header = () => (
    <header className="bg-card border-b border-border py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <SchoolHeader subtitle="Painel do Coordenador" />

        <div className="flex items-center gap-3">

          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}>
              <Bell className="w-5 h-5 text-muted-foreground" />
            </Button>
            {mostrarNotificacoes && (
              <div className="absolute right-0 top-12 w-80 z-50">
                <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
              </div>
            )}
          </div>

          <button
            ref={avatarRef}
            onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
            className="focus:outline-none"
          >
            <Avatar className="w-9 h-9 border-2 border-border cursor-pointer">
              <AvatarImage src={usuario?.avatar} />
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {usuario?.nome?.slice(0, 2).toUpperCase() || 'CO'}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      {mostrarMenuUsuario && createPortal(
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setMostrarMenuUsuario(false)} />
          <div
            className="fixed w-48 rounded-xl border border-border shadow-2xl z-[99999] overflow-hidden"
            style={{ backgroundColor: 'var(--card)', top: pos.top, right: pos.right }}
          >
            <button
              onClick={() => { setMostrarMenuUsuario(false); setMostrarPerfil(true); }}
              className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" /> Meu Perfil
            </button>
            <div className="h-px bg-border mx-3" />
            <button
              onClick={() => { setMostrarMenuUsuario(false); logout?.(); }}
              className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </>,
        document.body
      )}
    </header>
  );

  // ── Barra azul ──
  const BarraAzul = ({ titulo }: { titulo: string }) => (
    <div className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setViewAtual('dashboard')} className="text-white hover:bg-white/20">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Button>
        <h1 className="font-semibold text-lg">{titulo}</h1>
      </div>
    </div>
  );

  // ── View subpainel ──
  if (viewAtual !== 'dashboard') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BarraAzul titulo={tituloPorView[viewAtual] || ''} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
              <span className="text-muted-foreground">Carregando módulo...</span>
            </div>
          }>
            {renderConteudo()}
          </Suspense>
        </main>
        <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
      </div>
    );
  }

  // ── Dashboard principal ──
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Banner */}
        <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg p-8 overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              Olá, {usuario?.nome?.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 text-lg max-w-xl">
              Bem-vindo ao painel de coordenação.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        </section>

        {/* Menu de módulos */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            Módulos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  onClick={() => setViewAtual(item.id as ViewType)}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-border bg-card"
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <div
                      className="w-14 h-14 mx-auto rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon style={{ width: 26, height: 26, color: item.iconColor }} />
                    </div>
                    <div>
                      <CardTitle className="font-semibold text-foreground text-sm mb-1">
                        {item.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />
    </div>
  );
}