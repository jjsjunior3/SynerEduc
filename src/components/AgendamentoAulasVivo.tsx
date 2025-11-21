// src/components/AgendamentoAulasVivo.tsx
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Loader2, Plus, Calendar, Video, Trash2, Edit } from "lucide-react";
import { Badge } from "./ui/badge";
  import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface AulaVivo {
  id: string;
  titulo: string;
  descricao: string;
  data_hora: string;
  duracao: number;
  plataforma: string;
  link: string;
  senha: string | null;
  participantes_maximos: number;
  status: "agendada" | "em-andamento" | "finalizada" | "cancelada";
  notificar_alunos: boolean;
  link_seguro: boolean;
  criado_em: string;
}

export default function AgendamentoAulasVivo() {
  const { user } = useAuth();
  const [aulas, setAulas] = useState<AulaVivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<AulaVivo | null>(null);
  const [form, setForm] = useState<Partial<AulaVivo>>({
    titulo: "",
    descricao: "",
    data_hora: "",
    duracao: 60,
    plataforma: "Zoom",
    link: "",
    senha: "",
    participantes_maximos: 0,
    status: "agendada",
    notificar_alunos: false,
    link_seguro: false,
  });

  // ------------------------- CARREGAR AULAS --------------------------
  useEffect(() => {
    carregarAulas();
  }, []);

  async function carregarAulas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("aulas_ao_vivo")
      .select("*")
      .eq("professor_id", user?.id)
      .order("data_hora", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar aulas");
    } else {
      setAulas(data || []);
    }
    setLoading(false);
  }

  // --------------------------- SALVAR / EDITAR --------------------------
  async function salvarAula() {
    if (!form.titulo || !form.link || !form.data_hora) {
      toast.warning("Preencha os campos obrigatórios");
      return;
    }

    const aulaData = {
      ...form,
      professor_id: user?.id,
    };

    let result;
    if (editando) {
      result = await supabase
        .from("aulas_ao_vivo")
        .update(aulaData)
        .eq("id", editando.id);
    } else {
      result = await supabase.from("aulas_ao_vivo").insert([aulaData]);
    }

    if (result.error) {
      console.error(result.error);
      toast.error("Erro ao salvar aula");
    } else {
      toast.success(editando ? "Aula atualizada!" : "Aula agendada!");
      setEditando(null);
      setForm({
        titulo: "",
        descricao: "",
        data_hora: "",
        duracao: 60,
        plataforma: "Zoom",
        link: "",
        senha: "",
        participantes_maximos: 0,
        status: "agendada",
        notificar_alunos: false,
        link_seguro: false,
      });
      carregarAulas();
    }
  }

  // --------------------------- EXCLUIR --------------------------
  async function excluirAula(id: string) {
    const { error } = await supabase.from("aulas_ao_vivo").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir aula");
    else {
      toast.success("Aula excluída");
      carregarAulas();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-600">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando aulas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Aulas ao Vivo
        </h2>
        <Button onClick={() => setEditando({} as AulaV)}>
          <Plus className="w-4 h-4 mr-1" /> Nova Aula
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aulas.map(aula => (
          <Card key={aula.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {aula.titulo}
                <Badge variant="outline">{aula.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>{new Date(aula.data_hora).toLocaleString("pt-BR")}</p>
              <p>Plataforma: {aula.plataforma}</p>
              <p>Link: <a href={aula.link} target="_blank" className="text-blue-600 hover:underline">{aula.link}</a></p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditando(aula)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => excluirAula(aula.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Aula" : "Nova Aula"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <Input
              placeholder="Título"
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
            />
            <Textarea
              placeholder="Descrição"
              value={form.descricao || ""}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
            />
            <Input
              type="datetime-local"
              value={form.data_hora || ""}
              onChange={e => setForm({ ...form, data_hora: e.target.value })}
            />
            <Input
              type="text"
              placeholder="Link da reunião"
              value={form.link}
              onChange={e => setForm({ ...form, link: e.target.value })}
            />
            <Input
              type="text"
              placeholder="Plataforma (Zoom, Google Meet...)"
              value={form.plataforma}
              onChange={e => setForm({ ...form, plataforma: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvarAula}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
