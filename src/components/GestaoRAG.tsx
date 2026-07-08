// src/components/GestaoRAG.tsx
// F5.10 — Gestão do RAG (Pinecone) no painel do Professor Conteudista
// Mostra o total de vetores indexados e permite remover o material de uma
// série/disciplina antes de reindexar localmente uma versão atualizada.

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Database, Trash2, RefreshCw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { supabase } from "../supabase/supabaseClient";
import { toast } from "sonner";

export function GestaoRAG() {
  const [totalVetores, setTotalVetores] = useState<number | null>(null);
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [serie, setSerie] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const carregarStatus = async () => {
    setCarregandoStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("rag-status", {
        body: { acao: "status" },
      });
      if (error) throw error;
      setTotalVetores(data?.total_vetores ?? 0);
    } catch {
      setTotalVetores(null);
    } finally {
      setCarregandoStatus(false);
    }
  };

  useEffect(() => {
    carregarStatus();
  }, []);

  const handleExcluir = async () => {
    setExcluindo(true);
    try {
      const { data, error } = await supabase.functions.invoke("rag-status", {
        body: { acao: "excluir", serie: serie.trim(), disciplina: disciplina.trim() },
      });
      if (error) throw error;
      if (data?.erro) throw new Error(data.erro);

      toast.success(data?.mensagem ?? "Vetores removidos.");
      setSerie("");
      setDisciplina("");
      carregarStatus();
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível remover os vetores.");
    } finally {
      setExcluindo(false);
      setConfirmarExclusao(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" />
          Gestão do RAG (material indexado para IA)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Conteúdo usado pela Professora Sofia para responder alunos, professores e coordenação.
          A indexação roda localmente (OCR + embeddings) — aqui você acompanha o status e pode
          remover uma série/disciplina desatualizada antes de reindexar.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm text-muted-foreground">Total de vetores indexados no Pinecone</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              {carregandoStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : (totalVetores ?? "—")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={carregarStatus} disabled={carregandoStatus}>
            <RefreshCw className={`w-4 h-4 mr-2 ${carregandoStatus ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Remover material desatualizado</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rag-serie">Série</Label>
              <Input
                id="rag-serie"
                placeholder="Ex: 1ª série"
                value={serie}
                onChange={e => setSerie(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rag-disciplina">Disciplina</Label>
              <Input
                id="rag-disciplina"
                placeholder="Ex: Biologia"
                value={disciplina}
                onChange={e => setDisciplina(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={!serie.trim() || !disciplina.trim() || excluindo}
            onClick={() => setConfirmarExclusao(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remover vetores desta série/disciplina
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmarExclusao} onOpenChange={v => { if (!v) setConfirmarExclusao(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover material indexado?</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              Todos os vetores de <span className="font-semibold">{disciplina}</span> /{" "}
              <span className="font-semibold">{serie}</span> serão removidos do Pinecone.
              A Professora Sofia deixará de usar esse material até uma nova indexação local.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
