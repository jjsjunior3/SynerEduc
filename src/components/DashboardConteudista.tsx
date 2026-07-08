// src/components/DashboardConteudista.tsx
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  FolderOpen,
  Bell,
  Upload,
  Loader2,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { PerfilUsuario } from "./PerfilUsuario";
import { Notificacoes, useNotificacoesCount } from "./Notificacoes";
import { NotificacaoBalloon } from "./NotificacaoBalloon";
import { SchoolHeader } from "./SchoolHeader";
import { GestaoConteudoPDF } from "./GestaoConteudoPDF";
import { GestaoRAG } from "./GestaoRAG";
import { Usuario } from "../types/auth";
import { supabase } from "../supabase/supabaseClient";

interface DashboardConteudistaProps {
  onBackToSite?: () => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (u: Usuario) => void;
}

interface SerieEscolar {
  id: string;
  nome: string;
  nivel: "fundamental" | "medio";
  disciplinas: string[];
  totalAlunos: number;
  status: "ativa" | "inativa";
}

export default function DashboardConteudista({
  onBackToSite,
  usuario,
  logout,
}: DashboardConteudistaProps) {
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const { count: notifCount } = useNotificacoesCount();
  const [view, setView] = useState<"dashboard" | "uploadPDF">("dashboard");
  const [loadingStats, setLoadingStats] = useState(true);

  // Estatísticas dinâmicas
  const [estatisticas, setEstatisticas] = useState({
    totalConteudos: 0,
    conteudosPublicados: 0,
    pendentesRevisao: 0,
    downloadsTotais: 0,
    visualizacoesSemana: 0,
    disciplinasAtivas: 0,
    seriesAtendidas: 0,
  });

  // Lista de séries dinâmica
  const [series, setSeries] = useState<SerieEscolar[]>([]);

  // Função para carregar dados reais do Supabase
  const carregarDadosReais = async () => {
    if (!usuario?.id) {
        setLoadingStats(false);
        return;
    }

    try {
      setLoadingStats(true);

      // 1. Buscar todos os PDFs deste autor
      const { data: pdfs, error } = await supabase
        .from('pdfs_conteudista')
        .select('*')
        .eq('autor_id', usuario.id);

      if (error) throw error;

      const total = pdfs?.length || 0;

      // 2. Calcular disciplinas e séries únicas
      const disciplinasUnicas = new Set(pdfs?.map(p => p.disciplina));
      const seriesUnicas = new Set(pdfs?.map(p => p.serie));

      setEstatisticas(prev => ({
        ...prev,
        totalConteudos: total,
        conteudosPublicados: total,
        disciplinasAtivas: disciplinasUnicas.size,
        seriesAtendidas: seriesUnicas.size,
      }));

      // 3. Montar a lista de séries baseada no conteúdo enviado
      const mapaSeries = new Map<string, SerieEscolar>();

      pdfs?.forEach(pdf => {
        if (!mapaSeries.has(pdf.serie)) {
          mapaSeries.set(pdf.serie, {
            id: pdf.serie,
            nome: pdf.serie,
            nivel: pdf.serie.toLowerCase().includes('médio') ? 'medio' : 'fundamental',
            disciplinas: [],
            totalAlunos: 0,
            status: 'ativa'
          });
        }
        const serieObj = mapaSeries.get(pdf.serie);
        if (serieObj && !serieObj.disciplinas.includes(pdf.disciplina)) {
          serieObj.disciplinas.push(pdf.disciplina);
        }
      });

      setSeries(Array.from(mapaSeries.values()));

    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (view === "dashboard") {
      carregarDadosReais();
    }
  }, [usuario?.id, view]);

  if (view === "uploadPDF") {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button
          variant="ghost"
          onClick={() => setView("dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
        </Button>
        {/* Passando o usuário explicitamente para evitar erro de autenticação */}
        <GestaoConteudoPDF usuario={usuario} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border py-3 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <SchoolHeader subtitle="Portal Conteudista" />

          <div className="flex items-center gap-2 shrink-0">
            {onBackToSite && (
              <Button variant="outline" size="sm" onClick={onBackToSite} className="text-xs hidden sm:inline-flex">
                Voltar ao Site
              </Button>
            )}

            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}>
                <Bell className="w-5 h-5 text-muted-foreground" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </Button>
              {mostrarNotificacoes && (
                <Notificacoes onClose={() => setMostrarNotificacoes(false)} />
              )}
              <NotificacaoBalloon onAbrirNotificacoes={() => setMostrarNotificacoes(true)} />
            </div>

            <Button variant="ghost" size="sm" className="flex items-center gap-2 px-2" onClick={() => setMostrarPerfil(true)}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={usuario?.avatar} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {usuario?.nome?.slice(0, 2).toUpperCase() || "CO"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground hidden sm:block">{usuario?.nome || "Conteudista"}</span>
            </Button>
          </div>
        </div>
      </header>

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} usuario={usuario} logout={logout} />

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20 w-full">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Olá, {usuario?.nome?.split(" ")[0] || "Professor"} 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gerencie e publique o conteúdo das disciplinas
            </p>
          </div>
          <Button
            className="gap-2 text-xs shrink-0"
            onClick={() => setView("uploadPDF")}
          >
            <Upload className="w-4 h-4" />
            Gerenciar Conteúdos
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-border hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <Badge variant="secondary" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" /> Total</Badge>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.totalConteudos}
              </div>
              <div className="text-sm text-muted-foreground">Total de Conteúdos</div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                  Publicados
                </Badge>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.conteudosPublicados}
              </div>
              <div className="text-sm text-muted-foreground">Conteúdos publicados</div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40">
                  <GraduationCap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <Badge variant="secondary" className="text-xs">Ativas</Badge>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.disciplinasAtivas}
              </div>
              <div className="text-sm text-muted-foreground">Disciplinas Ativas</div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40">
                  <FolderOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <Badge variant="secondary" className="text-xs">Atendidas</Badge>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.seriesAtendidas}
              </div>
              <div className="text-sm text-muted-foreground">Séries Atendidas</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de séries */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Séries com Conteúdo Publicado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {series.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum conteúdo publicado ainda. Faça upload de PDFs para ver as séries aqui.
              </p>
            ) : (
              series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setView("uploadPDF")}
                  className="w-full flex justify-between items-center p-4 hover:bg-muted rounded-lg border-b border-border last:border-0 text-left transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 shrink-0">
                      <GraduationCap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{s.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.disciplinas.length} disciplinas ativas: {s.disciplinas.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                      Ativa
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <GestaoRAG />
        </div>
      </main>
    </div>
  );
}
