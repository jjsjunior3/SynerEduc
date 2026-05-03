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
import DashboardGestorGeral from "./components/DashboardGestorGeral";
import DashboardFallback from "./components/DashboardFallback";

// Site / Login
import SiteInstitucional from "./components/SiteInstitucional";
import LoginCompleto from "./components/LoginCompleto";

// ✅ NOVO: tela de troca de senha obrigatória no primeiro acesso
import TrocarSenha from "./components/TrocarSenha";

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

  // ✅ NOVO: flag de senha provisória — false por padrão (não quebra usuários existentes)
  const [senhaProvisoria, setSenhaProvisoria] = useState(false);

  // Entrar automaticamente no AVA se houver usuário salvo
  useEffect(() => {
    if (user) {
      setCurrentView("ava");
    }
  }, [user]);

  const handleAccessPortal = () => setCurrentView("login");
  const handleBackToSite   = () => setCurrentView("website");

  // ✅ ALTERADO: handleLogin agora recebe o segundo argumento opcional `provisoria`
  // Usuários existentes que não passam esse argumento continuam funcionando normalmente
  const handleLogin = (usuario: Usuario, provisoria?: boolean) => {
    setUser(usuario);
    localStorage.setItem("ava_user", JSON.stringify(usuario));
    setSenhaProvisoria(provisoria === true); // só true se explicitamente true
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
          return <DashboardAdministrador />;
        case "gestor_geral":
          return <DashboardGestorGeral {...commonProps} />;
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

        {/* ✅ NOVO: intercepta o dashboard se a senha for provisória */}
        {currentView === "ava" && user && senhaProvisoria && (
          <TrocarSenha
            onSenhaTrocada={() => setSenhaProvisoria(false)}
          />
        )}

        {/* Dashboard normal — só renderiza se NÃO for senha provisória */}
        {currentView === "ava" && user && !senhaProvisoria && renderDashboard(user)}

        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  );
}