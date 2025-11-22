// src/components/CadastrarUsuarioNovo.tsx
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Plus,
  X,
  BookOpen,
  GraduationCap,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";

interface CadastrarUsuarioNovoProps {
  onVoltar: () => void;
  onUsuarioCriado?: () => void;
}

type SegmentoDisciplina = "Fundamental 1" | "Fundamental 2" | "Ensino Médio";

interface NovoUsuario {
  nome: string;
  nomeUsuario: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  tipo: string;
  serie?: string;
  vinculacoesProfessor: VinculacaoProfessor[];
}

interface VinculacaoProfessor {
  id: string;
  segmento: SegmentoDisciplina;
  disciplinaId: string;
  disciplinaNome: string;
  seriesSelecionadas: string[];
}

interface DisciplinaDisponivel {
  id: string;
  nome: string;
  segmento: SegmentoDisciplina | null;
}

const seriesPorSegmento: Record<SegmentoDisciplina, string[]> = {
  "Fundamental 1": [
    "1º ano - Ensino Fundamental",
    "2º ano - Ensino Fundamental",
    "3º ano - Ensino Fundamental",
    "4º ano - Ensino Fundamental",
    "5º ano - Ensino Fundamental",
  ],
  "Fundamental 2": [
    "6º ano - Ensino Fundamental",
    "7º ano - Ensino Fundamental",
    "8º ano - Ensino Fundamental",
    "9º ano - Ensino Fundamental",
  ],
  "Ensino Médio": [
    "1ª série - Ensino Médio",
    "2ª série - Ensino Médio",
    "3ª série - Ensino Médio",
  ],
};

const seriesDisponiveis = [
  "1º ano - Ensino Fundamental",
  "2º ano - Ensino Fundamental",
  "3º ano - Ensino Fundamental",
  "4º ano - Ensino Fundamental",
  "5º ano - Ensino Fundamental",
  "6º ano - Ensino Fundamental",
  "7º ano - Ensino Fundamental",
  "8º ano - Ensino Fundamental",
  "9º ano - Ensino Fundamental",
  "1ª série - Ensino Médio",
  "2ª série - Ensino Médio",
  "3ª série - Ensino Médio",
];

export function CadastrarUsuarioNovo({
  onVoltar,
  onUsuarioCriado,
}: CadastrarUsuarioNovoProps) {
  const [dados, setDados] = useState<NovoUsuario>({
    nome: "",
    nomeUsuario: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    tipo: "",
    serie: "",
    vinculacoesProfessor: [],
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [usuarioCriado, setUsuarioCriado] = useState<any>(null);

  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<
    DisciplinaDisponivel[]
  >([]);
  const [carregandoDisciplinas, setCarregandoDisciplinas] = useState(true);

  const [modalDisciplina, setModalDisciplina] = useState(false);
  const [novaVinculacao, setNovaVinculacao] = useState<{
    segmento: SegmentoDisciplina | "";
    disciplinaId: string;
    seriesSelecionadas: string[];
  }>({
    segmento: "",
    disciplinaId: "",
    seriesSelecionadas: [],
  });

  const tiposUsuario = [
    { value: "aluno", label: "Aluno" },
    { value: "professor", label: "Professor" },
    { value: "coordenador", label: "Coordenador" },
    { value: "administrador", label: "Administrador" },
    { value: "professor_conteudista", label: "Professor Conteudista" },
  ];

  // Carrega disciplinas (com segmento vindo do banco)
  const carregarDisciplinas = async () => {
    try {
      setCarregandoDisciplinas(true);
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome, segmento")
        .order("nome", { ascending: true });

      if (error) throw error;

      const disciplinasFormatadas: DisciplinaDisponivel[] = (data || []).map(
        (d: any) => ({
          id: d.id,
          nome: d.nome,
          segmento:
            d.segmento === "Fundamental 1" ||
            d.segmento === "Fundamental 2" ||
            d.segmento === "Ensino Médio"
              ? (d.segmento as SegmentoDisciplina)
              : null,
        })
      );

      setDisciplinasDisponiveis(disciplinasFormatadas);
      console.log(
        "[CADASTRO_NOVO] Disciplinas carregadas:",
        disciplinasFormatadas.length
      );
    } catch (err: any) {
      console.error(
        "[CADASTRO_NOVO] Erro ao carregar disciplinas:",
        err.message
      );
      toast.error("Erro ao carregar disciplinas do banco.");
      setDisciplinasDisponiveis([]);
    } finally {
      setCarregandoDisciplinas(false);
    }
  };

  useEffect(() => {
    carregarDisciplinas();
  }, []);

  // Validação
  const validarFormulario = () => {
    const erros: string[] = [];

    if (!dados.nome.trim()) erros.push("Nome completo é obrigatório");

    if (!dados.nomeUsuario.trim()) {
      erros.push("Nome de usuário é obrigatório");
    } else {
      const nomeUsuarioRegex = /^[a-zA-Z0-9.]+$/;
      if (!nomeUsuarioRegex.test(dados.nomeUsuario)) {
        erros.push(
          "Nome de usuário pode conter apenas letras, números e pontos"
        );
      }
      if (dados.nomeUsuario.length < 3) {
        erros.push("Nome de usuário deve ter pelo menos 3 caracteres");
      }
    }

    if (!dados.senha) {
      erros.push("Senha é obrigatória");
    } else if (dados.senha.length < 6) {
      erros.push("Senha deve ter pelo menos 6 caracteres");
    }

    if (!dados.confirmarSenha) {
      erros.push("Confirmação de senha é obrigatória");
    } else if (dados.senha !== dados.confirmarSenha) {
      erros.push("Senhas não coincidem");
    }

    if (!dados.tipo) {
      erros.push("Tipo de usuário é obrigatório");
    }

    if (dados.tipo === "aluno" && !dados.serie) {
      erros.push("Série é obrigatória para alunos");
    }

    if (
      (dados.tipo === "professor" ||
        dados.tipo === "professor_conteudista") &&
      dados.vinculacoesProfessor.length === 0
    ) {
      erros.push(
        "Pelo menos uma disciplina deve ser vinculada ao professor / conteudista"
      );
    }

    return erros;
  };

  const errosValidacao = validarFormulario();
  const formularioValido = errosValidacao.length === 0;

  const gerarNomeUsuario = () => {
    if (dados.nome.trim()) {
      const nomeUsuarioSugerido = dados.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .split(" ")
        .filter((part) => part.length > 0)
        .slice(0, 2)
        .join(".");

      setDados((prev) => ({ ...prev, nomeUsuario: nomeUsuarioSugerido }));
    }
  };

  const abrirModalDisciplina = () => {
    setNovaVinculacao({
      segmento: "",
      disciplinaId: "",
      seriesSelecionadas: [],
    });
    setModalDisciplina(true);
  };

  const disciplinasFiltradas = useMemo(
    () =>
      novaVinculacao.segmento
        ? disciplinasDisponiveis.filter(
            (d) => d.segmento === novaVinculacao.segmento
          )
        : [],
    [disciplinasDisponiveis, novaVinculacao.segmento]
  );

  const seriesDoSegmento = (segmento: SegmentoDisciplina | "") =>
    segmento ? seriesPorSegmento[segmento] || [] : [];

  const adicionarVinculacao = () => {
    if (!novaVinculacao.segmento || !novaVinculacao.disciplinaId) {
      toast.error("Segmento e disciplina são obrigatórios");
      return;
    }

    if (novaVinculacao.seriesSelecionadas.length === 0) {
      toast.error("Pelo menos uma série deve ser selecionada");
      return;
    }

    const jaExiste = dados.vinculacoesProfessor.some(
      (v) => v.disciplinaId === novaVinculacao.disciplinaId
    );
    if (jaExiste) {
      toast.error("Esta disciplina já foi adicionada");
      return;
    }

    const disciplina = disciplinasDisponiveis.find(
      (d) => d.id === novaVinculacao.disciplinaId
    );
    if (!disciplina) {
      toast.error("Disciplina não encontrada");
      return;
    }

    const novaVinculacaoCompleta: VinculacaoProfessor = {
      id: Date.now().toString(),
      segmento: novaVinculacao.segmento,
      disciplinaId: novaVinculacao.disciplinaId,
      disciplinaNome: disciplina.nome,
      seriesSelecionadas: [...novaVinculacao.seriesSelecionadas],
    };

    setDados((prev) => ({
      ...prev,
      vinculacoesProfessor: [
        ...prev.vinculacoesProfessor,
        novaVinculacaoCompleta,
      ],
    }));

    setModalDisciplina(false);
    toast.success("Disciplina adicionada com sucesso!");
  };

  const removerVinculacao = (id: string) => {
    setDados((prev) => ({
      ...prev,
      vinculacoesProfessor: prev.vinculacoesProfessor.filter(
        (v) => v.id !== id
      ),
    }));
    toast.success("Disciplina removida");
  };

  const handleSerieChange = (serie: string, checked: boolean) => {
    setNovaVinculacao((prev) => ({
      ...prev,
      seriesSelecionadas: checked
        ? [...prev.seriesSelecionadas, serie]
        : prev.seriesSelecionadas.filter((s) => s !== serie),
    }));
  };

  // Cadastro via Edge Function
  const criarUsuario = async () => {
    if (!formularioValido) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setSalvando(true);
    try {
      const nome = dados.nome.trim();
      const nomeUsuario = dados.nomeUsuario.trim().toLowerCase();
      const emailFinal =
        dados.email.trim() || `${nomeUsuario || "usuario"}@escola.local`;

      const payload = {
        nome,
        email: emailFinal,
        senha: dados.senha,
        tipo: dados.tipo,
        serie: dados.tipo === "aluno" ? dados.serie : null,
        vinculacoesProfessor:
          dados.tipo === "professor" || dados.tipo === "professor_conteudista"
            ? dados.vinculacoesProfessor
            : [],
      };


      console.log("[CADASTRO_NOVO] Enviando para admin-create-user:", payload);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("[CADASTRO_NOVO] Erro da Edge Function:", result);
        throw new Error(result.error || "Erro ao criar usuário");
      }

      console.log("[CADASTRO_NOVO] Usuário criado via Edge Function:", result);

      setUsuarioCriado({
        nome,
        nomeUsuario,
        senhaTemporaria: dados.senha,
      });

      setModalConfirmacao(true);
      toast.success("Usuário criado com sucesso!");
      onUsuarioCriado?.();
    } catch (error: any) {
      console.error("[CADASTRO_NOVO] Erro ao criar usuário:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setSalvando(false);
    }
  };

  const finalizarCadastro = () => {
    setModalConfirmacao(false);
    onVoltar();
  };

  // Render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              ✨ Novo Fluxo de Cadastro
            </h1>
            <p className="text-sm text-gray-600">
              Sistema de cadastro unificado por tipo de usuário
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Dados do Novo Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={dados.nome}
                  onChange={(e) =>
                    setDados((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder="Digite o nome completo"
                  onBlur={gerarNomeUsuario}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="nomeUsuario">Nome de Usuário *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={gerarNomeUsuario}
                    className="text-xs"
                  >
                    Gerar automaticamente
                  </Button>
                </div>
                <Input
                  id="nomeUsuario"
                  value={dados.nomeUsuario}
                  onChange={(e) =>
                    setDados((prev) => ({
                      ...prev,
                      nomeUsuario: e.target.value.toLowerCase(),
                    }))
                  }
                  placeholder="usuario.login"
                />
                <p className="text-xs text-gray-500">
                  Usado para login. Apenas letras, números e pontos.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={dados.email}
                onChange={(e) =>
                  setDados((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@exemplo.com (deixe vazio para gerar automaticamente)"
              />
              <p className="text-xs text-gray-500">
                Se não informado, será gerado automaticamente como:{" "}
                {dados.nomeUsuario || "usuario"}@escola.local
              </p>
            </div>

            {/* Senha */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">
                Credenciais de Acesso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={dados.senha}
                      onChange={(e) =>
                        setDados((prev) => ({ ...prev, senha: e.target.value }))
                      }
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                    >
                      {mostrarSenha ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      type={mostrarConfirmacao ? "text" : "password"}
                      value={dados.confirmarSenha}
                      onChange={(e) =>
                        setDados((prev) => ({
                          ...prev,
                          confirmarSenha: e.target.value,
                        }))
                      }
                      placeholder="Digite a senha novamente"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setMostrarConfirmacao(!mostrarConfirmacao)
                      }
                    >
                      {mostrarConfirmacao ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {dados.confirmarSenha &&
                    dados.senha !== dados.confirmarSenha && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        As senhas não coincidem
                      </p>
                    )}
                  {dados.confirmarSenha &&
                    dados.senha === dados.confirmarSenha &&
                    dados.senha.length >= 6 && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Senhas coincidem
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Tipo / Série / Vinculações */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Perfil do Usuário</h3>

              <div className="space-y-2 mb-4">
                <Label>Tipo de Usuário *</Label>
                <Select
                  key={`tipo-${dados.tipo}`}
                  value={dados.tipo}
                  onValueChange={(value) =>
                    setDados((prev) => ({
                      ...prev,
                      tipo: value,
                      vinculacoesProfessor: [],
                      serie: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposUsuario.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dados.tipo === "aluno" && (
                <div className="space-y-2">
                  <Label>Série *</Label>
                  <Select
                    key={`serie-${dados.serie || "empty"}`}
                    value={dados.serie}
                    onValueChange={(value) =>
                      setDados((prev) => ({ ...prev, serie: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesDisponiveis.map((serie) => (
                        <SelectItem key={serie} value={serie}>
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(dados.tipo === "professor" ||
                dados.tipo === "professor_conteudista") && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">
                        Vinculação de Disciplinas
                      </h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      Adicione disciplinas e selecione as séries específicas
                      que este professor leciona.
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-blue-600">
                        <strong>{dados.vinculacoesProfessor.length}</strong>{" "}
                        disciplina(s) vinculada(s)
                      </div>
                      <Button
                        onClick={abrirModalDisciplina}
                        disabled={carregandoDisciplinas}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Disciplina
                      </Button>
                    </div>
                  </div>

                  {dados.vinculacoesProfessor.length > 0 && (
                    <div className="space-y-3">
                      <Label>Disciplinas Vinculadas</Label>
                      {dados.vinculacoesProfessor.map((v) => (
                        <div
                          key={v.id}
                          className="border rounded-lg p-4 bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="w-4 h-4 text-gray-600" />
                                <span className="font-medium">
                                  {v.disciplinaNome}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {v.segmento}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <GraduationCap className="w-4 h-4" />
                                <span>
                                  Séries: {v.seriesSelecionadas.join(", ")}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerVinculacao(v.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Erros */}
            {errosValidacao.length > 0 && (
              <div className="border-t pt-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Corrija os seguintes erros:
                  </h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {errosValidacao.map((erro, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        {erro}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="border-t pt-6 flex justify-between">
              <Button variant="outline" onClick={onVoltar}>
                Cancelar
              </Button>

              <Button
                onClick={criarUsuario}
                disabled={!formularioValido || salvando}
                className="min-w-32"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="-4 h-4 mr-2" />
                    Criar Usuário
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Disciplina */}
      <Dialog open={modalDisciplina} onOpenChange={setModalDisciplina}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Disciplina ao Professor</DialogTitle>
            <DialogDescription>
              Segmento → Disciplina → Séries que este professor leciona
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>1. Segmento *</Label>
              <Select
                value={novaVinculacao.segmento}
                onValueChange={(value: SegmentoDisciplina) =>
                  setNovaVinculacao((prev) => ({
                    ...prev,
                    segmento: value,
                    disciplinaId: "",
                    seriesSelecionadas: [],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fundamental 1">
                    Ensino Fundamental 1
                  </SelectItem>
                  <SelectItem value="Fundamental 2">
                    Ensino Fundamental 2
                  </SelectItem>
                  <SelectItem value="Ensino Médio">Ensino Médio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {novaVinculacao.segmento && (
              <div className="space-y-2">
                <Label>2. Disciplina *</Label>
                <Select
                  value={novaVinculacao.disciplinaId}
                  onValueChange={(value) =>
                    setNovaVinculacao((prev) => ({
                      ...prev,
                      disciplinaId: value,
                      seriesSelecionadas: [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplinasFiltradas.map((disciplina) => (
                      <SelectItem key={disciplina.id} value={disciplina.id}>
                        {disciplina.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {novaVinculacao.segmento && novaVinculacao.disciplinaId && (
              <div className="space-y-2">
                <Label>3. Séries *</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                  {seriesDoSegmento(novaVinculacao.segmento).map((serie) => (
                    <div key={serie} className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={novaVinculacao.seriesSelecionadas.includes(
                          serie
                        )}
                        onChange={(e) =>
                          handleSerieChange(serie, e.target.checked)
                        }
                        className="rounded"
                      />
                      <Label className="text-sm">{serie}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDisciplina(false)}>
              Cancelar
            </Button>
            <Button
              onClick={adicionarVinculacao}
              disabled={
                !novaVinculacao.segmento ||
                !novaVinculacao.disciplinaId ||
                novaVinculacao.seriesSelecionadas.length === 0
              }
            >
              Adicionar Disciplina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação */}
      <Dialog open={modalConfirmacao} onOpenChange={setModalConfirmacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Usuário Criado com Sucesso!
            </DialogTitle>
            <DialogDescription>
              O usuário foi cadastrado e já pode fazer login.
            </DialogDescription>
          </DialogHeader>

          {usuarioCriado && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Nome:</span>
                  <span>{usuarioCriado.nome}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Login:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {usuarioCriado.nomeUsuario}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Senha:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {usuarioCriado.senhaTemporaria}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Anote essas credenciais e repasse ao usuário. Ele poderá alterar
                a senha após o primeiro login.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={finalizarCadastro} className="w-full">
              Entendi, fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
