// src/components/AgendaProfessor.tsx
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
  import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Home,
  BookOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Disciplina {
  id: string;
  nome: string;
}

interface Serie {
  id: string;
  nome: string;
  turma: string;
}

interface AtividadeAgenda {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "tarefa_casa" | "estudo" | "trabalho" | "prova" | "projeto";
  data_entrega: string;
  disciplina_id: string;
  professor_id: string;
  serie_nome: string;
  turma: string;
  criado_em?: string;
}

interface AgendaProfessorProps {
  disciplina: Disciplina;
  serie: Serie;
}

export function AgendaProfessor({ disciplina, serie }: AgendaProfessorProps) {
  const { user } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<AtividadeAgenda | null>(null);
  const [novaAtividade, setNovaAtividade] = useState({
    titulo: "",
    descricao: "",
    tipo: "tarefa_casa" as AtividadeAgenda["tipo"],
    data_entrega: "",
  });
  const [atividades, setAtividades] = useState<AtividadeAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);

  //--------------------------------------------------------------------
  //  1️⃣  Carregar atividades reais do Supabase
  //--------------------------------------------------------------------
  useEffect(() => {
    carregarAtividades();
  }, [disciplina.id]);

  async function carregarAtividades() {
    setregando(true);
    const { data, error } = await supabase
      .from("agenda_professor")
      .select("*")
      .eq("disciplina_id", disciplina.id)
      .eq("professor_id", user?.id)
      .order("data_entrega", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar atividades");
      console.error(error);
    } else {
      setAtividades(data || []);
    }
    setCarregando(false);
  }

  //--------------------------------------------------------------------
  //  2️⃣  Salvar (criar/editar) uma atividade
  //--------------------------------------------------------------------
  async function handleSalvarAtividade() {
    if (
      !novaAtividade.titulo ||
      !novaAtividade.descricao ||
      !novaAtividade.data_entrega
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const atividadeData = {
      titulo: novaAtividade.titulo,
      descricao: novaAtividade.descricao,
      tipo: novaAtividade.tipo,
      data_entrega: novaAtividade.data_entrega,
      disciplina_id: disciplina.id,
      professor_id: user?.id,
      serie_nome: serie?.nome || "",
      turma: serie?.turma || "",
    };

    const { error } = editando
      ? await supabase
          .from("agenda_professor")
          .update(atividadeData)
          .eq("id", editando.id)
      : await supabase.from("agenda_professor").insert([atividadeData]);

    if (error) {
      toast.error("Erro ao salvar atividade");
      console.error(error);
    } else {
      toast.success(editando ? "Atividade atualizada!" : "Atividade adicionada!");
      carregarAtividades();
      setModalAberto(false);
      setEditando(null);
      resetForm();
    }
  }

  //--------------------------------------------------------------------
  //  3️⃣  Excluir
  //--------------------------------------------------------------------
  async function handleExcluir(id: string) {
    const { error } = await supabase
      .from("agenda_professor")
      .delete()
      .eq("id", id);
    if (error) toast.error("Erro ao excluir atividade");
    else {
      toast.success("Atividade removida da agenda!");
      carregarAtividades();
    }
  }

  //--------------------------------------------------------------------
  //  4️⃣ Utilidades
  //--------------------------------------------------------------------
  const resetForm = () =>
    setNovaAtividade      titulo: "",
      descricao: "",
      tipo: "tarefa_casa",
      data_entrega: "",
    });

  const handleEditar = (atividade: AtividadeAgenda) => {
    setEditando(atividade);
    setNovaAtividade({
      titulo: atividade.titulo,
      descricao: atividade.descricao,
      tipo: atividade.tipo,
      data_entrega: atividade.data_entrega,
    });
    setModalAberto(true);
  };

  //--------------------------------------------------------------------
  //  5️⃣  Cores / Ícones / Rótulos
  //--------------------------------------------------------------------
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "tarefa_casa":
        return "bg-blue-100 text-blue-700";
      case "estudo":
        return "bg-green-100 text-green-700";
      case "trabalho":
        return "bg-purple-100 text-purple-700";
      case "prova":
        return "bg-red-100 text-red-700";
      case "projeto":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "tarefa_casa":
        return <Home className="w-4 h-4" />;
      case "estudo":
        return <BookOpen className="w-4 h-4" />;
      case "trabalho":
        return <BookOpen className="w-4 h-4" />;
      case "prova":
        return <Calendar className="w-4 h-4" />;
      case "projeto":
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getTipoTexto = (tipo: string) => {
    switch (tipo) {
      case "tarefa_casa":
        return "Tarefa de Casa";
      case "estudo":
        return "Estudo";
      case "trabalho":
        return "Trabalho";
      case "prova":
        return "Prova";
      case "projeto":
        return "Projeto";
      default:
        return "Atividade";
    }
  };

  const atividadesOrdenadas = [...atividades].sort((a, b) =>
    new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime()
  );

  //--------------------------------------------------------------------
  //  6️⃣  Renderização
  //--------------------------------------------------------------------
  if (carregando) {
    return (
      <div className="py-10 text-center text-gray-500">
        Carregando atividades...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho e botão */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Agenda de Atividades
        </h2>
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editando ? "Editar Atividade" : "Nova Atividade na Agenda"}
              </DialogTitle>
              <DialogDescription>
                {editando
                  ? "Atualize as informações da atividade existente."
                  : "Adicione uma nova atividade para os alunos."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={novaAtividade.titulo}
                    onChange={(e) =>
                      setNovaAtividade((p) => ({ ...p, titulo: e.target.value }))
                    }
                    placeholder="Ex: Revisão capítulo 3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Atividade</Label>
                  <Select
                    value={novaAtividade.tipo}
                    onValueChange={(value) =>
                      setNovaAtividade((p) => ({ ...p, tipo: value as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tarefa_casa">Tarefa de Casa</SelectItem>
                      <SelectItem value="estudo">Estudo</SelectItem>
                      <SelectItem value="trabalho">Trabalho</SelectItem>
                      <SelectItem value="prova">Prova</SelectItem>
                      <SelectItem value="projeto">Projeto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  value={novaAtividade.descricao}
                  onChange={(e) =>
                    setNovaAtividade((p) => ({
                      ...p,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Descreva a atividade..."
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Entrega / Realização *</Label>
                <Input
                  type="date"
                  value={novaAtividade.data_entrega}
                  onChange={(e) =>
                    setNovaAtividade((p) => ({
                      ...p,
                      data_entrega: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSalvarAtividade}>
                  {editando ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de atividades */}
      {atividades.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">
            <p>Nenhuma atividade cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {atividadesOrdenadas.map((atividade) => {
            const dataEntrega = new Date(atividade.data_entrega);
            const hoje = new Date();
            const diasParaEntrega = Math.ceil(
              (dataEntrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
            );
            const isAtrasado = diasParaEntrega < 0;
            const isUrgente = diasParaEntrega <= 3 &amp;&amp; diasParaEntrega >= 0;
            return (
              <Card
                key={atividade.id}
                className={
                  isAtrasado
                    ? "border-red-300"
                    : isUrgente
                    ? "border-yellow-300"
                    : ""
                }
              >
                <CardContent className="p-6 flex justify-between">
                  <divName="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-lg ${getTipoColor(
                          atividade.tipo
                        )}`}
                      >
                        {getTipoIcon(atividade.tipo)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {atividade.titulo}
                        </h3>
                        <Badge className={getTipoColor(atividade.tipo)}>
                          {getTipoTexto(atividade.tipo)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-2">
                      {atividade.descricao}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {dataEntrega.toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditar(atividade)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExcluir(atividade.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
