// src/components/DisciplinaPage.tsx
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

import {
  BookOpen,
  FileText,
  Video,
  MessageSquare,
  FileText as FileTextIcon,
  Loader2,
} from "lucide-react";

import { AtividadesAluno } from "./AtividadesAluno";
import { AulasAoVivo } from "./AulasAoVivo";
import { Forum } from "./Forum";
import { PDFViewerModerno, ConteudoPdf } from "./PDFViewerModerno";

type Aba = "conteudo" | "atividades" | "aulaVivo" | "forum";

interface DisciplinaData {
  id: string;
  nome: string;
  cor: string;
}

interface TurmaData {
  id: string;
  nome: string;
  serieId: string;
  serieNome: string;
  totalAlunos: number;
  disciplinas: DisciplinaData[];
}

interface DisciplinaPageProps {
  disciplina: DisciplinaData;
  turma: TurmaData | null;
  usuario: any;
}

export function DisciplinaPage({ disciplina, turma, usuario }: DisciplinaPageProps) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("conteudo");

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

 const menuItens = [
  { id: "conteudo" as Aba, label: "Conteúdo", shortLabel: "Conteúdo", icon: BookOpen },
  { id: "atividades" as Aba, label: "Atividades", shortLabel: "Atividades", icon: FileText },
  { id: "aulaVivo" as Aba, label: "Aulas ao Vivo", shortLabel: "Aulas", icon: Video },
  { id: "forum" as Aba, label: "Fórum", shortLabel: "Fórum", icon: MessageSquare },
];

  useEffect(() => {
    async function carregarMateriais() {
      if (!turma?.serieNome || !disciplina?.nome) return;
      setLoadingConteudo(true);
      setErroConteudo(null);
      try {
        const { data, error } = await supabase
          .from("pdfs_conteudista")
          .select(`id, url, nome, titulo, descricao, disciplina, serie, bimestre, autor_nome, created_at`)
          .eq("serie", turma.serieNome)
          .eq("disciplina", disciplina.nome)
          .order("bimestre", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;

        const mapeados: ConteudoPdf[] = (data || []).map((row: any) => ({
          id: row.id,
          url: row.url,
          nome: row.nome || row.titulo || "Material",
          titulo: row.titulo,
          descricao: row.descricao,
          disciplina: row.disciplina,
          serie: row.serie,
          bimestre: row.bimestre,
          autor_nome: row.autor_nome,
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
    }

    if (abaAtiva === "conteudo") carregarMateriais();
  }, [abaAtiva, turma?.serieNome, disciplina?.nome]);

  const bimestres = [1, 2, 3, 4];
  const getMaterialDoBimestre = (b: number) => materiais.find((m) => m.bimestre === b) || null;

  return (
    <div className="flex flex-col min-h-full">

      {/* Abas de navegação — sem cabeçalho duplicado */}
      <div className="border-b border-border mb-4 sm:mb-6">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {menuItens.map((item) => {
            const Icon = item.icon;
            const isAtivo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 border-b-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${                  isAtivo
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

        {/* Aba Conteúdo */}
        {abaAtiva === "conteudo" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

            {/* Coluna dos bimestres */}
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

                  {!loadingConteudo && !erroConteudo && bimestres.map((bimestre) => {
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
                          <span className="font-semibold">
                            {bimestre}º bimestre
                          </span>
                          {disponivel && !selecionado && (
                            <Badge
                              className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-none text-[10px]"
                              variant="secondary"
                            >
                              Disponível
                            </Badge>
                          )}
                          {selecionado && (
                            <Badge
                              className="bg-white/20 text-white border-none text-[10px]"
                              variant="secondary"
                            >
                              Aberto
                            </Badge>
                          )}
                        </div>
                        <span className={`text-xs truncate ${selecionado ? "text-blue-100" : "text-muted-foreground"}`}>
                          {disponivel
                            ? mat?.nome || "Material disponível"
                            : "Ainda não disponível"}
                        </span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Visualizador de PDF */}
            <div className="lg:col-span-3">
              <PDFViewerModerno
                material={materialSelecionado}
                disciplina={{
                  id: disciplina.id,
                  nome: disciplina.nome,
                  professor: undefined,
                }}
                onMarcarConcluido={(_id) => {
                  // Futuro: salvar em tabela de progresso
                }}
                onEnviarDuvida={(_id) => {
                  // Futuro: abrir modal de dúvida / fórum
                }}
              />
            </div>
          </div>
        )}

        {/* Aba Atividades */}
        {abaAtiva === "atividades" && (
          <AtividadesAluno
            disciplinaId={disciplina.id}
            nomeDisciplina={disciplina.nome}
            serieNome={turma.serieNome}
          />
        )}

        {/* Aba Aulas ao Vivo */}
        {abaAtiva === "aulaVivo" && (
          <AulasAoVivo
            disciplina={disciplina}
            serie={{ id: turma.serieId, nome: turma.serieNome }}
            turma={{ id: turma.id, nome: turma.nome }}
          />
        )}

        {/* Aba Fórum */}
        {abaAtiva === "forum" && (
          <Forum
            disciplina={disciplina}
            serie={{ id: turma.serieId, nome: turma.serieNome }}
            turma={{ id: turma.id, nome: turma.nome }}
          />
        )}
      </div>
    </div>
  );
}