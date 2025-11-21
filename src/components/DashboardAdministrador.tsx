// src/components/DashboardAdministrador.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import {
  UserPlus,
  School,
  FileText,
  Settings,
  Users,
  Loader2,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import {PerfilUsuario} from "./PerfilUsuario";
import {RelatoriosAdmin} from "./RelatoriosAdmin";
import GestaoEscola from "./GestaoEscola";
import {CadastrarUsuarioNovo} from "./CadastrarUsuarioNovo";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Usuario } from "../types/auth";
import { supabase } from "../supabase/supabaseClient";

// props do dashboard
interface DashboardAdministradorProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
}

// estatísticas do cabeçalho
interface EstatisticasGerais {
  totalAlunos: number;
  totalProfessores: number;
  totalDisciplinas: number;
  totalTurmas: number;
}

// telas internas disponíveis neste dashboard
type ViewType =
  | "dashboard"
  | "cadastrar-usuario"
  | "gestao"
  | "relatorios"
  | "admin-usuarios"; // reservado para um futuro GerenciadorUsuariosFixed

export default function DashboardAdministrador({
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
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (viewAtual === "dashboard") {
      carregarEstatisticasReais();
    }
  }, [viewAtual]);

  async function carregarEstatisticasReais() {
    console.log("[ADMIN] Carregando estatísticas reais...");
    try {
      setLoadingStats(true);

      // alunos
      const {
        count: alunosCount,
        error: alunosError,
      } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "aluno");
      if (alunosError) {
        console.warn("⚠️ Erro ao contar alunos:", alunosError.message);
      }

      // professores
      const {
        count: professoresCount,
        error: profError,
      } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "professor");
      if (profError) {
        console.warn("⚠️ Erro ao contar professores:", profError.message);
      }

      // disciplinas
      const {
        count: disciplinasCount,
        error: discError,
      } = await supabase
        .from("disciplinas")
        .select("*", { count: "exact", head: true });
      if (discError) {
        console.warn("⚠️ Erro ao contar disciplinas:", discError.message);
      }

      // turmas (tabela pode ainda não existir)
      let turmasCount = 0;
      try {
        const { count, error } = await supabase
          .from("turmas")
          .select("*", { count: "exact", head: true });

        if (error) {
          console.warn(
            "⚠️ Erro ao contar turmas (tabela pode não existir):",
            error.message
          );
        } else {
          turmasCount = count || 0;
        }
      } catch (e: any) {
        console.warn(
          "⚠️ Exceção ao contar turmas (provavelmente tabela ausente):",
          e?.message
        );
      }

      setEstatisticas({
        totalAlunos: alunosCount || 0,
        totalProfessores: professoresCount || 0,
        totalDisciplinas: disciplinasCount || 0,
        totalTurmas: turmasCount,
      });

      console.log("✅ Estatísticas carregadas:", {
        alunos: alunosCount,
        professores: professoresCount,
        disciplinas: disciplinasCount,
        turmas: turmasCount,
      });
    } catch (err: any) {
      console.error("💥 Erro ao buscarísticas:", err?.message);
    } finally {
      setLoadingStats(false);
    }
  }

  // cards do menu principal
  const menuItems = [
    {
      id: "cadastrar-usuario",
      title: "✨ Cadastrar Usuário",
      description: "Fluxo centralizado Professor → Disciplinas → Séries",
      icon: <UserPlus className="w-8 h-8 text-blue-600" />,
      color: "bg-blue-100",
    },
    {
      id: "gestao",
      title: "✨ Gestão Escolar",
      description: "Cadastros simplificados e vínculos",
      icon: <School className="w-8 h-8 text-green-600" />,
      color: "bg-green-100",
    },
    {
      id: "relatorios",
      title: "Relatórios",
      description: "Emitir relatórios de usuários e dados",
      icon: <FileText className="w-8 h-8 text-purple-600" />,
      color: "bg-purple-100",
    },
    // espaço reservado para um futuro gerenciador de usuários fixo
    {
      id: "admin-usuarios",
      title: "Gerenciar Usuários",
      description: "Visualizar, editar e gerenciar",
      icon: <Users className="w-8 h-8 text-green-600" />,
      color: "bg-green-100",
    },
    // se quiser manter um "configurações" genérico:
    {
      id: "dashboard",
      title: "Configurações / Visão Geral",
      description: "Resumo do sistema e configurações gerais",
      icon: <Settings className="w-8 h-8 text-blue-600" />,
      color: "bg-blue-100",
    },
  ] as const;

  // Navegação interna para telas específicas
  if (viewAtual !== "dashboard") {
    switch (viewAtual) {
      case "cadastrar-usuario":
        return (
          <CadastrarUsuarioNovo
            onVoltar={() => setViewAtual("dashboard")}
            onUsuarioCriado={carregarEstatisticasReais}
          />
        );

      case "gestao":
        return <GestaoEscola onVoltar={() => setViewAtual("dashboard")} />;

      case "relatorios":
        return <RelatoriosAdmin onVoltar={() => setViewAtual("dashboard")} />;

      case "admin-usuarios":
        // quando você tiver o GerenciadorUsuariosFixed pronto, encaixa aqui:
        // return (
        //   <GerenciadorUsuariosFixed onVoltar={() => setViewAtual("dashboard")} />
        // );
        return (
          <div className="min-h-screen bg-gray-50 p-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewAtual("dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="p-4 border rounded bg-white text-sm text-gray-600">
              Área de gestão avançada de usuários ainda não configurada nesta
              versão. Use “Cadastrar Usuário” e “Gestão Escolar” por enquanto.
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // Layout principal (dashboard)
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-gray-900">
            Colégio Conexão EAD
          </h1>
          <p className="text-sm text-gray-600">Painel Administrativo</p>
        </div>

        <div className="flex items-center gap-4">
          {onBackToSite && (
            <Button variant="outline" size="sm" onClick={onBackToSite}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMostrarPerfil(true)}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={usuario?.avatar} alt={usuario?.nome} />
              <AvatarFallback>
                {usuario?.nome?.slice(0, 2).toUpperCase() ?? "AD"}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </header>

      <main className="p-6">
        {/* Cards do menu principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {menuItems.map((item) => (
            <Card
              key={item.id}
              onClick={() => setViewAtual(item.id as ViewType)}
              className={`${item.color} cursor-pointer hover:shadow-lg transition-all bg-white/90 backdrop-blur`}
            >
              <CardContent className="flex items-center gap-4 p-6">
                {item.icon}
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visão geral / estatísticas */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            Visão Geral (tempo real)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {["Alunos", "Professores", "Disciplinas", "Turmas"].map(
              (titulo, i) => (
                <Card
                  key={titulo}
                  className="hover:shadow-md bg-white/80 backdrop-blur-sm"
                >
                  <CardContent className="p-4 text-center">
                    {loadingStats ? (
                      <Loader2 className="animate-spin mx-auto text-blue-600" />
                    ) : (
                      <div className="text-2xl font-bold text-blue-600">
                        {
                          [
                            estatisticas.totalAlunos,
                            estatisticas.totalProfessores,
                            estatisticas.totalDisciplinas,
                            estatisticas.totalTurmas,
                          ][i]
                        }
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{titulo}</p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </section>
      </main>

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
