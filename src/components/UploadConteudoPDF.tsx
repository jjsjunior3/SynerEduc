import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Folder,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Usuario } from "../types/auth";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";

interface UploadConteudoPDFProps {
  onVoltar?: () => void;
  usuario?: Usuario;
  serieSelecionada?: any;
  disciplinaSelecionada?: any;
  bimestreSelecionado?: number;
}

interface ArquivoUpload {
  id: string;
  arquivo: File;
  nome: string;
  tamanho: string;
  progresso: number;
  status: "pendente" | "enviando" | "sucesso" | "erro";
  url?: string;
  erro?: string;
}

interface FormularioConteudo {
  serie: string;
  disciplina: string;
  bimestre: string;
  topico: string;
  descricao: string;
  palavrasChave: string;
  visibilidade: "publico" | "privado" | "rascunho";
}

export function UploadConteudoPDF({
  onVoltar,
  usuario,
  serieSelecionada,
  disciplinaSelecionada,
  bimestreSelecionado,
}: UploadConteudoPDFProps) {
  const [arquivos, setArquivos] = useState<ArquivoUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [viewAtual, setViewAtual] = useState<"upload" | "gerenciar">("upload");

  const [formulario, setFormulario] = useState<FormularioConteudo>({
    serie: serieSelecionada?.id || "",
    disciplina: disciplinaSelecionada?.id || "",
    bimestre: bimestreSelecionado?.toString() || "1",
    topico: "",
    descricao: "",
    palavrasChave: "",
    visibilidade: "rascunho",
  });

  // Séries / disciplinas / bimestres (mockadas, depois você pode ligar no banco)
  const series = [
    { id: "5ano", nome: "5º ano", nivel: "fundamental" },
    { id: "6ano", nome: "6º ano", nivel: "fundamental" },
    { id: "7ano", nome: "7º ano", nivel: "fundamental" },
    { id: "8ano", nome: "8º ano", nivel: "fundamental" },
    { id: "9ano", nome: "9º ano", nivel: "fundamental" },
    { id: "1serie", nome: "1ª série", nivel: "medio" },
    { id: "2serie", nome: "2ª série", nivel: "medio" },
    { id: "3serie", nome: "3ª série", nivel: "medio" },
  ];

  const disciplinas = [
    { id: "portugues", nome: "Português", icone: "📚" },
    { id: "matematica", nome: "Matemática", icone: "🔢" },
    { id: "ciencias", nome: "Ciências", icone: "🔬" },
    { id: "historia", nome: "História", icone: "📜" },
    { id: "geografia", nome: "Geografia", icone: "🌍" },
    { id: "fisica", nome: "Física", icone: "⚛️" },
    { id: "quimica", nome: "Química", icone: "🧪" },
    { id: "biologia", nome: "Biologia", icone: "🧬" },
    { id: "ingles", nome: "Inglês", icone: "🗣️" },
    { id: "arte", nome: "Arte", icone: "🎨" },
    { id: "educacao_fisica", nome: "Educação Física", icone: "⚽" },
  ];

  const bimestres = [
    { id: "1", nome: "1º Bimestre" },
    { id: "2", nome: "2º Bimestre" },
    { id: "3", nome: "3º Bimestre" },
    { id: "4", nome: "4º Bimestre" },
  ];

  // Garante nome de arquivo "seguro" pra Storage
  const sanitizeFileName = (name: string): string => {
    let cleaned = name.trim();
    cleaned = cleaned.replace(/\s+/g, "_");
    cleaned = cleaned
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // remove acentos
    cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, "");
    return cleaned;
  };

  const formatarTamanho = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    processarArquivos(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processarArquivos(files);
    }
  };

  const processarArquivos = (files: File[]) => {
    const arquivosPDF = files.filter((file) => file.type === "application/pdf");

    if (arquivosPDF.length !== files.length) {
      toast.error("Apenas arquivos PDF são permitidos!");
    }

    if (arquivosPDF.length === 0) {
      toast.error("Nenhum arquivo PDF válido selecionado!");
      return;
    }

    const novosArquivos: ArquivoUpload[] = arquivosPDF.map((file) => ({
      id: Date.now() + Math.random().toString(36),
      arquivo: file,
      nome: file.name,
      tamanho: formatarTamanho(file.size),
      progresso: 0,
      status: "pendente",
    }));

    setArquivos((prev) => [...prev, ...novosArquivos]);

    if (arquivosPDF.length > 0) {
      setMostrarFormulario(true);
      toast.success(
        `${arquivosPDF.length} arquivo${
          arquivosPDF.length > 1 ? "s" : ""
        } adicionados para upload!`
      );
    }
  };

  const removerArquivo = (id: string) => {
    setArquivos((prev) => prev.filter((arquivo) => arquivo.id !== id));
  };

  const tentarNovamente = (id: string) => {
    setArquivos((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: "pendente", progresso: 0, erro: undefined }
          : a
      )
    );
  };

  /**
   * UPLOAD REAL: Storage + tabela pdfs_conteudista
   */
  const uploadArquivos = async () => {
    if (!usuario?.id) {
      toast.error("Usuário não identificado. Faça login novamente.");
      return;
    }

    if (!formulario.topico.trim()) {
      toast.error("Por favor, informe o nome do tópico!");
      return;
    }

    if (!formulario.serie || !formulario.disciplina || !formulario.bimestre) {
      toast.error("Por favor, selecione série, disciplina e bimestre!");
      return;
    }

    if (arquivos.length === 0) {
      toast.error("Nenhum arquivo para enviar.");
      return;
    }

    setUploading(true);

    try {
      for (const arquivo of arquivos) {
        if (arquivo.status === "sucesso") continue;

        // status: enviando
        setArquivos((prev) =>
          prev.map((a) =>
            a.id === arquivo.id
              ? { ...a, status: "enviando", progresso: 0, erro: undefined }
              : a
          )
        );

        // 1) Monta caminho compatível com a policy: primeira pasta = auth.uid()
        const safeName = sanitizeFileName(arquivo.arquivo.name);
        const caminho = `${usuario.id}/${Date.now()}-${safeName}`;

        // 2) Upload para o Storage (bucket pdfs-conteudista)
        const { data: storageData, error: storageError } =
          await supabase.storage
            .from("pdfs-conteudista")
            .upload(caminho, arquivo.arquivo, {
              cacheControl: "3600",
              upsert: false,
            });

        if (storageError || !storageData?.path) {
          console.error("Erro ao enviar para Storage:", storageError);
          setArquivos((prev) =>
            prev.map((a) =>
              a.id === arquivo.id
                ? {
                    ...a,
                    status: "erro",
                    erro:
                      storageError?.message ||
                      "Erro ao enviar arquivo para o servidor.",
                  }
                : a
            )
          );
          toast.error(`Erro ao enviar ${arquivo.nome}`);
          continue;
        }

        // 3) Gera URL pública (se o bucket for público; se for privado, pode ignorar)
        const { data: publicUrlData } = supabase.storage
          .from("pdfs-conteudista")
          .getPublicUrl(storageData.path);

        const publicUrl = publicUrlData?.publicUrl || null;

        // 4) INSERT na tabela pdfs_conteudista
        const { error: insertError } = await supabase
          .from("pdfs_conteudista")
          .insert({
            url: storageData.path,
            titulo: formulario.topico || arquivo.nome,
            descricao: formulario.descricao || null,
            data_envio: new Date().toISOString(),
            id_prof_conteudista: usuario.id,

            // ⚠️ por enquanto NÃO mexemos nos UUIDs
            id_disciplina: null,
            id_bimestre: null,
            id_turma: null,

            // novos campos simples pra você filtrar depois
            disciplina_slug: formulario.disciplina || null,          // "ciencias", "matematica"
            bimestre_numero: formulario.bimestre
              ? Number(formulario.bimestre)
              : null,                                                // 1, 2, 3, 4
          });


        if (insertError) {
          console.error("Erro ao salvar metadados:", insertError);
          setArquivos((prev) =>
            prev.map((a) =>
              a.id === arquivo.id
                ? {
                    ...a,
                    status: "erro",
                    erro:
                      insertError.message ||
                      "Erro ao salvar informações do conteúdo.",
                  }
                : a
            )
          );
          toast.error(`Erro ao registrar ${arquivo.nome} no sistema`);
          continue;
        }

        // 5) Marca sucesso no estado
        setArquivos((prev) =>
          prev.map((a) =>
            a.id === arquivo.id
              ? {
                  ...a,
                  status: "sucesso",
                  progresso: 100,
                  url: publicUrl || undefined,
                }
              : a
          )
        );
        toast.success(`${arquivo.nome} enviado com sucesso!`);
      }

      const algumErro = arquivos.some((a) => a.status === "erro");
      const todosEnviados = arquivos.every(
        (a) => a.status === "sucesso" || a.status === "erro"
      );

      if (todosEnviados && !algumErro) {
        toast.success("Todos os arquivos foram enviados com sucesso!");
        setTimeout(() => {
          setArquivos([]);
          setFormulario((prev) => ({
            ...prev,
            topico: "",
            descricao: "",
            palavrasChave: "",
          }));
          setMostrarFormulario(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Erro inesperado no upload:", error);
      toast.error("Erro inesperado durante o upload!");
    } finally {
      setUploading(false);
    }
  };

  // VIEW: Gerenciar (ainda só placeholder)
  if (viewAtual === "gerenciar") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setViewAtual("upload")}
                  variant="ghost"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Upload
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <h1 className="text-xl font-bold text-gray-900">
                  Gerenciar Conteúdo
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Arquivos Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Sistema de gerenciamento em desenvolvimento</p>
                <p className="text-sm">
                  Em breve você poderá visualizar e gerenciar todos os seus
                  arquivos PDF
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // VIEW: Upload
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {onVoltar && (
                <>
                  <Button onClick={onVoltar} variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                </>
              )}
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  Upload de Conteúdo
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => setViewAtual("gerenciar")}
                variant="outline"
                size="sm"
              >
                <Folder className="w-4 h-4 mr-2" />
                Gerenciar Arquivos
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Área de Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                Enviar Arquivos PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 hover:border-purple-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Arraste seus PDFs aqui
                </h3>
                <p className="text-gray-600 mb-4">
                  ou clique para selecionar arquivos
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivos
                  </label>
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Apenas arquivos PDF são aceitos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Arquivos */}
          {arquivos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Arquivos Selecionados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {arquivos.map((arquivo) => (
                    <div
                      key={arquivo.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-red-600" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {arquivo.nome}
                        </p>
                        <p className="text-sm text-gray-600">
                          {arquivo.tamanho}
                        </p>

                        {arquivo.status === "enviando" && (
                          <div className="mt-2">
                            <Progress
                              value={arquivo.progresso}
                              className="h-2"
                            />
                            <p className="text-xs text-gray-600 mt-1">
                              Enviando...
                            </p>
                          </div>
                        )}

                        {arquivo.status === "erro" && arquivo.erro && (
                          <p className="text-sm text-red-600 mt-1">
                            {arquivo.erro}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {arquivo.status === "pendente" && (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                        {arquivo.status === "enviando" && (
                          <Badge variant="secondary">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Enviando
                          </Badge>
                        )}
                        {arquivo.status === "sucesso" && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                        {arquivo.status === "erro" && (
                          <div className="flex gap-2">
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Erro
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => tentarNovamente(arquivo.id)}
                            >
                              Tentar Novamente
                            </Button>
                          </div>
                        )}

                        {arquivo.status !== "enviando" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerArquivo(arquivo.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Detalhes */}
          {mostrarFormulario && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Conteúdo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="serie">Série</Label>
                    <Select
                      value={formulario.serie}
                      onValueChange={(value) =>
                        setFormulario((prev) => ({ ...prev, serie: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a série" />
                      </SelectTrigger>
                      <SelectContent>
                        {series.map((serie) => (
                          <SelectItem key={serie.id} value={serie.id}>
                            {serie.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="disciplina">Disciplina</Label>
                    <Select
                      value={formulario.disciplina}
                      onValueChange={(value) =>
                        setFormulario((prev) => ({
                          ...prev,
                          disciplina: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a disciplina" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplinas.map((disciplina) => (
                          <SelectItem key={disciplina.id} value={disciplina.id}>
                            <span className="flex items-center gap-2">
                              <span>{disciplina.icone}</span>
                              {disciplina.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bimestre">Bimestre</Label>
                    <Select
                      value={formulario.bimestre}
                      onValueChange={(value) =>
                        setFormulario((prev) => ({ ...prev, bimestre: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o bimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        {bimestres.map((bimestre) => (
                          <SelectItem key={bimestre.id} value={bimestre.id}>
                            {bimestre.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="topico">Nome do Tópico *</Label>
                  <Input
                    id="topico"
                    value={formulario.topico}
                    onChange={(e) =>
                      setFormulario((prev) => ({
                        ...prev,
                        topico: e.target.value,
                      }))
                    }
                    placeholder="Ex: Equações do 2º grau, Literatura de Cordel, etc."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formulario.descricao}
                    onChange={(e) =>
                      setFormulario((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                    placeholder="Descreva brevemente o conteúdo do material..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="palavras-chave">Palavras-chave</Label>
                  <Input
                    id="palavras-chave"
                    value={formulario.palavrasChave}
                    onChange={(e) =>
                      setFormulario((prev) => ({
                        ...prev,
                        palavrasChave: e.target.value,
                      }))
                    }
                    placeholder="Separadas por vírgula: matemática, equações, exercícios"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="visibilidade">Visibilidade</Label>
                  <Select
                    value={formulario.visibilidade}
                    onValueChange={(
                      value: "publico" | "privado" | "rascunho"
                    ) =>
                      setFormulario((prev) => ({
                        ...prev,
                        visibilidade: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">
                        Rascunho (não visível para alunos)
                      </SelectItem>
                      <SelectItem value="publico">
                        Público (visível para todos)
                      </SelectItem>
                      <SelectItem value="privado">
                        Privado (apenas professores)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={uploadArquivos}
                    disabled={uploading || arquivos.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Enviar {arquivos.length} arquivo
                        {arquivos.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setArquivos([]);
                      setMostrarFormulario(false);
                    }}
                    disabled={uploading}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
