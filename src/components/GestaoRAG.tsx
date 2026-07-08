// src/components/GestaoRAG.tsx
// F5.10 — Gestão do RAG (Pinecone) no painel do Professor Conteudista
// Navegação em 3 níveis: série → disciplina → volume/bimestre, com exclusão
// individual e em lote (com confirmação reforçada) usando o catálogo espelhado
// no Supabase (rag_material_indexado) — o Pinecone não permite listar por si só.

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Loader2, Database, Trash2, RefreshCw, ChevronRight, ChevronLeft,
  GraduationCap, BookOpen, FolderOpen,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { supabase } from "../supabase/supabaseClient";
import { toast } from "sonner";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemCatalogo {
  livro_id: string;
  serie: string;
  disciplina: string;
  area: string | null;
  bimestre: number | null;
  volume: number | null;
  tipo: string;
  total_vetores: number;
  indexado_em: string | null;
}

function labelItem(item: ItemCatalogo): string {
  if (item.volume != null) return `Volume ${item.volume}`;
  if (item.bimestre === 0) return "Ano inteiro";
  if (item.bimestre != null) return `${item.bimestre}º bimestre`;
  return "Material";
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function GestaoRAG() {
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [totalPinecone, setTotalPinecone] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [serieAtiva, setSerieAtiva] = useState<string | null>(null);
  const [disciplinaAtiva, setDisciplinaAtiva] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState(false);
  const [confirmarItem, setConfirmarItem] = useState<ItemCatalogo | null>(null);
  const [confirmarLote, setConfirmarLote] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState("");

  const carregar = async () => {
    setCarregando(true);
    try {
      const [{ data: catalogoData, error: catalogoErro }, { data: statusData }] = await Promise.all([
        supabase.functions.invoke("rag-status", { body: { acao: "catalogo" } }),
        supabase.functions.invoke("rag-status", { body: { acao: "status" } }),
      ]);
      if (catalogoErro) throw catalogoErro;
      setItens(catalogoData?.itens ?? []);
      setTotalPinecone(statusData?.total_vetores ?? null);
    } catch {
      toast.error("Não foi possível carregar o catálogo do RAG.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  // ── Agrupamento série → disciplina → itens ────────────────────────────────
  const porSerie = useMemo(() => {
    const mapa = new Map<string, ItemCatalogo[]>();
    for (const item of itens) {
      if (!mapa.has(item.serie)) mapa.set(item.serie, []);
      mapa.get(item.serie)!.push(item);
    }
    return mapa;
  }, [itens]);

  const disciplinasDaSerie = useMemo(() => {
    if (!serieAtiva) return new Map<string, ItemCatalogo[]>();
    const mapa = new Map<string, ItemCatalogo[]>();
    for (const item of porSerie.get(serieAtiva) ?? []) {
      if (!mapa.has(item.disciplina)) mapa.set(item.disciplina, []);
      mapa.get(item.disciplina)!.push(item);
    }
    return mapa;
  }, [porSerie, serieAtiva]);

  const itensDaDisciplina = useMemo(() => {
    if (!serieAtiva || !disciplinaAtiva) return [];
    return (disciplinasDaSerie.get(disciplinaAtiva) ?? [])
      .slice()
      .sort((a, b) => (a.volume ?? a.bimestre ?? 0) - (b.volume ?? b.bimestre ?? 0));
  }, [disciplinasDaSerie, serieAtiva, disciplinaAtiva]);

  const somaVetores = (lista: ItemCatalogo[]) => lista.reduce((s, i) => s + (i.total_vetores || 0), 0);

  // ── Exclusão ────────────────────────────────────────────────────────────────
  const executarExclusao = async (ids: string[]) => {
    setExcluindo(true);
    try {
      const { data, error } = await supabase.functions.invoke("rag-status", {
        body: { acao: "excluir", livro_ids: ids },
      });
      if (error) throw error;
      if (data?.erro) throw new Error(data.erro);

      toast.success(data?.mensagem ?? "Removido com sucesso.");
      setItens(prev => prev.filter(i => !ids.includes(i.livro_id)));

      // Se esvaziou a disciplina/série atual, volta um nível
      if (disciplinaAtiva && !itens.some(i => i.disciplina === disciplinaAtiva && !ids.includes(i.livro_id))) {
        setDisciplinaAtiva(null);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível remover.");
    } finally {
      setExcluindo(false);
      setConfirmarItem(null);
      setConfirmarLote(false);
      setTextoConfirmacao("");
    }
  };

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 flex-wrap">
      <button
        onClick={() => { setSerieAtiva(null); setDisciplinaAtiva(null); }}
        className={`hover:text-foreground transition-colors ${!serieAtiva ? "text-foreground font-medium" : ""}`}
      >
        Séries
      </button>
      {serieAtiva && (
        <>
          <ChevronRight className="w-3.5 h-3.5" />
          <button
            onClick={() => setDisciplinaAtiva(null)}
            className={`hover:text-foreground transition-colors ${!disciplinaAtiva ? "text-foreground font-medium" : ""}`}
          >
            {serieAtiva}
          </button>
        </>
      )}
      {disciplinaAtiva && (
        <>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{disciplinaAtiva}</span>
        </>
      )}
    </div>
  );

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            Gestão do RAG (material indexado para IA)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Conteúdo usado pela Professora Sofia para responder alunos, professores e coordenação.
          A indexação roda localmente (OCR + embeddings) — aqui você navega por série e disciplina
          e remove material desatualizado antes de reindexar.
        </p>
      </CardHeader>

      <CardContent>
        {/* Total geral */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4 mb-5 bg-muted/40">
          <div>
            <p className="text-sm text-muted-foreground">Total de vetores indexados no Pinecone (geral)</p>
            <p className="text-2xl font-bold text-foreground">
              {totalPinecone ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Livros no catálogo</p>
            <p className="text-2xl font-bold text-foreground">{itens.length}</p>
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando catálogo...
          </div>
        ) : itens.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum material indexado ainda (ou o catálogo ainda não foi sincronizado —
            rode a indexação local para popular esta lista).
          </p>
        ) : (
          <>
            <Breadcrumb />

            {/* Nível 1 — séries */}
            {!serieAtiva && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...porSerie.entries()].map(([serie, lista]) => {
                  const disciplinas = new Set(lista.map(i => i.disciplina));
                  return (
                    <button
                      key={serie}
                      onClick={() => setSerieAtiva(serie)}
                      className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
                          <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{serie}</p>
                          <p className="text-xs text-muted-foreground">
                            {disciplinas.size} disciplina{disciplinas.size !== 1 ? "s" : ""} · {somaVetores(lista)} vetores
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Nível 2 — disciplinas da série */}
            {serieAtiva && !disciplinaAtiva && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...disciplinasDaSerie.entries()].map(([disciplina, lista]) => (
                  <button
                    key={disciplina}
                    onClick={() => setDisciplinaAtiva(disciplina)}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 shrink-0">
                        <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{disciplina}</p>
                        <p className="text-xs text-muted-foreground">
                          {lista.length} item{lista.length !== 1 ? "s" : ""} · {somaVetores(lista)} vetores
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Nível 3 — volumes/bimestres da disciplina */}
            {serieAtiva && disciplinaAtiva && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDisciplinaAtiva(null)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  {itensDaDisciplina.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmarLote(true)}
                      disabled={excluindo}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir todos os {itensDaDisciplina.length} itens desta disciplina
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {itensDaDisciplina.map(item => (
                    <div key={item.livro_id} className="flex items-center justify-between p-3.5 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/40 shrink-0">
                          <FolderOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{labelItem(item)}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.total_vetores} vetores
                            {item.indexado_em ? ` · indexado em ${new Date(item.indexado_em).toLocaleDateString("pt-BR")}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmarItem(item)}
                        disabled={excluindo}
                        aria-label={`Excluir ${labelItem(item)}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Confirmação — exclusão individual */}
      <AlertDialog open={!!confirmarItem} onOpenChange={v => { if (!v) setConfirmarItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item do índice?</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">{confirmarItem ? labelItem(confirmarItem) : ""}</span> de{" "}
              <span className="font-semibold">{confirmarItem?.disciplina}</span> ({confirmarItem?.serie}) será
              removido do Pinecone. A Professora Sofia deixará de usar esse material até uma nova indexação local.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmarItem && executarExclusao([confirmarItem.livro_id])}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação — exclusão em lote (reforçada) */}
      <AlertDialog open={confirmarLote} onOpenChange={v => { if (!v) { setConfirmarLote(false); setTextoConfirmacao(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover todos os itens de {disciplinaAtiva}?</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              Isso vai remover <span className="font-semibold">{itensDaDisciplina.length} itens</span> (
              {somaVetores(itensDaDisciplina)} vetores) de{" "}
              <span className="font-semibold">{disciplinaAtiva}</span> ({serieAtiva}) do Pinecone.
              Essa ação não pode ser desfeita pela interface.
            </p>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="confirmacao-lote" className="text-sm">
              Digite <span className="font-semibold">{disciplinaAtiva}</span> para confirmar
            </Label>
            <Input
              id="confirmacao-lote"
              value={textoConfirmacao}
              onChange={e => setTextoConfirmacao(e.target.value)}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executarExclusao(itensDaDisciplina.map(i => i.livro_id))}
              disabled={excluindo || textoConfirmacao !== disciplinaAtiva}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
            >
              {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : `Excluir ${itensDaDisciplina.length} itens`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
