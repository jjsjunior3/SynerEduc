// src/components/AtividadesRecebidas.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import {
  Download, FileText, Calendar, Clock, CheckCircle,
  XCircle, AlertCircle, Search, Loader2, Filter,
  MessageSquare, Send, X, ChevronUp,
} from 'lucide-react';

interface AtividadesRecebidasProps {
  onVoltar: () => void;
}

interface Atividade {
  id: string;
  titulo: string;
  disciplina: string;
  turmas: string;
  serie: string;
  tipo: string;
  data_entrega: string;
  totalEntregues: number;
  totalCorrigidas: number;
  totalPendentes: number;
}

interface Submissao {
  id: string;
  atividade_id: string;
  aluno_id: string;
  status: string;
  nota?: number;
  arquivo_url?: string;
  arquivo_nome?: string;
  data_entrega?: string;
  feedback?: string;
  aluno_nome: string;
  atividade_titulo: string;
  disciplina: string;
  turmas: string;
  serie: string;
  prazo: string;
}

interface ModalCorrecaoState {
  aberto: boolean;
  submissao: Submissao | null;
  feedback: string;
  nota: string;
  salvando: boolean;
}

function getMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

// ← Retorna classes Tailwind com dark: em vez de hex hardcoded
function getStatusClasses(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'entregue':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'text-blue-900 dark:text-blue-200',
        border: 'border-blue-300 dark:border-blue-700',
      };
    case 'atrasado':
      return {
        bg: 'bg-red-100 dark:bg-red-900/40',
        text: 'text-red-900 dark:text-red-200',
        border: 'border-red-300 dark:border-red-700',
      };
    case 'corrigido':
      return {
        bg: 'bg-green-100 dark:bg-green-900/40',
        text: 'text-green-900 dark:text-green-200',
        border: 'border-green-300 dark:border-green-700',
      };
    default:
      return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        border: 'border-border',
      };
  }
}

export function AtividadesRecebidas({ onVoltar }: AtividadesRecebidasProps) {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(false);

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([]);

  const mesAtual = getMesAtual();

  const [filtroSerie, setFiltroSerie] = useState('todas');
  const [dataInicio, setDataInicio] = useState(mesAtual.inicio);
  const [dataFim, setDataFim] = useState(mesAtual.fim);
  const [filtroAplicado, setFiltroAplicado] = useState(false);

  const [atividadeSelecionada, setAtividadeSelecionada] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');

  const [modalCorrecao, setModalCorrecao] = useState<ModalCorrecaoState>({
    aberto: false, submissao: null, feedback: '', nota: '', salvando: false,
  });

  useEffect(() => {
    if (usuario?.id) carregarSeriesDisponiveis();
  }, [usuario?.id]);

  async function carregarSeriesDisponiveis() {
    try {
      const { data } = await supabase
        .from('atividades')
        .select('serie')
        .eq('professor_id', usuario!.id);
      const series = Array.from(new Set((data || []).map((a: any) => a.serie).filter(Boolean)));
      setSeriesDisponiveis(series);
    } catch { /* silencioso */ }
  }

  async function carregarDados() {
    if (!usuario?.id) return;

    if (!dataInicio || !dataFim) {
      toast.error('Selecione as datas de início e fim.');
      return;
    }
    if (dataInicio > dataFim) {
      toast.error('A data de início deve ser anterior à data de fim.');
      return;
    }

    setLoading(true);
    setAtividadeSelecionada(null);
    setSubmissoes([]);
    setAtividades([]);

    try {
      let query = supabase
        .from('atividades')
        .select('*')
        .eq('professor_id', usuario.id)
        .gte('data_entrega', dataInicio)
        .lte('data_entrega', dataFim + 'T23:59:59')
        .order('data_entrega', { ascending: true });

      if (filtroSerie !== 'todas') query = query.eq('serie', filtroSerie);

      const { data: dadosAtividades, error: erroAtiv } = await query;
      if (erroAtiv) throw erroAtiv;

      if (!dadosAtividades || dadosAtividades.length === 0) {
        setLoading(false);
        return;
      }

      const idsAtividades = dadosAtividades.map((a: any) => a.id);

      const { data: dadosSubmissoes, error: erroSub } = await supabase
        .from('atividades_alunos')
        .select('*')
        .in('atividade_id', idsAtividades);
      if (erroSub) throw erroSub;

      const idsAlunos = Array.from(new Set((dadosSubmissoes || []).map((s: any) => s.aluno_id)));
      const { data: dadosAlunos } = idsAlunos.length > 0
        ? await supabase.from('users').select('id, nome').in('id', idsAlunos)
        : { data: [] };

      const listaSubmissoes: Submissao[] = (dadosSubmissoes || []).map((sub: any) => {
        const ativ = dadosAtividades.find((a: any) => a.id === sub.atividade_id);
        const aluno = (dadosAlunos || []).find((u: any) => u.id === sub.aluno_id);
        return {
          ...sub,
          aluno_nome: aluno?.nome || 'Aluno Desconhecido',
          atividade_titulo: ativ?.titulo || '',
          disciplina: ativ?.disciplina || '',
          turmas: ativ?.turmas || '',
          serie: ativ?.serie || '',
          prazo: ativ?.data_entrega || '',
        };
      });

      setSubmissoes(listaSubmissoes);

      const listaAtividades: Atividade[] = dadosAtividades.map((ativ: any) => {
        const subs = listaSubmissoes.filter((s) => s.atividade_id === ativ.id);
        return {
          id: ativ.id,
          titulo: ativ.titulo,
          disciplina: ativ.disciplina,
          turmas: ativ.turmas,
          serie: ativ.serie,
          tipo: ativ.tipo || 'exercicio',
          data_entrega: ativ.data_entrega,
          totalEntregues: subs.filter((s) => s.status === 'entregue' || s.status === 'atrasado').length,
          totalCorrigidas: subs.filter((s) => s.status === 'corrigido').length,
          totalPendentes: subs.filter((s) => !s.status || s.status === 'pendente').length,
        };
      });

      setAtividades(listaAtividades);
    } catch {
      toast.error('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const aplicarFiltro = () => { setFiltroAplicado(true); carregarDados(); };

  const limparFiltros = () => {
    setFiltroSerie('todas');
    setDataInicio(mesAtual.inicio);
    setDataFim(mesAtual.fim);
    setFiltroAplicado(false);
    setAtividades([]);
    setSubmissoes([]);
    setAtividadeSelecionada(null);
    setFiltroStatus('todos');
    setBusca('');
  };

  const abrirCorrecao = (sub: Submissao) => {
    setModalCorrecao({
      aberto: true, submissao: sub,
      feedback: sub.feedback || '',
      nota: sub.nota !== undefined ? String(sub.nota) : '',
      salvando: false,
    });
  };

  const salvarCorrecao = async () => {
    if (!modalCorrecao.submissao) return;
    setModalCorrecao((p) => ({ ...p, salvando: true }));

    try {
      const notaNum = modalCorrecao.nota !== '' ? parseFloat(modalCorrecao.nota) : null;
      if (notaNum !== null && (notaNum < 0 || notaNum > 10)) {
        toast.error('A nota deve ser entre 0 e 10.');
        setModalCorrecao((p) => ({ ...p, salvando: false }));
        return;
      }

      const { error } = await supabase
        .from('atividades_alunos')
        .update({ feedback: modalCorrecao.feedback, nota: notaNum, status: 'corrigido' })
        .eq('id', modalCorrecao.submissao.id);

      if (error) throw error;

      setSubmissoes((prev) =>
        prev.map((s) =>
          s.id === modalCorrecao.submissao!.id
            ? { ...s, feedback: modalCorrecao.feedback, nota: notaNum ?? undefined, status: 'corrigido' }
            : s
        )
      );

      setAtividades((prev) =>
        prev.map((a) => {
          if (a.id !== modalCorrecao.submissao!.atividade_id) return a;
          const subsAtualizadas = submissoes
            .map((s) => s.id === modalCorrecao.submissao!.id ? { ...s, status: 'corrigido' } : s)
            .filter((s) => s.atividade_id === a.id);
          return {
            ...a,
            totalCorrigidas: subsAtualizadas.filter((s) => s.status === 'corrigido').length,
            totalEntregues: subsAtualizadas.filter((s) => s.status === 'entregue' || s.status === 'atrasado').length,
          };
        })
      );

      toast.success('Correção salva com sucesso!');
      setModalCorrecao({ aberto: false, submissao: null, feedback: '', nota: '', salvando: false });
    } catch (err: any) {
      const msg = err?.message || err?.details || 'Erro ao salvar correção.';
      toast.error(`Erro: ${msg}`);
      console.error('[salvarCorrecao]', err);
      setModalCorrecao((p) => ({ ...p, salvando: false }));
    }
  };

  const submissoesFiltradas = submissoes.filter((sub) => {
    if (!['entregue', 'atrasado', 'corrigido'].includes(sub.status)) return false;
    if (atividadeSelecionada && sub.atividade_id !== atividadeSelecionada) return false;
    if (filtroStatus !== 'todos' && sub.status !== filtroStatus) return false;
    if (busca && !sub.aluno_nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'entregue':  return <Clock className="w-3.5 h-3.5" />;
      case 'atrasado':  return <AlertCircle className="w-3.5 h-3.5" />;
      case 'corrigido': return <CheckCircle className="w-3.5 h-3.5" />;
      default:          return <XCircle className="w-3.5 h-3.5" />;
    }
  };

  const getStatusTexto = (status: string) => {
    switch (status) {
      case 'entregue':  return 'Aguardando Correção';
      case 'atrasado':  return 'Entregue com Atraso';
      case 'corrigido': return 'Corrigido';
      default:          return 'Pendente';
    }
  };

  const formatarData = (d?: string) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  const formatarDataHora = (d?: string) =>
    d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="space-y-6">

      {/* ── Filtros ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5 text-blue-600" />
            Filtrar Atividades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground mb-1.5 block text-xs">Série</Label>
              <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                <SelectTrigger><SelectValue placeholder="Todas as séries" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as séries</SelectItem>
                  {seriesDisponiveis.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-muted-foreground mb-1.5 block text-xs">Prazo — De</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>

            <div>
              <Label className="text-muted-foreground mb-1.5 block text-xs">Prazo — Até</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={aplicarFiltro}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Buscando...</>
                  : <><Search className="w-4 h-4 mr-2" />Buscar</>}
              </Button>
              {filtroAplicado && (
                <Button variant="outline" onClick={limparFiltros} title="Limpar filtros">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {!filtroAplicado && (
            <p className="text-xs text-muted-foreground text-center">
              Por padrão mostra o mês atual ({formatarData(mesAtual.inicio)} a {formatarData(mesAtual.fim)}). Ajuste as datas se necessário e clique em <strong>Buscar</strong>.
            </p>
          )}

          {filtroAplicado && !loading && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Exibindo atividades com prazo entre</span>
              <span className="text-xs font-medium text-foreground">{formatarData(dataInicio)}</span>
              <span className="text-xs text-muted-foreground">e</span>
              <span className="text-xs font-medium text-foreground">{formatarData(dataFim)}</span>
              {filtroSerie !== 'todas' && (
                <>
                  <span className="text-xs text-muted-foreground">• Série:</span>
                  <span className="text-xs font-medium text-foreground">{filtroSerie}</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Atividades encontradas ── */}
      {filtroAplicado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              Atividades Encontradas
              <Badge variant="secondary">{atividades.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : atividades.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">Nenhuma atividade encontrada no período selecionado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {atividades.map((ativ) => {
                  const selecionada = atividadeSelecionada === ativ.id;
                  return (
                    <div
                      key={ativ.id}
                      onClick={() => setAtividadeSelecionada(selecionada ? null : ativ.id)}
                      className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        selecionada
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                          : 'border-border hover:border-blue-300 bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-foreground text-sm line-clamp-2 flex-1">
                          {ativ.titulo}
                        </h3>
                        {/* ← dark mode corrigido */}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200">
                          {ativ.tipo}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {ativ.disciplina} • {ativ.serie}
                      </p>

                      {/* Contadores — dark mode corrigido */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center p-2 rounded-md bg-blue-100 dark:bg-blue-900/40">
                          <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">{ativ.totalEntregues}</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400">Entregues</div>
                        </div>
                        <div className="text-center p-2 rounded-md bg-green-100 dark:bg-green-900/40">
                          <div className="font-bold text-green-700 dark:text-green-300 text-sm">{ativ.totalCorrigidas}</div>
                          <div className="text-[10px] text-green-600 dark:text-green-400">Corrigidas</div>
                        </div>
                        <div className="text-center p-2 rounded-md bg-muted">
                          <div className="font-bold text-muted-foreground text-sm">{ativ.totalPendentes}</div>
                          <div className="text-[10px] text-muted-foreground">Pendentes</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Prazo: {formatarData(ativ.data_entrega)}</span>
                      </div>

                      {selecionada && (
                        <p className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1">
                          <ChevronUp className="w-3 h-3" /> Filtrando por esta atividade
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Filtros de submissões ── */}
      {filtroAplicado && submissoes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
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
              <Button variant="outline" onClick={() => { setFiltroStatus('todos'); setBusca(''); setAtividadeSelecionada(null); }}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Lista de Entregas ── */}
      {filtroAplicado && (
        <Card>
          <CardHeader>
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
                <FileText className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-1">Nenhuma entrega encontrada</h3>
                <p className="text-sm text-muted-foreground">
                  {atividadeSelecionada
                    ? 'Nenhum aluno entregou esta atividade ainda.'
                    : 'Use os filtros acima para encontrar entregas específicas.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissoesFiltradas.map((sub) => {
                  const estilo = getStatusClasses(sub.status); // ← classes Tailwind
                  return (
                    <div key={sub.id} className="rounded-lg border border-border bg-card hover:shadow-md transition-shadow p-4">
                      <div className="flex flex-col md:flex-row items-start gap-4">

                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                          {sub.aluno_nome.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-3">
                            <div>
                              <h4 className="font-medium text-foreground">{sub.aluno_nome}</h4>
                              <p className="text-sm text-muted-foreground">{sub.atividade_titulo}</p>
                              <p className="text-xs text-muted-foreground">{sub.serie} • {sub.disciplina}</p>
                            </div>
                            {/* ← badge de status com classes Tailwind */}
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit flex-shrink-0 ${estilo.bg} ${estilo.text} ${estilo.border}`}>
                              {getStatusIcon(sub.status)}
                              {getStatusTexto(sub.status)}
                            </span>
                          </div>

                          {sub.arquivo_url && (
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-3 border border-border">
                              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                                <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </div>
                              <p className="text-sm text-foreground flex-1 truncate">
                                {sub.arquivo_nome || 'Arquivo Anexado'}
                              </p>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => window.open(sub.arquivo_url!, '_blank')}
                                className="gap-2 flex-shrink-0"
                              >
                                <Download className="w-4 h-4" /> Baixar
                              </Button>
                            </div>
                          )}

                          {/* ← feedback existente: dark mode corrigido */}
                          {sub.feedback && (
                            <div className="p-3 rounded-lg mb-3 text-sm bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-200">
                              <strong>Feedback:</strong> {sub.feedback}
                            </div>
                          )}

                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Enviado: {formatarDataHora(sub.data_entrega)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Prazo: {formatarData(sub.prazo)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* ← badge nota: dark mode corrigido */}
                              {sub.status === 'corrigido' && sub.nota !== undefined && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                                  Nota: {sub.nota}
                                </span>
                              )}
                              <Button
                                variant="outline" size="sm"
                                onClick={() => abrirCorrecao(sub)}
                                className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {sub.status === 'corrigido' ? 'Editar Correção' : 'Corrigir'}
                              </Button>
                            </div>
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
      )}

      {/* ── Modal de Correção ── */}
      {modalCorrecao.aberto && modalCorrecao.submissao && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !modalCorrecao.salvando && setModalCorrecao((p) => ({ ...p, aberto: false }))}
          />
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-border shadow-2xl z-10 overflow-hidden"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="flex items-start justify-between p-3 px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {modalCorrecao.submissao.aluno_nome.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground leading-tight">
                    {modalCorrecao.submissao.aluno_nome}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {modalCorrecao.submissao.atividade_titulo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCorrecao((p) => ({ ...p, aberto: false }))}
                disabled={modalCorrecao.salvando}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground flex-shrink-0 ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex items-end gap-4">
                <div className="flex-shrink-0">
                  <Label htmlFor="nota-input" className="text-foreground p-3 font-medium mb-1.5 block text-sm">
                    Nota
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="nota-input"
                      type="number" min="0" max="10" step="0.1"
                      placeholder="0.0"
                      value={modalCorrecao.nota}
                      onChange={(e) => setModalCorrecao((p) => ({ ...p, nota: e.target.value }))}
                      disabled={modalCorrecao.salvando}
                      className="w-28 text-center text-lg font-semibold"
                    />
                    <span className="text-muted-foreground text-sm font-medium">/ 10</span>
                  </div>
                </div>

                {/* ← aviso modal: dark mode corrigido */}
                <div className="flex-1 flex items-center gap-2 p-3 rounded-lg text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Ao salvar, o status será alterado para <strong>Corrigido</strong> automaticamente.</span>
                </div>
              </div>

              <div>
                <Label htmlFor="feedback-input" className="text-foreground p-3 font-medium mb-1.5 block text-sm">
                  Feedback para o aluno
                </Label>
                <textarea
                  id="feedback-input"
                  rows={5}
                  placeholder="Escreva aqui seu comentário sobre a atividade — pontos positivos, o que pode melhorar, orientações..."
                  value={modalCorrecao.feedback}
                  onChange={(e) => setModalCorrecao((p) => ({ ...p, feedback: e.target.value }))}
                  disabled={modalCorrecao.salvando}
                  className="w-full rounded-lg border p-2 border-border bg-background text-foreground text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/30">
              <Button
                variant="outline" className="flex-1"
                onClick={() => setModalCorrecao((p) => ({ ...p, aberto: false }))}
                disabled={modalCorrecao.salvando}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={salvarCorrecao}
                disabled={modalCorrecao.salvando}
              >
                {modalCorrecao.salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Send className="w-4 h-4" />Salvar Correção</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}