// src/components/AgendaAluno.tsx
/**
 * Agenda do Aluno
 * Exibe eventos e compromissos criados pelos professores da série do aluno,
 * filtrados por série e data.
 *
 * O contexto de série e turma é recebido via props do DashboardAluno.
 * A filtragem de dados no Supabase agora considera APENAS a série do aluno,
 * conforme o requisito de que a tabela 'users' não possui coluna 'turma'.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Home,
  Info,
  ListFilter, // ✅ ADICIONADO: Importar ListFilter
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Badge } from './ui/badge'; // ✅ ADICIONADO: Importar Badge para usar a cor da disciplina

// Interfaces atualizadas para refletir as colunas do banco de dados
interface DisciplinaProps {
  id: string; // UUID da disciplina
  nome: string;
  cor?: string; // ✅ Adicionado cor para exibir no badge
}

interface SerieProps {
  id: string; // ID real da série (UUID)
  nome: string; // Nome da série (ex: "7º ano")
}

interface TurmaProps {
  id: string; // ID da turma (UUID)
  nome: string; // Nome da turma (string)
}

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
  serie: string; // Nome da série
  turma: string | null; // Pode ser null ou string vazia
  criado_em: string;
  professor?: { nome: string };
  disciplina?: { nome: string; cor?: string }; // ✅ ATUALIZADO: Inclui cor da disciplina
}

interface AgendaAlunoProps {
  onVoltar: () => void;
  serie: SerieProps;
  turma: TurmaProps;
  disciplinasDoAluno: DisciplinaProps[];
}

export function AgendaAluno({ onVoltar, serie, turma, disciplinasDoAluno }: AgendaAlunoProps) {
  const { usuario } = useAuth();

  const [eventosAgenda, setEventosAgenda] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataFiltro, setDataFiltro] = useState<string>(hojeISO);
  const [disciplinaFiltro, setDisciplinaFiltro] = useState<string>('todas'); // ✅ NOVO: Estado para filtro de disciplina

  // =========================================
  // FUNÇÕES AUXILIARES
  // =========================================
  const formatarDataBR = (dataISO: string) => {
    if (!dataISO) return "Data inválida";
    try {
      return new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
      console.error("Erro ao formatar data:", e);
      return "Data inválida";
    }
  };

  const formatarDataCurta = (dataISO: string) => {
    if (!dataISO) return "Data inválida";
    try {
      return new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC'
      });
    } catch (e) {
      console.error("Erro ao formatar data curta:", e);
      return "Data inválida";
    }
  };

  // =========================================
  // CARREGAR EVENTOS DA AGENDA DO PROFESSOR
  // =========================================
  const carregarEventos = useCallback(async () => {
    if (!usuario?.id || !serie?.nome) {
      setErro("Informações do aluno ou série não disponíveis.");
      setCarregando(false);
      setEventosAgenda([]);
      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      console.log("🔍 Carregando eventos da agenda do aluno com:", {
        serieNome: serie.nome,
        dataAula: dataFiltro,
        disciplinasDoAlunoIds: disciplinasDoAluno.map(d => d.id),
        disciplinaFiltro: disciplinaFiltro,
      });

      let query = supabase
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
          criado_em,
          professor:users(nome),
          disciplina:disciplinas(nome, cor)
        ` // ✅ ATUALIZADO: Buscando 'cor' da disciplina
        )
        .eq("serie", serie.nome)
        .eq("data_aula", dataFiltro); // Filtra pelo "Dia da Aula"

      // Filtra pelas disciplinas que o aluno realmente cursa (se houver)
      if (disciplinasDoAluno.length > 0) {
        query = query.in("disciplina_id", disciplinasDoAluno.map(d => d.id));
      } else {
        // Se o aluno não tem disciplinas, não há eventos para mostrar
        setEventosAgenda([]);
        setCarregando(false);
        return;
      }

      // Aplica filtro de disciplina se selecionado
      if (disciplinaFiltro !== 'todas') {
        query = query.eq("disciplina_id", disciplinaFiltro);
      }

      // ✅ CORRIGIDO: Sintaxe de ordenação para tabelas relacionadas
      const { data, error } = await query
        .order("nome", { foreignTable: "disciplina", ascending: true }) // Ordena pelo nome da disciplina
        .order("criado_em", { ascending: true }); // Ordena por data de criação para eventos da mesma disciplina

      console.log("DEBUG: Data returned from agenda_professor:", data);
      console.log("DEBUG: Error from agenda_professor:", error);

      if (error) throw error;

      setEventosAgenda((data || []) as EventoAgenda[]);
      console.log("✅ Dados da agenda recebidos:", data);
    } catch (e: any) {
      console.error("❌ Erro ao carregar agenda do aluno:", e);
      setErro(e.message || "Erro ao carregar eventos da agenda.");
      setEventosAgenda([]);
    } finally {
      setCarregando(false);
    }
  }, [usuario?.id, serie?.nome, dataFiltro, disciplinasDoAluno, disciplinaFiltro]);

  useEffect(() => {
    carregarEventos();
  }, [carregarEventos]);

  // Agrupar eventos por disciplina para exibição
  const eventosAgrupadosPorDisciplina = eventosAgenda.reduce((acc, evento) => {
    const disciplinaNome = evento.disciplina?.nome || 'Disciplina Desconhecida';
    if (!acc[disciplinaNome]) {
      acc[disciplinaNome] = [];
    }
    acc[disciplinaNome].push(evento);
    return acc;
  }, {} as Record<string, EventoAgenda[]>);

  // =========================================
  // RENDERIZAÇÃO
  // =========================================
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header da Agenda */}
      <div className={`flex items-center gap-4 p-4 bg-blue-600 text-white shadow-sm`}>
        <Button variant="ghost" size="sm" onClick={onVoltar} className="flex items-center gap-2 text-white hover:bg-white/20">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="font-semibold text-lg">Agenda Diária</h1>
          <p className="text-sm opacity-90">
            <span className="font-medium">{serie?.nome || 'Série'}</span>
            {/* ✅ REMOVIDO: Turma não é mais usada para filtragem principal */}
            {/* <span className="mx-1">•</span>
            <span className="text-white/80">
              Turma {turma?.nome || 'Turma'}
            </span> */}
          </p>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {/* Filtro por data */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Filtro por data
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p>
                Selecione uma data para ver os eventos da agenda. Por padrão,
                mostramos os eventos do <strong>Dia da Aula</strong> selecionado.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Na data selecionada ({formatarDataBR(dataFiltro)}) há{" "}
                <strong>{eventosAgenda.length}</strong>{" "}
                {eventosAgenda.length === 1 ? "evento" : "eventos"} registrado(s).
              </p>
            </div>

            <div className="flex flex-col items-start gap-1">
              <Label htmlFor="filtro-data" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Dia da Aula
              </Label>
              <Input
                id="filtro-data"
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="w-48 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Filtro por disciplina */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
              <ListFilter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Filtro por disciplina
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p>
                Selecione uma disciplina para filtrar os eventos.
              </p>
            </div>

            <div className="flex flex-col items-start gap-1">
              <Label htmlFor="filtro-disciplina" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Disciplina
              </Label>
              <select
                id="filtro-disciplina"
                value={disciplinaFiltro}
                onChange={(e) => setDisciplinaFiltro(e.target.value)}
                className="w-48 p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="todas">Todas as Disciplinas</option>
                {disciplinasDoAluno.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Mensagens de estado */}
        {carregando && (
          <div className="flex items-center justify-center p-8 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <p className="text-lg">Carregando agenda...</p>
          </div>
        )}

        {erro && (
          <div className="flex flex-col items-center justify-center p-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-8 h-8 mb-4" />
            <p className="text-lg font-semibold">Erro ao carregar agenda:</p>
            <p className="text-sm text-center">{erro}</p>
            <Button onClick={carregarEventos} className="mt-4 bg-red-500 hover:bg-red-600 text-white">
              Tentar Novamente
            </Button>
          </div>
        )}

        {!carregando && !erro && eventosAgenda.length === 0 && (
          <Card className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <Info className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Nenhum evento encontrado
            </h3>
            <p className="text-sm text-center">
              Não há eventos registrados para a data e filtros selecionados.
            </p>
          </Card>
        )}

        {/* Lista de Eventos Agrupados por Disciplina */}
        {!carregando && !erro && eventosAgenda.length > 0 && (
          <div className="space-y-6">
            {Object.entries(eventosAgrupadosPorDisciplina).map(([disciplinaNome, eventos]) => (
              <div key={disciplinaNome} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4 border-gray-200 dark:border-gray-700">
                  {disciplinaNome}
                </h2>
                {eventos.map((evento) => (
                  <Card key={evento.id} className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {evento.professor?.nome || 'Professor Desconhecido'}
                      </CardTitle>
                      <Badge
                        className="text-[10px] font-medium"
                        style={{
                          backgroundColor: evento.disciplina?.cor || '#6B7280', // Cor da disciplina ou cinza padrão
                          color: '#FFFFFF', // Texto branco para contraste
                        }}
                      >
                        {evento.disciplina?.nome || 'Disciplina'}
                      </Badge>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Título da Unidade */}
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                          {evento.titulo_unidade}
                        </h3>
                      </div>

                      {/* Em Sala */}
                      {evento.conteudo_sala && (
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-green-700 dark:text-green-400" />
                            <h4 className="font-semibold text-green-900 dark:text-green-100">Conteúdo em Sala:</h4>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                            {evento.conteudo_sala}
                          </p>
                        </div>
                      )}

                      {/* Para Casa */}
                      {evento.atividade_casa && (
                        <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Home className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                            <h4 className="font-semibold text-amber-900 dark:text-amber-100">Atividade Para Casa:</h4>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                            {evento.atividade_casa}
                          </p>
                        </div>
                      )}

                      {/* Data de Entrega */}
                      {evento.data_entrega && (
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Prazo de Entrega:</h4>
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                              {formatarDataCurta(evento.data_entrega)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Observação */}
                      {evento.observacao && (
                        <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                            <h4 className="font-semibold text-purple-900 dark:text-purple-100">Observação:</h4>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                            {evento.observacao}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Informação */}
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Sobre a Agenda:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300">
                  <li>A agenda é atualizada diariamente pelos professores após cada aula.</li>
                  <li>Use o filtro de data para consultar atividades de dias anteriores.</li>
                  <li>Fique atento aos prazos de entrega destacados em azul.</li>
                  <li>Leia as observações dos professores com atenção.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
