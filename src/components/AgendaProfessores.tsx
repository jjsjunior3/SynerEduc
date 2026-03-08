// src/components/AgendaProfessores.tsx

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog';

import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock3,
  X,
  Trash2,
  Edit,
  Send
} from 'lucide-react';

interface AgendaProfessoresProps {
  onVoltar: () => void;
}

type StatusAgenda = 'pendente' | 'editada' | 'enviado';

interface AgendaEvento {
  id: string;
  titulo_unidade: string;
  conteudo_sala: string | null;
  atividade_casa: string | null;
  observacao: string | null;
  data_aula: string;            // YYYY-MM-DD
  horario: string | null;       // "07:30 - 08:20" ou similar
  prazo_entrega: string | null; // YYYY-MM-DD
  status: StatusAgenda;
  serie: string;
  turma: string | null;
  professor_nome: string;
  disciplina_nome: string;
  editado_por_nome: string | null;
  enviado_em: string | null;    // ISO
}

interface FiltroOpcao {
  id: string;
  nome: string;
}

export default function AgendaProfessores({ onVoltar }: AgendaProfessoresProps) {
  // Filtros
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [professores, setProfessores] = useState<FiltroOpcao[]>([]);
  const [disciplinas, setDisciplinas] = useState<FiltroOpcao[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [professorId, setProfessorId] = useState<string>('todos');
  const [disciplinaId, setDisciplinaId] = useState<string>('todas');
  const [serieSelecionada, setSerieSelecionada] = useState<string>('todas');
  const [statusFiltro, setStatusFiltro] =
    useState<'todos' | StatusAgenda>('todos');

  // Dados
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal
  const [eventoSelecionado, setEventoSelecionado] =
    useState<AgendaEvento | null>(null);

  // =========================
  // Helpers de formatação
  // =========================
  const dataISO = useMemo(
    () => dataSelecionada.toISOString().split('T')[0],
    [dataSelecionada]
  );

  const formatarDataExtenso = (date: Date) =>
    date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  const formatarDataCurta = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  };

  const formatarDataHoraCurta = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const data = d.toLocaleDateString('pt-BR');
    const hora = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${data} às ${hora}`;
  };

  const mudarDia = (delta: number) => {
    setDataSelecionada(prev => {
      const n = new Date(prev);
      n.setDate(n.getDate() + delta);
      return n;
    });
  };

  const irParaHoje = () => setDataSelecionada(new Date());

  // =========================
  // Filtros (prof, disc, série)
  // =========================
  useEffect(() => {
    async function carregarFiltros() {
      try {
        setErro(null);

        // Professores
        const { data: profs, error: errProfs } = await supabase
          .from('users')
          .select('id, nome')
          .eq('tipo', 'professor')
          .order('nome', { ascending: true });

        if (errProfs) throw errProfs;

        const professoresOptions: FiltroOpcao[] = (profs || []).map(p => ({
          id: String(p.id),
          nome: String(p.nome ?? 'Professor(a)')
        }));

        setProfessores([
          { id: 'todos', nome: 'Todos os Professores' },
          ...professoresOptions
        ]);

        // Disciplinas
        const { data: disc, error: errDisc } = await supabase
          .from('disciplinas')
          .select('id, nome')
          .order('nome', { ascending: true });

        if (errDisc) throw errDisc;

        const discOptions: FiltroOpcao[] = (disc || []).map(d => ({
          id: String(d.id),
          nome: String(d.nome ?? 'Disciplina')
        }));

        setDisciplinas([{ id: 'todas', nome: 'Todas' }, ...discOptions]);

        // Séries
        const { data: seriesData, error: errSer } = await supabase
          .from('series')
          .select('nome')
          .order('nome', { ascending: true });

        if (errSer) throw errSer;

        const seriesLista = (seriesData || [])
          .map((s: any) => String(s.nome ?? '').trim())
          .filter(s => s.length > 0);

        setSeries(['todas', ...Array.from(new Set(seriesLista))]);
      } catch (e: any) {
        console.error('Erro ao carregar filtros da agenda:', e);
        setErro('Não foi possível carregar as opções de filtro da agenda.');
      }
    }

    carregarFiltros();
  }, []);

  // =========================
  // Carregar eventos
  // =========================
  useEffect(() => {
    async function carregarEventos() {
      try {
        setErro(null);
        setCarregando(true);

        let query = supabase
          .from('agenda_professor')
          .select(
            `
              id,
              titulo_unidade,
              conteudo_sala,
              atividade_casa,
              observacao,
              data_aula,
              horario,
              prazo_entrega,
              status,
              serie,
              turma,
              editado_por,
              enviado_em,
              professor:professor_id ( id, nome ),
              disciplina:disciplina_id ( id, nome )
            `
          )
          .eq('data_aula', dataISO)
          .order('horario', { ascending: true });

        if (professorId !== 'todos') {
          query = query.eq('professor_id', professorId);
        }
        if (disciplinaId !== 'todas') {
          query = query.eq('disciplina_id', disciplinaId);
        }
        if (serieSelecionada !== 'todas') {
          query = query.eq('serie', serieSelecionada);
        }
        if (statusFiltro !== 'todos') {
          query = query.eq('status', statusFiltro);
        }

        const { data, error } = await query;
        if (error) throw error;

        const eventosFormatados: AgendaEvento[] = (data || []).map(
          (item: any) => ({
            id: String(item.id),
            titulo_unidade: String(item.titulo_unidade ?? 'Título não informado'),
            conteudo_sala: item.conteudo_sala ?? null,
            atividade_casa: item.atividade_casa ?? null,
            observacao: item.observacao ?? null,
            data_aula: String(item.data_aula),
            horario: item.horario ? String(item.horario) : null,
            prazo_entrega: item.prazo_entrega
              ? String(item.prazo_entrega)
              : null,
            status: (item.status ?? 'pendente') as StatusAgenda,
            serie: String(item.serie ?? 'Série'),
            turma: item.turma ? String(item.turma) : null,
            professor_nome: String(item.professor?.nome ?? 'Professor'),
            disciplina_nome: String(item.disciplina?.nome ?? 'Disciplina'),
            editado_por_nome: item.editado_por
              ? String(item.editado_por)
              : null,
            enviado_em: item.enviado_em ? String(item.enviado_em) : null
          })
        );

        setEventos(eventosFormatados);
      } catch (e: any) {
        console.error('Erro ao carregar eventos da agenda:', e);
        setErro('Não foi possível carregar as agendas deste dia.');
      } finally {
        setCarregando(false);
      }
    }

    carregarEventos();
  }, [dataISO, professorId, disciplinaId, serieSelecionada, statusFiltro]);

  // =========================
  // Contadores
  // =========================
  const totalAgendas = eventos.length;
  const totalEnviadas = eventos.filter(e => e.status === 'enviado').length;
  const totalEditadas = eventos.filter(e => e.status === 'editada').length;
  const totalPendentes = eventos.filter(e => e.status === 'pendente').length;

  // =========================
  // Ações do coordenador
  // =========================
  const handleDeletarAgenda = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agenda_professor')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEventos(prev => prev.filter(e => e.id !== id));
      setEventoSelecionado(null);
    } catch (e: any) {
      console.error('Erro ao deletar agenda:', e);
      alert('Não foi possível deletar a agenda.');
    }
  };

  const handleEnviarParaPais = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agenda_professor')
        .update({
          status: 'enviado',
          enviado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setEventos(prev =>
        prev.map(e =>
          e.id === id
            ? {
                ...e,
                status: 'enviado',
                enviado_em: new Date().toISOString()
              }
            : e
        )
      );

      setEventoSelecionado(prev =>
        prev?.id === id
          ? {
              ...prev,
              status: 'enviado',
              enviado_em: new Date().toISOString()
            }
          : prev
      );
    } catch (e: any) {
      console.error('Erro ao enviar agenda para os pais:', e);
      alert('Não foi possível enviar a agenda para os pais.');
    }
  };

  const handleEditarAgenda = (id: string) => {
    // Aqui você decide: abrir outra tela, modal de edição, etc.
    alert(`Edição da agenda ${id} ainda não implementada.`);
  };

  const getStatusBadge = (status: StatusAgenda) => {
    switch (status) {
      case 'enviado':
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Enviada
          </Badge>
        );
      case 'editada':
        return (
          <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Editada
          </Badge>
        );
      case 'pendente':
      default:
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-200">
            <Clock3 className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  // =========================
  // Render
  // =========================
  return (
    // IMPORTANTE: sem max-w aqui. Quem controla isso é o <main> do Dashboard.
    <div className="w-full space-y-6">
      {/* Header interno da Agenda */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoltar}
          className="mr-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Agenda dos Professores
          </h1>
          <p className="text-sm text-gray-600">
            Visualize e gerencie as agendas de aula dos professores.
          </p>
        </div>
      </div>

      {/* Linha com "Hoje" e data em destaque */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{formatarDataExtenso(dataSelecionada)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarDia(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input
            type="date"
            className="border rounded-md px-3 py-1 text-sm"
            value={dataISO}
            onChange={e => {
              const nova = new Date(e.target.value);
              if (!Number.isNaN(nova.getTime())) setDataSelecionada(nova);
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarDia(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={irParaHoje}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Card de filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                Filtros da Agenda
              </CardTitle>
              <p className="text-xs text-gray-500">
                Refine por professor, disciplina, série e status.
              </p>
            </div>
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Professor */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-700">
                Professor
              </span>
              <Select
                value={professorId}
                onValueChange={v => setProfessorId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {professores.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Disciplina */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-700">
                Disciplina
              </span>
              <Select
                value={disciplinaId}
                onValueChange={v => setDisciplinaId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Série */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-700">
                Série
              </span>
              <Select
                value={serieSelecionada}
                onValueChange={v => setSerieSelecionada(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {series.map(s => (
                    <SelectItem key={s} value={s}>
                      {s === 'todas' ? 'Todas' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-700">
                Status
              </span>
              <Select
                value={statusFiltro}
                onValueChange={v =>
                  setStatusFiltro(v as 'todos' | StatusAgenda)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="editada">Editada</SelectItem>
                  <SelectItem value="enviado">Enviada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {erro && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {erro}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-blue-100 bg-blue-50/70">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700">Total de agendas</p>
              <p className="text-xl font-semibold text-blue-900">
                {totalAgendas}
              </p>
            </div>
            <BookOpen className="w-6 h-6 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="border border-green-100 bg-green-50/70">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700">Enviadas</p>
              <p className="text-xl font-semibold text-green-900">
                {totalEnviadas}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </CardContent>
        </Card>
        <Card className="border border-orange-100 bg-orange-50/70">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-700">Editadas</p>
              <p className="text-xl font-semibold text-orange-900">
                {totalEditadas}
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </CardContent>
        </Card>
        <Card className="border border-red-100 bg-red-50/70">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700">Pendentes</p>
              <p className="text-xl font-semibold text-red-900">
                {totalPendentes}
              </p>
            </div>
            <Clock className="w-6 h-6 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Lista de agendas do dia */}
      <div className="space-y-3">
        {carregando && (
          <div className="text-center text-gray-600 py-6">
            Carregando agendas...
          </div>
        )}

        {!carregando && eventos.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-gray-600">
              <Calendar className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              Nenhuma agenda cadastrada para esta data.
            </CardContent>
          </Card>
        )}

        {!carregando &&
          eventos.map(evento => (
            <Card
              key={evento.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEventoSelecionado(evento)}
            >
              <CardContent className="py-3 px-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(evento.status)}
                    </div>
                    <h2 className="font-semibold text-sm text-gray-900">
                      {evento.titulo_unidade}
                    </h2>
                    <p className="text-xs text-gray-600">
                      {evento.disciplina_nome} • {evento.serie}
                      {evento.turma ? ` - Turma ${evento.turma}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Prof. {evento.professor_nome}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {evento.horario || 'Horário não informado'}
                      </span>
                    </div>
                    {evento.prazo_entrega && (
                      <div className="flex items-center gap-1 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-full px-2 py-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Entrega: {formatarDataCurta(evento.prazo_entrega)}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 px-2 text-[11px] flex items-center gap-1"
                      onClick={e => {
                        e.stopPropagation();
                        setEventoSelecionado(evento);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                      Revisar
                    </Button>
                  </div>
                </div>

                {evento.conteudo_sala && (
                  <p className="text-xs text-gray-700 line-clamp-2">
                    <span className="font-medium">Em sala:</span>{' '}
                    {evento.conteudo_sala}
                  </p>
                )}

                {evento.atividade_casa && (
                  <p className="text-xs text-gray-700 line-clamp-2">
                    <span className="font-medium">Para casa:</span>{' '}
                    {evento.atividade_casa}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Modal de detalhes */}
      <Dialog
        open={!!eventoSelecionado}
        onOpenChange={open => {
          if (!open) setEventoSelecionado(null);
        }}
      >
        <DialogContent
          className="max-w-2xl"
          aria-describedby="agenda-dialog-descricao"
        >
          {eventoSelecionado && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-lg font-semibold">
                    {eventoSelecionado.titulo_unidade}
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEventoSelecionado(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {getStatusBadge(eventoSelecionado.status)}
                </div>
              </DialogHeader>

              <div
                id="agenda-dialog-descricao"
                className="space-y-4 text-sm text-gray-900 mt-2"
              >
                {/* Prof / Disciplina */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Professor
                    </span>
                    <p className="font-medium">
                      Prof. {eventoSelecionado.professor_nome}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Disciplina
                    </span>
                    <p className="font-medium">
                      {eventoSelecionado.disciplina_nome}
                    </p>
                  </div>
                </div>

                {/* Data / Horário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">Data</span>
                    <p className="font-medium">
                      {formatarDataExtenso(
                        new Date(eventoSelecionado.data_aula)
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Horário
                    </span>
                    <p className="font-medium">
                      {eventoSelecionado.horario || 'Horário não informado'}
                    </p>
                  </div>
                </div>

                {/* Série / Turma */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">Série</span>
                    <p className="font-medium">{eventoSelecionado.serie}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Turma</span>
                    <p className="font-medium">
                      {eventoSelecionado.turma || 'Não informada'}
                    </p>
                  </div>
                </div>

                {/* Em Sala */}
                {eventoSelecionado.conteudo_sala && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">
                      Em Sala
                    </span>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-sm whitespace-pre-wrap">
                      {eventoSelecionado.conteudo_sala}
                    </div>
                  </div>
                )}

                {/* Para Casa */}
                {eventoSelecionado.atividade_casa && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">
                      Para Casa
                    </span>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 text-sm whitespace-pre-wrap">
                      {eventoSelecionado.atividade_casa}
                    </div>
                  </div>
                )}

                {/* Prazo */}
                {eventoSelecionado.prazo_entrega && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">
                      Prazo para Entrega
                    </span>
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100 text-sm">
                      {formatarDataCurta(eventoSelecionado.prazo_entrega)}
                    </div>
                  </div>
                )}

                {/* Observação */}
                {eventoSelecionado.observacao && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">
                      Observação
                    </span>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100 text-sm whitespace-pre-wrap">
                      {eventoSelecionado.observacao}
                    </div>
                  </div>
                )}

                {/* Banners de status */}
                {eventoSelecionado.status === 'editada' &&
                  eventoSelecionado.editado_por_nome && (
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-xs text-orange-800">
                      <strong>Esta agenda foi editada</strong> por{' '}
                      {eventoSelecionado.editado_por_nome}
                    </div>
                  )}

                {eventoSelecionado.status === 'enviado' &&
                  eventoSelecionado.enviado_em && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-xs text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        <strong>Agenda enviada aos pais</strong> em{' '}
                        {formatarDataHoraCurta(eventoSelecionado.enviado_em)}
                      </span>
                    </div>
                  )}

                {eventoSelecionado.status === 'pendente' && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-xs text-red-800">
                    <strong>
                      Esta agenda ainda não foi enviada aos pais.
                    </strong>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Tem certeza que deseja deletar esta agenda?'
                      )
                    ) {
                      handleDeletarAgenda(eventoSelecionado.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => handleEditarAgenda(eventoSelecionado.id)}
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
                {eventoSelecionado.status !== 'enviado' && (
                  <Button
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => handleEnviarParaPais(eventoSelecionado.id)}
                  >
                    <Send className="w-4 h-4" />
                    Enviar aos Pais
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
