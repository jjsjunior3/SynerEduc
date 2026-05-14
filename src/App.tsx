// src/App.tsx
import React, { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Usuario } from "./types/auth";

// Dashboards
import DashboardAluno from "./components/DashboardAluno";
import DashboardProfessor from "./components/DashboardProfessor";
import DashboardCoordenador from "./components/DashboardCoordenador";
import DashboardConteudista from "./components/DashboardConteudista";
import { DashboardAdministrador } from "./components/DashboardAdministrador";
import { DashboardAdminPresencial } from "./components/DashboardAdminPresencial"; // ← NOVO
import DashboardGestorGeral from "./components/DashboardGestorGeral";
import DashboardFallback from "./components/DashboardFallback";
import DashboardSecretaria from "./components/Dashboardsecretaria";
import DashboardFinanceiro from "./components/Dashboardfinanceiro";

// Site / Login
import SiteInstitucional from "./components/SiteInstitucional";
import LoginCompleto from "./components/LoginCompleto";
import TrocarSenha from "./components/TrocarSenha";

// Hook global de Presence
import { usePresence } from "./hooks/usePresence";

function AVAComPresence({
  user,
  senhaProvisoria,
  handleLogout,
  handleBackToSite,
  renderDashboard,
  setSenhaProvisoria,
}: {
  user: Usuario;
  senhaProvisoria: boolean;
  handleLogout: () => void;
  handleBackToSite: () => void;
  renderDashboard: (u: Usuario) => React.ReactNode;
  setSenhaProvisoria: (v: boolean) => void;
}) {
  usePresence(user);

  if (senhaProvisoria) {
    return <TrocarSenha onSenhaTrocada={() => setSenhaProvisoria(false)} />;
  }

  try {
    return <>{renderDashboard(user)}</>;
  } catch (err) {
    console.error("[AVAComPresence] Erro ao renderizar dashboard:", err);
    return (
      <DashboardFallback
        usuario={user}
        logout={handleLogout}
        onBackToSite={handleBackToSite}
        mensagem="Erro inesperado ao carregar o painel. Tente recarregar a página."
      />
    );
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<"website" | "login" | "ava">("website");

  const [user, setUser] = useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem("ava_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [senhaProvisoria, setSenhaProvisoria] = useState(false);

  useEffect(() => {
    if (user) setCurrentView("ava");
  }, [user]);

  const handleAccessPortal = () => setCurrentView("login");
  const handleBackToSite   = () => setCurrentView("website");

  const handleLogin = (usuario: Usuario, provisoria?: boolean) => {
    setUser(usuario);
    localStorage.setItem("ava_user", JSON.stringify(usuario));
    setSenhaProvisoria(provisoria === true);
    setCurrentView("ava");
  };

  const handleLogout = () => {
    localStorage.removeItem("ava_user");
    setUser(null);
    setSenhaProvisoria(false);
    setCurrentView("website");
  };

  const renderDashboard = (usuario: Usuario) => {
    const commonProps = {
      usuario,
      logout: handleLogout,
      onBackToSite: handleBackToSite,
      atualizarUsuario: (novo: Usuario) => {
        setUser(novo);
        localStorage.setItem("ava_user", JSON.stringify(novo));
      },
      onDisciplinaClick: (disciplina: any) =>
        console.log("Disciplina selecionada:", disciplina),
      onBoletimClick:    () => console.log("Boletim clicado"),
      onComunicadosClick:() => console.log("Comunicados clicado"),
    };

    try {
      switch (usuario.tipo) {
        case "aluno":
          return <DashboardAluno {...commonProps} />;
        case "professor":
          return <DashboardProfessor {...commonProps} />;
        case "coordenador":
          return <DashboardCoordenador {...commonProps} />;
        case "professor_conteudista":
          return <DashboardConteudista {...commonProps} />;
        case "administrador":
          return <DashboardAdministrador {...commonProps} />;
        case "admin_presencial":                          // ← NOVO
          return <DashboardAdminPresencial {...commonProps} />;
        case "gestor_geral":
          return <DashboardGestorGeral {...commonProps} />;
        case "secretaria":
          return <DashboardSecretaria {...commonProps} />;
        case "financeiro":
          return <DashboardFinanceiro {...commonProps} />;
        default:
          return (
            <DashboardFallback
              usuario={usuario}
              logout={handleLogout}
              onBackToSite={handleBackToSite}
              mensagem={`Tipo de usuário "${usuario.tipo}" não é válido ou não está implementado.`}
            />
          );
      }
    } catch (error) {
      console.error("Erro ao renderizar dashboard:", error);
      return (
        <DashboardFallback
          usuario={usuario}
          logout={handleLogout}
          onBackToSite={handleBackToSite}
          mensagem={`Erro ao carregar o dashboard: ${
            error instanceof Error ? error.message : "Erro desconhecido"
          }`}
        />
      );
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        {currentView === "website" && (
          <SiteInstitucional onAccessPortal={handleAccessPortal} />
        )}

        {currentView === "login" && (
          <LoginCompleto
            onLogin={handleLogin}
            onBackToSite={handleBackToSite}
          />
        )}

        {currentView === "ava" && user && (
          <AVAComPresence
            user={user}
            senhaProvisoria={senhaProvisoria}
            handleLogout={handleLogout}
            handleBackToSite={handleBackToSite}
            renderDashboard={renderDashboard}
            setSenhaProvisoria={setSenhaProvisoria}
          />
        )}

        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  );
}