// src/components/AtividadesCoordenador.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import {
  Loader2, FileText, Calendar, Clock, CheckCircle,
  XCircle, AlertCircle, Search, Filter, X, ChevronDown,
  ChevronUp, Users, User, Download, AlertTriangle,
  BookOpen, Send, MessageSquare,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessorInfo { id: string; nome: string; }
interface AlunoInfo     { id: string; nome: string; serie: string; }

interface AtividadeCoord {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  data_entrega: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  disciplina: string;
  serie: string;
  professor_id: string;
  professor_nome: string;
  status: string;
  totalAlunos: number;
  entregues: number;    // entregue + atrasado + corrigido
  corrigidas: number;
  comFeedback: number;
  naoEntregaram: number;
}

interface SubmissaoCoord {
  id: string;
  atividade_id: string;
  aluno_id: string;
  aluno_nome: string;
  atividade_titulo: string;
  professor_nome: string;
  disciplina: string;
  serie: string;
  tipo: string;
  status: string;
  nota?: number;
  feedback?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  data_entrega_aluno?: string;
  prazo: string;
}

type Aba = 'enviadas' | 'recebidas';

interface Props {
  onVoltar?: () => void;
  tabInicial?: Aba;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

function getTipoStyle(tipo: string) {
  switch (tipo) {
    case 'exercicio': return { bg: '#dbeafe', text: '#1e3a8a', label: 'Exercício' };
    case 'trabalho':  return { bg: '#dcfce7', text: '#14532d', label: 'Trabalho' };
    case 'prova':     return { bg: '#fee2e2', text: '#7f1d1d', label: 'Prova' };
    case 'projeto':   return { bg: '#ede9fe', text: '#4c1d95', label: 'Projeto' };
    default:          return { bg: '#f3f4f6', text: '#374151', label: tipo };
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'entregue':  return { label: 'Aguardando Correção', bgCls: 'bg-blue-100 dark:bg-blue-900/40',   textCls: 'text-blue-800 dark:text-blue-200',   borderCls: 'border-blue-300 dark:border-blue-700',   Icon: Clock };
    case 'atrasado':  return { label: 'Entregue com Atraso', bgCls: 'bg-orange-100 dark:bg-orange-900/40', textCls: 'text-orange-800 dark:text-orange-200', borderCls: 'border-orange-300 dark:border-orange-700', Icon: AlertTriangle };
    case 'corrigido': return { label: 'Corrigido',            bgCls: 'bg-green-100 dark:bg-green-900/40',  textCls: 'text-green-800 dark:text-green-200',  borderCls: 'border-green-300 dark:border-green-700',  Icon: CheckCircle };
    default:          return { label: 'Pendente',             bgCls: 'bg-muted',                           textCls: 'text-muted-foreground',               borderCls: 'border-border',                           Icon: XCircle };
  }
}

const fmt     = (d?: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
const fmtHora = (d?: string) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AtividadesCoordenador({ tabInicial = 'enviadas' }: Props) {
  const segmento  = useSegmento();
  const mesAtual  = getMesAtual();

  // Tabs
  const [tabAtiva, setTabAtiva] = useState<Aba>(tabInicial);

  // Filtros de dropdown
  const [professores,      setProfessores]      = useState<ProfessorInfo[]>([]);
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([]);

  // Filtros selecionados
  const [filtroProfessor, setFiltroProfessor] = useState('todos');
  const [filtroSerie,     setFiltroSerie]     = useState('todas');
  const [dataInicio,      setDataInicio]      = useState(mesAtual.inicio);
  const [dataFim,         setDataFim]         = useState(mesAtual.fim);

  // Dados
  const [atividades,    setAtividades]    = useState<AtividadeCoord[]>([]);
  const [submissoes,    setSubmissoes]    = useState<SubmissaoCoord[]>([]);
  const [todosAlunos,   setTodosAlunos]   = useState<AlunoInfo[]>([]);

  // UI
  const [loading,           setLoading]           = useState(false);
  const [filtroAplicado,    setFiltroAplicado]    = useState(false);
  const [expandida,         setExpandida]         = useState<string | null>(null);
  const [buscaAluno,        setBuscaAluno]        = useState('');
  const [filtroStatus,      setFiltroStatus]      = useState('todos');
  const [atividadeFiltro,   setAtividadeFiltro]   = useState<string | null>(null);

  // ── Carga inicial: professores e séries ──────────────────────────────────────
  useEffect(() => {
    carregarDadosIniciais();
  }, [segmento]);

  async function carregarDadosIniciais() {
    try {
      let q = supabase.from('users').select('id, nome').eq('tipo', 'professor').order('nome');
      if (segmento === 'presencial') q = q.eq('segmento', 'presencial');
      else q = q.neq('segmento', 'presencial');
      const { data: profs } = await q;
      setProfessores(profs || []);

      if (profs && profs.length > 0) {
        const { data: ativs } = await supabase
          .from('atividades').select('serie')
          .in('professor_id', profs.map((p: any) => p.id));
        const s = Array.from(new Set((ativs || []).map((a: any) => a.serie).filter(Boolean)))
          .sort((a: any, b: any) => a.localeCompare(b, 'pt-BR')) as string[];
        setSeriesDisponiveis(s);
      }
    } catch { /* silencioso */ }
  }

  // ── Buscar dados ─────────────────────────────────────────────────────────────
  async function carregarDados() {
    if (!dataInicio || !dataFim) { toast.error('Selecione as datas.'); return; }
    if (dataInicio > dataFim)    { toast.error('Data de início deve ser anterior à de fim.'); return; }

    setLoading(true);
    setAtividades([]);
    setSubmissoes([]);
    setTodosAlunos([]);
    setExpandida(null);
    setAtividadeFiltro(null);
    setBuscaAluno('');
    setFiltroStatus('todos');

    try {
      const profIds = filtroProfessor !== 'todos'
        ? [filtroProfessor]
        : professores.map(p => p.id);

      if (profIds.length === 0) {
        toast.info('Nenhum professor encontrado para este segmento.');
        setFiltroAplicado(true);
        setLoading(false);
        return;
      }

      // 1. Atividades
      let ativQuery = supabase.from('atividades').select('*')
        .in('professor_id', profIds)
        .gte('data_entrega', dataInicio)
        .lte('data_entrega', dataFim + 'T23:59:59')
        .order('data_entrega', { ascending: false });
      if (filtroSerie !== 'todas') ativQuery = ativQuery.eq('serie', filtroSerie);

      const { data: dadosAtiv, error: errAtiv } = await ativQuery;
      if (errAtiv) throw errAtiv;

      if (!dadosAtiv || dadosAtiv.length === 0) {
        setFiltroAplicado(true);
        setLoading(false);
        return;
      }

      const ativIds    = dadosAtiv.map((a: any) => a.id);
      const seriesUniq = Array.from(new Set(dadosAtiv.map((a: any) => a.serie as string)));

      // 2. Submissões + todos os alunos das séries (paralelo)
      const [{ data: dadosSubs, error: errSubs }, { data: dadosAlunos }] = await Promise.all([
        supabase.from('atividades_alunos').select('*').in('atividade_id', ativIds),
        supabase.from('users').select('id, nome, serie').eq('tipo', 'aluno').in('serie', seriesUniq),
      ]);
      if (errSubs) throw errSubs;

      setTodosAlunos(dadosAlunos || []);

      // Maps
      const profMap  = new Map(professores.map(p => [p.id, p.nome]));
      const alunoMap = new Map((dadosAlunos || []).map((a: any) => [a.id, a.nome]));
      const alunosPorSerie = new Map<string, AlunoInfo[]>();
      (dadosAlunos || []).forEach((a: any) => {
        if (!alunosPorSerie.has(a.serie)) alunosPorSerie.set(a.serie, []);
        alunosPorSerie.get(a.serie)!.push(a);
      });

      // 3. Enriquecer atividades
      const atividadesEnr: AtividadeCoord[] = dadosAtiv.map((ativ: any) => {
        const subs       = (dadosSubs || []).filter((s: any) => s.atividade_id === ativ.id);
        const totalAlunos = alunosPorSerie.get(ativ.serie)?.length ?? 0;
        const entregues   = subs.filter((s: any) => ['entregue', 'atrasado', 'corrigido'].includes(s.status)).length;
        const corrigidas  = subs.filter((s: any) => s.status === 'corrigido').length;
        const comFeedback = subs.filter((s: any) => s.status === 'corrigido' && s.feedback).length;
        const naoEntregaram = Math.max(0, totalAlunos - entregues);
        return {
          id: ativ.id, titulo: ativ.titulo, descricao: ativ.descricao,
          tipo: ativ.tipo || 'exercicio', data_entrega: ativ.data_entrega,
          arquivo_url: ativ.arquivo_url, arquivo_nome: ativ.arquivo_nome,
          disciplina: ativ.disciplina, serie: ativ.serie,
          professor_id: ativ.professor_id,
          professor_nome: profMap.get(ativ.professor_id) ?? 'Desconhecido',
          status: ativ.status || 'ativa',
          totalAlunos, entregues, corrigidas, comFeedback, naoEntregaram,
        };
      });

      // 4. Enriquecer submissões (apenas com status relevante)
      const submissoesEnr: SubmissaoCoord[] = (dadosSubs || [])
        .filter((s: any) => ['entregue', 'atrasado', 'corrigido'].includes(s.status))
        .map((sub: any) => {
          const ativ = dadosAtiv.find((a: any) => a.id === sub.atividade_id);
          return {
            id: sub.id, atividade_id: sub.atividade_id,
            aluno_id: sub.aluno_id,
            aluno_nome: alunoMap.get(sub.aluno_id) ?? 'Aluno Desconhecido',
            atividade_titulo: ativ?.titulo ?? '',
            professor_nome: profMap.get(ativ?.professor_id) ?? 'Desconhecido',
            disciplina: ativ?.disciplina ?? '',
            serie: ativ?.serie ?? '',
            tipo: ativ?.tipo ?? 'exercicio',
            status: sub.status,
            nota: sub.nota, feedback: sub.feedback,
            arquivo_url: sub.arquivo_url, arquivo_nome: sub.arquivo_nome,
            data_entrega_aluno: sub.data_entrega,
            prazo: ativ?.data_entrega ?? '',
          };
        });

      setAtividades(atividadesEnr);
      setSubmissoes(submissoesEnr);
      setFiltroAplicado(true);
    } catch {
      toast.error('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // ── Helpers derivados ────────────────────────────────────────────────────────

  function alunosNaoEntregaramDe(ativ: AtividadeCoord): AlunoInfo[] {
    const doSerie = todosAlunos.filter(a => a.serie === ativ.serie);
    const entregouIds = new Set(
      submissoes
        .filter(s => s.atividade_id === ativ.id && ['entregue', 'atrasado', 'corrigido'].includes(s.status))
        .map(s => s.aluno_id)
    );
    return doSerie.filter(a => !entregouIds.has(a.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function submissoesDe(atividadeId: string): SubmissaoCoord[] {
    return submissoes.filter(s => s.atividade_id === atividadeId);
  }

  // Submissões filtradas para aba "recebidas"
  const submissoesFiltradas = useMemo(() => {
    return submissoes.filter(s => {
      if (atividadeFiltro && s.atividade_id !== atividadeFiltro) return false;
      if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false;
      if (buscaAluno && !s.aluno_nome.toLowerCase().includes(buscaAluno.toLowerCase())) return false;
      return true;
    });
  }, [submissoes, atividadeFiltro, filtroStatus, buscaAluno]);

  const limparFiltros = () => {
    setFiltroProfessor('todos'); setFiltroSerie('todas');
    setDataInicio(mesAtual.inicio); setDataFim(mesAtual.fim);
    setFiltroAplicado(false); setAtividades([]); setSubmissoes([]);
    setExpandida(null); setAtividadeFiltro(null);
    setBuscaAluno(''); setFiltroStatus('todos');
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Tabs ── */}
      <div className="flex border-b border-border overflow-x-auto">
        {(['enviadas', 'recebidas'] as Aba[]).map(tab => (
          <button
            key={tab}
            onClick={() => setTabAtiva(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              tabAtiva === tab
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'enviadas' ? <BookOpen className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {tab === 'enviadas' ? 'Atividades Enviadas' : 'Atividades Recebidas'}
            {filtroAplicado && tab === 'enviadas' && atividades.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{atividades.length}</Badge>
            )}
            {filtroAplicado && tab === 'recebidas' && submissoes.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{submissoes.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── Filtros ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Filter className="w-4 h-4 text-blue-600" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Professor */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Professor</Label>
              <Select value={filtroProfessor} onValueChange={setFiltroProfessor}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Professores</SelectItem>
                  {professores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Série */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Série / Turma</Label>
              <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Séries</SelectItem>
                  {seriesDisponiveis.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data início */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Prazo — De</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>

            {/* Data fim */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Prazo — Até</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>

            {/* Botões */}
            <div className="flex items-end gap-2">
              <Button
                onClick={carregarDados}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Buscando...</>
                  : <><Search className="w-4 h-4 mr-1.5" />Buscar</>}
              </Button>
              {filtroAplicado && (
                <Button variant="outline" onClick={limparFiltros} title="Limpar filtros">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {!filtroAplicado && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Por padrão exibe o mês atual ({fmt(mesAtual.inicio)} a {fmt(mesAtual.fim)}). Ajuste os filtros e clique em <strong>Buscar</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════ ABA ENVIADAS ═══════════════════════ */}
      {tabAtiva === 'enviadas' && filtroAplicado && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : atividades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border">
              <FileText className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
              <p className="font-medium text-muted-foreground">Nenhuma atividade encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros e tente novamente.</p>
            </div>
          ) : (
            atividades.map(ativ => {
              const tipoStyle = getTipoStyle(ativ.tipo);
              const pct       = ativ.totalAlunos > 0 ? Math.round((ativ.entregues / ativ.totalAlunos) * 100) : 0;
              const aberta    = expandida === ativ.id;
              const subsAtiv  = submissoesDe(ativ.id);
              const naoEntr   = alunosNaoEntregaramDe(ativ);
              const vencida   = new Date(ativ.data_entrega) < new Date();

              return (
                <Card key={ativ.id} className={`transition-shadow ${aberta ? 'shadow-md' : 'hover:shadow-sm'}`}>
                  <CardContent className="p-5">

                    {/* ── Linha principal ── */}
                    <div className="flex flex-col md:flex-row md:items-start gap-4">

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-2">

                        {/* Título + badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground text-base leading-snug">{ativ.titulo}</h3>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: tipoStyle.bg, color: tipoStyle.text }}
                          >
                            {tipoStyle.label}
                          </span>
                          {ativ.status === 'ativa' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                              Ativa
                            </span>
                          )}
                          {vencida && ativ.status !== 'encerrada' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">
                              Prazo vencido
                            </span>
                          )}
                        </div>

                        {/* Professor + disciplina + série */}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span className="font-medium text-foreground">{ativ.professor_nome}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" /> {ativ.disciplina}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> {ativ.serie}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Prazo: {fmtHora(ativ.data_entrega)}
                          </span>
                        </div>

                        {/* Stats chips */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                            <Send className="w-3 h-3" /> {ativ.entregues}/{ativ.totalAlunos} entregaram
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                            <CheckCircle className="w-3 h-3" /> {ativ.corrigidas} corrigidas
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200">
                            <MessageSquare className="w-3 h-3" /> {ativ.comFeedback} com feedback
                          </span>
                          {ativ.naoEntregaram > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                              <AlertCircle className="w-3 h-3" /> {ativ.naoEntregaram} não entregaram
                            </span>
                          )}
                        </div>

                        {/* Barra de progresso */}
                        {ativ.totalAlunos > 0 && (
                          <div className="pt-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Progresso das entregas</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{pct}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: pct === 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#ef4444',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botão expandir */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {ativ.arquivo_url && (
                          <Button variant="outline" size="sm"
                            onClick={() => window.open(ativ.arquivo_url, '_blank')} title="Baixar arquivo">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setExpandida(aberta ? null : ativ.id)}
                          className="gap-1.5"
                        >
                          {aberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {aberta ? 'Fechar' : 'Detalhes'}
                        </Button>
                      </div>
                    </div>

                    {/* ── Detalhes expandidos ── */}
                    {aberta && (
                      <div className="mt-5 pt-4 border-t border-border space-y-4">

                        {/* Submissões recebidas */}
                        {subsAtiv.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Entregas recebidas ({subsAtiv.length})
                            </h4>
                            <div className="space-y-2">
                              {subsAtiv.map(sub => {
                                const si = getStatusInfo(sub.status);
                                const SIcon = si.Icon;
                                return (
                                  <div key={sub.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {sub.aluno_nome.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{sub.aluno_nome}</p>
                                        <p className="text-[11px] text-muted-foreground">Enviado: {fmtHora(sub.data_entrega_aluno)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {sub.status === 'corrigido' && sub.nota !== undefined && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                                          Nota: {sub.nota}
                                        </span>
                                      )}
                                      {sub.feedback && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200">
                                          Feedback enviado
                                        </span>
                                      )}
                                      <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${si.bgCls} ${si.textCls} ${si.borderCls}`}>
                                        <SIcon className="w-3 h-3" /> {si.label}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Alunos que NÃO entregaram */}
                        {naoEntr.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              Não entregaram ({naoEntr.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {naoEntr.map(al => (
                                <span key={al.id}
                                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                                  <User className="w-3 h-3" /> {al.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {subsAtiv.length === 0 && naoEntr.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhuma entrega registrada para esta atividade.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ═══════════════════════ ABA RECEBIDAS ═══════════════════════ */}
      {tabAtiva === 'recebidas' && filtroAplicado && (
        <div className="space-y-4">

          {/* Atividades (para filtro rápido) */}
          {atividades.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrar por atividade
                  <Badge variant="secondary">{atividades.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {atividades.map(ativ => {
                      const selecionada = atividadeFiltro === ativ.id;
                      return (
                        <button
                          key={ativ.id}
                          onClick={() => setAtividadeFiltro(selecionada ? null : ativ.id)}
                          className={`text-left rounded-lg border-2 p-3 transition-all ${
                            selecionada
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                              : 'border-border hover:border-blue-300 bg-card'
                          }`}
                        >
                          <p className="text-xs font-semibold text-foreground line-clamp-1 mb-0.5">{ativ.titulo}</p>
                          <p className="text-[11px] text-muted-foreground mb-1">
                            {ativ.professor_nome} · {ativ.disciplina} · {ativ.serie}
                          </p>
                          <div className="flex gap-2 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                              {ativ.entregues} entregues
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                              {ativ.corrigidas} corrigidas
                            </span>
                            {ativ.naoEntregaram > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                                {ativ.naoEntregaram} pendentes
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Filtros de submissão */}
          {submissoes.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno..."
                      value={buscaAluno}
                      onChange={e => setBuscaAluno(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Status</SelectItem>
                      <SelectItem value="entregue">Aguardando Correção</SelectItem>
                      <SelectItem value="atrasado">Entregue com Atraso</SelectItem>
                      <SelectItem value="corrigido">Corrigido</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => { setFiltroStatus('todos'); setBuscaAluno(''); setAtividadeFiltro(null); }}>
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de submissões */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2">
                Entregas dos Alunos
                <Badge variant="secondary">{submissoesFiltradas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : submissoesFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-3" />
                  <p className="font-medium text-foreground mb-1">Nenhuma entrega encontrada</p>
                  <p className="text-sm text-muted-foreground">
                    {submissoes.length === 0
                      ? 'Ainda não há entregas para as atividades encontradas.'
                      : 'Nenhuma entrega corresponde aos filtros aplicados.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissoesFiltradas.map(sub => {
                    const si    = getStatusInfo(sub.status);
                    const SIcon = si.Icon;
                    const tipo  = getTipoStyle(sub.tipo);
                    return (
                      <div key={sub.id}
                        className="rounded-lg border border-border bg-card hover:shadow-sm transition-shadow p-4">
                        <div className="flex flex-col md:flex-row md:items-start gap-3">

                          {/* Avatar */}
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                            {sub.aluno_nome.charAt(0)}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="font-semibold text-foreground">{sub.aluno_nome}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1">{sub.atividade_titulo}</p>
                                <div className="flex flex-wrap gap-2 mt-0.5">
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" /> {sub.professor_nome}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">·</span>
                                  <span className="text-[11px] text-muted-foreground">{sub.serie} · {sub.disciplina}</span>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: tipo.bg, color: tipo.text }}
                                  >
                                    {tipo.label}
                                  </span>
                                </div>
                              </div>
                              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit flex-shrink-0 ${si.bgCls} ${si.textCls} ${si.borderCls}`}>
                                <SIcon className="w-3.5 h-3.5" /> {si.label}
                              </span>
                            </div>

                            {/* Arquivo */}
                            {sub.arquivo_url && (
                              <div className="flex items-center gap-3 p-2.5 bg-muted rounded-lg mb-2 border border-border">
                                <div className="w-7 h-7 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                </div>
                                <p className="text-xs text-foreground flex-1 truncate">{sub.arquivo_nome || 'Arquivo Anexado'}</p>
                                <Button variant="outline" size="sm"
                                  onClick={() => window.open(sub.arquivo_url, '_blank')} className="gap-1.5">
                                  <Download className="w-3.5 h-3.5" /> Baixar
                                </Button>
                              </div>
                            )}

                            {/* Feedback */}
                            {sub.feedback && (
                              <div className="p-2.5 rounded-lg mb-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-200">
                                <strong>Feedback do professor:</strong> {sub.feedback}
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Enviado: {fmtHora(sub.data_entrega_aluno)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Prazo: {fmt(sub.prazo)}
                                </span>
                              </div>
                              {sub.status === 'corrigido' && sub.nota !== undefined && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                                  Nota: {sub.nota}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Estado vazio inicial ── */}
      {!filtroAplicado && !loading && (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <p className="font-medium text-muted-foreground">Selecione os filtros e clique em Buscar</p>
          <p className="text-sm text-muted-foreground mt-1">
            {tabAtiva === 'enviadas'
              ? 'Visualize as atividades criadas pelos professores do seu segmento.'
              : 'Visualize as entregas dos alunos e o status das correções.'}
          </p>
        </div>
      )}
    </div>
  );
}
