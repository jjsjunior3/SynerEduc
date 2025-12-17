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
} from "lucide-react";
import { PerfilUsuario } from "./PerfilUsuario";
import { RelatoriosAdmin } from "./RelatoriosAdmin";
import GestaoEscola from "./GestaoEscola"; // versão online ligada ao Supabase
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
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [viewAtual, setViewAtual] = useState<ViewType>("dashboard");

  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais>({
    totalAlunos: 0,
    totalProfessores: 0,
    totalDisciplinas: 0,
    totalTurmas: 0,
  });
  const [carregandoStats, setCarregandoStats] = useState(false);

  // --------- CARREGAR ESTATÍSTICAS DO SUPABASE ---------

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  async function carregarEstatisticas() {
    try {
      setCarregandoStats(true);

      // 1) Alunos
      const { count: alunosCount, error: alunosError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "aluno");

      if (alunosError) {
        console.warn(
          "[DashboardAdmin] Erro ao contar alunos:",
          alunosError.message
        );
      }

      // 2) Professores (professor + professor_conteudista)
      const { count: professoresCount, error: profError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .in("tipo", ["professor", "professor_conteudista"]);

      if (profError) {
        console.warn(
          "[DashboardAdmin] Erro ao contar professores:",
          profError.message
        );
      }

      // 3) Disciplinas
      const { count: disciplinasCount, error: discError } = await supabase
        .from("disciplinas")
        .select("*", { count: "exact", head: true });

      if (discError) {
        console.warn(
          "[DashboardAdmin] Erro ao contar disciplinas:",
          discError.message
        );
      }

      // 4) Séries (usando tabela 'series' como "turmas")
      let turmasCount = 0;
      const { count: seriesCount, error: seriesError } = await supabase
        .from("series")
        .select("*", { count: "exact", head: true });

      if (seriesError) {
        console.warn(
          "[DashboardAdmin] Erro ao contar séries/turmas:",
          seriesError.message
        );
      } else {
        turmasCount = seriesCount || 0;
      }

      setEstatisticas({
        totalAlunos: alunosCount || 0,
        totalProfessores: professoresCount || 0,
        totalDisciplinas: disciplinasCount || 0,
        totalTurmas: turmasCount,
      });
    } catch (e: any) {
      console.error(
        "[DashboardAdmin] Erro inesperado ao carregar estatísticas:",
        e?.message
      );
      setEstatisticas({
        totalAlunos: 0,
        totalProfessores: 0,
        totalDisciplinas: 0,
        totalTurmas: 0,
      });
    } finally {
      setCarregandoStats(false);
    }
  }

  // --------- MENU ---------

  const menuItems: Array<{
    id: ViewType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    iconColor: string;
  }> = [
    {
      id: "cadastrar-usuario",
      title: "Cadastrar Usuário",
      description: "Adicionar novos usuários ao sistema",
      icon: <UserPlus className="w-8 h-8" />,
      color: "bg-blue-200",
      iconColor: "text-blue-600",
    },
    {
      id: "admin-usuarios",
      title: "Gerenciar Usuários",
      description: "Visualizar, editar e gerenciar usuários",
      icon: <Users className="w-8 h-8" />,
      color: "bg-green-200",
      iconColor: "text-green-600",
    },
    {
      id: "gestao",
      title: "Gestão Escolar",
      description: "Gerenciar disciplinas e séries",
      icon: <School className="w-8 h-8" />,
      color: "bg-purple-200",
      iconColor: "text-purple-600",
    },
    {
      id: "gestao-conteudo",
      title: "Gestão de Conteúdo",
      description: "Gerenciar materiais e biblioteca digital",
      icon: <Book className="w-8 h-8" />,
      color: "bg-emerald-200",
      iconColor: "text-emerald-600",
    },
    {
      id: "relatorios",
      title: "Relatórios",
      description: "Gerar relatórios de alunos e professores",
      icon: <FileText className="w-8 h-8" />,
      color: "bg-orange-200",
      iconColor: "text-orange-600",
    },
    {
      id: "comunicados",
      title: "Comunicados",
      description: "Enviar e gerenciar comunicados",
      icon: <MessageSquare className="w-8 h-8" />,
      color: "bg-teal-200",
      iconColor: "text-teal-600",
    },
    {
      id: "forum",
      title: "Fórum Geral",
      description: "Moderar discussões da comunidade",
      icon: <MessageSquare className="w-8 h-8" />,
      color: "bg-violet-200",
      iconColor: "text-violet-600",
    },
    {
      id: "gestao-vinculos",
      title: "Gestão de Vínculos",
      description: "Gerenciar vínculos entre professores e disciplinas",
      icon: <Link2 className="w-8 h-8" />,
      color: "bg-gray-200",
      iconColor: "text-gray-600",
    },
  ];

  const handleMenuClick = (itemId: ViewType) => {
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
              <h1 className="font-semibold text-gray-900">
                Colégio Conexão EAD Maranhense
              </h1>
              <p className="text-sm text-gray-600">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
                    ? usuario.nome
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : "A"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700">
                {usuario?.nome || "Administrador"}
              </span>
            </Button>
          </div>
        </div>

        {/* Perfil Dropdown */}
        {mostrarPerfil && (
          <div className="absolute right-6 top-20 w-80 z-50">
            <PerfilUsuario
              usuario={usuario}
              onClose={() => setMostrarPerfil(false)}
              onAtualizar={atualizarUsuario}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row h-full w-full">
        {viewAtual === "dashboard" ? (
          <>
            {/* Sidebar */}
            <aside className="md:w-1/4 p-4 space-y-4 bg-gray-50">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold">ATIVIDADES RECENTES</h3>
                  </div>
                  <div className="text-sm text-gray-600 space-y-3">
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-xs">
                        Nenhuma atividade recente.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    <h3 className="font-semibold">ALERTAS</h3>
                  </div>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-xs">
                        Nenhum alerta no momento.
                      </p>
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
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${item.color}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <span
                        className={`rounded-full p-2 ${item.iconColor} bg-white`}
                      >
                        {item.icon}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Estatísticas rápidas */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Visão Geral
                  </h2>
                  {carregandoStats && (
                    <span className="text-xs text-gray-500">
                      Atualizando estatísticas...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {estatisticas.totalAlunos}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Total de Alunos
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {estatisticas.totalProfessores}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Professores
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {estatisticas.totalDisciplinas}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Disciplinas
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {estatisticas.totalTurmas}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Turmas
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>
          </>
        ) : (
          <div className="w-full">
            {viewAtual === "cadastrar-usuario" && (
              <CadastrarUsuarioNovo
                onVoltar={() => setViewAtual("dashboard")}
              />
            )}
            {viewAtual === "gestao" && (
              <GestaoEscola onVoltar={() => setViewAtual("dashboard")} />
            )}
            {viewAtual === "relatorios" && (
              <RelatoriosAdmin onVoltar={() => setViewAtual("dashboard")} />
            )}
            {viewAtual === "admin-usuarios" && (
              <GerenciadorUsuarios
                onVoltar={() => setViewAtual("dashboard")}
              />
            )}
            {viewAtual === "gestao-conteudo" && (
              <GestaoConteudoPDF onVoltar={() => setViewAtual("dashboard")} />
            )}
            {viewAtual === "comunicados" && (
              <ComunicadosPage onVoltar={() => setViewAtual("dashboard")} />
            )}
            {viewAtual === "forum" && (
              <Forum onVoltar={() => setViewAtual("dashboard")} />
            )}
            {viewAtual === "gestao-vinculos" && (
              <GestaoVinculos onVoltar={() => setViewAtual("dashboard")} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardAdministrador;
