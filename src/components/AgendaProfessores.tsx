// src/components/AgendaProfessores.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Calendar, Clock, BookOpen, Filter, ChevronLeft, ChevronRight,
  Eye, CheckCircle, AlertTriangle, Clock3, Trash2, Edit, Send, Loader2,
} from 'lucide-react';

interface AgendaProfessoresProps { onVoltar: () => void; }
type StatusAgenda = 'pendente' | 'editada' | 'enviado';

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

export default function AgendaProfessores({ onVoltar }: AgendaProfessoresProps) {
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
          editado_por_nome: item.editado_por ? String(item.editado_por) : null,
          enviado_em: item.enviado_em ? String(item.enviado_em) : null,
        })));
      } catch { setErro('Não foi possível carregar as agendas deste dia.'); }
      finally { setCarregando(false); }
    }
    carregarEventos();
  }, [dataISO, professorId, disciplinaId, serieSelecionada, statusFiltro]);

  const totalAgendas = eventos.length;
  const totalEnviadas = eventos.filter(e => e.status === 'enviado').length;
  const totalEditadas = eventos.filter(e => e.status === 'editada').length;
  const totalPendentes = eventos.filter(e => e.status === 'pendente').length;

  const handleDeletar = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta agenda?')) return;
    try {
      const { error } = await supabase.from('agenda_professor').delete().eq('id', id);
      if (error) throw error;
      setEventos(prev => prev.filter(e => e.id !== id));
      setEventoSelecionado(null);
    } catch { alert('Não foi possível deletar a agenda.'); }
  };

  const handleEnviar = async (id: string) => {
    try {
      const enviado_em = new Date().toISOString();
      const { error } = await supabase.from('agenda_professor').update({ status: 'enviado', enviado_em }).eq('id', id);
      if (error) throw error;
      setEventos(prev => prev.map(e => e.id === id ? { ...e, status: 'enviado', enviado_em } : e));
      setEventoSelecionado(prev => prev?.id === id ? { ...prev, status: 'enviado', enviado_em } : prev);
    } catch { alert('Não foi possível enviar a agenda.'); }
  };

  const getStatusStyle = (status: StatusAgenda) => {
    switch (status) {
      case 'enviado':  return { bg: '#dcfce7', text: '#14532d', border: '#86efac', icon: <CheckCircle className="w-3 h-3" />, label: 'Enviada' };
      case 'editada':  return { bg: '#ffedd5', text: '#7c2d12', border: '#fdba74', icon: <AlertTriangle className="w-3 h-3" />, label: 'Editada' };
      default:         return { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5', icon: <Clock3 className="w-3 h-3" />, label: 'Pendente' };
    }
  };

  const StatusBadge = ({ status }: { status: StatusAgenda }) => {
    const s = getStatusStyle(status);
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
        style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
        {s.icon} {s.label}
      </span>
    );
  };

  // Cards de resumo com cores fixas
  const resumoCards = [
    { label: 'Total', value: totalAgendas, icon: BookOpen, bg: '#dbeafe', text: '#1e3a8a', iconColor: '#3b82f6' },
    { label: 'Enviadas', value: totalEnviadas, icon: CheckCircle, bg: '#dcfce7', text: '#14532d', iconColor: '#16a34a' },
    { label: 'Editadas', value: totalEditadas, icon: AlertTriangle, bg: '#ffedd5', text: '#7c2d12', iconColor: '#ea580c' },
    { label: 'Pendentes', value: totalPendentes, icon: Clock, bg: '#fee2e2', text: '#7f1d1d', iconColor: '#dc2626' },
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
          <input
            type="date"
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <Filter className="w-4 h-4 text-blue-600" /> Filtros da Agenda
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="space-y-2 px-3">
              <Label className="text-xs text-muted-foreground">Professor</Label>
              <Select value={professorId} onValueChange={setProfessorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {professores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 px-3">
              <Label className="text-xs text-muted-foreground">Disciplina</Label>
              <Select value={disciplinaId} onValueChange={setDisciplinaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {disciplinas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 px-3">
              <Label className="text-xs text-muted-foreground">Série</Label>
              <Select value={serieSelecionada} onValueChange={setSerieSelecionada}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {series.map(s => <SelectItem key={s} value={s}>{s === 'todas' ? 'Todas' : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 px-3">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFiltro} onValueChange={v => setStatusFiltro(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
              {erro}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 gap-5">
        {resumoCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl flex items-center justify-between"
              style={{ backgroundColor: card.bg, padding: '1.25rem 1.5rem' }}>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: card.text }}>{card.label}</p>
                <p className="text-3xl font-bold" style={{ color: card.text }}>{card.value}</p>
              </div>
              <Icon style={{ width: 32, height: 32, color: card.iconColor, opacity: 0.7 }} />
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
            <Card key={evento.id} className="p-2 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEventoSelecionado(evento)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <StatusBadge status={evento.status} />
                    <h2 className="font-semibold p-2 text-foreground text-base leading-snug">
                      {evento.titulo_unidade}
                    </h2>
                    <p className="text-sm p-2 text-muted-foreground">
                      {evento.disciplina_nome} • {evento.serie}
                      {evento.turma ? ` — Turma ${evento.turma}` : ''}
                    </p>
                    <p className="text-sm p-2 text-muted-foreground">
                      Prof. {evento.professor_nome}
                    </p>

                    {evento.conteudo_sala && (
                      <p className="text-sm p-2 text-muted-foreground line-clamp-1">
                        <span className="font-medium text-foreground">Em sala:</span> {evento.conteudo_sala}
                      </p>
                    )}
                    {evento.atividade_casa && (
                      <p className="text-sm p-2 text-muted-foreground line-clamp-1">
                        <span className="font-medium text-foreground">Para casa:</span> {evento.atividade_casa}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{evento.horario || 'Horário não informado'}</span>
                    </div>
                    {evento.prazo_entrega && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#fef9c3', color: '#713f12' }}>
                        Entrega: {formatarDataCurta(evento.prazo_entrega)}
                      </span>
                    )}
                    <Button variant="outline" size="sm"
                      className="gap-1.5 text-sm"
                      onClick={e => { e.stopPropagation(); setEventoSelecionado(evento); }}>
                      <Eye className="w-4 h-4" /> Revisar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!eventoSelecionado} onOpenChange={open => { if (!open) setEventoSelecionado(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {eventoSelecionado && (
            <>
              <DialogHeader className="pb-4 border-b border-border">
                <div className="space-y-2">
                  <DialogTitle className="text-foreground text-lg leading-tight">
                    {eventoSelecionado.titulo_unidade}
                  </DialogTitle>
                  <StatusBadge status={eventoSelecionado.status} />
                </div>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Grid de metadados */}
                <div className="grid p-2 grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { label: 'Professor', value: `Prof. ${eventoSelecionado.professor_nome}` },
                    { label: 'Disciplina', value: eventoSelecionado.disciplina_nome },
                    { label: 'Data', value: formatarDataExtenso(new Date(eventoSelecionado.data_aula)) },
                    { label: 'Horário', value: eventoSelecionado.horario || 'Não informado' },
                    { label: 'Série', value: eventoSelecionado.serie },
                    { label: 'Turma', value: eventoSelecionado.turma || 'Não informada' },
                  ].map(item => (
                    <div key={item.label}>
                      <span className="text-xs p-1 text-muted-foreground block mb-0.5">{item.label}</span>
                      <p className="font-medium p-1 text-foreground text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Conteúdo em sala */}
                {eventoSelecionado.conteudo_sala && (
                  <div>
                    <span className="text-xs p-2 text-muted-foreground block mb-1.5">Em Sala</span>
                    <div className="rounded-lg p-4
                     text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                      style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      {eventoSelecionado.conteudo_sala}
                    </div>
                  </div>
                )}

                {/* Para casa */}
                {eventoSelecionado.atividade_casa && (
                  <div>
                    <span className="text-xs p-2 text-muted-foreground block mb-1.5">Para Casa</span>
                    <div className="rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                      style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
                      {eventoSelecionado.atividade_casa}
                    </div>
                  </div>
                )}

                {/* Prazo */}
                {eventoSelecionado.prazo_entrega && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1.5">Prazo de Entrega</span>
                    <div className="rounded-lg p-4 text-sm text-foreground"
                      style={{ backgroundColor: '#fef9c3', border: '1px solid #fde047' }}>
                      {formatarDataCurta(eventoSelecionado.prazo_entrega)}
                    </div>
                  </div>
                )}

                {/* Observação */}
                {eventoSelecionado.observacao && (
                  <div>
                    <span className="text-xs p-2 text-muted-foreground block mb-1.5">Observação</span>
                    <div className="rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                      style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      {eventoSelecionado.observacao}
                    </div>
                  </div>
                )}

                {/* Banners de status */}
                {eventoSelecionado.status === 'editada' && eventoSelecionado.editado_por_nome && (
                  <div className="rounded-lg p-4 text-xs"
                    style={{ backgroundColor: '#ffedd5', border: '1px solid #fdba74', color: '#7c2d12' }}>
                    <strong>Esta agenda foi editada</strong> por {eventoSelecionado.editado_por_nome}
                  </div>
                )}

                {eventoSelecionado.status === 'enviado' && eventoSelecionado.enviado_em && (
                  <div className="rounded-lg p-4 text-xs flex items-center gap-2"
                    style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#14532d' }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span><strong>Agenda enviada aos pais</strong> em {formatarDataHoraCurta(eventoSelecionado.enviado_em)}</span>
                  </div>
                )}

                {eventoSelecionado.status === 'pendente' && (
                  <div className="rounded-lg p-4 text-xs"
                    style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#7f1d1d' }}>
                    <strong>Esta agenda ainda não foi enviada aos pais.</strong>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => handleDeletar(eventoSelecionado.id)}>
                  <Trash2 className="w-4 h-4" /> Deletar
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none gap-2"
                  onClick={() => alert(`Edição ainda não implementada.`)}>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}