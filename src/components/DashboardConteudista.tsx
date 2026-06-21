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
  LogOut,
  Upload,
  Loader2
} from "lucide-react";
import { PerfilUsuario } from "./PerfilUsuario";
import { Notificacoes } from "./Notificacoes";
// Importante: Usando o componente corrigido
import { GestaoConteudoPDF } from "./GestaoConteudoPDF"; 
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
      <div className="p-6 bg-gray-50 min-h-screen">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 border-b fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {onBackToSite && (
              <Button variant="ghost" size="sm" onClick={onBackToSite} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            )}
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Portal Conexão
              </h1>
              <p className="text-xs text-gray-600">Portal Conteudista</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}>
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMostrarPerfil(!mostrarPerfil)}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={usuario?.avatar} />
                <AvatarFallback>{usuario?.nome?.slice(0, 2).toUpperCase() || "CO"}</AvatarFallback>
              </Avatar>
            </Button>
            {logout && (
              <Button onClick={logout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
            )}
          </div>
        </div>
        {mostrarNotificacoes && (
          <div className="absolute right-4 top-16 w-80 z-50">
            <Notificacoes usuario={usuario} onClose={() => setMostrarNotificacoes(false)} />
          </div>
        )}
        {mostrarPerfil && (
          <div className="absolute right-4 top-16 w-80 z-50">
            <PerfilUsuario usuario={usuario} onClose={() => setMostrarPerfil(false)} />
          </div>
        )}
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-6 py-10 pt-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Olá, {usuario?.nome?.split(" ")[0] || "Professor"} 👋
        </h2>
        <p className="text-gray-600 mb-6">
          Gerencie e publique o conteúdo das disciplinas
        </p>

        {/* Botão direto pra upload */}
        <div className="mb-8">
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => setView("uploadPDF")}
          >
            <Upload className="w-4 h-4 mr-2" />
            Gerenciar Conteúdos (Upload)
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-blue-600 text-white">
            <CardContent className="p-6">
              <p>Total de Conteúdos</p>
              <h3 className="text-3xl font-bold flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.totalConteudos}
              </h3>
            </CardContent>
          </Card>
          <Card className="bg-green-600 text-white">
            <CardContent className="p-6">
              <p>Publicados</p>
              <h3 className="text-3xl font-bold flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.conteudosPublicados}
              </h3>
            </CardContent>
          </Card>
          <Card className="bg-purple-600 text-white">
            <CardContent className="p-6">
              <p>Disciplinas Ativas</p>
              <h3 className="text-3xl font-bold flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.disciplinasAtivas}
              </h3>
            </CardContent>
          </Card>
          <Card className="bg-orange-500 text-white">
            <CardContent className="p-6">
              <p>Séries Atendidas</p>
              <h3 className="text-3xl font-bold flex items-center gap-2">
                {loadingStats ? <Loader2 className="animate-spin w-6 h-6" /> : estatisticas.seriesAtendidas}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Lista de séries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-600" />
              Séries com Conteúdo Publicado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {series.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Nenhum conteúdo publicado ainda. Faça upload de PDFs para ver as séries aqui.
              </p>
            ) : (
              series.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg border-b last:border-0">
                  <div className="flex items-center gap-4">
                    <GraduationCap className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">{s.nome}</p>
                      <p className="text-sm text-gray-600">
                        {s.disciplinas.length} disciplinas ativas: {s.disciplinas.join(", ")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={s.status === "ativa" ? "default" : "secondary"}>Ativa</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
