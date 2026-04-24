import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

import {
  Download,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  File,
  Send,
  History,
  Target,
  Loader2,
  MessageSquare,
  Star,
  ExternalLink,
} from "lucide-react";

import { toast } from "sonner";

interface AtividadeSubmissao {
  id: string;
  atividade_id: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  data_entrega: string;
  status: "pendente" | "entregue" | "concluido";
  nota?: number;
  feedback?: string;
}

interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  data_entrega: string;
  status: "pendente" | "enviado" | "corrigido" | "atrasado";
  tipo: "exercicio" | "prova" | "trabalho" | "projeto";
  pontuacao: number;
  submissao?: AtividadeSubmissao;
}

interface AtividadesAlunoProps {
  disciplinaId: string;
  nomeDisciplina: string;
  serieNome: string;
}

export function AtividadesAluno({
  disciplinaId,
  nomeDisciplina,
  serieNome,
}: AtividadesAlunoProps) {
  const { usuario } = useAuth();

  const [modalEnvioAberto, setModalEnvioAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] =
    useState<Atividade | null>(null);
  const [arquivoResposta, setArquivoResposta] = useState<File | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [carregandoEnvio, setCarregandoEnvio] = useState(false);
  const [error, setError] = useState<string>("");

  // ========================================
  // CARREGAR ATIVIDADES DO BANCO
  // ========================================
  const carregarAtividades = useCallback(async () => {
    if (!usuario?.id || !serieNome || !nomeDisciplina) return;

    try {
      setLoading(true);
      setError("");

      const { data: atividadesData, error: atividadesError } = await supabase
        .from("atividades")
        .select("*")
        .eq("serie", serieNome)
        .eq("disciplina", nomeDisciplina)
        .order("data_entrega", { ascending: true });

      if (atividadesError) throw atividadesError;

      const atividadeIds = (atividadesData || []).map((a: any) => a.id);

      if (atividadeIds.length === 0) {
        setAtividades([]);
        return;
      }

      const { data: submissoesData, error: submissoesError } = await supabase
        .from("atividades_alunos")
        .select("*")
        .eq("aluno_id", usuario.id)
        .in("atividade_id", atividadeIds);

      if (submissoesError) throw submissoesError;

      const submissoesMap = new Map(
        (submissoesData || []).map((s: any) => [s.atividade_id, s])
      );

      const agora = new Date();

      const atividadesFormatadas: Atividade[] = (atividadesData || []).map(
        (atv: any) => {
          const sub = submissoesMap.get(atv.id);
          const dataEntregaAtividade = new Date(atv.data_entrega);

          let statusAtividade: Atividade["status"] = "pendente";

          if (sub) {
            statusAtividade = "enviado";
            if (sub.nota !== null && sub.nota !== undefined) {
              statusAtividade = "corrigido";
            }
          } else if (agora > dataEntregaAtividade) {
            statusAtividade = "atrasado";
          }

          const submissao: AtividadeSubmissao | undefined = sub
            ? {
                id: sub.id,
                atividade_id: sub.atividade_id,
                arquivo_url: sub.arquivo_url || undefined,
                arquivo_nome: sub.arquivo_nome || undefined,
                data_entrega: sub.data_entrega,
                status:
                  (sub.status as AtividadeSubmissao["status"]) || "pendente",
                nota:
                  sub.nota !== null && sub.nota !== undefined
                    ? Number(sub.nota)
                    : undefined,
                feedback: sub.feedback || undefined,
              }
            : undefined;

          return {
            id: atv.id,
            titulo: atv.titulo,
            descricao: atv.descricao || "",
            arquivo_url: atv.arquivo_url || undefined,
            arquivo_nome: atv.arquivo_nome || undefined,
            data_entrega: atv.data_entrega,
            status: statusAtividade,
            tipo: (atv.tipo as Atividade["tipo"]) || "exercicio",
            pontuacao: atv.pontuacao || 100,
            submissao,
          };
        }
      );

      setAtividades(atividadesFormatadas);
    } catch (err: any) {
      console.error("Erro ao carregar atividades:", err);
      setError(
        err.message ||
          "Erro ao carregar atividades. Tente novamente mais tarde."
      );
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, serieNome, nomeDisciplina]);

  useEffect(() => {
    carregarAtividades();
  }, [carregarAtividades]);

  // ========================================
  // UPLOAD DE ARQUIVO DE RESPOSTA
  // ========================================
  async function uploadArquivoResposta(
    file: File,
    atividadeId: string
  ): Promise<{ url: string; nome: string } | null> {
    try {
      const timestamp = Date.now();
      const alunoIdSanitizado = usuario?.id.replace(/-/g, "") || "unknown";
      const fileName = `${alunoIdSanitizado}_${timestamp}_${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;
      const filePath = `${atividadeId}/${fileName}`;

      const { error } = await supabase.storage
        .from("entregas_atividades")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("entregas_atividades").getPublicUrl(filePath);

      return { url: publicUrl, nome: file.name };
    } catch (error) {
      console.error("Erro ao fazer upload da resposta:", error);
      toast.error("Erro ao enviar seu arquivo de resposta");
      return null;
    }
  }

  // ========================================
  // SUBMISSÃO DA ATIVIDADE PELO ALUNO
  // ========================================
  const handleSubmissao = async () => {
    if (!atividadeSelecionada || !arquivoResposta || !usuario?.id) {
      toast.error("Selecione um arquivo e tente novamente.");
      return;
    }

    setCarregandoEnvio(true);

    try {
      const resultadoUpload = await uploadArquivoResposta(
        arquivoResposta,
        atividadeSelecionada.id
      );
      if (!resultadoUpload) {
        throw new Error("Falha no upload do arquivo de resposta.");
      }

      const submissaoExistente = atividadeSelecionada.submissao;

      const dadosSubmissao: any = {
        atividade_id: atividadeSelecionada.id,
        aluno_id: usuario.id,
        arquivo_url: resultadoUpload.url,
        arquivo_nome: resultadoUpload.nome,
        data_entrega: new Date().toISOString(),
        status: "entregue",
      };

      if (submissaoExistente) {
        const { error } = await supabase
          .from("atividades_alunos")
          .update(dadosSubmissao)
          .eq("id", submissaoExistente.id);
        if (error) throw error;
        toast.success("Atividade reenviada com sucesso!");
      } else {
        const { error } = await supabase
          .from("atividades_alunos")
          .insert([dadosSubmissao]);
        if (error) throw error;
        toast.success("Atividade enviada com sucesso!");
      }

      await carregarAtividades();
      setArquivoResposta(null);
      setModalEnvioAberto(false);
      setAtividadeSelecionada(null);
    } catch (err: any) {
      console.error("Erro ao submeter atividade:", err);
      toast.error(
        err.message || "Erro ao enviar atividade. Tente novamente."
      );
    } finally {
      setCarregandoEnvio(false);
    }
  };

  // ========================================
  // HELPERS DE UI
  // ========================================
  const atividadesPendentes = atividades.filter(
    (atv) => atv.status === "pendente" || atv.status === "atrasado"
  );
  const atividadesEnviadas = atividades.filter((atv) => atv.submissao);
  const atividadesCorrigidas = atividades.filter((atv) => atv.status === "corrigido");

  const getStatusBadge = (status: Atividade["status"]) => {
    switch (status) {
      case "enviado":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3 h-3" /> Enviado
          </span>
        );
      case "corrigido":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
            <CheckCircle className="w-3 h-3" /> Corrigido
          </span>
        );
      case "atrasado":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-3 h-3" /> Atrasado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            Pendente
          </span>
        );
    }
  };

  const getTipoIcon = (tipo: Atividade["tipo"]) => {
    switch (tipo) {
      case "prova":
        return <Target className="w-4 h-4" />;
      case "trabalho":
      case "projeto":
        return <File className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatarDataHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return {
      data: data.toLocaleDateString("pt-BR"),
      hora: data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const getNotaColor = (nota: number, max: number) => {
    const percent = (nota / max) * 100;
    if (percent >= 70) return { text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' };
    if (percent >= 50) return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' };
    return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' };
  };

  const handleEnviarAtividade = (atividade: Atividade) => {
    setAtividadeSelecionada(atividade);
    setArquivoResposta(null);
    setModalEnvioAberto(true);
  };

  const handleBaixarArquivo = (url?: string) => {
    if (!url) return;
    window.open(url, "_blank");
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Minhas Atividades - {nomeDisciplina}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{serieNome}</p>
        </div>
      </div>

      <div className="space-y-10">

        {/* ── Atividades Corrigidas (destaque) ── */}
        {atividadesCorrigidas.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
              Atividades Corrigidas
              <span className="text-sm text-muted-foreground">
                ({atividadesCorrigidas.length})
              </span>
            </h3>

            <div className="space-y-5">
              {atividadesCorrigidas.map((atividade) => {
                const notaColors = atividade.submissao?.nota !== undefined
                  ? getNotaColor(atividade.submissao.nota, atividade.pontuacao)
                  : null;

                return (
                  <Card
                    key={atividade.id}
                    className="border-l-4 border-l-green-500 dark:border-l-green-400"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {getTipoIcon(atividade.tipo)}
                            <h4 className="font-semibold text-foreground">
                              {atividade.titulo}
                            </h4>
                            {getStatusBadge(atividade.status)}
                          </div>
                          <p className="text-muted-foreground text-sm mb-4">
                            {atividade.descricao}
                          </p>
                        </div>

                        {/* Nota em destaque */}
                        {atividade.submissao?.nota !== undefined && notaColors && (
                          <div className={`flex-shrink-0 ${notaColors.bg} ${notaColors.border} border rounded-xl px-4 py-3 text-center min-w-[80px]`}>
                            <p className="text-xs text-muted-foreground mb-0.5">Nota</p>
                            <p className={`text-2xl font-bold ${notaColors.text}`}>
                              {atividade.submissao.nota}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              de {atividade.pontuacao}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Feedback do professor */}
                      {atividade.submissao?.feedback && (
                        <div className="mt-3 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
                          style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              Feedback do Professor
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {atividade.submissao.feedback}
                          </p>
                        </div>
                      )}

                      {/* Meta info + botões */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Entrega: {formatarDataHora(atividade.data_entrega).data}</span>
                        </div>
                        {atividade.submissao?.data_entrega && (
                          <div className="flex items-center gap-1">
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviado: {formatarDataHora(atividade.submissao.data_entrega).data}</span>
                          </div>
                        )}
                        {atividade.submissao?.arquivo_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBaixarArquivo(atividade.submissao!.arquivo_url)}
                            className="gap-1.5 text-xs h-7"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Sua Resposta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Separator />
          </section>
        )}

        {/* ── Atividades Pendentes ── */}
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Atividades Pendentes
            <span className="text-sm text-muted-foreground">
              ({atividadesPendentes.length})
            </span>
          </h3>

          {loading ? (
            <div className="flex items-center justify-center p-6 bg-card rounded-lg border border-border">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
              <span className="text-muted-foreground">Carregando atividades...</span>
            </div>
          ) : error ? (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4 text-center" style={{ backgroundColor: 'rgba(220,38,38,0.05)' }}>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={carregarAtividades}>
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : atividadesPendentes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500 dark:text-green-400" />
                <p className="text-foreground font-medium text-sm">Parabéns! Você está em dia.</p>
                <p className="text-muted-foreground text-xs mt-1">Nenhuma atividade pendente no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {atividadesPendentes.map((atividade) => {
                const { data, hora } = formatarDataHora(atividade.data_entrega);
                const isAtrasado = new Date(atividade.data_entrega) < new Date();

                return (
                  <Card
                    key={atividade.id}
                    className={`border-l-4 ${
                      isAtrasado
                        ? "border-l-red-500 dark:border-l-red-400"
                        : "border-l-amber-500 dark:border-l-amber-400"
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {getTipoIcon(atividade.tipo)}
                            <h4 className="font-semibold text-foreground">
                              {atividade.titulo}
                            </h4>
                            {getStatusBadge(atividade.status)}
                          </div>
                          <p className="text-muted-foreground text-sm mb-4">
                            {atividade.descricao}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Entrega: {data} às {hora}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              <span>{atividade.pontuacao} pontos</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {atividade.arquivo_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBaixarArquivo(atividade.arquivo_url)}
                                className="gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Baixar Enunciado
                              </Button>
                            )}

                            <Button
                              onClick={() => handleEnviarAtividade(atividade)}
                              className="gap-2"
                              disabled={isAtrasado}
                            >
                              <Send className="w-4 h-4" />
                              {isAtrasado ? "Prazo Expirado" : "Enviar Resposta"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <Separator />

        {/* ── Histórico (atividades enviadas aguardando correção) ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <History className="w-5 h-5 text-muted-foreground" />
              Histórico de Atividades
            </h3>
            {atividadesEnviadas.length > 3 && (
              <Button
                variant="outline"
                onClick={() => setModalHistoricoAberto(true)}
                className="gap-2"
                size="sm"
              >
                <History className="w-4 h-4" />
                Ver Histórico Completo
              </Button>
            )}
          </div>

          {atividadesEnviadas.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">Nenhuma atividade enviada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {atividadesEnviadas
                .filter((atv) => atv.status !== "corrigido") // Corrigidas já aparecem acima
                .slice(0, 3)
                .map((atividade) => {
                  const { data, hora } = formatarDataHora(
                    atividade.submissao!.data_entrega
                  );

                  return (
                    <Card
                      key={atividade.id}
                      className="border-l-4 border-l-blue-500 dark:border-l-blue-400"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {getTipoIcon(atividade.tipo)}
                              <h4 className="font-medium text-sm text-foreground">
                                {atividade.titulo}
                              </h4>
                              {getStatusBadge(atividade.status)}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Enviado: {data} às {hora}</span>
                              {atividade.submissao?.arquivo_nome && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {atividade.submissao.arquivo_nome}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground italic">
                            Aguardando correção
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {atividadesEnviadas.filter((atv) => atv.status !== "corrigido").length > 3 && (
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => setModalHistoricoAberto(true)}
                >
                  Ver todas as atividades enviadas
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Modal de Envio ── */}
      <Dialog open={modalEnvioAberto} onOpenChange={setModalEnvioAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Send className="w-5 h-5" />
              Enviar Atividade: {atividadeSelecionada?.titulo}
            </DialogTitle>
            <DialogDescription>
              Anexe sua resposta e envie para o professor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="arquivoResposta" className="text-foreground">Arquivo de Resposta</Label>
              <Input
                id="arquivoResposta"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png"
                onChange={(e) =>
                  setArquivoResposta(e.target.files?.[0] || null)
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: PDF, DOC, DOCX, TXT, ZIP, JPG, PNG (máximo 10MB)
              </p>
              {arquivoResposta && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-2">
                  <FileText className="w-3 h-3" />
                  {arquivoResposta.name}
                </p>
              )}
              {atividadeSelecionada?.submissao?.arquivo_nome &&
                !arquivoResposta && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-2">
                    <FileText className="w-3 h-3" />
                    Arquivo já enviado: {atividadeSelecionada.submissao.arquivo_nome}
                  </p>
                )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setModalEnvioAberto(false)}
                disabled={carregandoEnvio}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmissao}
                disabled={!arquivoResposta || carregandoEnvio}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {carregandoEnvio ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : atividadeSelecionada?.submissao ? (
                  "Reenviar Atividade"
                ) : (
                  "Enviar Atividade"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Histórico Completo ── */}
      <Dialog
        open={modalHistoricoAberto}
        onOpenChange={setModalHistoricoAberto}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <History className="w-5 h-5" />
              Histórico Completo de Atividades
            </DialogTitle>
            <DialogDescription>
              Todas as suas atividades enviadas e corrigidas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {atividadesEnviadas.length === 0 ? (
              <div className="p-6 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Nenhuma atividade enviada ainda.</p>
              </div>
            ) : (
              atividadesEnviadas.map((atividade) => {
                const dataEnvio = formatarDataHora(atividade.submissao!.data_entrega);
                const dataEntrega = formatarDataHora(atividade.data_entrega);
                const notaColors = atividade.submissao?.nota !== undefined
                  ? getNotaColor(atividade.submissao.nota, atividade.pontuacao)
                  : null;

                return (
                  <Card key={atividade.id}>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-wrap flex-1">
                            {getTipoIcon(atividade.tipo)}
                            <h4 className="font-semibold text-foreground">
                              {atividade.titulo}
                            </h4>
                            {getStatusBadge(atividade.status)}
                          </div>
                          {atividade.submissao?.nota !== undefined && notaColors && (
                            <div className={`${notaColors.bg} ${notaColors.border} border rounded-xl px-3 py-2 text-center flex-shrink-0`}>
                              <p className={`text-xl font-bold ${notaColors.text}`}>
                                {atividade.submissao.nota}
                                <span className="text-xs font-normal text-muted-foreground">/{atividade.pontuacao}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="text-muted-foreground text-sm">
                          {atividade.descricao}
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Prazo de Entrega:</span>
                            <p className="text-foreground">{dataEntrega.data} às {dataEntrega.hora}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Data de Envio:</span>
                            <p className="text-foreground">{dataEnvio.data} às {dataEnvio.hora}</p>
                          </div>
                        </div>

                        {/* Feedback do professor no histórico */}
                        {atividade.submissao?.feedback && (
                          <div className="rounded-lg p-4 border border-blue-200 dark:border-blue-800"
                            style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                Feedback do Professor
                              </span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                              {atividade.submissao.feedback}
                            </p>
                          </div>
                        )}

                        {atividade.submissao?.arquivo_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleBaixarArquivo(atividade.submissao!.arquivo_url)
                            }
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Sua Resposta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}