import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { 
  ArrowLeft, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Loader2, 
  Save,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Interfaces
interface FrequenciaProfessorProps {
  disciplina: {
    id: string;
    nome: string;
    cor?: string;
    turma?: string;
    serie?: string;
  };
  serie: any; // Aceita string ou objeto
  onVoltar: () => void;
}

interface AlunoFrequencia {
  aluno_id: string;
  aluno_nome: string;
  matricula?: string;
  presente: boolean;
  observacao: string;
  frequencia_id: string | null;
}

interface HistoricoAula {
  id: string;
  data: string;
  aula?: string;
  presentes: number;
  ausentes: number;
  total: number;
}

export function FrequenciaProfessor({ disciplina, serie, onVoltar }: FrequenciaProfessorProps) {
  const { usuario } = useAuth();

  // Estados
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dataFrequencia, setDataFrequencia] = useState(new Date().toISOString().split('T')[0]);

  const [listaAlunos, setListaAlunos] = useState<AlunoFrequencia[]>([]);
  const [historico, setHistorico] = useState<HistoricoAula[]>([]);

  // Estado para armazenar o ID da turma capturado
  const [turmaIdCapturado, setTurmaIdCapturado] = useState<string | null>(null);

  // Helpers de Série/Turma
  const turmaIdProp = typeof turma === 'object' ? turma?.id : null;
  const serieNome = typeof serie === 'string' ? serie : serie?.nome;

  // ========================================
  // 1. CARREGAR DADOS
  // ========================================
  const carregarDados = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id) return;

    setLoading(true);
    try {
      // A. Buscar Alunos (Corrigido: Não pede turma_id)
      let queryAlunos = supabase
        .from('users')
        .select('id, nome, email') 
        .eq('tipo', 'aluno')
        .order('nome', { ascending: true });

      // Filtra pela série (texto) que existe na tabela users
      if (serieNome) {
        queryAlunos = queryAlunos.eq('serie', serieNome);
      }

      const { data: alunosData, error: alunosError } = await queryAlunos;

      if (alunosError) throw alunosError;

      if (!alunosData || alunosData.length === 0) {
        setListaAlunos([]);
        setLoading(false);
        return;
      }

      // ✅ LÓGICA ROBUSTA PARA DESCOBRIR ID DA TURMA
      if (!turmaIdProp && !turmaIdCapturado && alunosData.length > 0) {
        const primeiroAlunoId = alunosData[0].id;

        // Tentativa 1: Buscar na tabela de vínculo alunos_turmas
        const { data: vinculoData } = await supabase
          .from('alunos_turmas')
          .select('turma_id')
          .eq('aluno_id', primeiroAlunoId)
          .maybeSingle();

        if (vinculoData) {
          console.log("ID da turma encontrado via vínculo:", vinculoData.turma_id);
          setTurmaIdCapturado(vinculoData.turma_id);
        } else {
          // Tentativa 2: Buscar na tabela turmas pelo nome da série
          console.log("Tentando buscar turma pelo nome:", serieNome);
          const { data: turmaData } = await supabase
            .from('turmas')
            .select('id')
            .ilike('nome', `%${serieNome}%`) // Busca aproximada (ex: "6º ano" acha "6º Ano A")
            .limit(1)
            .maybeSingle();

          if (turmaData) {
            console.log("ID da turma encontrado pelo nome:", turmaData.id);
            setTurmaIdCapturado(turmaData.id);
          }
        }
      }

      const alunosIds = alunosData.map(a => a.id);

      // B. Buscar Frequência do Dia
      const { data: freqData, error: freqError } = await supabase
        .from('frequencia_diaria')
        .select('*')
        .eq('disciplina_id', disciplina.id)
        .eq('data_aula', dataFrequencia)
        .in('aluno_id', alunosIds);

      if (freqError) throw freqError;

      const freqMap = new Map();
      freqData?.forEach(f => freqMap.set(f.aluno_id, f));

      // C. Montar Lista
      const listaFinal = alunosData.map(aluno => ({
        aluno_id: aluno.id,
        aluno_nome: aluno.nome,
        matricula: aluno.email?.split('@')[0] || 'N/A',
        presente: freqMap.has(aluno.id) ? freqMap.get(aluno.id).presente : true,
        observacao: freqMap.has(aluno.id) ? freqMap.get(aluno.id).observacao || '' : '',
        frequencia_id: freqMap.has(aluno.id) ? freqMap.get(aluno.id).id : null,
      }));

      setListaAlunos(listaFinal);

    } catch (err) {
      console.error("Erro ao carregar:", err);
      toast.error("Erro ao carregar lista de alunos.");
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, disciplina?.id, turmaIdProp, serieNome, dataFrequencia, turmaIdCapturado]);

  // ========================================
  // 2. CARREGAR HISTÓRICO
  // ========================================
  const carregarHistorico = useCallback(async () => {
    if (!disciplina?.id) return;
    try {
      const { data } = await supabase
        .from('frequencia_diaria')
        .select('data_aula, presente')
        .eq('disciplina_id', disciplina.id)
        .order('data_aula', { ascending: false })
        .limit(200);

      if (data) {
        const agrupado = data.reduce((acc: any, curr) => {
          const d = curr.data_aula;
          if (!acc[d]) acc[d] = { id: d, data: d, aula: 'Aula Regular', presentes: 0, ausentes: 0, total: 0 };
          acc[d].total++;
          if (curr.presente) acc[d].presentes++;
          else acc[d].ausentes++;
          return acc;
        }, {});

        setHistorico(Object.values(agrupado).slice(0, 5) as HistoricoAula[]);
      }
    } catch (err) {
      console.error("Erro histórico:", err);
    }
  }, [disciplina?.id]);

  useEffect(() => {
    carregarDados();
    carregarHistorico();
  }, [carregarDados, carregarHistorico]);

  // ========================================
  // 3. MANIPULADORES (Ações)
  // ========================================
  const handleTogglePresenca = (alunoId: string) => {
    setListaAlunos(prev => prev.map(a => 
      a.aluno_id === alunoId ? { ...a, presente: !a.presente } : a
    ));
  };

  const handleMarcarTodosPresentes = () => {
    setListaAlunos(prev => prev.map(a => ({ ...a, presente: true })));
  };

  const handleMarcarTodosAusentes = () => {
    setListaAlunos(prev => prev.map(a => ({ ...a, presente: false })));
  };

  const handleAtualizarObservacao = (alunoId: string, texto: string) => {
    setListaAlunos(prev => prev.map(a => 
      a.aluno_id === alunoId ? { ...a, observacao: texto } : a
    ));
  };

    const handleSalvarFrequencia = async () => {
    // ✅ Usa o ID que veio via prop OU o que descobrimos buscando na tabela alunos_turmas
      const idFinalTurma = turmaIdProp || turmaIdCapturado;

      if (!idFinalTurma) {
        toast.error("Erro: ID da turma não identificado. Verifique se a turma existe no banco.");
        return;
      }

      setSalvando(true);
      try {
        const dadosParaSalvar = listaAlunos.map(a => {
          // Objeto base com os dados obrigatórios
          const registro = {
            aluno_id: a.aluno_id,
            disciplina_id: disciplina.id,
            turma_id: idFinalTurma,
            data_aula: dataFrequencia,
            presente: a.presente,
            observacao: a.observacao || null,
          };

          // 💡 O PULO DO GATO: Só adicionamos o ID se ele existir (edição).
          // Se for novo (null), não enviamos o campo 'id' para o banco gerar automático.
          if (a.frequencia_id) {
            return { ...registro, id: a.frequencia_id };
          }

          return registro;
        });
          console.log("🔍 turmaIdProp:", turmaIdProp);
          console.log("🔍 turmaIdCapturado:", turmaIdCapturado);
          console.log("🔍 idFinalTurma:", turmaIdProp || turmaIdCapturado);
        const { error } = await supabase
          .from('frequencia_diaria')
          .upsert(dadosParaSalvar, { onConflict: 'aluno_id, disciplina_id, data_aula' });

        if (error) throw error;

        toast.success(`Frequência de ${formatarData(dataFrequencia)} salva!`);
        await carregarDados();
        await carregarHistorico();

      } catch (err: any) {
        console.error(err);
        toast.error("Erro ao salvar: " + err.message);
      } finally {
        setSalvando(false);
      }
    };


  const formatarData = (dataStr: string) => {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // ========================================
  // RENDERIZAÇÃO
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
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
            <div className={`w-10 h-10 ${disciplina.cor || 'bg-blue-600'} rounded-lg flex items-center justify-center text-white`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Frequência - {disciplina.nome}</h1>
              <p className="text-sm text-gray-600">
                {serieNome} • {listaAlunos.length} alunos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Card Principal de Chamada */}
          <Card>
            <CardHeader>
              <CardTitle>Chamada - {serieNome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Cabeçalho com Data e Ações Rápidas */}
              <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Data da Aula
                    </label>
                    <Input
                      type="date"
                      value={dataFrequencia}
                      onChange={(e) => setDataFrequencia(e.target.value)}
                      className="w-48 bg-white"
                    />
                  </div>
                  <div className="pl-4 border-l border-blue-300 hidden md:block">
                    <p className="text-sm text-gray-600 mb-1">Total</p>
                    <p className="text-2xl font-bold text-blue-700">{listaAlunos.length}</p>
                  </div>
                  <div className="pl-4 border-l border-blue-300 hidden md:block">
                    <p className="text-sm text-gray-600 mb-1">Presentes</p>
                    <p className="text-2xl font-bold text-green-700">
                      {listaAlunos.filter(a => a.presente).length}
                    </p>
                  </div>
                  <div className="pl-4 border-l border-blue-300 hidden md:block">
                    <p className="text-sm text-gray-600 mb-1">Ausentes</p>
                    <p className="text-2xl font-bold text-red-700">
                      {listaAlunos.filter(a => !a.presente).length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarcarTodosPresentes}
                    className="flex-1 md:flex-none flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Todos Presentes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarcarTodosAusentes}
                    className="flex-1 md:flex-none flex items-center gap-2 bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    Todos Ausentes
                  </Button>
                </div>
              </div>

              {/* Lista de Alunos */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : listaAlunos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum aluno encontrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {listaAlunos.map((aluno, index) => (
                    <div
                      key={aluno.aluno_id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        aluno.presente
                          ? 'bg-green-50/50 border-green-200'
                          : 'bg-red-50/50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Número e Checkbox */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-semibold text-gray-700 text-sm shadow-sm">
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`aluno-${aluno.aluno_id}`}
                              checked={aluno.presente}
                              onCheckedChange={() => handleTogglePresenca(aluno.aluno_id)}
                              className="w-5 h-5 data-[state=checked]:bg-green-600 data-[state=unchecked]:border-gray-400"
                            />
                          </div>
                        </div>

                        {/* Informações do Aluno */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                            <div>
                              <h4 className="font-bold text-gray-900 text-base">{aluno.aluno_nome}</h4>
                              <p className="text-xs text-gray-500">ID: {aluno.aluno_id.slice(0, 8)}</p>
                            </div>

                            <div 
                              className="cursor-pointer"
                              onClick={() => handleTogglePresenca(aluno.aluno_id)}
                            >
                              {aluno.presente ? (
                                <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Presente
                                </Badge>
                              ) : (
                                <Badge className="bg-red-600 hover:bg-red-700 text-white px-3 py-1">
                                  <XCircle className="w-3 h-3 mr-1" /> Ausente
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Campo de Observação */}
                          <div>
                            <Textarea
                              value={aluno.observacao}
                              onChange={(e) => handleAtualizarObservacao(aluno.aluno_id, e.target.value)}
                              placeholder="Adicione uma observação (opcional)..."
                              className="w-full resize-none bg-white text-sm min-h-[60px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão Salvar */}
              <div className="flex items-center justify-between pt-4 border-t sticky bottom-0 bg-white p-4 shadow-lg md:static md:shadow-none md:bg-transparent md:p-0 z-20">
                <div className="hidden md:block">
                  <p className="text-sm text-gray-600">
                    Editando frequência de <span className="font-bold">{formatarData(dataFrequencia)}</span>
                  </p>
                </div>
                <Button
                  onClick={handleSalvarFrequencia}
                  disabled={salvando || loading}
                  className="flex items-center gap-2 w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Salvar Frequência
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Frequências Anteriores */}
          {historico.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {historico.map((registro) => (
                    <div
                      key={registro.data}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {formatarData(registro.data)}
                          </div>
                          <div className="text-sm text-gray-600">{registro.aula || 'Aula Regular'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-semibold">{registro.presentes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-700">
                          <XCircle className="w-4 h-4" />
                          <span className="font-semibold">{registro.ausentes}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
