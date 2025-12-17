import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Loader2, Calendar, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

export function AgendaProfessor({ disciplina, serie, turma }) {
  const { usuario } = useAuth();

  const nomeSerie = typeof serie === "string" ? serie : serie?.nome ?? "";
  const nomeTurma = typeof turma === "string" ? turma : turma?.nome ?? "";

  const [carregando, setCarregando] = useState(true);
  const [atividades, setAtividades] = useState([]);

  const [modoEdicao, setModoEdicao] = useState(null);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");

  // ================================
  //   CARREGAR ATIVIDADES
  // ================================
  const carregar = async () => {
    if (!usuario?.id || !disciplina?.id || !nomeSerie) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("agenda_professor")
        .select("*")
        .eq("professor_id", usuario.id)
        .eq("disciplina_id", disciplina.id)
        .eq("serie", nomeSerie)
        .eq("turma", nomeTurma)
        .order("criado_em", { ascending: false }); // <- CORRETO

      if (error) throw error;
      setAtividades(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar a agenda.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [usuario?.id, disciplina?.id, nomeSerie, nomeTurma]);

  // ================================
  //   NOVA ATIVIDADE
  // ================================
  const iniciarNovo = () => {
    setModoEdicao("novo");
    setTitulo("");
    setDescricao("");
    setDataEntrega("");
  };

  // ================================
  //   EDITAR
  // ================================
  const iniciarEdicao = (atv) => {
    setModoEdicao("editar");
    setAtividadeSelecionada(atv);
    setTitulo(atv.titulo);
    setDescricao(atv.descricao);
    setDataEntrega(atv.data_entrega ?? "");
  };

  // ================================
  //   SALVAR (INSERT / UPDATE)
  // ================================
  const handleSalvar = async () => {
    if (!titulo.trim()) {
      toast.error("Informe um título.");
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      disciplina_id: disciplina.id,
      professor_id: usuario.id,
      serie: nomeSerie,
      turma: nomeTurma,
      data_entrega: dataEntrega || null,
    };

    try {
      if (modoEdicao === "novo") {
        const { error } = await supabase
          .from("agenda_professor")
          .insert([payload]);

        if (error) throw error;
        toast.success("Atividade cadastrada!");
      } else if (modoEdicao === "editar") {
        const { error } = await supabase
          .from("agenda_professor")
          .update(payload)
          .eq("id", atividadeSelecionada.id);

        if (error) throw error;
        toast.success("Atividade atualizada!");
      }

      setModoEdicao(null);
      setAtividadeSelecionada(null);
      carregar();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar atividade.");
    }
  };

  // ================================
  //   EXCLUIR
  // ================================
  const excluir = async (atv) => {
    if (!confirm("Excluir esta atividade?")) return;

    try {
      const { error } = await supabase
        .from("agenda_professor")
        .delete()
        .eq("id", atv.id);

      if (error) throw error;

      toast.success("Atividade removida!");
      carregar();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir.");
    }
  };

  // ================================
  //   RENDER
  // ================================
  return (
    <div className="h-full flex flex-col gap-4">

      {/* Cabeçalho moderno da agenda */}
     <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agenda da Disciplina
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Série: {nomeSerie} • Turma: {nomeTurma}
          </p>
        </div>

        <Button
          size="sm"
          onClick={iniciarNovo}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova Atividade
        </Button>
      </div>


      {/* Formulário */}
      {modoEdicao && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {modoEdicao === "novo" ? "Nova Atividade" : "Editar Atividade"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            <div>
              <label className="block text-xs text-gray-600 mb-1">Título</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Descrição</label>
              <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Prazo (opcional)</label>
              <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModoEdicao(null)}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-[#0B0B3B] text-white" onClick={handleSalvar}>
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin inline-block" />
            Carregando agenda...
          </div>
        ) : atividades.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">
            Nenhuma atividade cadastrada.
          </p>
        ) : (
          <div className="space-y-3">
            {atividades.map((atv) => (
              <Card key={atv.id} className="border border-gray-200 shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="flex justify-between">

                    <div>
                      <h3 className="font-semibold text-sm">{atv.titulo}</h3>
                      {atv.descricao && (
                        <p className="text-xs text-gray-600 whitespace-pre-line mt-1">
                          {atv.descricao}
                        </p>
                      )}

                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-blue-100 text-blue-700 text-[11px]">
                          Envio: {format(new Date(atv.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>

                        {atv.data_entrega && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-[11px]">
                            Prazo: {format(new Date(atv.data_entrega), "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" onClick={() => iniciarEdicao(atv)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button variant="ghost" size="icon" onClick={() => excluir(atv)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
