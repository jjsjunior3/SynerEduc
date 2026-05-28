import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Loader2, Plus, Calendar, Video, Trash2, Edit, ExternalLink } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuth } from '../contexts/AuthContext';

interface AgendamentoAulasVivoProps {
  disciplinaId: string;
  nomeDisciplina: string;
  turmaId?: string; // Opcional, caso queira filtrar por turma específica também
}

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
  disciplina_id: string;
}

export function AgendamentoAulasVivo({ disciplinaId, nomeDisciplina, turmaId }: AgendamentoAulasVivoProps) {
  const { usuario } = useAuth();
  const [aulas, setAulas] = useState<AulaVivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<AulaVivo | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<AulaVivo>>({
    titulo: "",
    descricao: "",
    data_hora: "",
    duracao: 60,
    plataforma: "Google Meet",
    link: "",
    senha: "",
    participantes_maximos: 0,
    status: "agendada",
    notificar_alunos: false,
    link_seguro: false,
  });

  // ------------------------- CARREGAR AULAS --------------------------
  useEffect(() => {
    if (usuario?.id && disciplinaId) {
      carregarAulas();
    }
  }, [usuario?.id, disciplinaId]);

  async function carregarAulas() {
    setLoading(true);
    let query = supabase
      .from("aulas_ao_vivo")
      .select("*")
      .eq("professor_id", usuario?.id)
      .eq("disciplina_id", disciplinaId) // Filtra pela disciplina atual
      .order("data_hora", { ascending: true });

    // Se tiver turmaId, filtra também (opcional, depende da sua regra de negócio)
    if (turmaId) {
      // query = query.eq("turma_id", turmaId); 
      // Descomente acima se sua tabela aulas_ao_vivo tiver a coluna turma_id
    }

    const { data, error } = await query;

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
      toast.warning("Preencha título, link e data/hora.");
      return;
    }

    const aulaData = {
      ...form,
      professor_id: usuario?.id,
      disciplina_id: disciplinaId, // Salva o vínculo com a disciplina
      // turma_id: turmaId // Salva o vínculo com a turma se necessário
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
      fecharModal();
      carregarAulas();
    }
  }

  // --------------------------- EXCLUIR --------------------------
  function excluirAula(id: string) {
    setConfirmId(id);
  }

  function abrirModalEdicao(aula: AulaVivo) {
    setEditando(aula);
    setForm(aula);
    setModalAberto(true);
  }

  function abrirModalNovo() {
    setEditando(null);
    setForm({
      titulo: "",
      descricao: "",
      data_hora: "",
      duracao: 60,
      plataforma: "Google Meet",
      link: "",
      senha: "",
      participantes_maximos: 0,
      status: "agendada",
      notificar_alunos: false,
      link_seguro: false,
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditando(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" /> Carregando agendamentos...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div>
          <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            Aulas ao Vivo: {nomeDisciplina}
          </h2>
          <p className="text-sm text-blue-700">Gerencie os links e horários das suas transmissões.</p>
        </div>
        <Button onClick={abrirModalNovo} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Aula
        </Button>
      </div>

      {aulas.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma aula agendada para esta disciplina.</p>
          <Button variant="link" onClick={abrirModalNovo}>Agendar a primeira</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aulas.map(aula => (
            <Card key={aula.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-start text-base">
                  <span className="line-clamp-1" title={aula.titulo}>{aula.titulo}</span>
                  <Badge variant={aula.status === 'agendada' ? 'default' : 'secondary'} className="capitalize">
                    {aula.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {new Date(aula.data_hora).toLocaleString("pt-BR", { 
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                  })}
                </div>

                <div className="space-y-1">
                  <p><span className="font-semibold">Plataforma:</span> {aula.plataforma}</p>
                  {aula.senha && <p><span className="font-semibold">Senha:</span> {aula.senha}</p>}
                </div>

                <div className="pt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <a href={aula.link} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3 h-3 mr-2" /> Entrar
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => abrirModalEdicao(aula)}>
                    <Edit className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => excluirAula(aula.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              {editando ? "Editar Aula" : "Agendar Nova Aula"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título da Aula</label>
              <Input
                placeholder="Ex: Revisão para a Prova"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data e Hora</label>
                <Input
                  type="datetime-local"
                  value={form.data_hora || ""}
                  onChange={e => setForm({ ...form, data_hora: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duração (min)</label>
                <Input
                  type="number"
                  value={form.duracao}
                  onChange={e => setForm({ ...form, duracao: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Link da Reunião</label>
              <Input
                type="text"
                placeholder="https://meet.google.com/..."
                value={form.link}
                onChange={e => setForm({ ...form, link: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plataforma</label>
                <Input
                  type="text"
                  placeholder="Zoom, Meet..."
                  value={form.plataforma}
                  onChange={e => setForm({ ...form, plataforma: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha (Opcional)</label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={form.senha || ""}
                  onChange={e => setForm({ ...form, senha: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição / Pauta</label>
              <Textarea
                placeholder="O que será abordado nesta aula..."
                value={form.descricao || ""}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
            <Button onClick={salvarAula} className="bg-blue-600 hover:bg-blue-700">
              {editando ? "Salvar Alterações" : "Agendar Aula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta aula?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">Esta ação não pode ser desfeita.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmId) return;
                const { error } = await supabase.from("aulas_ao_vivo").delete().eq("id", confirmId);
                if (error) toast.error("Erro ao excluir aula");
                else {
                  toast.success("Aula removida");
                  carregarAulas();
                }
                setConfirmId(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancelar Aula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
