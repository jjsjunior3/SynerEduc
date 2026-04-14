import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Loader2, Users, Edit, Trash2, ArrowLeft, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: "aluno" | "professor" | "coordenador" | "admin" | "professor_conteudista";
  ativo: boolean;
  criado_em: string;
}

interface Props {
  onVoltar: () => void;
}

export default function AdminUsuariosSimples({ onVoltar }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [deletando, setDeletando] = useState<Usuario | null>(null);

  // Cores e labels por tipo
  const tipoColor = (papel: string) => {
    const cores: Record<string, string> = {
      aluno: "bg-blue-100 text-blue-800",
      professor: "bg-green-100 text-green-800",
      coordenador: "bg-purple-100 text-purple-800",
      professor_conteudista: "bg-orange-100 text-orange-800",
      admin: "bg-red-100 text-red-800",
    };
    return cores[papel] ??bg-gray-100 text-gray-800";
  };

  const tipoLabel = (papel: string) => {
    switch (papel) {
      case "aluno": return "Aluno";
      case "professor": return "Professor";
      case "professor_conteudista": return "Prof. Conteudista";
      case "coordenador": return "Coordenador";
      case "admin": return "Administrador";
      default: return papel;
    }
  };

  // ----------------------------------------------
  //   BUSCAR USUÁRIOS DIRETAMENTE DO SUPABASE
  // ----------------------------------------------
  const carregarUsuarios = async () => {
    setLoading(true);
    setErro(null);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários");
      setErro(error.message);
    } else {
      setUsuarios(data as Usuario[]);
    }

    setLoading(false);
  };

  // ----------------------------------------------
  //   ATUALIZAR DADOS DO USUÁRIO (Ex: ativar/inativar)
  // ----------------------------------------------
  const alternarStatus = async (usuario: Usuario) => {
    const novoStatus = !usuario.ativo;
    const { error } = await supabase
      .from("users")
      .update({ ativo: novoStatus })
      .eq("id", usuario.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      console.error(error);
    } else {
      toast.success(`Ufsuário ${novoStatus ? "ativado" : "inativado"}`);
      carregarUsuarios();
    }
  };

  // ----------------------------------------------
  //   EXCLUIR USUÁRIO
  // ----------------------------------------------
  const confirmarExclusao = async () => {
    if (!deletando) return;
    const { error } = await supabase.from("users").delete().eq("id", deletando.id);
    if (error) {
      toast.error("Erro ao excluir usuário");
    } else {
      toast.success("Usuário deletado com sucesso");
      setDeletando(null);
      carregarUsuarios();
    }
  };

  // ----------------------------------------------
  //   ATUALIZAR (EDITAR) – nome / papel
  // ----------------------------------------------
  const salvarAlteracao = async (novoNome: string, novoTipo: string) => {
    if (!editando) return;

    const { error } = await supabase
      .from("users")
      .update({ nome: novoNome, papel: novoTipo })
      .eq("id", editando.id);

    if (error) {
      toast.error("Erro ao salvar alterações");
      console.error(error);
    } else {
      toast.success("Usuário atualizado com sucesso");
      setEditando(null);
      carregarUsuarios();
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const listaFiltrada = usuarios.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    u.papel.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span>Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center bg-white border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-lg font-semibold">Gerenciar Usuários</h1>
        </div>
        <Button onClick={carregarUsuarios} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Busca */}
      <div className="p-6">
        <div className="max-w-sm mb-6">
          <Input
            placeholder="Buscar usuário por nome, e-mail ou tipo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {/* Lista */}
        {erro &amp;&amp; <p className="text-red-600 mb-4">Erro: {erro}</p>}

        {listaFiltrada.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Nenhum usuário encontrado.</p>
        ) : (
          <div className="grid gap-4">
            {listaFiltrada.map(usuario => (
              <Card key={usuario.id} className="hover:shadow-md transition">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{usuario.nome}</h3>
                      <Badge className={tipoColor(usuario.papel)}>
                        {tipoLabel(usuario.papel)}
                      </Badge>
                      {!usuario.ativo &amp;&amp; (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{usuario.email}</p>
                    <p className="text-xs text-gray-400">
                      Criado em: {new Date(usuario.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditando(usuario)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletando(usuario)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => alternarStatus(usuario)}
                      className={
                        usuario.ativo
                          ? "text-yellow-700 hover:bg-yellow-50"
                          : "text-green-700 hover:bg-green-50"
                      }
                    >
                      {usuario.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edição */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editando &amp;&amp; (
            <div className="space-y-3">
              <Input
                value={editando.nome}
                onChange={e => setEditando({ ...editando, nome: e.target.value })}
              />
              <select
                value={editando.papel}
                onChange={e => setEditando({ ...editando, papel: e.target.value as Usuario["papel"] })}
                className="w-full border rounded-md p-2"
              >
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="professor_conteudista">Conteudista</option>
                <option value="coordenador">Coordenador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={() => salvarAlteracao(editando!.nome, editando!.papel)}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de exclusão */}
      <Dialog open={!!deletando} onOpenChange={() => setDeletando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir Usuário</DialogTitle>
          </DialogHeader>
          {deletando &amp;&amp; (
            <p>
              Tem certeza que deseja excluir <strong>{deletando.nome}</strong>?<br />
              Essa ação é permanente!
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletando(null)}>
              Cancelar
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
