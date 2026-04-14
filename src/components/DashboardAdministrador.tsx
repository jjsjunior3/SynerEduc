// src/components/DashboardAdministrador.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import {
  MessageSquare,
  BarChart3,
  UserPlus,
  School,
  FileText,
  Book,
  Users,
  Link2,
  Sun,
  Moon,
} from "lucide-react";
import { PerfilUsuario } from "./PerfilUsuario";
import { RelatoriosAdmin } from "./RelatoriosAdmin";
import GestaoEscola from "./GestaoEscola";
import { CadastrarUsuarioNovo } from "./CadastrarUsuarioNovo";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import logoEscola from "figma:asset/e339c695d5503d560f7e53d2039456d52fd95ea5.png";
import { Usuario } from "../types/auth";
import { GerenciadorUsuarios } from "./GerenciadorUsuariosFixed";
import { GestaoConteudoPDF } from "./GestaoConteudoPDF";
import ComunicadosPage from "./ComunicadosPage";
import { Forum } from "./Forum";
import { GestaoVinculos } from "./GestaoVinculos";
import { supabase } from "../supabase/supabaseClient";
import { useTheme } from "../contexts/ThemeContext";

interface DashboardAdministradorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
  onDisciplinaClick?: (disciplina: any) => void;
  onBoletimClick?: () => void;
  onComunicadosClick?: () => void;
}

interface EstatisticasGerais {
  totalAlunos: number;
  totalProfessores: number;
  totalDisciplinas: number;
  totalTurmas: number;
}

type ViewType =
  | "dashboard"
  | "cadastrar-usuario"
  | "gestao"
  | "relatorios"
  | "admin-usuarios"
  | "gestao-conteudo"
  | "comunicados"
  | "forum"
  | "gestao-vinculos";

export function DashboardAdministrador({
  onBackToSite,
  usuario,
  logout,
  atualizarUsuario,
}: DashboardAdministradorProps) {
  const { theme, toggleTheme } = useTheme();
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais>({
    totalAlunos: 0,
    totalProfessores: 0,
    totalDisciplinas: 0,
    totalTurmas: 0,
  });
  const [carregandoStats, setCarregandoStats] = useState(false);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  async function carregarEstatisticas() {
    try {
      setCarregandoStats(true);
      const [
        { count: alunosCount },
        { count: professoresCount },
        { count: disciplinasCount },
        { count: seriesCount },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tipo", "aluno"),
        supabase.from("users").select("*", { count: "exact", head: true }).in("tipo", ["professor", "professor_conteudista"]),
        supabase.from("disciplinas").select("*", { count: "exact", head: true }),
        supabase.from("series").select("*", { count: "exact", head: true }),
      ]);
      setEstatisticas({
        totalAlunos: alunosCount || 0,
        totalProfessores: professoresCount || 0,
        totalDisciplinas: disciplinasCount || 0,
        totalTurmas: seriesCount || 0,
      });
    } catch {
      setEstatisticas({ totalAlunos: 0, totalProfessores: 0, totalDisciplinas: 0, totalTurmas: 0 });
    } finally {
      setCarregandoStats(false);
    }
  }

  // Cores dos cards usando style direto para garantir contraste em ambos os modos
  const menuItems: Array<{
    id: ViewType;
    title: string;
    description: string;
    icon: React.ReactNode;
    bgLight: string;
    bgDark: string;
    iconColor: string;
  }> = [
    {
      id: "cadastrar-usuario",
      title: "Cadastrar Usuário",
      description: "Adicionar novos usuários ao sistema",
      icon: <UserPlus className="w-8 h-8" />,
      bgLight: "#dbeafe",
      bgDark: "#1e3a5f",
      iconColor: "#2563eb",
    },
    {
      id: "admin-usuarios",
      title: "Gerenciar Usuários",
      description: "Visualizar, editar e gerenciar usuários",
      icon: <Users className="w-8 h-8" />,
      bgLight: "#dcfce7",
      bgDark: "#14532d",
      iconColor: "#16a34a",
    },
    {
      id: "gestao",
      title: "Gestão Escolar",
      description: "Gerenciar disciplinas e séries",
      icon: <School className="w-8 h-8" />,
      bgLight: "#f3e8ff",
      bgDark: "#3b0764",
      iconColor: "#9333ea",
    },
    {
      id: "gestao-conteudo",
      title: "Gestão de Conteúdo",
      description: "Gerenciar materiais e biblioteca digital",
      icon: <Book className="w-8 h-8" />,
      bgLight: "#d1fae5",
      bgDark: "#064e3b",
      iconColor: "#059669",
    },
    {
      id: "relatorios",
      title: "Relatórios",
      description: "Gerar relatórios de alunos e professores",
      icon: <FileText className="w-8 h-8" />,
      bgLight: "#ffedd5",
      bgDark: "#431407",
      iconColor: "#ea580c",
    },
    {
      id: "comunicados",
      title: "Comunicados",
      description: "Enviar e gerenciar comunicados",
      icon: <MessageSquare className="w-8 h-8" />,
      bgLight: "#ccfbf1",
      bgDark: "#134e4a",
      iconColor: "#0d9488",
    },
    {
      id: "forum",
      title: "Fórum Geral",
      description: "Moderar discussões da comunidade",
      icon: <MessageSquare className="w-8 h-8" />,
      bgLight: "#ede9fe",
      bgDark: "#2e1065",
      iconColor: "#7c3aed",
    },
    {
      id: "gestao-vinculos",
      title: "Gestão de Vínculos",
      description: "Gerenciar vínculos entre professores e disciplinas",
      icon: <Link2 className="w-8 h-8" />,
      bgLight: "#f3f4f6",
      bgDark: "#1f2937",
      iconColor: "#4b5563",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={logoEscola}
                alt="Colégio Conexão EAD Maranhense"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="font-semibold text-foreground">
                  Colégio Conexão EAD Maranhense
                </h1>
                <p className="text-sm text-muted-foreground">Painel Administrativo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors border border-border"
                aria-label="Alternar tema"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              {onBackToSite && (
                <Button variant="outline" size="sm" onClick={onBackToSite}>
                  Voltar ao Site
                </Button>
              )}

              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => setMostrarPerfil(true)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario?.avatar} alt={usuario?.nome} />
                  <AvatarFallback className="text-sm">
                    {usuario?.nome
                      ? usuario.nome.split(" ").map((n) => n[0]).join("").toUpperCase()
                      : "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">
                  {usuario?.nome || "Administrador"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Perfil */}
      {mostrarPerfil && (
        <PerfilUsuario
          open={mostrarPerfil}
          onOpenChange={setMostrarPerfil}
          usuario={usuario}
          logout={logout}
        />
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col md:flex-row h-full gap-6">

          {/* Sidebar */}
          {viewAtual === "dashboard" && (
            <aside className="md:w-1/4 space-y-4">
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold text-foreground text-sm">Atividades Recentes</h3>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-xs">Nenhuma atividade recente.</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    <h3 className="font-semibold text-foreground text-sm">Alertas</h3>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-xs">Nenhum alerta no momento.</p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          )}

          {/* Área Principal */}
          <main className="flex-1">
            {viewAtual === "dashboard" ? (
              <>
                {/* Menu Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setViewAtual(item.id)}
                      className="cursor-pointer rounded-lg border border-border hover:shadow-lg hover:scale-[1.02] transition-all p-8 flex items-center gap-4"
                      style={{ backgroundColor: theme === 'dark' ? item.bgDark : item.bgLight }}
                    >
                      <span
                        className="rounded-full p-2 bg-white/20 flex-shrink-0"
                        style={{ color: item.iconColor }}
                      >
                        {item.icon}
                      </span>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visão Geral */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Visão Geral</h2>
                    {carregandoStats && (
                      <span className="text-xs text-muted-foreground">Atualizando...</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { valor: estatisticas.totalAlunos, label: "Total de Alunos", cor: "text-blue-600 dark:text-blue-400" },
                      { valor: estatisticas.totalProfessores, label: "Professores", cor: "text-green-600 dark:text-green-400" },
                      { valor: estatisticas.totalDisciplinas, label: "Disciplinas", cor: "text-purple-600 dark:text-purple-400" },
                      { valor: estatisticas.totalTurmas, label: "Turmas", cor: "text-orange-600 dark:text-orange-400" },
                    ].map((stat) => (
                      <Card key={stat.label} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 text-center">
                          <div className={`text-2xl font-bold ${stat.cor}`}>{stat.valor}</div>
                          <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {viewAtual === "cadastrar-usuario" && <CadastrarUsuarioNovo onVoltar={() => setViewAtual("dashboard")} />}
                {viewAtual === "gestao" && <GestaoEscola onVoltar={() => setViewAtual("dashboard")} />}
                {viewAtual === "relatorios" && <RelatoriosAdmin onVoltar={() => setViewAtual("dashboard")} />}
                {viewAtual === "admin-usuarios" && <GerenciadorUsuarios onVoltar={() => setViewAtual("dashboard")} />}
                {viewAtual === "gestao-conteudo" && <GestaoConteudoPDF onVoltar={() => setViewAtual("dashboard")} />}
                {viewAtual === "comunicados" && <ComunicadosPage onVoltar={() => setViewAtual("dashboard")} />}
                {viewAtual === "forum" && <Forum onVoltar={() => setViewAtual("dashboard")} />}
                {viewAtual === "gestao-vinculos" && <GestaoVinculos onVoltar={() => setViewAtual("dashboard")} />}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardAdministrador;