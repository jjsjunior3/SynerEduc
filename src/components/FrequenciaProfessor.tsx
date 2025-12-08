import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Calendar, UserCheck, Save, Users, AlertTriangle, Loader2, History } from 'lucide-react';
import { toast } from 'sonner';

interface FrequenciaProfessorProps {
  disciplina: { id: string; nome: string };
  serie: { id: string; nome: string }; // serie.id pode vir com prefixo "serie_"
}

interface Aluno {
  id: string;
  nome: string;
  presente: boolean;
  observacao?: string;
}

interface RegistroFrequenciaHistorico {
  data_aula: string;
  totalAlunos: number;
  presentes: number;
  faltas: number;
}

export function FrequenciaProfessor({ disciplina, serie }: FrequenciaProfessorProps) {
  const { usuario } = useAuth();
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [loadingFrequencia, setLoadingFrequencia] = useState(false);
  const [historicoFrequencia, setHistoricoFrequencia] = useState<RegistroFrequenciaHistorico[]>([]);
  const [turmaId, setTurmaId] = useState<string | null>(null);

  // ✅ CORREÇÃO CRÍTICA: Extrair o UUID puro da série
  // Garante que o prefixo "serie_" seja removido antes de usar o ID em queries Supabase
  // A expressão regular foi corrigida para ficar em uma única linha.
  const serieIdPuro = typeof serie.id === 'string' ? serie.id.replace(/^serie_/, '') : serie.id;
  const serieNome = serie.nome;

  // ========================================
  // CARREGAR ALUNOS DA SÉRIE E TURMA
  // ========================================
  const carregarAlunos = useCallback(async () => {
    if (!serieIdPuro || !serieNome) {
      setLoadingAlunos(false);
      return;
    }

    setLoadingAlunos(true);
    try {
      // 1. Buscar a turma padrão para esta série (ou a primeira que encontrar)
      //    A tabela 'turmas' tem uma coluna 'serie_id' (UUID)
      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas')
        .select('id')
        .eq('serie_id', serieIdPuro) // ✅ Usando o UUID puro da série
        .limit(1)
        .single();

      if (turmaError && turmaError.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error('Erro ao buscar turma:', turmaError);
        toast.error('Erro ao buscar turma para a série.');
        setLoadingAlunos(false);
        return;
      }

      if (!turmaData) {
        toast.info('Nenhuma turma encontrada para esta série. Cadastre uma turma primeiro.');
        setAlunos([]);
        setLoadingAlunos(false);
        return;
      }
      setTurmaId(turmaData.id); // turmas.id é um UUID

      // 2. Buscar alunos vinculados a esta turma (filtrando pela coluna 'serie' TEXT na tabela 'users')
      const { data: alunosData, error: alunosError } = await supabase
        .from('users')
        .select('id, nome')
        .eq('tipo', 'aluno')
        .eq('serie', serieNome) // ✅ Usando o NOME da série (TEXT) para filtrar na tabela 'users'
        .order('nome', { ascending: true });

      if (alunosError) throw alunosError;

      const alunosFormatados: Aluno[] = (alunosData || [])
        .filter(aluno => aluno !== null)
        .map(aluno => ({
          id: aluno.id,
          nome: aluno.nome,
          presente: false,
          observacao: ''
        }));

      setAlunos(alunosFormatados);

    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast.error('Erro ao carregar lista de alunos.');
    } finally {
      setLoadingAlunos(false);
    }
  }, [serieIdPuro, serieNome]);

  // ========================================
  // CARREGAR FREQUÊNCIA PARA A DATA SELECIONADA
  // ========================================
  const carregarFrequenciaDaData = useCallback(async () => {
    if (!disciplina?.id || !turmaId || !dataSelecionada) return;

    setLoadingFrequencia(true);

    try {
      // Buscar registros de frequência para a data, disciplina e turma
      const { data: frequenciaData, error: frequenciaError } = await supabase
        .from('frequencia_diaria')
        .select('aluno_id, presente, observacao')
        .eq('data_aula', dataSelecionada)
        .eq('disciplina_id', disciplina.id)
        .eq('turma_id', turmaId);

      if (frequenciaError) throw frequenciaError;

      const frequenciaMap = new Map(frequenciaData?.map(f => [f.aluno_id, { presente: f.presente, observacao: f.observacao }]));

      setAlunos(prevAlunos => prevAlunos.map(aluno => ({
        ...aluno,
        presente: frequenciaMap.get(aluno.id)?.presente ?? false,
        observacao: frequenciaMap.get(aluno.id)?.observacao ?? ''
      })));
    } catch (error) {
      console.error('Erro ao carregar frequência da data:', error);
      toast.error('Erro ao carregar frequência para a data selecionada.');
    } finally {
      setLoadingFrequencia(false);
    }
  }, [disciplina.id, turmaId, dataSelecionada]);

  // ========================================
  // CARREGAR HISTÓRICO DE FREQUÊNCIA
  // ========================================
  const carregarHistorico = useCallback(async () => {
    if (!disciplina?.id || !turmaId) return;

    try {
      // Agrupar por data e contar presenças/faltas por data
      const { data, error } = await supabase.rpc('get_frequencia_resumo_por_data', {
        p_disciplina_id: disciplina.id,
        p_turma_id: turmaId
      });

      if (error) throw error;

      setHistoricoFrequencia(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de frequência:', error);
      toast.error('Erro ao carregar histórico de frequência.');
    }
  }, [disciplina.id, turmaId]);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

  useEffect(() => {
    if (turmaId) {
      carregarFrequenciaDaData();
      carregarHistorico();
    }
  }, [dataSelecionada, turmaId, carregarFrequenciaDaData, carregarHistorico]);

  // ========================================
  // HANDLERS
  // ========================================
  const handlePresencaChange = (alunoId: string, presente: boolean) => {
    setAlunos(prev => prev.map(aluno =>
      aluno.id === alunoId ? { ...aluno, presente } : aluno
    ));
  };

  const handleObservacaoChange = (alunoId: string, observacao: string) => {
    setAlunos(prev => prev.map(aluno =>
      aluno.id === alunoId ? { ...aluno, observacao } : aluno
    ));
  };

  const handleMarcarTodos = (presente: boolean) => {
    setAlunos(prev => prev.map(aluno => ({ ...aluno, presente })));
  };

  const handleSalvarFrequencia = async () => {
    if (!usuario?.id || !disciplina?.id || !turmaId) {
      toast.error('Dados incompletos para salvar frequência.');
      return;
    }

    setLoadingFrequencia(true);
    try {
      const frequenciaParaSalvar = alunos.map(aluno => ({
        aluno_id: aluno.id,
        disciplina_id: disciplina.id,
        turma_id: turmaId,
        data_aula: dataSelecionada,
        presente: aluno.presente,
        observacao: aluno.observacao || null,
      }));

      const { error } = await supabase
        .from('frequencia_diaria')
        .upsert(frequenciaParaSalvar, { onConflict: 'aluno_id, disciplina_id, turma_id, data_aula' });

      if (error) throw error;

      toast.success('Frequência salva com sucesso!');
      carregarHistorico();
    } catch (error) {
      console.error('Erro ao salvar frequência:', error);
      toast.error('Erro ao salvar frequência. Tente novamente.');
    } finally {
      setLoadingFrequencia(false);
    }
  };

  // ========================================
  // ESTATÍSTICAS E HELPERS
  // ========================================
  const calcularEstatisticas = () => {
    const presentes = alunos.filter(a => a.presente).length;
    const faltas = alunos.length - presentes;
    const percentualPresenca = alunos.length > 0 ? (presentes / alunos.length) * 100 : 0;

    return { presentes, faltas, percentualPresenca };
  };

  const { presentes, faltas, percentualPresenca } = calcularEstatisticas();

  const getPercentualColor = (percentual: number) => {
    if (percentual >= 90) return 'text-green-600';
    if (percentual >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Controle de Frequência</h2>
      <p className="text-sm text-gray-600 mt-1">
        {disciplina.nome} • Turma: {serie.nome}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Selecionar Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="max-w-[200px]"
            disabled={loadingFrequencia}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Lista de Alunos
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleMarcarTodos(true)} disabled={loadingAlunos || loadingFrequencia}>
              Marcar Todos Presentes
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMarcarTodos(false)} disabled={loadingAlunos || loadingFrequencia}>
              Marcar Todos Ausentes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAlunos || loadingFrequencia ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Carregando alunos e frequência...</span>
            </div>
          ) : alunos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
              <p className="font-medium">Nenhum aluno encontrado para esta série/turma.</p>
              <p className="text-sm mt-1">Verifique o cadastro de alunos e turmas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {alunos.map((aluno) => (
                <div key={aluno.id} className="flex flex-col p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">{aluno.nome}</span>
                    <Checkbox
                      checked={aluno.presente}
                      onCheckedChange={(checked: boolean) => handlePresencaChange(aluno.id, checked)}
                      disabled={loadingFrequencia}
                    />
                  </div>
                  <Input
                    type="text"
                    placeholder="Observação (opcional)"
                    value={aluno.observacao}
                    onChange={(e) => handleObservacaoChange(aluno.id, e.target.value)}
                    className="text-xs h-8"
                    disabled={loadingFrequencia}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="w-5 h-5" />
            Resumo da Frequência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span>Total de Alunos:</span>
            <Badge variant="secondary">{alunos.length}</Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Presentes:</span>
            <Badge className="bg-green-100 text-green-700">{presentes}</Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Faltas:</span>
            <Badge className="bg-red-100 text-red-700">{faltas}</Badge>
          </div>
          <div className="flex justify-between items-center text-lg font-semibold pt-2 border-t">
            <span>% Presença:</span>
            <span className={getPercentualColor(percentualPresenca)}>
              {percentualPresenca.toFixed(2)}%
            </span>
          </div>
          <Button
            onClick={handleSalvarFrequencia}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={loadingAlunos || loadingFrequencia}
          >
            {loadingFrequencia ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Frequência
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5" />
            Histórico Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historicoFrequencia.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Nenhum registro de frequência recente.
            </div>
          ) : (
            <div className="space-y-3">
              {historicoFrequencia.map((registro, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <span className="text-sm font-medium text-gray-800">
                    {new Date(registro.data_aula).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">P: {registro.presentes}</Badge>
                    <Badge className="bg-red-100 text-red-700">F: {registro.faltas}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
