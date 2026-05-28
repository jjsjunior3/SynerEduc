// src/components/AgendaProfessor.tsx
import { useState, useEffect, useCallback } from 'react';
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
  Plus, Edit2, Trash2, Send, Clock, Info,
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
}

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

  const formatarDataBR = (d: string | null) => {
    if (!d) return 'N/A';
    try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }); }
    catch { return d; }
  };

  const resetForm = () => {
    setTituloUnidade(''); setConteudoSala(''); setAtividadeCasa('');
    setObservacao(''); setDataEntrega('');
  };

  const carregarEventos = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id || !nomeSerie) return;
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from('agenda_professor')
        .select('id,titulo_unidade,conteudo_sala,atividade_casa,observacao,data_aula,data_entrega,disciplina_id,professor_id,serie,turma,criado_em')
        .eq('professor_id', usuario.id)
        .eq('disciplina_id', disciplina.id)
        .eq('serie', nomeSerie)
        .eq('segmento', segmento)           // ← filtro por segmento
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
    if (evento.data_aula !== hoje()) {
      toast.info('Você só pode editar a agenda do dia atual.');
      return;
    }
    setModoEdicao(evento);
    setTituloUnidade(evento.titulo_unidade);
    setConteudoSala(evento.conteudo_sala || '');
    setAtividadeCasa(evento.atividade_casa || '');
    setObservacao(evento.observacao || '');
    setDataEntrega(evento.data_entrega || '');
  };

  const handleEnviarAgenda = async () => {
    if (!tituloUnidade.trim() || !conteudoSala.trim() || !atividadeCasa.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setEnviando(true);
    try {
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
        data_aula: hoje(),
        segmento,                           // ← salva segmento no payload
        status: 'pendente',                 // ← aguarda aprovação da coordenação
      };

      const { error } = modoEdicao
        ? await supabase.from('agenda_professor').update(payload).eq('id', modoEdicao.id)
        : await supabase.from('agenda_professor').insert([payload]);

      if (error) throw error;
      toast.success(modoEdicao ? 'Agenda atualizada!' : 'Agenda enviada!');
      resetForm();
      setModoEdicao(null);
      carregarEventos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar agenda.');
    } finally {
      setEnviando(false);
    }
  };


  const pedirConfirmacaoDelete = (id: string) => {
    setConfirmarDelete(id);
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

  const agendaHoje = eventosAgenda.find((a) => a.data_aula === hoje());
  const ehHoje = dataFiltroLista === hoje();

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

        {/* ── Formulário / Visualização do dia atual ── */}
        {ehHoje && (
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Send className="w-5 h-5 text-blue-600" />
                  {modoEdicao ? 'Editar Agenda de Hoje' : agendaHoje ? `Agenda de Hoje — ${formatarDataBR(hoje())}` : `Criar Agenda — ${formatarDataBR(hoje())}`}
                </CardTitle>
                {agendaHoje && !modoEdicao && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"
                      onClick={() => iniciarEdicao(agendaHoje)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    >
                      <Edit2 className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => pedirConfirmacaoDelete(agendaHoje.id)}
                      disabled={enviando}
                      className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Apagar
                    </Button>
                  </div>
                )}
              </div>
              {!agendaHoje && !modoEdicao && (
                <p className="text-sm text-muted-foreground mt-1">
                  Envie a agenda para os alunos de <strong>{nomeSerie}</strong> — <strong>{disciplina.nome}</strong>.
                </p>
              )}
            </CardHeader>

            <CardContent className="p-6">
              {agendaHoje && !modoEdicao ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base text-foreground mb-2">{agendaHoje.titulo_unidade}</h3>

                  {agendaHoje.conteudo_sala && (
                    <CardColorido
                      className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20"
                      icon={BookOpen} titulo="Conteúdo em Sala"
                      conteudo={agendaHoje.conteudo_sala}
                    />
                  )}
                  {agendaHoje.atividade_casa && (
                    <CardColorido
                      className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20"
                      icon={Home} titulo="Atividade Para Casa"
                      conteudo={agendaHoje.atividade_casa}
                    />
                  )}
                  {agendaHoje.data_entrega && (
                    <div className="rounded-lg p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Prazo de Entrega:</span>
                      <span className="text-xs text-foreground">{formatarDataBR(agendaHoje.data_entrega)}</span>
                    </div>
                  )}
                  {agendaHoje.observacao && (
                    <CardColorido
                      className="border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20"
                      icon={AlertCircle} titulo="Observação"
                      conteudo={agendaHoje.observacao}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
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
                        Observação
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

                  <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-red-500">*</span> Campos obrigatórios
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
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                          : <><Send className="w-4 h-4" />{modoEdicao ? 'Atualizar' : 'Enviar Agenda'}</>
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Filtro de data para consulta ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Consultar agenda por data
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Em {formatarDataBR(dataFiltroLista)} há{' '}
                <strong className="text-foreground">{eventosAgenda.length}</strong>{' '}
                {eventosAgenda.length === 1 ? 'evento' : 'eventos'} registrado(s).
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

        {/* ── Agendas de datas anteriores ── */}
        {!ehHoje && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground">
              Agenda de {formatarDataBR(dataFiltroLista)}
            </h2>

            {carregando ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-muted-foreground">Carregando...</span>
              </div>
            ) : erro ? (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive text-sm mb-1">Erro ao carregar</p>
                    <p className="text-sm text-muted-foreground mb-3">{erro}</p>
                    <Button variant="outline" size="sm" onClick={carregarEventos}>Tentar novamente</Button>
                  </div>
                </CardContent>
              </Card>
            ) : eventosAgenda.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-foreground font-medium text-sm mb-1">Nenhuma agenda para esta data</p>
                  <p className="text-muted-foreground text-xs">Não há registros para {formatarDataBR(dataFiltroLista)}.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {eventosAgenda.map((evento) => (
                  <Card key={evento.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-foreground">{evento.titulo_unidade}</h3>

                      {evento.conteudo_sala && (
                        <CardColorido
                          className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20"
                          icon={BookOpen} titulo="Conteúdo em Sala"
                          conteudo={evento.conteudo_sala}
                        />
                      )}
                      {evento.atividade_casa && (
                        <CardColorido
                          className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20"
                          icon={Home} titulo="Atividade Para Casa"
                          conteudo={evento.atividade_casa}
                        />
                      )}
                      {evento.data_entrega && (
                        <div className="rounded-lg p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Prazo:</span>
                          <span className="text-xs text-foreground">{formatarDataBR(evento.data_entrega)}</span>
                        </div>
                      )}
                      {evento.observacao && (
                        <CardColorido
                          className="border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20"
                          icon={AlertCircle} titulo="Observação"
                          conteudo={evento.observacao}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Informações ── */}
        <div className="rounded-xl p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Sobre a Agenda Diária:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Envie a agenda ao final de cada aula.</li>
                <li>Os alunos receberão a agenda ao acessar a disciplina.</li>
                <li>Edição e exclusão só são permitidas no dia atual.</li>
                <li>Use o filtro de data para consultar registros anteriores.</li>
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