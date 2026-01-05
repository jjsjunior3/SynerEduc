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
import { Textarea } from "./ui/textarea";
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
} from "lucide-react";

import { toast } from "sonner";

interface AtividadeSubmissao {
  id: string;
  atividade_id: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  data_entrega: string;
  status: "pendente" | "entregue" | "concluido"; // valores do banco
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
  status: "pendente" | "enviado" | "corrigido" | "atrasado"; // status visual
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

      // 1. Buscar atividades desta série e disciplina
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

      // 2. Buscar submissões do aluno para essas atividades
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

      // 3. Combinar dados
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
        status: "entregue", // ✔ valor permitido pela constraint
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

  const getStatusBadge = (status: Atividade["status"]) => {
    switch (status) {
      case "enviado":
        return (
          <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>
        );
      case "corrigido":
        return (
          <Badge className="bg-green-100 text-green-800">Corrigido</Badge>
        );
      case "atrasado":
        return <Badge variant="destructive">Atrasado</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
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
    <>
      {/* Header simples dentro da aba */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Minhas Atividades - {nomeDisciplina}
          </h1>
          <p className="text-xs text-gray-500">{serieNome}</p>
        </div>
      </div>

      <main className="space-y-8">
        {/* Atividades Pendentes */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Atividades Pendentes{" "}
            <span className="text-sm text-gray-500">
              ({atividadesPendentes.length})
            </span>
          </h3>

          {loading ? (
            <div className="flex items-center justify-center p-6 bg-white rounded-lg shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-600">Carregando atividades...</span>
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={carregarAtividades}
                >
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : atividadesPendentes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                <p>Parabéns! Você está em dia com todas as atividades.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {atividadesPendentes.map((atividade) => {
                const { data, hora } = formatarDataHora(
                  atividade.data_entrega
                );
                const isAtrasado =
                  new Date(atividade.data_entrega) < new Date();

                return (
                  <Card
                    key={atividade.id}
                    className={`border-l-4 ${
                      isAtrasado ? "border-l-red-500" : "border-l-orange-500"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTipoIcon(atividade.tipo)}
                            <h4 className="font-semibold">
                              {atividade.titulo}
                            </h4>
                            {getStatusBadge(atividade.status)}
                          </div>
                          <p className="text-gray-600 text-sm mb-3">
                            {atividade.descricao}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Entrega: {data} às {hora}
                              </span>
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
                                onClick={() =>
                                  handleBaixarArquivo(atividade.arquivo_url)
                                }
                                className="gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Baixar Enunciado
                              </Button>
                            )}

                            {atividade.tipo !== "prova" && (
                              <Button
                                onClick={() =>
                                  handleEnviarAtividade(atividade)
                                }
                                className="gap-2"
                                disabled={isAtrasado}
                              >
                                <Send className="w-4 h-4" />
                                {isAtrasado
                                  ? "Prazo Expirado"
                                  : "Enviar Resposta"}
                              </Button>
                            )}
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

        {/* Histórico de Atividades (resumo) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-gray-700" />
              Histórico de Atividades
            </h3>
            <Button
              variant="outline"
              onClick={() => setModalHistoricoAberto(true)}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Ver Histórico Completo
            </Button>
          </div>

          <div className="grid gap-3">
            {atividadesEnviadas.slice(0, 3).map((atividade) => {
              const { data, hora } = formatarDataHora(
                atividade.submissao!.data_entrega
              );

              return (
                <Card
                  key={atividade.id}
                  className="border-l-4 border-l-green-500"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getTipoIcon(atividade.tipo)}
                          <h4 className="font-medium text-sm">
                            {atividade.titulo}
                          </h4>
                          {getStatusBadge(atividade.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Enviado: {data} às {hora}
                          </span>
                          {atividade.submissao?.nota !== undefined && (
                            <span className="font-medium text-green-600">
                              Nota: {atividade.submissao.nota}/
                              {atividade.pontuacao}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      {/* Modal de Envio de Atividade */}
      <Dialog open={modalEnvioAberto} onOpenChange={setModalEnvioAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Enviar Atividade: {atividadeSelecionada?.titulo}
            </DialogTitle>
            <DialogDescription>
              Anexe sua resposta e envie para o professor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="arquivoResposta">Arquivo de Resposta</Label>
              <Input
                id="arquivoResposta"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.zip"
                onChange={(e) =>
                  setArquivoResposta(e.target.files?.[0] || null)
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: PDF, DOC, DOCX, TXT, ZIP (máximo 10MB)
              </p>
              {arquivoResposta && (
                <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                  <FileText className="w-3 h-3" />
                  {arquivoResposta.name}
                </p>
              )}
              {atividadeSelecionada?.submissao?.arquivo_nome &&
                !arquivoResposta && (
                  <p className="text-sm text-blue-600 flex items-center gap-1 mt-2">
                    <FileText className="w-3 h-3" />
                    Arquivo já enviado:{" "}
                    {atividadeSelecionada.submissao.arquivo_nome}
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
              >
                {carregandoEnvio ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

      {/* Modal de Histórico Completo */}
      <Dialog
        open={modalHistoricoAberto}
        onOpenChange={setModalHistoricoAberto}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico Completo de Atividades
            </DialogTitle>
            <DialogDescription>
              Todas as suas atividades enviadas e corrigidas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {atividadesEnviadas.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma atividade enviada ainda.</p>
              </div>
            ) : (
              atividadesEnviadas.map((atividade) => {
                const dataEnvio = formatarDataHora(
                  atividade.submissao!.data_entrega
                );
                const dataEntrega = formatarDataHora(atividade.data_entrega);

                return (
                  <Card key={atividade.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTipoIcon(atividade.tipo)}
                            <h4 className="font-semibold">
                              {atividade.titulo}
                            </h4>
                            {getStatusBadge(atividade.status)}
                          </div>
                          {atividade.submissao?.nota !== undefined && (
                            <div className="text-lg font-semibold text-green-600">
                              {atividade.submissao.nota}/
                              {atividade.pontuacao}
                            </div>
                          )}
                        </div>

                        <p className="text-gray-600 text-sm">
                          {atividade.descricao}
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">
                              Prazo de Entrega:
                            </span>
                            <p>
                              {dataEntrega.data} às {dataEntrega.hora}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Data de Envio:
                            </span>
                            <p>
                              {dataEnvio.data} às {dataEnvio.hora}
                            </p>
                          </div>
                        </div>

                        {atividade.submissao?.feedback && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <span className="text-blue-800 font-medium text-sm">
                              Feedback do Professor:
                            </span>
                            <p className="text-blue-700 text-sm mt-1">
                              {atividade.submissao.feedback}
                            </p>
                          </div>
                        )}

                        {atividade.submissao?.arquivo_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleBaixarArquivo(
                                atividade.submissao!.arquivo_url
                              )
                            }
                            className="gap-2 mt-3"
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
    </>
  );
}
