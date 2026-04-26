// src/components/AgendaProfessores.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Calendar, Clock, BookOpen, Filter, ChevronLeft, ChevronRight,
  Eye, CheckCircle, AlertTriangle, Clock3, Trash2, Edit, Send,
  Loader2, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface AgendaProfessoresProps { onVoltar: () => void; }
type StatusAgenda = 'pendente' | 'editado' | 'enviado';

interface AgendaEvento {
  id: string;
  titulo_unidade: string;
  conteudo_sala: string | null;
  atividade_casa: string | null;
  observacao: string | null;
  data_aula: string;
  horario: string | null;
  prazo_entrega: string | null;
  status: StatusAgenda;
  serie: string;
  turma: string | null;
  professor_nome: string;
  disciplina_nome: string;
  editado_por_nome: string | null;
  enviado_em: string | null;
}

interface FiltroOpcao { id: string; nome: string; }

interface FormEdicao {
  titulo_unidade: string;
  conteudo_sala: string;
  atividade_casa: string;
  observacao: string;
  prazo_entrega: string;
}

export default function AgendaProfessores({ onVoltar }: AgendaProfessoresProps) {
  const { usuario } = useAuth();

  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [professores, setProfessores] = useState<FiltroOpcao[]>([]);
  const [disciplinas, setDisciplinas] = useState<FiltroOpcao[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [professorId, setProfessorId] = useState('todos');
  const [disciplinaId, setDisciplinaId] = useState('todas');
  const [serieSelecionada, setSerieSelecionada] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusAgenda>('todos');
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [eventoSelecionado, setEventoSelecionado] = useState<AgendaEvento | null>(null);

  // ── Edição ──
  const [modoEdicao, setModoEdicao] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [formEdicao, setFormEdicao] = useState<FormEdicao>({
    titulo_unidade: '', conteudo_sala: '', atividade_casa: '', observacao: '', prazo_entrega: '',
  });

  const dataISO = useMemo(() => dataSelecionada.toISOString().split('T')[0], [dataSelecionada]);

  const formatarDataExtenso = (date: Date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const formatarDataCurta = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
  };

  const formatarDataHoraCurta = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const mudarDia = (delta: number) => setDataSelecionada(prev => {
    const n = new Date(prev); n.setDate(n.getDate() + delta); return n;
  });

  useEffect(() => {
    async function carregarFiltros() {
      try {
        const [{ data: profs }, { data: disc }, { data: seriesData }] = await Promise.all([
          supabase.from('users').select('id, nome').eq('tipo', 'professor').order('nome'),
          supabase.from('disciplinas').select('id, nome').order('nome'),
          supabase.from('series').select('nome').order('nome'),
        ]);
        setProfessores([{ id: 'todos', nome: 'Todos os Professores' }, ...(profs || []).map((p: any) => ({ id: String(p.id), nome: String(p.nome) }))]);
        setDisciplinas([{ id: 'todas', nome: 'Todas' }, ...(disc || []).map((d: any) => ({ id: String(d.id), nome: String(d.nome) }))]);
        setSeries(['todas', ...Array.from(new Set((seriesData || []).map((s: any) => String(s.nome).trim()).filter(Boolean)))]);
      } catch { setErro('Não foi possível carregar os filtros.'); }
    }
    carregarFiltros();
  }, []);

  useEffect(() => {
    async function carregarEventos() {
      setCarregando(true); setErro(null);
      try {
        let query = supabase.from('agenda_professor').select(`
          id, titulo_unidade, conteudo_sala, atividade_casa, observacao,
          data_aula, horario, prazo_entrega, status, serie, turma,
          editado_por, enviado_em,
          professor:professor_id(id, nome),
          disciplina:disciplina_id(id, nome)
        `).eq('data_aula', dataISO).order('horario', { ascending: true });

        if (professorId !== 'todos') query = query.eq('professor_id', professorId);
        if (disciplinaId !== 'todas') query = query.eq('disciplina_id', disciplinaId);
        if (serieSelecionada !== 'todas') query = query.eq('serie', serieSelecionada);
        if (statusFiltro !== 'todos') query = query.eq('status', statusFiltro);

        const { data, error } = await query;
        if (error) throw error;

        // Resolver nomes dos editores (editado_por é UUID sem FK, então buscamos separadamente)
        const editorIds = Array.from(new Set(
          (data || []).map((item: any) => item.editado_por).filter(Boolean)
        ));
        let editorMap: Record<string, string> = {};
        if (editorIds.length > 0) {
          const { data: editores } = await supabase
            .from('users')
            .select('id, nome')
            .in('id', editorIds);
          (editores || []).forEach((e: any) => { editorMap[e.id] = e.nome; });
        }

        setEventos((data || []).map((item: any) => ({
          id: String(item.id),
          titulo_unidade: String(item.titulo_unidade ?? 'Sem título'),
          conteudo_sala: item.conteudo_sala ?? null,
          atividade_casa: item.atividade_casa ?? null,
          observacao: item.observacao ?? null,
          data_aula: String(item.data_aula),
          horario: item.horario ? String(item.horario) : null,
          prazo_entrega: item.prazo_entrega ? String(item.prazo_entrega) : null,
          status: (item.status ?? 'pendente') as StatusAgenda,
          serie: String(item.serie ?? ''),
          turma: item.turma ? String(item.turma) : null,
          professor_nome: String(item.professor?.nome ?? 'Professor'),
          disciplina_nome: String(item.disciplina?.nome ?? 'Disciplina'),
          editado_por_nome: item.editado_por ? (editorMap[item.editado_por] || 'Coordenação') : null,
          enviado_em: item.enviado_em ? String(item.enviado_em) : null,
        })));
      } catch { setErro('Não foi possível carregar as agendas deste dia.'); }
      finally { setCarregando(false); }
    }
    carregarEventos();
  }, [dataISO, professorId, disciplinaId, serieSelecionada, statusFiltro]);

  const totalAgendas = eventos.length;
  const totalEnviadas = eventos.filter(e => e.status === 'enviado').length;
  const totalEditadas = eventos.filter(e => e.status === 'editado').length;
  const totalPendentes = eventos.filter(e => e.status === 'pendente').length;

  const handleDeletar = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta agenda?')) return;
    try {
      const { error } = await supabase.from('agenda_professor').delete().eq('id', id);
      if (error) throw error;
      setEventos(prev => prev.filter(e => e.id !== id));
      setEventoSelecionado(null);
      toast.success('Agenda deletada.');
    } catch { toast.error('Não foi possível deletar a agenda.'); }
  };

  const handleEnviar = async (id: string) => {
    try {
      const enviado_em = new Date().toISOString();
      const { error } = await supabase.from('agenda_professor').update({ status: 'enviado', enviado_em }).eq('id', id);
      if (error) throw error;
      setEventos(prev => prev.map(e => e.id === id ? { ...e, status: 'enviado', enviado_em } : e));
      setEventoSelecionado(prev => prev?.id === id ? { ...prev, status: 'enviado', enviado_em } : prev);
      toast.success('Agenda enviada aos pais!');
    } catch { toast.error('Não foi possível enviar a agenda.'); }
  };

  // ── Funções de edição ──
  const abrirEdicao = (evento: AgendaEvento) => {
    setFormEdicao({
      titulo_unidade: evento.titulo_unidade,
      conteudo_sala: evento.conteudo_sala || '',
      atividade_casa: evento.atividade_casa || '',
      observacao: evento.observacao || '',
      prazo_entrega: evento.prazo_entrega || '',
    });
    setModoEdicao(true);
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setFormEdicao({ titulo_unidade: '', conteudo_sala: '', atividade_casa: '', observacao: '', prazo_entrega: '' });
  };

  const salvarEdicao = async () => {
    if (!eventoSelecionado) return;
    if (!formEdicao.titulo_unidade.trim()) { toast.error('O título é obrigatório.'); return; }

    setSalvandoEdicao(true);
    try {
      const payload = {
        titulo_unidade: formEdicao.titulo_unidade.trim(),
        conteudo_sala: formEdicao.conteudo_sala.trim() || null,
        atividade_casa: formEdicao.atividade_casa.trim() || null,
        observacao: formEdicao.observacao.trim() || null,
        prazo_entrega: formEdicao.prazo_entrega || null,
        status: 'editado' as StatusAgenda,
        // ✅ FIX: Enviar o UUID do usuário (id), não o nome/email
        // A coluna editado_por no banco é do tipo UUID (foreign key para users)
        editado_por: usuario?.id || null,
      };

      const { error } = await supabase
        .from('agenda_professor')
        .update(payload)
        .eq('id', eventoSelecionado.id);

      if (error) throw error;

      const atualizado: AgendaEvento = {
        ...eventoSelecionado,
        titulo_unidade: payload.titulo_unidade,
        conteudo_sala: payload.conteudo_sala,
        atividade_casa: payload.atividade_casa,
        observacao: payload.observacao,
        prazo_entrega: payload.prazo_entrega,
        status: payload.status,
        // Mostrar o nome do coordenador na UI
        editado_por_nome: usuario?.nome || 'Coordenação',
      };
      setEventos(prev => prev.map(e => e.id === eventoSelecionado.id ? atualizado : e));
      setEventoSelecionado(atualizado);
      setModoEdicao(false);
      toast.success('Agenda atualizada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const getStatusStyle = (status: StatusAgenda) => {
    switch (status) {
      case 'enviado': return { className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800', icon: <CheckCircle className="w-3 h-3" />, label: 'Enviada' };
      case 'editado': return { className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800', icon: <AlertTriangle className="w-3 h-3" />, label: 'Editada' };
      default: return { className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800', icon: <Clock3 className="w-3 h-3" />, label: 'Pendente' };
    }
  };

  const StatusBadge = ({ status }: { status: StatusAgenda }) => {
    const s = getStatusStyle(status);
    return (
      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const resumoCards = [
    { label: 'Total', value: totalAgendas, icon: BookOpen, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200', iconClass: 'text-blue-500 dark:text-blue-400' },
    { label: 'Enviadas', value: totalEnviadas, icon: CheckCircle, className: 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200', iconClass: 'text-green-500 dark:text-green-400' },
    { label: 'Editadas', value: totalEditadas, icon: AlertTriangle, className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200', iconClass: 'text-orange-500 dark:text-orange-400' },
    { label: 'Pendentes', value: totalPendentes, icon: Clock, className: 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200', iconClass: 'text-red-500 dark:text-red-400' },
  ];
  
  return (
    <div className="space-y-6">

      {/* Navegação de data */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-foreground capitalize">{formatarDataExtenso(dataSelecionada)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => mudarDia(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input type="date"
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
            value={dataISO}
            onChange={e => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) setDataSelecionada(d); }}
          />
          <Button variant="outline" size="icon" onClick={() => mudarDia(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDataSelecionada(new Date())}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Filter className="w-4 h-4 text-blue-600" /> Filtros da Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Professor</Label>
              <Select value={professorId} onValueChange={setProfessorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {professores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Disciplina</Label>
              <Select value={disciplinaId} onValueChange={setDisciplinaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {disciplinas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Série</Label>
              <Select value={serieSelecionada} onValueChange={setSerieSelecionada}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {series.map(s => <SelectItem key={s} value={s}>{s === 'todas' ? 'Todas' : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFiltro} onValueChange={v => setStatusFiltro(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="editado">Editada</SelectItem>
                  <SelectItem value="enviado">Enviada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {erro && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
              {erro}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
        {resumoCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl flex items-center justify-between p-4 sm:p-5 ${card.className}`}>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold mb-1">{card.label}</p>
                <p className="text-2xl sm:text-3xl font-bold">{card.value}</p>
              </div>
              <Icon className={`w-6 h-6 sm:w-8 sm:h-8 opacity-70 ${card.iconClass}`} />
            </div>
          );
        })}
      </div>

      {/* Lista de agendas */}
      <div className="space-y-4">
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600 mr-2" />
            <span className="text-muted-foreground">Carregando agendas...</span>
          </div>
        ) : eventos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma agenda cadastrada para esta data.</p>
            </CardContent>
          </Card>
        ) : (
          eventos.map(evento => (
            <Card key={evento.id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setEventoSelecionado(evento); setModoEdicao(false); }}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-6">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <StatusBadge status={evento.status} />
                    <h2 className="font-semibold text-foreground text-base leading-snug">{evento.titulo_unidade}</h2>
                    <p className="text-sm text-muted-foreground">
                      {evento.disciplina_nome} • {evento.serie}{evento.turma ? ` — Turma ${evento.turma}` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">Prof. {evento.professor_nome}</p>
                    {evento.conteudo_sala && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        <span className="font-medium text-foreground">Em sala:</span> {evento.conteudo_sala}
                      </p>
                    )}
                    {evento.atividade_casa && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        <span className="font-medium text-foreground">Para casa:</span> {evento.atividade_casa}
                      </p>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{evento.horario || 'Horário não informado'}</span>
                    </div>
                    {evento.prazo_entrega && (
                      <span className="text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Entrega: {formatarDataCurta(evento.prazo_entrega)}
                      </span>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm hidden sm:flex"
                      onClick={e => { e.stopPropagation(); setEventoSelecionado(evento); setModoEdicao(false); }}>
                      <Eye className="w-4 h-4" /> Revisar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Modal ── */}
      <Dialog open={!!eventoSelecionado} onOpenChange={open => {
        if (!open) { setEventoSelecionado(null); cancelarEdicao(); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {eventoSelecionado && (
            <>
              <DialogHeader className="pb-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <DialogTitle className="text-foreground text-lg leading-tight">
                      {modoEdicao ? 'Editar Agenda' : eventoSelecionado.titulo_unidade}
                    </DialogTitle>
                    {!modoEdicao && <StatusBadge status={eventoSelecionado.status} />}
                  </div>
                  {!modoEdicao && (
                    <Button variant="outline" size="sm"
                      className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex-shrink-0"
                      onClick={() => abrirEdicao(eventoSelecionado)}>
                      <Edit className="w-4 h-4" /> Editar
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {/* ── VISUALIZAÇÃO ── */}
              {!modoEdicao && (
                <>
                  <div className="space-y-5 py-4">
                    <div className="grid px-2 grid-cols-2 gap-x-6 gap-y-4">
                      {[
                        { label: 'Professor', value: `Prof. ${eventoSelecionado.professor_nome}` },
                        { label: 'Disciplina', value: eventoSelecionado.disciplina_nome },
                        { label: 'Data', value: formatarDataExtenso(new Date(eventoSelecionado.data_aula)) },
                        { label: 'Horário', value: eventoSelecionado.horario || 'Não informado' },
                        { label: 'Série', value: eventoSelecionado.serie },
                        { label: 'Turma', value: eventoSelecionado.turma || 'Não informada' },
                      ].map(item => (
                        <div key={item.label}>
                          <span className="text-xs pt-2 text-muted-foreground block mb-0.5">{item.label}</span>
                          <p className="font-medium text-foreground text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {eventoSelecionado.conteudo_sala && (
                      <div>
                        <span className="text-xs py-2 text-muted-foreground block mb-1.5">Em Sala</span>
                        <div className="rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                          style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                          {eventoSelecionado.conteudo_sala}
                        </div>
                      </div>
                    )}

                    {eventoSelecionado.atividade_casa && (
                      <div>
                        <span className="text-xs py-2 text-muted-foreground block mb-1.5">Para Casa</span>
                        <div className="rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                          style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
                          {eventoSelecionado.atividade_casa}
                        </div>
                      </div>
                    )}

                    {eventoSelecionado.prazo_entrega && (
                      <div>
                        <span className="text-xs py-2 text-muted-foreground block mb-1.5">Prazo de Entrega</span>
                        <div className="rounded-lg p-4 text-sm text-foreground"
                          style={{ backgroundColor: '#fef9c3', border: '1px solid #fde047' }}>
                          {formatarDataCurta(eventoSelecionado.prazo_entrega)}
                        </div>
                      </div>
                    )}

                    {eventoSelecionado.observacao && (
                      <div>
                        <span className="text-xs py-2 text-muted-foreground block mb-1.5">Observação</span>
                        <div className="rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          {eventoSelecionado.observacao}
                        </div>
                      </div>
                    )}

                    {eventoSelecionado.status === 'editado' && eventoSelecionado.editado_por_nome && (
                      <div className="rounded-lg p-4 text-xs"
                        style={{ backgroundColor: '#ffedd5', border: '1px solid #fdba74', color: '#7c2d12' }}>
                        <strong>Agenda editada</strong> pela Coordenação ({eventoSelecionado.editado_por_nome})
                      </div>
                    )}
                    {eventoSelecionado.status === 'enviado' && eventoSelecionado.enviado_em && (
                      <div className="rounded-lg p-4 text-xs flex items-center gap-2"
                        style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#14532d' }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span><strong>Enviada aos pais</strong> em {formatarDataHoraCurta(eventoSelecionado.enviado_em)}</span>
                      </div>
                    )}
                    {eventoSelecionado.status === 'pendente' && (
                      <div className="rounded-lg p-4 text-xs"
                        style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#7f1d1d' }}>
                        <strong>Esta agenda ainda não foi enviada aos pais.</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    <Button variant="outline"
                      className="flex-1 sm:flex-none gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDeletar(eventoSelecionado.id)}>
                      <Trash2 className="w-4 h-4" /> Deletar
                    </Button>
                    <Button variant="outline" className="flex-1 sm:flex-none gap-2"
                      onClick={() => abrirEdicao(eventoSelecionado)}>
                      <Edit className="w-4 h-4" /> Editar
                    </Button>
                    {eventoSelecionado.status !== 'enviado' && (
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={() => handleEnviar(eventoSelecionado.id)}>
                        <Send className="w-4 h-4" /> Enviar aos Pais
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* ── EDIÇÃO ── */}
              {modoEdicao && (
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium text-sm">
                      Título da Unidade <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formEdicao.titulo_unidade}
                      onChange={e => setFormEdicao(p => ({ ...p, titulo_unidade: e.target.value }))}
                      placeholder="Título da unidade"
                      disabled={salvandoEdicao}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium text-sm">Conteúdo em Sala</Label>
                    <Textarea
                      value={formEdicao.conteudo_sala}
                      onChange={e => setFormEdicao(p => ({ ...p, conteudo_sala: e.target.value }))}
                      placeholder="O que foi trabalhado em sala..."
                      rows={4}
                      disabled={salvandoEdicao}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium text-sm">Atividade Para Casa</Label>
                    <Textarea
                      value={formEdicao.atividade_casa}
                      onChange={e => setFormEdicao(p => ({ ...p, atividade_casa: e.target.value }))}
                      placeholder="Atividade para os alunos fazerem em casa..."
                      rows={4}
                      disabled={salvandoEdicao}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium text-sm">
                        Prazo de Entrega <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                      </Label>
                      <Input
                        type="date"
                        value={formEdicao.prazo_entrega}
                        onChange={e => setFormEdicao(p => ({ ...p, prazo_entrega: e.target.value }))}
                        disabled={salvandoEdicao}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium text-sm">
                        Observação <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                      </Label>
                      <Input
                        value={formEdicao.observacao}
                        onChange={e => setFormEdicao(p => ({ ...p, observacao: e.target.value }))}
                        placeholder="Observações adicionais..."
                        disabled={salvandoEdicao}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg text-xs"
                    style={{ backgroundColor: '#dbeafe', color: '#1e3a8a' }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Ao salvar, o status será alterado para <strong>Editada</strong> e o nome
                      da coordenação será registrado automaticamente.
                    </span>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-border">
                    <Button variant="outline" className="flex-1" onClick={cancelarEdicao} disabled={salvandoEdicao}>
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      onClick={salvarEdicao} disabled={salvandoEdicao}>
                      {salvandoEdicao
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                        : <><Save className="w-4 h-4" />Salvar Edição</>
                      }
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}