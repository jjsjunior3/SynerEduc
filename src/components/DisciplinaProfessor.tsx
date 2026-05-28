// src/components/DisciplinaProfessor.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useSegmento } from "../hooks/useSegmento";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader2, BookOpen, FileText, Video, Calendar as CalendarIcon, FileText as FileTextIcon } from "lucide-react";

import { PDFViewerProfessor } from "./PDFViewerProfessor";
import { AtividadesProfessor } from "./AtividadesProfessor";
import { FrequenciaProfessor } from "./FrequenciaProfessor";
import { AulasAoVivoProfessor } from "./AulasAoVivoProfessor";

interface ConteudoPdf {
  id: string;
  url: string;
  nome: string;
  titulo: string;
  descricao: string;
  disciplina: string;
  serie: string;
  bimestre: number;
  autor_nome: string;
  created_at: string;
}

type Aba = "conteudo" | "atividades" | "frequencia" | "aulaVivo";

interface DisciplinaProfessorProps {
  disciplina: { id: string; nome: string; cor: string };
  serie: { id: string; nome: string };
  turma: { id: string; nome: string };
  onVoltar: () => void;
}

export function DisciplinaProfessor({ disciplina, serie, turma, onVoltar }: DisciplinaProfessorProps) {
  const { usuario } = useAuth();
  const { isPresencial } = useSegmento();

  // Presencial começa em "atividades"; EAD começa em "conteudo"
  const [abaAtiva, setAbaAtiva] = useState<Aba>(isPresencial ? "atividades" : "conteudo");

  const [materiais, setMateriais] = useState<ConteudoPdf[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState<ConteudoPdf | null>(null);
  const [loadingConteudo, setLoadingConteudo] = useState(false);
  const [erroConteudo, setErroConteudo] = useState<string | null>(null);

  if (!disciplina || !turma) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-muted-foreground text-sm">Carregando disciplina...</span>
      </div>
    );
  }

  const todosMenuItens = [
    { id: "conteudo" as Aba,    label: "Conteúdo",     shortLabel: "Conteúdo",   icon: BookOpen,      apenasEAD: true  },
    { id: "atividades" as Aba,  label: "Atividades",   shortLabel: "Atividades", icon: FileText,      apenasEAD: false },
    { id: "frequencia" as Aba,  label: "Frequência",   shortLabel: "Frequência", icon: CalendarIcon,  apenasEAD: false },
    { id: "aulaVivo" as Aba,    label: "Aulas ao Vivo",shortLabel: "Aulas",      icon: Video,         apenasEAD: true  },
  ];

  // Oculta abas EAD-only quando segmento é presencial
  const menuItens = todosMenuItens.filter(item => !(isPresencial && item.apenasEAD));

  const buscarConteudos = useCallback(async () => {
    if (!serie?.nome || !disciplina?.nome) return;
    setLoadingConteudo(true);
    setErroConteudo(null);
    try {
      const { data, error } = await supabase
        .from("pdfs_conteudista")
        .select("id, url, nome, titulo, descricao, disciplina, serie, bimestre, autor_nome, created_at")
        .eq("serie", serie.nome)
        .eq("disciplina", disciplina.nome)
        .order("bimestre", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mapeados: ConteudoPdf[] = (data || []).map((row: any) => ({
        id: row.id, url: row.url,
        nome: row.nome || row.titulo || "Material",
        titulo: row.titulo, descricao: row.descricao,
        disciplina: row.disciplina, serie: row.serie,
        bimestre: row.bimestre, autor_nome: row.autor_nome,
        created_at: row.created_at,
      }));

      setMateriais(mapeados);
      if (!materialSelecionado) {
        setMaterialSelecionado(mapeados.find((m) => m.bimestre === 1) || mapeados[0] || null);
      }
    } catch (e: any) {
      setErroConteudo(e?.message || "Erro ao carregar materiais.");
      setMateriais([]);
      setMaterialSelecionado(null);
    } finally {
      setLoadingConteudo(false);
    }
  }, [disciplina?.nome, serie?.nome]);

  useEffect(() => {
    if (abaAtiva === "conteudo") buscarConteudos();
  }, [abaAtiva, buscarConteudos]);

  const getMaterialDoBimestre = (b: number) => materiais.find((m) => m.bimestre === b) || null;

  return (
    <div className="flex flex-col min-h-full">

      {/* Abas — filtradas por segmento */}
      <div className="border-b border-border mb-4 sm:mb-6">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {menuItens.map((item) => {
            const Icon = item.icon;
            const isAtivo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 border-b-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isAtivo
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4 hidden sm:block" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo das abas */}
      <div className="flex-1">

        {/* Aba Conteúdo — apenas EAD */}
        {abaAtiva === "conteudo" && !isPresencial && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

            {/* Bimestres */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileTextIcon className="w-4 h-4" />
                    Conteúdos por Bimestre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingConteudo && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando materiais...
                    </div>
                  )}
                  {erroConteudo && (
                    <p className="text-xs text-red-600">{erroConteudo}</p>
                  )}
                  {!loadingConteudo && !erroConteudo && [1, 2, 3, 4].map((bimestre) => {
                    const mat = getMaterialDoBimestre(bimestre);
                    const disponivel = !!mat;
                    const selecionado = materialSelecionado?.bimestre === bimestre;

                    return (
                      <button
                        key={bimestre}
                        onClick={() => disponivel && setMaterialSelecionado(mat)}
                        disabled={!disponivel}
                        className={`w-full text-left px-3 py-3 rounded-md border text-sm transition flex flex-col gap-1 ${
                          disponivel
                            ? selecionado
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-foreground"
                            : "border-dashed border-border bg-muted/30 text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{bimestre}º bimestre</span>
                          {disponivel && !selecionado && (
                            <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-none text-[10px]" variant="secondary">
                              Disponível
                            </Badge>
                          )}
                          {selecionado && (
                            <Badge className="bg-white/20 text-white border-none text-[10px]" variant="secondary">
                              Aberto
                            </Badge>
                          )}
                        </div>
                        <span className={`text-xs truncate ${selecionado ? "text-blue-100" : "text-muted-foreground"}`}>
                          {disponivel ? mat?.nome || "Material disponível" : "Ainda não disponível"}
                        </span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* PDF Viewer */}
            <div className="lg:col-span-3">
              <PDFViewerProfessor
                bimestre={materialSelecionado ? {
                  numero: materialSelecionado.bimestre,
                  nome: materialSelecionado.nome,
                  descricao: materialSelecionado.descricao ?? "",
                  pdfUrl: materialSelecionado.url,
                  id: materialSelecionado.id,
                  autor_nome: materialSelecionado.autor_nome,
                } : null}
                onClose={() => setMaterialSelecionado(null)}
                sidebarAberta={true}
                onToggleSidebar={() => {}}
                hasProximo={materialSelecionado ? materialSelecionado.bimestre < 4 : false}
                hasAnterior={materialSelecionado ? materialSelecionado.bimestre > 1 : false}
                onProximo={() => {
                  if (materialSelecionado && materialSelecionado.bimestre < 4) {
                    const prox = materiais.find((m) => m.bimestre === materialSelecionado.bimestre + 1);
                    if (prox) setMaterialSelecionado(prox);
                  }
                }}
                onAnterior={() => {
                  if (materialSelecionado && materialSelecionado.bimestre > 1) {
                    const ant = materiais.find((m) => m.bimestre === materialSelecionado.bimestre - 1);
                    if (ant) setMaterialSelecionado(ant);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Aba Atividades */}
        {abaAtiva === "atividades" && (
          <AtividadesProfessor disciplina={disciplina} serie={serie} />
        )}

        {/* Aba Frequência */}
        {abaAtiva === "frequencia" && (
          <FrequenciaProfessor disciplina={disciplina} serie={serie} />
        )}

        {/* Aba Aulas ao Vivo — apenas EAD */}
        {abaAtiva === "aulaVivo" && !isPresencial && (
          <AulasAoVivoProfessor disciplina={disciplina} serie={serie} />
        )}

      </div>
    </div>
  );
}

export default DisciplinaProfessor;