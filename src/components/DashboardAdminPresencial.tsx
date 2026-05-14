// src/components/DashboardAdminPresencial.tsx
import { lazy, Suspense, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus, School, Users, Link2,
  Loader2, Bell, Sun, Moon, User, LogOut,
} from 'lucide-react';

import { Card, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTheme } from '../contexts/ThemeContext';
import { Notificacoes } from './Notificacoes';
import { PerfilUsuario } from './PerfilUsuario';
import { SchoolHeader } from './SchoolHeader';
import { Usuario } from '../types/auth';

const CadastrarUsuarioNovo = lazy(() =>
  import('./CadastrarUsuarioNovo').then(m => ({
    default: m.CadastrarUsuarioNovo ?? m.default
  }))
);
const GerenciadorUsuarios = lazy(() =>
  import('./GerenciadorUsuariosFixed').then(m => ({
    default: m.GerenciadorUsuarios ?? m.default
  }))
);
const GestaoEscola = lazy(() =>
  import('./GestaoEscola').then(m => ({
    default: m.default ?? m.GestaoEscola
  }))
);
const GestaoVinculos = lazy(() =>
  import('./GestaoVinculos').then(m => ({
    default: m.GestaoVinculos ?? m.default
  }))
);

interface DashboardAdminPresencialProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
}

type ViewType =
  | 'dashboard'
  | 'cadastrar-usuario'
  | 'admin-usuarios'
  | 'gestao'
  | 'gestao-vinculos';

const SEGMENTO_FIXO = 'presencial' as const;

const menuItems = [
  {
    id: 'cadastrar-usuario' as ViewType,
    title: 'Cadastrar Usuário',
    description: 'Adicionar novos usuários presenciais',
    icon: UserPlus,
    bg: '#dbeafe',
    iconColor: '#2563eb',
  },
  {
    id: 'admin-usuarios' as ViewType,
    title: 'Gerenciar Usuários',
    description: 'Editar e gerenciar usuários',
    icon: Users,
    bg: '#dcfce7',
    iconColor: '#16a34a',
  },
  {
    id: 'gestao' as ViewType,
    title: 'Gestão Escolar',
    description: 'Disciplinas e séries presenciais',
    icon: School,
    bg: '#ede9fe',
    iconColor: '#7c3aed',
  },
  {
    id: 'gestao-vinculos' as ViewType,
    title: 'Gestão de Vínculos',
    description: 'Professores e disciplinas',
    icon: Link2,
    bg: '#cffafe',
    iconColor: '#0891b2',
  },
];

const tituloPorView: Record<string, string> = {
  'cadastrar-usuario': 'Cadastrar Usuário',
  'admin-usuarios':    'Gerenciar Usuários',
  'gestao':            'Gestão Escolar',
  'gestao-vinculos':   'Gestão de Vínculos',
};

export function DashboardAdminPresencial({
  onBackToSite, usuario, logout,
}: DashboardAdminPresencialProps) {
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

  const renderConteudo = () => {
    switch (viewAtual) {
      case 'cadastrar-usuario':
        return <CadastrarUsuarioNovo onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      case 'admin-usuarios':
        return <GerenciadorUsuarios onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      case 'gestao':
        return <GestaoEscola onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      case 'gestao-vinculos':
        return <GestaoVinculos onVoltar={() => setViewAtual('dashboard')} segmentoForcado={SEGMENTO_FIXO} />;
      default:
        return null;
    }
  };

  const pos = getDropdownPos();

  // ── Header ──
  const Header = () => (
    <header className="bg-card border-b border-border py-3 sm:py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between">
        <SchoolHeader subtitle="Painel Administrativo — Presencial" />

        <div className="flex items-center gap-3">
          {/* Badge segmento */}
          <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full font-medium border
            bg-blue-100 text-blue-800 border-blue-300
            dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
            Presencial
          </span>

          {/* Tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-secondary hover:bg-accent transition-colors border border-border"
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Notificações */}
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

          {/* Avatar + menu */}
          <button
            ref={avatarRef}
            onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
            className="focus:outline-none"
          >
            <Avatar className="w-9 h-9 border-2 border-border cursor-pointer">
              <AvatarImage src={usuario?.avatar} />
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {usuario?.nome?.slice(0, 2).toUpperCase() || 'AP'}
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

  // ── Barra azul de navegação interna ──
  const BarraAzul = ({ titulo }: { titulo: string }) => (
    <div className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost" size="sm"
          onClick={() => setViewAtual('dashboard')}
          className="text-white hover:bg-white/20"
        >
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
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
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
        <section className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg p-5 sm:p-8 overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
              Olá, {usuario?.nome?.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 text-sm sm:text-lg max-w-xl">
              Bem-vindo ao painel administrativo presencial.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        </section>

        {/* Cards de módulos */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            Módulos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  onClick={() => setViewAtual(item.id)}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-border bg-card"
                >
                  <CardContent className="p-4 sm:p-8 text-center space-y-2 sm:space-y-4">
                    <div
                      className="w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: item.iconColor }} />
                    </div>
                    <div>
                      <CardTitle className="font-semibold text-foreground text-xs sm:text-sm mb-0.5 sm:mb-1">
                        {item.title}
                      </CardTitle>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed hidden sm:block">
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

export default DashboardAdminPresencial;