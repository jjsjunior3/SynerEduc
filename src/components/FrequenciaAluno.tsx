// src/components/FrequenciaAluno.tsx
/**
 * Frequência do Aluno
 * Exibe a frequência do aluno logado para uma disciplina, série e turma específicas,
 * com filtro por data.
 *
 * O contexto de disciplina, série e turma é recebido via props do DisciplinaPage.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Loader2, AlertCircle, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';

interface DisciplinaProps {
  id: string; // UUID da disciplina
  nome: string;
  cor?: string;
}

interface SerieProps {
  id: string; // ID real da série (UUID)
  nome: string; // Nome da série (ex: "7º ano")
}

interface TurmaProps {
  id: string; // ID da turma (UUID)
  nome: string; // Nome da turma (string)
}

interface FrequenciaRegistro {
  id: string;
  data_aula: string;
  presente: boolean;
  observacao: string | null;
  disciplina_nome: string; // Nome da disciplina para exibição
  professor_nome: string; // Nome do professor para exibição
}

interface FrequenciaAlunoProps {
  onVoltar: () => void;
  disciplina: DisciplinaProps; // ✅ Obrigatória
  serie: SerieProps;           // ✅ Obrigatória (contém ID real da série e nome da série)
  turma: TurmaProps;           // ✅ Obrigatória (contém ID e nome da turma)
}

export function FrequenciaAluno({ onVoltar, disciplina, serie, turma }: FrequenciaAlunoProps) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [registrosFrequencia, setRegistrosFrequencia] = useState<FrequenciaRegistro[]>([]);

  const [dataFiltro, setDataFiltro] = useState<string>(new Date().toISOString().split('T')[0]); // Data atual

  // ========================================
  // 1️⃣ CARREGAR FREQUÊNCIA DO ALUNO
  // ========================================
  const carregarFrequenciaDoAluno = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id || !serie?.id || !turma?.id || !dataFiltro) {
      setErro('Dados de disciplina, série, turma ou data incompletos para carregar a frequência.');
      setRegistrosFrequencia([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const alunoId = usuario.id;
      const disciplinaId = disciplina.id;
      const turmaId = turma.id;
      const serieId = serie.id;

      const { data, error } = await supabase
        .from('frequencia_diaria')
        .select(`
          id,
          data_aula,
          presente,
          observacao,
          disciplinas(nome), // Para pegar o nome da disciplina
          professores_disciplinas_series(professores(nome)) // Para pegar o nome do professor
        `)
        .eq('aluno_id', alunoId)
        .eq('disciplina_id', disciplinaId)
        .eq('turma_id', turmaId)
        .eq('serie_id', serieId)
        .eq('data_aula', dataFiltro)
        .order('data_aula', { ascending: false });

      if (error) throw error;

      const frequenciaFormatada: FrequenciaRegistro[] = (data || []).map((reg: any) => ({
        id: reg.id,
        data_aula: reg.data_aula,
        presente: reg.presente,
        observacao: reg.observacao,
        disciplina_nome: reg.disciplinas?.nome || 'N/A',
        professor_nome: reg.professores_disciplinas_series?.professores?.nome || 'N/A',
      }));

      setRegistrosFrequencia(frequenciaFormatada);
    } catch (err: any) {
      console.error('Erro ao carregar frequência do aluno:', err.message);
      setErro('Erro ao carregar frequência do aluno: ' + err.message);
      toast.error('Erro ao carregar frequência', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, disciplina?.id, serie?.id, turma?.id, dataFiltro]);

  useEffect(() => {
    carregarFrequenciaDoAluno();
  }, [carregarFrequenciaDoAluno]);

  // ========================================
  // 2️⃣ RENDERIZAÇÃO
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* HEADER PADRÃO COM BOTÃO VOLTAR E INFORMAÇÕES DA DISCIPLINA/TURMA */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onVoltar} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-gray-100">Minha Frequência</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Disciplina: <span className="font-medium">{disciplina?.nome || 'N/A'}</span> |
                Série/Turma: <span className="font-medium">{serie?.nome || 'N/A'} ({turma?.nome || 'N/A'})</span>
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Data */}
        <div className="flex justify-end mt-4">
          <div className="space-y-1 w-48">
            <label htmlFor="select-data" className="text-sm font-medium text-gray-700 dark:text-gray-300">Data da Aula</label>
            <Input
              id="select-data"
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border dark:border-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando sua frequência...</span>
            </div>
          ) : erro ? (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-700">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">Erro ao carregar frequência</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">{erro}</p>
                  <Button variant="outline" size="sm" onClick={carregarFrequenciaDoAluno} className="mt-3">
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : registrosFrequencia.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-gray-800 shadow-sm dark:shadow-md">
              <CardContent>
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Nenhum registro de frequência</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Não há registros de frequência para esta data.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Registros de Frequência</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Disciplina</TableHead>
                      <TableHead>Professor</TableHead>
                      <TableHead className="text-center">Presença</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosFrequencia.map((registro) => (
                      <TableRow key={registro.id}>
                        <TableCell className="font-medium">{new Date(registro.data_aula).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{registro.disciplina_nome}</TableCell>
                        <TableCell>{registro.professor_nome}</TableCell>
                        <TableCell className="text-center">
                          {registro.presente ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>{registro.observacao || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
