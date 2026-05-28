// src/components/AgendaAluno.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSegmento } from '../hooks/useSegmento';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Loader2, AlertCircle, Calendar as CalendarIcon,
  Clock, BookOpen, Home, Info, ListFilter,
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface DisciplinaProps { id: string; nome: string; cor?: string; }
interface SerieProps { id: string; nome: string; }
interface TurmaProps { id: string; nome: string; }

interface EventoAgenda {
  id: string;
  titulo_unidade: string;
  conteudo_sala: string | null;
  atividade_casa: string | null;
  observacao: string | null;
  data_aula: string;
  data_entrega: string | null;
  disciplina_id: string;
  professor_id: string;
  serie: string;
  turma: string | null;
  criado_em: string;
  professor?: { nome: string };
  disciplina?: { nome: string; cor?: string };
}

interface AgendaAlunoProps {
  serie: SerieProps;
  turma: TurmaProps;
  disciplinasDoAluno: DisciplinaProps[];
}

function resolverCorDisciplina(cor?: string): string {
  if (!cor) return '#3b82f6';
  if (cor.startsWith('#')) return cor;
  const mapa: Record<string, string> = {
    'bg-blue-500': '#3b82f6',   'bg-blue-600': '#2563eb',
    'bg-green-500': '#22c55e',  'bg-green-600': '#16a34a',
    'bg-red-500': '#ef4444',    'bg-red-600': '#dc2626',
    'bg-purple-500': '#a855f7', 'bg-purple-600': '#9333ea',
    'bg-orange-500': '#f97316', 'bg-orange-600': '#ea580c',
    'bg-yellow-500': '#eab308', 'bg-yellow-600': '#ca8a04',
    'bg-pink-500': '#ec4899',   'bg-pink-600': '#db2777',
    'bg-indigo-500': '#6366f1', 'bg-indigo-600': '#4f46e5',
    'bg-teal-500': '#14b8a6',   'bg-teal-600': '#0d9488',
    'bg-emerald-500': '#10b981','bg-emerald-600': '#059669',
    'bg-violet-500': '#8b5cf6', 'bg-violet-600': '#7c3aed',
    'bg-gray-500': '#6b7280',   'bg-gray-600': '#4b5563',
  };
  return mapa[cor] || '#3b82f6';
}

export function AgendaAluno({ serie, turma, disciplinasDoAluno }: AgendaAlunoProps) {
  const { usuario } = useAuth();
  const { segmento } = useSegmento();

  const [eventosAgenda, setEventosAgenda] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataFiltro, setDataFiltro] = useState<string>(hojeISO);
  const [disciplinaFiltro, setDisciplinaFiltro] = useState<string>('todas');

  const formatarDataBR = (dataISO: string) => {
    if (!dataISO) return "Data inválida";
    try { return new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
    catch { return "Data inválida"; }
  };

  const formatarDataCurta = (dataISO: string) => {
    if (!dataISO) return "Data inválida";
    try {
      return new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
      });
    } catch { return "Data inválida"; }
  };

  const carregarEventos = useCallback(async () => {
    if (!usuario?.id || !serie?.nome) {
      setErro("Informações do aluno ou série não disponíveis.");
      setCarregando(false);
      return;
    }
    try {
      setCarregando(true);
      setErro(null);

      if (disciplinasDoAluno.length === 0) {
        setEventosAgenda([]);
        setCarregando(false);
        return;
      }

      let query = supabase
        .from("agenda_professor")
        .select(`id, titulo_unidade, conteudo_sala, atividade_casa, observacao,
          data_aula, data_entrega, disciplina_id, professor_id, serie, turma, criado_em,
          professor:users(nome), disciplina:disciplinas(nome, cor)`)
        .eq("serie", serie.nome)
        .eq("segmento", segmento)                              // ← filtro por segmento
        .eq("data_aula", dataFiltro)
        .eq("status", "enviado")                               // ← só exibe agendas aprovadas pela coordenação
        .in("disciplina_id", disciplinasDoAluno.map(d => d.id));

      if (disciplinaFiltro !== 'todas') {
        query = query.eq("disciplina_id", disciplinaFiltro);
      }

      const { data, error } = await query
        .order("nome", { foreignTable: "disciplina", ascending: true })
        .order("criado_em", { ascending: true });

      if (error) throw error;
      setEventosAgenda((data || []) as EventoAgenda[]);
    } catch (e: any) {
      setErro(e.message || "Erro ao carregar eventos da agenda.");
      setEventosAgenda([]);
    } finally {
      setCarregando(false);
    }
  }, [usuario?.id, serie?.nome, dataFiltro, disciplinasDoAluno, disciplinaFiltro, segmento]);

  useEffect(() => { carregarEventos(); }, [carregarEventos]);

  const eventosAgrupados = eventosAgenda.reduce((acc, evento) => {
    const nome = evento.disciplina?.nome || 'Disciplina Desconhecida';
    if (!acc[nome]) acc[nome] = [];
    acc[nome].push(evento);
    return acc;
  }, {} as Record<string, EventoAgenda[]>);

  return (
    <div className="space-y-6">

      {/* Filtro por data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            Filtro por data
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Selecione uma data para ver os eventos da agenda.</p>
            <p className="text-xs">
              Em {formatarDataBR(dataFiltro)} há{" "}
              <strong className="text-foreground">{eventosAgenda.length}</strong>{" "}
              {eventosAgenda.length === 1 ? "evento" : "eventos"} registrado(s).
            </p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <Label htmlFor="filtro-data" className="text-xs font-medium text-muted-foreground">Dia da Aula</Label>
            <Input id="filtro-data" type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="w-48" />
          </div>
        </CardContent>
      </Card>

      {/* Filtro por disciplina */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListFilter className="w-4 h-4 text-blue-600" />
            Filtro por disciplina
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <p className="text-sm text-muted-foreground">Selecione uma disciplina para filtrar os eventos.</p>
          <div className="flex flex-col items-start gap-1">
            <Label htmlFor="filtro-disciplina" className="text-xs font-medium text-muted-foreground">Disciplina</Label>
            <select
              id="filtro-disciplina"
              value={disciplinaFiltro}
              onChange={(e) => setDisciplinaFiltro(e.target.value)}
              className="w-48 p-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="todas">Todas as Disciplinas</option>
              {disciplinasDoAluno.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {carregando && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
          <p className="text-muted-foreground">Carregando agenda...</p>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive mb-1">Erro ao carregar agenda</p>
              <p className="text-sm text-muted-foreground mb-3">{erro}</p>
              <Button variant="outline" size="sm" onClick={carregarEventos}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vazio */}
      {!carregando && !erro && eventosAgenda.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground text-sm">Não há eventos registrados para a data e filtros selecionados.</p>
          </CardContent>
        </Card>
      )}

      {/* Eventos */}
      {!carregando && !erro && eventosAgenda.length > 0 && (
        <div className="space-y-8">
          {Object.entries(eventosAgrupados).map(([disciplinaNome, eventos]) => (
            <div key={disciplinaNome}>
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2 mb-4">{disciplinaNome}</h2>
              <div className="space-y-4">
                {eventos.map((evento) => {
                  const corHex = resolverCorDisciplina(evento.disciplina?.cor);
                  return (
                    <Card key={evento.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{evento.professor?.nome || 'Professor'}</span>
                        </div>
                        {/* cor dinâmica do banco — style inline é aceitável aqui */}
                        <span className="text-[11px] p-2 font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: corHex }}>
                          {evento.disciplina?.nome || disciplinaNome}
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <h3 className="font-semibold text-base text-foreground">{evento.titulo_unidade}</h3>

                        {/* ← dark mode corrigido: style rgba → classes Tailwind */}
                        {evento.conteudo_sala && (
                          <div className="rounded-lg p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-xs font-semibold text-green-700 dark:text-green-300">Conteúdo em Sala</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">{evento.conteudo_sala}</p>
                          </div>
                        )}

                        {evento.atividade_casa && (
                          <div className="rounded-lg p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Atividade Para Casa</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">{evento.atividade_casa}</p>
                          </div>
                        )}

                        {evento.data_entrega && (
                          <div className="rounded-lg p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Prazo de Entrega:</span>
                            <span className="text-xs font-medium text-foreground">{formatarDataCurta(evento.data_entrega)}</span>
                          </div>
                        )}

                        {evento.observacao && (
                          <div className="rounded-lg p-4 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Observação</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">{evento.observacao}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card informativo */}
      <div className="rounded-xl p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Sobre a Agenda:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>A agenda é atualizada diariamente pelos professores após cada aula.</li>
              <li>Use o filtro de data para consultar atividades de dias anteriores.</li>
              <li>Fique atento aos prazos de entrega destacados em azul.</li>
              <li>Leia as observações dos professores com atenção.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}