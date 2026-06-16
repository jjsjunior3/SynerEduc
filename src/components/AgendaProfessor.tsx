// src/components/AgendaProfessor.tsx
import { useState, useEffect, useCallback } from 'react';
import { AssistenteVoz } from './ai/AssistenteVoz';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSegmento } from '../hooks/useSegmento';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Loader2, AlertCircle, Calendar, BookOpen, Home,
  Plus, Edit2, Trash2, Send, Clock, Info, Lock,
  MessageSquare, X, UserRound,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface DisciplinaProps { id: string; nome: string; cor?: string; }
interface SerieProps { id: string; nome: string; }
interface TurmaProps { id: string; nome: string; }

interface AgendaItem {
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
  status?: string;
}

interface MensagemPrivada {
  alunoId: string;
  alunoNome: string;
  mensagem: string;
}

interface AlunoItem { id: string; nome: string; }

interface AgendaProfessorProps {
  onVoltar: () => void;
  disciplina: DisciplinaProps;
  serie: SerieProps;
  turma: TurmaProps;
}

const hoje = () => new Date().toISOString().split('T')[0];

export function AgendaProfessor({ disciplina, serie, turma, onVoltar }: AgendaProfessorProps) {
  const { usuario } = useAuth();
  const { segmento } = useSegmento();
  const nomeSerie = serie?.nome ?? '';
  const nomeTurma = turma?.nome ?? '';

  const [carregando, setCarregando] = useState(true);
  const [eventosAgenda, setEventosAgenda] = useState<AgendaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [modoEdicao, setModoEdicao] = useState<AgendaItem | null>(null);
  const [tituloUnidade, setTituloUnidade] = useState('');
  const [conteudoSala, setConteudoSala] = useState('');
  const [atividadeCasa, setAtividadeCasa] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [dataFiltroLista, setDataFiltroLista] = useState(hoje());
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null);

  // Mensagens privadas
  const [alunos, setAlunos] = useState<AlunoItem[]>([]);
  const [mensagensPrivadas, setMensagensPrivadas] = useState<MensagemPrivada[]>([]);

  const formatarDataBR = (d: string | null) => {
    if (!d) return 'N/A';
    try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }); }
    catch { return d; }
  };

  const isPast = dataFiltroLista < hoje();
  const isFuture = dataFiltroLista > hoje();
  const agendaDoDia = eventosAgenda.find((a) => a.data_aula === dataFiltroLista);

  const resetForm = () => {
    setTituloUnidade(''); setConteudoSala(''); setAtividadeCasa('');
    setObservacao(''); setDataEntrega(''); setMensagensPrivadas([]);
  };

  // Carrega alunos da turma para mensagens privadas
  useEffect(() => {
    if (!nomeSerie || !usuario?.id) return;
    supabase
      .from('users')
      .select('id, nome')
      .eq('tipo', 'aluno')
      .eq('serie', nomeSerie)
      .eq('segmento', segmento)
      .eq('status', 'ativo')
      .order('nome')
      .then(({ data }) => setAlunos(data || []));
  }, [nomeSerie, segmento, usuario?.id]);

  const carregarEventos = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id || !nomeSerie) return;
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from('agenda_professor')
        .select('id,titulo_unidade,conteudo_sala,atividade_casa,observacao,data_aula,data_entrega,disciplina_id,professor_id,serie,turma,criado_em,status')
        .eq('professor_id', usuario.id)
        .eq('disciplina_id', disciplina.id)
        .eq('serie', nomeSerie)
        .eq('segmento', segmento)
        .eq('data_aula', dataFiltroLista)
        .or(`turma.is.null,turma.eq.,turma.eq.${nomeTurma}`)
        .order('data_aula', { ascending: false });

      if (error) throw error;
      setEventosAgenda(data || []);
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar agenda.');
      setEventosAgenda([]);
    } finally {
      setCarregando(false);
    }
  }, [usuario?.id, disciplina?.id, nomeSerie, nomeTurma, dataFiltroLista, segmento]);

  useEffect(() => { carregarEventos(); }, [carregarEventos]);

  const iniciarEdicao = (evento: AgendaItem) => {
    if (evento.data_aula < hoje()) {
      toast.info('Agendas de dias passados não podem ser editadas.');
      return;
    }
    setModoEdicao(evento);
    setTituloUnidade(evento.titulo_unidade);
    setConteudoSala(evento.conteudo_sala || '');
    setAtividadeCasa(evento.atividade_casa || '');
    setObservacao(evento.observacao || '');
    setDataEntrega(evento.data_entrega || '');
    setMensagensPrivadas([]);
  };

  const handleEnviarAgenda = async () => {
    if (!tituloUnidade.trim() || !conteudoSala.trim() || !atividadeCasa.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setEnviando(true);
    try {
      const status = isFuture ? 'rascunho' : 'pendente';
      const payload = {
        titulo_unidade: tituloUnidade.trim(),
        conteudo_sala: conteudoSala.trim(),
        atividade_casa: atividadeCasa.trim(),
        observacao: observacao.trim() || null,
        data_entrega: dataEntrega || null,
        disciplina_id: disciplina.id,
        professor_id: usuario?.id,
        serie: nomeSerie,
        turma: nomeTurma && nomeTurma !== 'Única' ? nomeTurma : null,
        data_aula: dataFiltroLista,
        segmento,
        status,
      };

      let agendaId: string | null = modoEdicao?.id ?? null;

      const { data: savedData, error } = modoEdicao
        ? await supabase.from('agenda_professor').update(payload).eq('id', modoEdicao.id).select('id').single()
        : await supabase.from('agenda_professor').insert([payload]).select('id').single();

      if (error) throw error;
      agendaId = savedData?.id ?? agendaId;

      // Salva mensagens privadas
      if (agendaId && mensagensPrivadas.length > 0) {
        const mpValidas = mensagensPrivadas.filter(m => m.alunoId && m.mensagem.trim());
        if (mpValidas.length > 0) {
          // Remove mensagens antigas se for edição
          if (modoEdicao) {
            await supabase.from('agenda_mensagens_privadas').delete().eq('agenda_id', agendaId);
          }
          const { error: mpError } = await supabase.from('agenda_mensagens_privadas').insert(
            mpValidas.map(m => ({
              agenda_id: agendaId,
              aluno_id: m.alunoId,
              aluno_nome: m.alunoNome,
              mensagem: m.mensagem.trim(),
            }))
          );
          if (mpError) throw mpError;
        }
      }

      toast.success(
        modoEdicao ? 'Agenda atualizada!' :
        isFuture ? 'Agenda salva como rascunho!' : 'Agenda enviada!'
      );
      resetForm();
      setModoEdicao(null);
      carregarEventos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar agenda.');
    } finally {
      setEnviando(false);
    }
  };

  const pedirConfirmacaoDelete = (evento: AgendaItem) => {
    if (evento.data_aula < hoje()) {
      toast.info('Agendas de dias passados não podem ser excluídas.');
      return;
    }
    setConfirmarDelete(evento.id);
  };

  const confirmarDeletar = async () => {
    if (!confirmarDelete) return;
    setEnviando(true);
    try {
      const { error } = await supabase
        .from('agenda_professor')
        .delete()
        .eq('id', confirmarDelete);
      if (error) throw error;
      toast.success('Agenda apagada!');
      carregarEventos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao apagar.');
    } finally {
      setEnviando(false);
      setConfirmarDelete(null);
    }
  };

  const adicionarMensagemPrivada = () => {
    setMensagensPrivadas(prev => [...prev, { alunoId: '', alunoNome: '', mensagem: '' }]);
  };

  const atualizarMensagemPrivada = (idx: number, campo: keyof MensagemPrivada, valor: string) => {
    setMensagensPrivadas(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      if (campo === 'alunoId') {
        const aluno = alunos.find(a => a.id === valor);
        return { ...m, alunoId: valor, alunoNome: aluno?.nome ?? '' };
      }
      return { ...m, [campo]: valor };
    }));
  };

  const removerMensagemPrivada = (idx: number) => {
    setMensagensPrivadas(prev => prev.filter((_, i) => i !== idx));
  };

  const statusBadge = (status?: string) => {
    if (status === 'rascunho') return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700">
        <Clock className="w-3 h-3" /> Rascunho
      </span>
    );
    if (status === 'pendente') return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
        <Clock className="w-3 h-3" /> Aguardando coordenador
      </span>
    );
    if (status === 'enviado') return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700">
        <Send className="w-3 h-3" /> Enviada aos alunos
      </span>
    );
    return null;
  };

  // ── Card colorido reutilizável ──
  const CardColorido = ({
    className, icon: Icon, titulo, conteudo,
  }: {
    className: string; icon: React.ElementType; titulo: string; conteudo: string;
  }) => (
    <div className={`rounded-lg p-4 border ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold">{titulo}</span>
      </div>
      <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">{conteudo}</p>
    </div>
  );

  const formulario = (
    <div className="space-y-6">

      {/* ── Assistente de voz ── */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">🎙️ Preencher pela voz</p>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Fale o título, conteúdo e tarefa de uma vez</p>
        </div>
        <AssistenteVoz
          contexto="agenda"
          labelBotao="Ditar"
          onAgenda={(dados) => {
            if (dados.titulo_unidade) setTituloUnidade(dados.titulo_unidade)
            if (dados.conteudo_sala)  setConteudoSala(dados.conteudo_sala)
            if (dados.atividade_casa) setAtividadeCasa(dados.atividade_casa)
            if (dados.observacao)     setObservacao(dados.observacao)
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tituloUnidade" className="text-foreground font-medium text-sm">
          Título da Unidade <span className="text-red-500">*</span>
        </Label>
        <Input
          id="tituloUnidade"
          value={tituloUnidade}
          onChange={(e) => setTituloUnidade(e.target.value)}
          placeholder="Ex: Unidade 5 – Funções Quadráticas"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="conteudoSala" className="text-foreground font-medium text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-green-600" />
          Conteúdo em Sala <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="conteudoSala"
          value={conteudoSala}
          onChange={(e) => setConteudoSala(e.target.value)}
          placeholder="Descreva o que foi trabalhado em sala..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="atividadeCasa" className="text-foreground font-medium text-sm flex items-center gap-2">
          <Home className="w-4 h-4 text-amber-600" />
          Atividade Para Casa <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="atividadeCasa"
          value={atividadeCasa}
          onChange={(e) => setAtividadeCasa(e.target.value)}
          placeholder="Descreva a atividade para casa..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dataEntrega" className="text-foreground font-medium text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Prazo de Entrega
            <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
          </Label>
          <Input
            id="dataEntrega"
            type="date"
            value={dataEntrega}
            onChange={(e) => setDataEntrega(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacao" className="text-foreground font-medium text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-600" />
            Observação para a turma
            <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
          </Label>
          <Input
            id="observacao"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Lembretes, materiais..."
          />
        </div>
      </div>

      {/* ── Mensagens privadas por aluno ── */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-medium text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Mensagens privadas para alunos
            <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={adicionarMensagemPrivada}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>

        {mensagensPrivadas.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma mensagem privada. Clique em "Adicionar" para enviar uma observação exclusiva para um aluno.
          </p>
        )}

        {mensagensPrivadas.map((mp, idx) => (
          <div key={idx} className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <UserRound className="w-3.5 h-3.5" /> Mensagem privada #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removerMensagemPrivada(idx)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Aluno</Label>
              <select
                value={mp.alunoId}
                onChange={(e) => atualizarMensagemPrivada(idx, 'alunoId', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o aluno...</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mensagem (visível apenas para este aluno)</Label>
              <Textarea
                value={mp.mensagem}
                onChange={(e) => atualizarMensagemPrivada(idx, 'mensagem', e.target.value)}
                placeholder="Ex: Você não trouxe o livro de matemática hoje..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
        <p className="text-xs text-muted-foreground">
          <span className="text-red-500">*</span> Campos obrigatórios
          {isFuture && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              · Será salvo como rascunho (data futura)
            </span>
          )}
        </p>
        <div className="flex gap-3">
          {modoEdicao && (
            <Button variant="outline" onClick={() => { setModoEdicao(null); resetForm(); }} disabled={enviando}>
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleEnviarAgenda}
            disabled={enviando || !tituloUnidade || !conteudoSala || !atividadeCasa}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
              : isFuture
                ? <><Clock className="w-4 h-4" />{modoEdicao ? 'Atualizar Rascunho' : 'Salvar Rascunho'}</>
                : <><Send className="w-4 h-4" />{modoEdicao ? 'Atualizar' : 'Enviar Agenda'}</>
            }
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6">

        {/* Info do contexto */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Disciplina:</span>
          <span className="text-sm font-medium text-foreground">{disciplina.nome}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">Série:</span>
          <span className="text-sm font-medium text-foreground">{nomeSerie}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">Turma:</span>
          <span className="text-sm font-medium text-foreground">{nomeTurma}</span>
        </div>

        {/* ── Seletor de data ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Data da agenda
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isPast
                  ? <span className="flex items-center gap-1 text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Data passada — somente leitura</span>
                  : isFuture
                    ? <span className="text-amber-600 dark:text-amber-400 font-medium">Data futura — será salvo como rascunho até o coordenador autorizar</span>
                    : <span>Hoje — agenda será enviada para aprovação do coordenador</span>
                }
              </p>
              <div className="flex flex-col gap-1">
                <Label htmlFor="filtro-data-lista" className="text-xs text-muted-foreground">Dia da Aula</Label>
                <Input
                  id="filtro-data-lista"
                  type="date"
                  value={dataFiltroLista}
                  onChange={(e) => {
                    setDataFiltroLista(e.target.value);
                    setModoEdicao(null);
                    resetForm();
                  }}
                  className="w-48"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Card principal: formulário ou visualização ── */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-foreground">
                {isPast
                  ? <><Lock className="w-5 h-5 text-muted-foreground" />Agenda de {formatarDataBR(dataFiltroLista)}</>
                  : modoEdicao
                    ? <><Edit2 className="w-5 h-5 text-blue-600" />Editar Agenda — {formatarDataBR(dataFiltroLista)}</>
                    : agendaDoDia
                      ? <><Calendar className="w-5 h-5 text-blue-600" />Agenda de {formatarDataBR(dataFiltroLista)}</>
                      : <><Send className="w-5 h-5 text-blue-600" />Criar Agenda — {formatarDataBR(dataFiltroLista)}</>
                }
              </CardTitle>

              <div className="flex items-center gap-2">
                {agendaDoDia && statusBadge(agendaDoDia.status)}
                {agendaDoDia && !modoEdicao && !isPast && (
                  <>
                    <Button variant="outline" size="sm"
                      onClick={() => iniciarEdicao(agendaDoDia)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    >
                      <Edit2 className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => pedirConfirmacaoDelete(agendaDoDia)}
                      disabled={enviando}
                      className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Apagar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {carregando ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-muted-foreground">Carregando...</span>
              </div>
            ) : erro ? (
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive text-sm mb-1">Erro ao carregar</p>
                  <p className="text-sm text-muted-foreground mb-3">{erro}</p>
                  <Button variant="outline" size="sm" onClick={carregarEventos}>Tentar novamente</Button>
                </div>
              </div>
            ) : agendaDoDia && !modoEdicao ? (
              // ── Visualização ──
              <div className="space-y-4">
                <h3 className="font-semibold text-base text-foreground mb-2">{agendaDoDia.titulo_unidade}</h3>
                {agendaDoDia.conteudo_sala && (
                  <CardColorido
                    className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20"
                    icon={BookOpen} titulo="Conteúdo em Sala"
                    conteudo={agendaDoDia.conteudo_sala}
                  />
                )}
                {agendaDoDia.atividade_casa && (
                  <CardColorido
                    className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20"
                    icon={Home} titulo="Atividade Para Casa"
                    conteudo={agendaDoDia.atividade_casa}
                  />
                )}
                {agendaDoDia.data_entrega && (
                  <div className="rounded-lg p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Prazo de Entrega:</span>
                    <span className="text-xs text-foreground">{formatarDataBR(agendaDoDia.data_entrega)}</span>
                  </div>
                )}
                {agendaDoDia.observacao && (
                  <CardColorido
                    className="border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20"
                    icon={AlertCircle} titulo="Observação para a turma"
                    conteudo={agendaDoDia.observacao}
                  />
                )}
              </div>
            ) : !isPast ? (
              // ── Formulário (hoje ou data futura) ──
              formulario
            ) : (
              // ── Data passada sem agenda ──
              <div className="p-8 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-foreground font-medium text-sm mb-1">Nenhuma agenda para esta data</p>
                <p className="text-muted-foreground text-xs">Não há registros para {formatarDataBR(dataFiltroLista)}.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Informações ── */}
        <div className="rounded-xl p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Sobre a Agenda:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Você pode registrar agendas para dias futuros — elas ficam salvas como <strong>rascunho</strong>.</li>
                <li>Edição e exclusão só são permitidas até o próprio dia (não edita o passado).</li>
                <li>A agenda chega ao aluno somente após o coordenador autorizar o envio.</li>
                <li>Use <strong>mensagens privadas</strong> para observações exclusivas para um aluno.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!confirmarDelete}
        onOpenChange={() => setConfirmarDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta agenda?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">
            Esta ação é irreversível.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDeletar}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
