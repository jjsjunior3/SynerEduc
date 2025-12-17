// src/components/DisciplinaPage.tsx
/**
 * Componente para visualizar o conteúdo de uma disciplina específica para o ALUNO.
 * Contém abas para Conteúdo, Atividades, Frequência, Agenda, Aulas ao Vivo e Fórum.
 *
 * CORREÇÕES:
 * - Ajuste na interface DisciplinaPageProps para receber serie e turma como objetos com IDs e nomes.
 * - Passagem correta das props disciplina, serie e turma para AgendaAluno e FrequenciaAluno.
 * - Renderiza AgendaAluno e FrequenciaAluno (novos componentes).
 * - REMOVIDAS todas as referências a ThemeContext e Dark Mode.
 */

import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  BookOpen,
  MessageSquare,
  BarChart3,
  Video,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
// import { useTheme } from "../contexts/ThemeContext"; // REMOVIDO

// Sub‑componentes das abas
import { PDFViewerModerno } from "./PDFViewerModerno"; // Assumindo que você terá um PDFViewerAluno
import { AtividadesAluno } from "./AtividadesAluno";
import  {FrequenciaAluno}  from "./FrequenciaAluno"; // ✅ NOVO: Componente para Frequência do Aluno
import { Forum } from "./Forum"; // Assumindo que você terá um ForumAluno
import { AulasAoVivo } from "./AulasAoVivo"; // Assumindo que você terá um AulasAoVivoAluno
import { AgendaAluno } from "./AgendaAluno"; // ✅ NOVO: Componente para Agenda do Aluno

/* ============================================================= */
/* ====================== TIPOS DE DADOS ====================== */
interface DisciplinaProps {
  id: string;
  nome: string;
  cor?: string;
}

interface SerieProps {
  id: string; // ID real da série (UUID)
  nome: string; // Nome da série (string)
}

interface TurmaProps {
  id: string; // ID da turma (UUID)
  nome: string; // Nome da turma (string)
}

// ✅ AJUSTADO: Interface de props para DisciplinaPage
interface DisciplinaPageProps {
  disciplina: DisciplinaProps;
  serie: SerieProps; // ✅ ID real da série e nome da série
  turma: TurmaProps; // ✅ ID da turma e nome da turma
  onVoltar: () => void;
}

/* ============================================================= */

export function DisciplinaPage({
  disciplina,
  serie,
  turma,
  onVoltar,
}: DisciplinaPageProps) {
  // const { theme } = useTheme(); // REMOVIDO
  const [abaAtiva, setAbaAtiva] = useState<
    "conteudo" | "atividades" | "forum" | "frequencia" | "agenda" | "aulas-vivo"
  >("conteudo");

  const [loadingConteudo, setLoadingConteudo] = useState(false);
  const [conteudo, setConteudo] = useState<any>(null);

  useEffect(() => {
    if (abaAtiva === "conteudo" && disciplina?.id) {
      setLoadingConteudo(true);
      setTimeout(() => {
        setConteudo({
          titulo: `Conteúdo de ${disciplina.nome}`,
          descricao: `Este é o material didático para a disciplina de ${disciplina.nome} da ${serie.nome} - Turma ${turma.nome}.`,
        });
        setLoadingConteudo(false);
      }, 500);
    }
  }, [abaAtiva, disciplina, serie, turma]);

  /* ============================================================= */
  /* ==================== RENDERIZAÇÃO DAS ABAS ==================== */

  if (abaAtiva === "conteudo") {
    return (
      <div className="flex-1 w-full bg-gray-50 p-6 overflow-y-auto"> {/* REMOVIDO dark: classes */}
        {loadingConteudo ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" /> {/* REMOVIDO dark: classes */}
            <span className="ml-2 text-gray-600">Carregando conteúdo...</span> {/* REMOVIDO dark: classes */}
          </div>
        ) : (
          <Card className="max-w-4xl mx-auto bg-white text-gray-900"> {/* REMOVIDO dark: classes */}
            <CardHeader>
              <CardTitle>Conteúdo da Disciplina: {disciplina.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{conteudo?.descricao}</p> {/* REMOVIDO dark: classes */}
              {/* <PDFViewerAluno pdfUrl="https://example.com/sample.pdf" /> */}
              <div className="p-4 border border-dashed rounded-md text-center text-gray-500"> {/* REMOVIDO dark: classes */}
                Conteúdo da disciplina será exibido aqui.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (abaAtiva === "atividades") {
    return (
      <div className="flex-1 w-full bg-gray-50 overflow-y-auto"> {/* REMOVIDO dark: classes */}
        <AtividadesAluno
          onVoltar={onVoltar}
          disciplina={disciplina}
          serie={serie}
          turma={turma}
        />
      </div>
    );
  }

  if (abaAtiva === "frequencia") {
    return (
      <div className="flex-1 w-full bg-gray-50 overflow-y-auto"> {/* REMOVIDO dark: classes */}
        <FrequenciaAluno
          onVoltar={onVoltar}
          disciplina={disciplina}
          serie={serie}
          turma={turma}
        />
      </div>
    );
  }

  if (abaAtiva === "agenda") {
    return (
      <div className="flex-1 w-full bg-gray-50 overflow-y-auto"> {/* REMOVIDO dark: classes */}
        <AgendaAluno
          onVoltar={onVoltar}
          disciplina={disciplina}
          serie={serie}
          turma={turma}
        />
      </div>
    );
  }

  if (abaAtiva === "aulas-vivo") {
    return (
      <div className="flex-1 w-full bg-gray-50 overflow-y-auto"> {/* REMOVIDO dark: classes */}
        <AulasAoVivo
          onVoltar={onVoltar}
          disciplina={disciplina}
          serie={serie}
          turma={turma}
        />
      </div>
    );
  }

  if (abaAtiva === "forum") {
    return (
      <div className="flex-1 w-full bg-gray-50 overflow-y-auto"> {/* REMOVIDO dark: classes */}
        <Forum
          onVoltar={onVoltar}
          disciplina={disciplina}
          serie={serie}
          turma={turma}
        />
      </div>
    );
  }

  /* ============================================================= */
  /* ==================== LAYOUT PRINCIPAL DO COMPONENTE ==================== */
  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden"> {/* REMOVIDO dark: classes */}
      {/* HEADER */}
      <div className={`${disciplina.cor || "bg-blue-600"} border-b shrink-0`}>
        <div className="px-6 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVoltar}
            className="flex items-center gap-2 text-white hover:text-white/80 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </Button>

          <div className="flex justify-between items-end text-white mt-4">
            <div>
              <h1 className="text-2xl font-bold">{disciplina.nome}</h1>
              <p className="text-white/80 text-sm">
                {serie.nome} - Turma {turma.nome}
              </p>
            </div>
            <Badge className="bg-white/20 text-white border-0">
              <BookOpen className="w-4 h-4 mr-2" /> Material Didático
            </Badge>
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10"> {/* REMOVIDO dark: classes */}
        <div className="px-6">
          <div className="flex space-x-6 overflow-x-auto">
            {[
              { id: "conteudo", label: "Conteúdo", icon: FileText },
              { id: "atividades", label: "Atividades", icon: FileText },
              { id: "frequencia", label: "Frequência", icon: BarChart3 },
              { id: "agenda", label: "Agenda", icon: CalendarIcon },
              { id: "aulas-vivo", label: "Aulas ao Vivo", icon: Video },
              { id: "forum", label: "Fórum", icon: MessageSquare },
            ].map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 font-medium whitespace-nowrap ${
                    abaAtiva === aba.id
                      ? "border-blue-600 text-blue-600" // REMOVIDO dark: classes
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300" // REMOVIDO dark: classes
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {aba.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL (conteúdo das abas) */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex items-center justify-center w-full h-full text-gray-500"> {/* REMOVIDO dark: classes */}
          Selecione uma aba para visualizar o conteúdo.
        </div>
      </div>
    </div>
  );
}
