// src/components/AgendaProfessor.tsx
/**
 * Componente para o professor gerenciar a agenda de sua disciplina.
 * Permite criar, editar e excluir eventos da agenda, com base no layout do Figma.
 *
 * @prop {() => void} onVoltar - Função para retornar à tela anterior.
 * @prop {DisciplinaProps} disciplina - Objeto da disciplina selecionada.
 * @prop {SerieProps} serie - Objeto da série selecionada.
 * @prop {TurmaProps | null} turma - Objeto da turma selecionada (pode ser null ou "Única").
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toast } from 'sonner'; // Usando sonner para toasts
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  BookOpen,
  Home,
  Plus,
  Edit2,
  Trash2,
  Send,
  Clock,
  Info, // Ícone para informações adicionais
} from 'lucide-react';

interface DisciplinaProps {
  id: string;
  nome: string;
  cor?: string;
}

interface SerieProps {
  id: string;
  nome: string;
}

interface TurmaProps {
  id: string;
  nome: string;
}

interface AgendaItem {
  id: string;
  titulo_unidade: string; // Mapeado para 'titulo' do Figma
  conteudo_sala: string | null; // Mapeado para 'emSala' do Figma
  atividade_casa: string | null; // Mapeado para 'paraCasa' do Figma
  observacao: string | null; // Mapeado para 'observacao' do Figma
  data_aula: string; // Nova coluna para o dia da aula
  data_entrega: string | null; // Prazo de entrega da atividade (opcional)
  disciplina_id: string;
  professor_id: string;
  serie: string; // Nome da série
  turma: string | null; // Nome da turma (pode ser null para "turma única")
  criado_em: string;
  professor?: { nome: string };
  disciplina?: { nome: string };
}

interface AgendaProfessorProps {
  onVoltar: () => void;
  disciplina: DisciplinaProps;
  serie: SerieProps;
  turma: TurmaProps;
}

export function AgendaProfessor({ disciplina, serie, turma, onVoltar }: AgendaProfessorProps) {
  const { usuario } = useAuth();

  const nomeSerie = serie?.nome ?? "";
  const nomeTurma = turma?.nome ?? "";

  const [carregando, setCarregando] = useState(true);
  const [eventosAgenda, setEventosAgenda] = useState<AgendaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Estados do formulário
  const [modoEdicao, setModoEdicao] = useState<AgendaItem | null>(null);
  const [tituloUnidade, setTituloUnidade] = useState("");
  const [conteudoSala, setConteudoSala] = useState("");
  const [atividadeCasa, setAtividadeCasa] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dataEntrega, setDataEntrega] = useState(""); // Campo opcional

  // Filtro de data para a lista de agendas (agora é o "Dia da Aula")
  const [dataFiltroLista, setDataFiltroLista] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Função utilitária para formatar datas
  const formatarDataBR = (dataString: string | null) => {
    if (!dataString) return 'N/A';
    try {
      const date = new Date(dataString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      console.error("Erro ao formatar data:", e);
      return dataString; // Retorna a string original em caso de erro
    }
  };

  const carregarEventos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      if (!usuario?.id || !disciplina?.id || !nomeSerie) {
        setErro("Dados essenciais (usuário, disciplina ou série) não disponíveis.");
        setCarregando(false);
        return;
      }

      console.log(`🔍 Carregando eventos da agenda com: {disciplinaId: '${disciplina.id}', serieNome: '${serie.nome}', turmaNome: '${turma.nome}', dataAula: '${dataFiltroLista}'}`);

      const { data, error } = await supabase
        .from("agenda_professor")
        .select(
          `
          id,
          titulo_unidade,
          conteudo_sala,
          atividade_casa,
          observacao,
          data_aula,
          data_entrega,
          disciplina_id,
          professor_id,
          serie,
          turma,
          criado_em
        `
        )
        .eq("professor_id", usuario.id) // Professor só vê suas próprias agendas
        .eq("disciplina_id", disciplina.id)
        .eq("serie", nomeSerie)
        .eq("data_aula", dataFiltroLista) // FILTRA PELA NOVA COLUNA data_aula
        .or(`turma.is.null,turma.eq.,turma.eq.${nomeTurma}`) // Filtro robusto para turma
        .order("data_aula", { ascending: false });

      if (error) {
        console.error("Erro ao carregar agenda:", error);
        setErro(`Falha ao carregar agenda: ${error.message}`);
        setEventosAgenda([]);
      } else {
        setEventosAgenda(data || []);
      }
    } catch (err) {
      console.error("Erro inesperado ao carregar agenda:", err);
      setErro("Ocorreu um erro inesperado ao carregar a agenda.");
      setEventosAgenda([]);
    } finally {
      setCarregando(false);
    }
  }, [usuario?.id, disciplina?.id, serie?.nome, turma?.nome, dataFiltroLista]);

  useEffect(() => {
    carregarEventos();
  }, [carregarEventos]);

  // Função para iniciar a edição
  const iniciarEdicao = (evento: AgendaItem) => {
    // Verifica se a agenda é do dia atual para permitir edição
    const hoje = new Date().toISOString().split('T')[0];
    if (evento.data_aula !== hoje) {
      toast.info("Você só pode editar a agenda do dia atual.");
      return;
    }
    setModoEdicao(evento);
    setTituloUnidade(evento.titulo_unidade);
    setConteudoSala(evento.conteudo_sala || '');
    setAtividadeCasa(evento.atividade_casa || '');
    setObservacao(evento.observacao || '');
    setDataEntrega(evento.data_entrega || '');
  };

  // Função para cancelar a edição
  const handleCancelarEdicao = () => {
    setModoEdicao(null);
    resetForm();
  };

  // Função para resetar o formulário
  const resetForm = () => {
    setTituloUnidade('');
    setConteudoSala('');
    setAtividadeCasa('');
    setObservacao('');
    setDataEntrega('');
  };

  // Função para enviar ou atualizar a agenda
  const handleEnviarAgenda = async () => {
    if (!tituloUnidade.trim() || !conteudoSala.trim() || !atividadeCasa.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios (Título da Unidade, Conteúdo em Sala, Atividade Para Casa).");
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      const agendaData = {
        titulo_unidade: tituloUnidade.trim(),
        conteudo_sala: conteudoSala.trim(),
        atividade_casa: atividadeCasa.trim(),
        observacao: observacao.trim() || null,
        data_entrega: dataEntrega || null, // Garante que seja null se vazio
        disciplina_id: disciplina.id,
        professor_id: usuario?.id,
        serie: nomeSerie,
        turma: nomeTurma && nomeTurma !== "Única" ? nomeTurma : null, // Salva null se for "Única" ou vazio
        data_aula: new Date().toISOString().split('T')[0], // Data da aula é sempre a data atual ao enviar
      };

      if (modoEdicao) {
        // Modo Edição
        const { error } = await supabase
          .from("agenda_professor")
          .update(agendaData)
          .eq("id", modoEdicao.id);

        if (error) throw error;
        toast.success("Agenda atualizada com sucesso!");
      } else {
        // Modo Criação
        const { error } = await supabase
          .from("agenda_professor")
          .insert([agendaData]);

        if (error) throw error;
        toast.success("Agenda enviada com sucesso!");
      }

      resetForm();
      setModoEdicao(null);
      carregarEventos(); // Recarrega a lista para mostrar a atualização
    } catch (err: any) {
      console.error("Erro ao enviar/atualizar agenda:", err);
      setErro(`Falha ao enviar/atualizar agenda: ${err.message || err.toString()}`);
      toast.error(`Erro: ${err.message || "Não foi possível enviar/atualizar a agenda."}`);
    } finally {
      setEnviando(false);
    }
  };

  // Função para apagar a agenda
  const handleApagarAgenda = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar esta agenda? Esta ação é irreversível.")) {
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase
        .from("agenda_professor")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Agenda apagada com sucesso!");
      carregarEventos();
    } catch (err: any) {
      console.error("Erro ao apagar agenda:", err);
      setErro(`Falha ao apagar agenda: ${err.message || err.toString()}`);
      toast.error(`Erro: ${err.message || "Não foi possível apagar a agenda."}`);
    } finally {
      setEnviando(false);
    }
  };

  // Verifica se já existe uma agenda para o dia atual
  const agendaDoDiaAtual = eventosAgenda.find(
    (agenda) => agenda.data_aula === new Date().toISOString().split('T')[0]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={onVoltar} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-blue-600">
          <ArrowLeft className="w-4 h-4" /> Voltar para a Seleção
        </Button>

        <div className="space-y-8">
          {/* Cabeçalho da Agenda */}
          <Card className="shadow-md border-none">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg p-6">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <Calendar className="w-7 h-7" />
                Agenda da Turma
              </CardTitle>
              <p className="text-blue-100 text-sm mt-1">
                Disciplina: {disciplina.nome} | Série: {serie.nome} | Turma: {turma.nome}
              </p>
            </CardHeader>
            <CardContent className="p-6 bg-white rounded-b-lg">
              {/* Formulário de Criar/Editar Agenda */}
              {modoEdicao || !agendaDoDiaAtual ? ( // Mostra o formulário se estiver editando ou se não houver agenda para hoje
                <Card className="border-l-4 border-blue-600 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
                      <Send className="w-6 h-6 text-blue-600" />
                      {modoEdicao ? 'Editar Agenda do Dia' : 'Criar Agenda do Dia'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Esta agenda será enviada para todos os alunos da turma {serie.nome} {turma.nome} na disciplina de {disciplina.nome}.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    {/* Título da Unidade */}
                    <div className="space-y-2">
                      <Label htmlFor="tituloUnidade" className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        Título da Unidade <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="tituloUnidade"
                        value={tituloUnidade}
                        onChange={(e) => setTituloUnidade(e.target.value)}
                        placeholder="Ex: Unidade 5 - Funções Quadráticas"
                        className="w-full"
                      />
                    </div>

                    {/* Conteúdo Trabalhado em Sala */}
                    <div className="space-y-2">
                      <Label htmlFor="conteudoSala" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <BookOpen className="w-4 h-4 text-green-600" />
                        Conteúdo Trabalhado em Sala <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="conteudoSala"
                        value={conteudoSala}
                        onChange={(e) => setConteudoSala(e.target.value)}
                        placeholder="Descreva o que foi ensinado em sala de aula..."
                        rows={4}
                        className="w-full"
                      />
                    </div>

                    {/* Atividade Para Casa */}
                    <div className="space-y-2">
                      <Label htmlFor="atividadeCasa" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Home className="w-4 h-4 text-amber-600" />
                        Atividade Para Casa <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="atividadeCasa"
                        value={atividadeCasa}
                        onChange={(e) => setAtividadeCasa(e.target.value)}
                        placeholder="Descreva a atividade que os alunos devem fazer em casa..."
                        rows={4}
                        className="w-full"
                      />
                    </div>

                    {/* Data de Entrega */}
                    <div className="space-y-2">
                      <Label htmlFor="dataEntrega" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Data de Entrega (Opcional)
                      </Label>
                      <Input
                        id="dataEntrega"
                        type="date"
                        value={dataEntrega}
                        onChange={(e) => setDataEntrega(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        Deixe em branco se não houver prazo específico.
                      </p>
                    </div>

                    {/* Observação */}
                    <div className="space-y-2">
                      <Label htmlFor="observacao" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <AlertCircle className="w-4 h-4 text-purple-600" />
                        Observação (Opcional)
                      </Label>
                      <Textarea
                        id="observacao"
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        placeholder="Observações adicionais, lembretes, materiais necessários..."
                        rows={3}
                        className="w-full"
                      />
                    </div>

                    {/* Botões */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        <span className="text-red-500">*</span> Campos obrigatórios
                      </p>
                      <div className="flex gap-2">
                        {modoEdicao && (
                          <Button
                            variant="outline"
                            onClick={handleCancelarEdicao}
                            disabled={enviando}
                          >
                            Cancelar
                          </Button>
                        )}
                        <Button
                          onClick={handleEnviarAgenda}
                          disabled={enviando || !tituloUnidade || !conteudoSala || !atividadeCasa}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {enviando ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              {modoEdicao ? 'Atualizar Agenda' : 'Enviar Agenda'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // Visualização da agenda do dia atual (se existir e não estiver editando)
                <Card className="border-l-4 border-blue-600 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
                        <Calendar className="w-6 h-6 text-blue-600" />
                        Agenda do Dia: {formatarDataBR(agendaDoDiaAtual?.data_aula || '')}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => iniciarEdicao(agendaDoDiaAtual!)}
                          className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 border-blue-300"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApagarAgenda(agendaDoDiaAtual!.id)}
                          className="flex items-center gap-2 text-red-600 hover:bg-red-50 border-red-300"
                        >
                          <Trash2 className="w-4 h-4" /> Apagar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{agendaDoDiaAtual?.titulo_unidade}</h3>
                    </div>

                    {/* Conteúdo em Sala */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-green-700" />
                        <h4 className="font-semibold text-green-900">Em Sala:</h4>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {agendaDoDiaAtual?.conteudo_sala}
                      </p>
                    </div>

                    {/* Atividade Para Casa */}
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="w-5 h-5 text-amber-700" />
                        <h4 className="font-semibold text-amber-900">Para Casa:</h4>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {agendaDoDiaAtual?.atividade_casa}
                      </p>
                    </div>

                    {/* Data de Entrega */}
                    {agendaDoDiaAtual?.data_entrega && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-700" />
                          <h4 className="font-semibold text-blue-900">Data de Entrega:</h4>
                          <span className="text-blue-700">{formatarDataBR(agendaDoDiaAtual.data_entrega)}</span>
                        </div>
                      </div>
                    )}

                    {/* Observação */}
                    {agendaDoDiaAtual?.observacao && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-purple-700" />
                          <h4 className="font-semibold text-purple-900">Observação:</h4>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                          {agendaDoDiaAtual.observacao}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Informações Adicionais e Filtro de Data para Visualização */}
              <div className="mt-8 space-y-6">
                <Card className="bg-blue-50 border-blue-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">Sobre a Agenda Diária:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                          <li>A agenda deve ser enviada ao final de cada aula.</li>
                          <li>Os alunos receberão notificação assim que a agenda for publicada.</li>
                          <li>Você só pode editar ou apagar a agenda do dia atual.</li>
                          <li>Use o filtro de data abaixo para consultar agendas anteriores (somente visualização).</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Filtro de Data para Visualização de Agendas Anteriores */}
                <Card className="shadow-sm">
                  <CardContent className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        Selecione uma data para visualizar a agenda de um dia específico.
                      </p>
                      <p className="text-xs text-gray-500">
                        Na data selecionada ({formatarDataBR(dataFiltroLista)}) há{" "}
                        <strong>{eventosAgenda.length}</strong>{" "}
                        {eventosAgenda.length === 1 ? "evento" : "eventos"} registrado(s).
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <Label htmlFor="filtro-data-lista" className="text-xs font-medium text-gray-600">
                        Dia da Aula
                      </Label>
                      <Input
                        id="filtro-data-lista"
                        type="date"
                        value={dataFiltroLista}
                        onChange={(e) => {
                          setDataFiltroLista(e.target.value);
                          setModoEdicao(null); // Sai do modo edição ao mudar a data
                          resetForm(); // Limpa o formulário
                        }}
                        className="w-48"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* LISTA DE EVENTOS DA AGENDA (para datas anteriores) */}
              {dataFiltroLista !== new Date().toISOString().split('T')[0] && ( // Só mostra a lista se não for o dia atual
                <div className="mt-8 space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">Agendas Anteriores</h2>
                  {carregando ? (
                    <div className="flex items-center justify-center p-6 bg-white rounded-lg shadow-sm">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-600">Carregando agenda...</span>
                    </div>
                  ) : erro ? (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4 flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                        <div>
                          <h3 className="font-semibold text-red-900 mb-1">Erro ao carregar agenda</h3>
                          <p className="text-sm text-red-700 mb-3">{erro}</p>
                          <Button variant="outline" size="sm" onClick={carregarEventos}>
                            Tentar novamente
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : eventosAgenda.length === 0 ? (
                    <Card className="bg-white shadow-sm">
                      <CardContent className="p-8 text-center text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          Nenhum evento agendado para {formatarDataBR(dataFiltroLista)}
                        </h3>
                        <p className="text-sm">
                          Não há eventos registrados para esta data, série e disciplina.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {eventosAgenda.map((evento) => (
                        <Card key={evento.id} className="border-l-4 border-l-blue-500 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-base mb-2">{evento.titulo_unidade}</h3>
                                <p className="text-xs text-gray-500 mb-1">
                                  **Conteúdo em Sala:** {evento.conteudo_sala}
                                </p>
                                <p className="text-xs text-gray-500 mb-1">
                                  **Atividade para Casa:** {evento.atividade_casa}
                                </p>
                                {evento.observacao && (
                                  <p className="text-xs text-gray-600 mt-2">
                                    **Observação:** {evento.observacao}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                                  <Calendar className="w-3 h-3" />
                                  <span>Dia da Aula: {formatarDataBR(evento.data_aula)}</span>
                                  {evento.data_entrega && (
                                    <>
                                      <Clock className="w-3 h-3 ml-2" />
                                      <span>Prazo: {formatarDataBR(evento.data_entrega)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {/* Botões de edição/exclusão não aparecem para agendas anteriores */}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
