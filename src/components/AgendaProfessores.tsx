// src/components/AgendaProfessores.tsx
/**
 * Agenda geral dos professores — visão semanal (coordenação/admin)
 * Mostra eventos reais da tabela agenda_professor, filtrando por professor.
 */

import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface AgendaProfessoresProps {
  onVoltar: () => void;
}

interface EventoAgenda {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "tarefa_casa" | "estudo" | "trabalho" | "prova" | "projeto";
  data_entrega: string;
  disciplina_id: string;
  professor_id: string;
  serie_nome: string;
  turma: string;
  professores?: { nome: string };
  disciplina_nome?: string;
}

export default function AgendaProfessores({ onVoltar }: AgendaProfessoresProps) {
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [professorSelecionado, setProfessorSelecionado] = useState("todos");
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [carregando, setCarregando] = useState(true);

  // ------------------------------------------------------------
  // 1️⃣ Carrega lista de professores (users)
  // ------------------------------------------------------------
  useEffect(() => {
    carregarProfessores();
  }, []);

  async function carregarProfessores() {
    const { data, error } = await supabase
      .from("users")
      .select("id, nome")
      .eq("papel", "professor")
      .order("nome", { ascending: true });

    if (error) console.error("Erro carregando professores", error);
    else setProfessores([{ id: "todos", nome: "Todos os Professores" }, ...(data || [])]);
  }

  // ------------------------------------------------------------
  // 2️⃣ Carrega eventos reais da agenda_professor
  // ------------------------------------------------------------
  useEffect(() => {
    carregarEventos();
  }, [dataAtual, professorSelecionado]);

  async function carregarEventos() {
    setCarregando(true);
    const inicioSemana = new Date(dataAtual);
    inicioSemana.setDate(dataAtual.getDate() - dataAtual.getDay());
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    let query = supabase
      .from("agenda_professor")
      .select(
        "id, titulo, descricao, tipo, data_entrega, serie_nome, turma, disciplina_id, professor_id, disciplinas(nome), users(nome)"
      )
      .gte("data_entrega", inicioSemana.toISOString().split("T")[0])
      .lte("data_entrega", fimSemana.toISOString().split("T")[0]);

    if (professorSelecionado !== "todos") {
      query = query.eq("professor_id", professorSelecionado);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar eventos", error);
    } else {
      setEventos(data || []);
    }
    setCarregando(false);
  }

  // ------------------------------------------------------------
  // 3️⃣  Funções auxiliares (cores/icones)
  // ------------------------------------------------------------
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "tarefa_casa":
        return "bg-green-100 text-green-700";
      case "estudo":
        return "bg-blue-100 text-blue-700";
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
        return <BookOpen className="w-4 h-4" />;
      case "estudo":
        return <BookOpen className="w-4 h-4" />;
      case "trabalho":
        return <Users className="w-4 h-4" />;
      case "prova":
        return <Calendar className="w-4 h-4" />;
      case "projeto":
        return <Users className="w-4 h-4" />;
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
        return "Evento";
    }
  };

  // ------------------------------------------------------------
  // 4️⃣  Lógica de calendário semanal
  // ------------------------------------------------------------
  const diasDaSemana = () => {
    const inicio = new Date(dataAtual);
    inicio.setDate(dataAtual.getDate() - dataAtual.getDay());
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      dias.push(dia);
    }
    return dias;
  };

  const navegarSemana = (direcao: "anterior" | "proxima") => {
    const nova = new Date(dataAtual);
    nova.setDate(
      dataAtual.getDate() + (direcao === "proxima" ? 7 : -7)
    );
    setDataAtual(nova);
  };

  const eventosPorDia = (dataStr: string) =>
    eventos.filter((e) => e.data_entrega === dataStr);

  // ------------------------------------------------------------
  // 5️⃣  Renderização
  // ------------------------------------------------------------
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-600">
        Carregando agenda dos professores...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ---------- Header ---------- */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onVoltar}
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="font-semibold text-gray-900">
            Agenda Semanal dos Professores
          </h1>
          <p className="text-sm text-gray-600">
            Visualize aulas, tarefas, provas e atividades cadastradas pelos professores.
          </p>
        </div>
      </div>

      {/* ---------- Conteúdo ---------- */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">
                Professor:
              </label>
              <Select
                value={professorSelecionado}
                onValueChange={setProfessorSelecionado}
              >
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent>
                  {professores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navegarSemana("anterior")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">
                Semana de{" "}
                {diasDaSemana()[0].toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}{" "}
                a{" "}
                {diasDaSemana()[6].toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navegarSemana("proxima")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ---------- Grade Semanal ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {diasDaSemana().map((dia, i) => {
            const dataStr = dia.toISOString().split("T")[0];
            const eventosDia = eventosPorDia(dataStr);
            const isHoje = dia.toDateString() === new Date().toDateString();
            return (
              <Card key={i} className={isHoje ? "ring-2 ring-blue-500" : ""}>
                <CardHeader>
                  <CardTitle className="text-center text-sm">
                    <div className="font-medium">
                      {dia.toLocaleDateString("pt-BR", {
                        weekday: "short",
                      }).toUpperCase()}
                    </div>
                    <div
                      className={`text-lg ${
                        isHoje ? "text-blue-600 font-bold" : ""
                      }`}
                    >
                      {dia.getDate()}
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-2 pt-0 text-sm">
                  {eventosDia.length === 0 && (
                    <p className="text-center text-gray-400 py-4">
                      Nenhum evento
                    </p>
                  )}
                  {eventosDia.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`p-1 rounded ${getTipoColor(evt.tipo)}`}
                        >
                          {getTipoIcon(evt.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {evt.titulo}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {evt.professores?.nome || "Professor"} ·{" "}
                            {evt.disciplinas?.nome || "Disciplina"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {evt.serie_nome} – Turma {evt.turma}
                          </p>
                          <div>
                            <Badge className={`${getTipoColor(evt.tipo)} text-xs`}>
                              {getTipoTexto(evt.tipo)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{" "}
                        {new Date(evt.data_entrega).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
