// src/components/AgendaProfessores.tsx
/**
 * Agenda geral dos professores — visualização por dia (coordenação/admin)
 * Mostra registros diários da agenda_professor, ordenados por horário.
 * Layout adaptado com dados reais do Supabase.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Calendar, Clock, Users, BookOpen, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface AgendaProfessoresProps {
  onVoltar: () => void;
}

interface EventoAgenda {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'tarefa_casa' | 'estudo' | 'trabalho' | 'prova' | 'projeto';
  data_entrega: string; // Prazo (informativo)
  criado_em: string; // Data que o professor registrou (filtro principal)
  disciplina_id: string;
  professor_id: string;
  serie: string;
  turma: string;
  professor?: { nome: string };
  disciplina?: { nome: string };
}

export default function AgendaProfessores({ onVoltar }: AgendaProfessoresProps) {
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [professorSelecionado, setProfessorSelecionado] = useState('todos');
  const [serieSelecionada, setSerieSelecionada] = useState('todas');
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // ========================================
  // 1️⃣ CARREGAR PROFESSORES
  // ========================================
  useEffect(() => {
    carregarProfessores();
  }, []);

  async function carregarProfessores() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome')
        .eq('tipo', 'professor')
        .order('nome', { ascending: true });

      if (error) throw error;

      setProfessores([
        { id: 'todos', nome: 'Todos os Professores' },
        ...(data || [])
      ]);
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
    }
  }

  // ========================================
  // 2️⃣ CARREGAR SÉRIES ÚNICAS
  // ========================================
  useEffect(() => {
    carregarSeries();
  }, []);

  async function carregarSeries() {
    try {
      const { data, error } = await supabase
        .from('agenda_professor')
        .select('serie')
        .not('serie', 'is', null);

      if (error) throw error;

      // Extrair séries únicas
      const seriesUnicas = Array.from(new Set(data?.map(item => item.serie) || []));
      setSeries(['todas', ...seriesUnicas.sort()]);
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
    }
  }

  // ========================================
  // 3️⃣ CARREGAR EVENTOS DO DIA ATUAL
  // ========================================
  useEffect(() => {
    carregarEventos();
  }, [dataAtual, professorSelecionado, serieSelecionada]);

  async function carregarEventos() {
    setCarregando(true);
    setErro(null);

    try {
      // Formatar data atual como YYYY-MM-DD
      const dataStr = dataAtual.toLocaleDateString('en-CA'); // Formato: YYYY-MM-DD

      console.log('🔍 Buscando eventos para:', dataStr);

      // Buscar eventos do dia (filtrado por criado_em::date)
      const { data, error } = await supabase.rpc('buscar_agenda_por_data', {
        data_inicio: dataStr,
        data_fim: dataStr,
        prof_id: professorSelecionado === 'todos' ? null : professorSelecionado
      });

      if (error) throw error;

      // Aplicar filtro de série (se selecionado)
      let eventosFiltrados = data || [];
      if (serieSelecionada !== 'todas') {
        eventosFiltrados = eventosFiltrados.filter((evt: any) => evt.serie === serieSelecionada);
      }

      console.log(`✅ Eventos carregados: ${eventosFiltrados.length}`);
      setEventos(eventosFiltrados);
    } catch (error: any) {
      console.error('Erro ao buscar eventos:', error);
      setErro(error.message || 'Erro ao carregar eventos da agenda');
    } finally {
      setCarregando(false);
    }
  }

  // ========================================
  // 4️⃣ FUNÇÕES AUXILIARES (CORES/ÍCONES)
  // ========================================
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'tarefa_casa': return 'bg-green-100 text-green-700';
      case 'estudo': return 'bg-blue-100 text-blue-700';
      case 'trabalho': return 'bg-purple-100 text-purple-700';
      case 'prova': return 'bg-red-100 text-red-700';
      case 'projeto': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'tarefa_casa': return <BookOpen className="w-4 h-4" />;
      case 'estudo': return <BookOpen className="w-4 h-4" />;
      case 'trabalho': return <Users className="w-4 h-4" />;
      case 'prova': return <Calendar className="w-4 h-4" />;
      case 'projeto': return <Users className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTipoTexto = (tipo: string) => {
    switch (tipo) {
      case 'tarefa_casa': return 'Tarefa de Casa';
      case 'estudo': return 'Estudo';
      case 'trabalho': return 'Trabalho';
      case 'prova': return 'Prova';
      case 'projeto': return 'Projeto';
      default: return 'Evento';
    }
  };

  // ========================================
  // 5️⃣ FUNÇÕES DE NAVEGAÇÃO
  // ========================================
  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatarDataCurta = (data: Date) => {
    return data.toLocaleDateString('pt-BR');
  };

  const navegarDia = (direcao: 'anterior' | 'proximo') => {
    const novaData = new Date(dataAtual);
    novaData.setDate(dataAtual.getDate() + (direcao === 'proximo' ? 1 : -1));
    setDataAtual(novaData);
  };

  const irParaHoje = () => {
    setDataAtual(new Date());
  };

  // ✅ ORDENAR EVENTOS POR HORÁRIO (criado_em)
  const eventosPorHorario = eventos
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

  const isHoje = dataAtual.toDateString() === new Date().toDateString();

  // ========================================
  // 6️⃣ RENDERIZAÇÃO
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Agenda dos Professores</h1>
            <p className="text-sm text-gray-600">Visualizar atividades programadas por dia</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Controles de Filtro */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Filtro de Professor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Professor</label>
                  <Select value={professorSelecionado} onValueChange={setProfessorSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {professores.map((professor) => (
                        <SelectItem key={professor.id} value={professor.id}>
                          {professor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Série */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select value={serieSelecionada} onValueChange={setSerieSelecionada}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Séries</SelectItem>
                      {series.filter(s => s !== 'todas').map((serie) => (
                        <SelectItem key={serie} value={serie}>
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Navegação de Data */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navegarDia('anterior')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 text-center">
                      <div className="text-sm font-medium">
                        {formatarDataCurta(dataAtual)}
                      </div>
                      {isHoje && (
                        <div className="text-xs text-blue-600 font-medium">Hoje</div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navegarDia('proximo')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    {!isHoje && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={irParaHoje}
                      >
                        Hoje
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cabeçalho do Dia */}
          <Card className={isHoje ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {formatarData(dataAtual)}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {eventosPorHorario.length} {eventosPorHorario.length === 1 ? 'atividade' : 'atividades'} programada{eventosPorHorario.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {isHoje && (
                  <Badge className="bg-blue-100 text-blue-700">Hoje</Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Lista de Atividades do Dia */}
          <Card>
            <CardContent className="p-6">
              {/* Loading */}
              {carregando && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-gray-600">Carregando eventos...</span>
                </div>
              )}

              {/* Erro */}
              {erro && !carregando && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900">Erro ao carregar eventos</h3>
                    <p className="text-sm text-red-700 mt-1">{erro}</p>
                    <Button variant="outline" size="sm" onClick={carregarEventos} className="mt-3">
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de Eventos */}
              {!carregando && !erro && eventosPorHorario.length > 0 && (
                <div className="space-y-3">
                  {eventosPorHorario.map((evento) => (
                    <div
                      key={evento.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                    >
                      {/* Horário */}
                      <div className="flex flex-col items-center justify-center min-w-[80px] pt-1">
                        <div className="font-semibold text-gray-900">
                          {new Date(evento.criado_em).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {evento.serie}
                        </div>
                        <div className="text-xs text-gray-500">
                          Turma {evento.turma}
                        </div>
                      </div>

                      {/* Ícone do Tipo */}
                      <div className={`p-3 rounded-lg ${getTipoColor(evento.tipo)} flex-shrink-0`}>
                        {getTipoIcon(evento.tipo)}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900">{evento.titulo}</h4>
                            <p className="text-sm text-gray-600">
                              {evento.professor?.nome || 'Professor'} • {evento.disciplina?.nome || 'Disciplina'}
                            </p>
                          </div>
                          <Badge className={getTipoColor(evento.tipo)}>
                            {getTipoTexto(evento.tipo)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{evento.descricao}</p>
                        {evento.data_entrega && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Prazo: {new Date(evento.data_entrega).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nenhum Evento */}
              {!carregando && !erro && eventosPorHorario.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">
                    Nenhuma atividade programada
                  </h3>
                  <p className="text-sm text-gray-600">
                    Não há atividades registradas para este dia com os filtros selecionados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
