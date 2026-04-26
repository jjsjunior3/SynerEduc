// src/components/FrequenciaProfessor.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  CheckCircle, XCircle,
  Loader2, Save, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface FrequenciaProfessorProps {
  disciplina: { id: string; nome: string; cor?: string; turma?: string; serie?: string; };
  serie: any;
}

interface AlunoFrequencia {
  aluno_id: string;
  aluno_nome: string;
  presente: boolean;
  observacao: string;
  frequencia_id: string | null;
}

export function FrequenciaProfessor({ disciplina, serie }: FrequenciaProfessorProps) {
  const { usuario } = useAuth();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dataFrequencia, setDataFrequencia] = useState(new Date().toISOString().split('T')[0]);
  const [listaAlunos, setListaAlunos] = useState<AlunoFrequencia[]>([]);
  const [turmaIdReal, setTurmaIdReal] = useState<string | null>(null);

  // turmaIdProp vem como "turma_<uuid>" (key do map do Dashboard) — não é um UUID válido
  // Por isso sempre buscamos via alunos_turmas
  const serieNome = typeof serie === 'string' ? serie : serie?.nome;

  const carregarDados = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id) return;
    setLoading(true);
    try {
      let query = supabase.from('users').select('id, nome').eq('tipo', 'aluno').order('nome');
      if (serieNome) query = query.eq('serie', serieNome);
      const { data: alunosData, error } = await query;
      if (error) throw error;
      if (!alunosData || alunosData.length === 0) { setListaAlunos([]); setLoading(false); return; }

      // Sempre buscar o turma_id real via alunos_turmas (o campo disciplina.turma não é UUID válido)
      if (!turmaIdReal && alunosData.length > 0) {
        const { data: vinculo } = await supabase
          .from('alunos_turmas').select('turma_id').eq('aluno_id', alunosData[0].id).maybeSingle();
        if (vinculo?.turma_id) {
          setTurmaIdReal(vinculo.turma_id);
        } else {
          // Fallback: buscar pelo nome da série na tabela turmas
          const { data: turmaData } = await supabase
            .from('turmas').select('id').ilike('nome', `%${serieNome}%`).limit(1).maybeSingle();
          if (turmaData?.id) setTurmaIdReal(turmaData.id);
        }
      }

      const alunosIds = alunosData.map((a: any) => a.id);
      const { data: freqData, error: freqError } = await supabase
        .from('frequencia_diaria').select('*')
        .eq('disciplina_id', disciplina.id)
        .eq('data_aula', dataFrequencia)
        .in('aluno_id', alunosIds);
      if (freqError) throw freqError;

      const freqMap = new Map();
      freqData?.forEach((f: any) => freqMap.set(f.aluno_id, f));

      setListaAlunos(alunosData.map((aluno: any) => ({
        aluno_id: aluno.id,
        aluno_nome: aluno.nome,
        presente: freqMap.has(aluno.id) ? freqMap.get(aluno.id).presente : true,
        observacao: freqMap.has(aluno.id) ? freqMap.get(aluno.id).observacao || '' : '',
        frequencia_id: freqMap.has(aluno.id) ? freqMap.get(aluno.id).id : null,
      })));
    } catch {
      toast.error('Erro ao carregar lista de alunos.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, disciplina?.id, serieNome, dataFrequencia, turmaIdReal]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleTogglePresenca = (id: string) =>
    setListaAlunos(prev => prev.map(a => a.aluno_id === id ? { ...a, presente: !a.presente } : a));

  const handleSalvarFrequencia = async () => {
    if (!turmaIdReal) {
      toast.error('ID da turma não identificado. Aguarde o carregamento ou recarregue a página.');
      return;
    }

    setSalvando(true);
    try {
      const dados = listaAlunos.map(a => {
        const reg: any = {
          aluno_id: a.aluno_id, disciplina_id: disciplina.id,
          turma_id: turmaIdReal, data_aula: dataFrequencia,
          presente: a.presente, observacao: a.observacao || null,
        };
        if (a.frequencia_id) reg.id = a.frequencia_id;
        return reg;
      });

      const { error } = await supabase
        .from('frequencia_diaria')
        .upsert(dados, { onConflict: 'aluno_id, disciplina_id, data_aula' });
      if (error) throw error;

      toast.success(`Frequência de ${formatarData(dataFrequencia)} salva!`);
      await carregarDados();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const formatarData = (d: string) => {
    if (!d) return '-';
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const presentes = listaAlunos.filter(a => a.presente).length;
  const ausentes = listaAlunos.filter(a => !a.presente).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">

          {/* Controles */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            {/* Data + contadores */}
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Data da Aula</Label>
                <Input
                  type="date"
                  value={dataFrequencia}
                  onChange={(e) => setDataFrequencia(e.target.value)}
                  className="w-44"
                />
              </div>

              <div className="flex items-center gap-5 pb-0.5">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                  <p className="text-xl font-bold text-foreground">{listaAlunos.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Presentes</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{presentes}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Ausentes</p>
                  <p className="text-xl font-bold text-red-500 dark:text-red-400">{ausentes}</p>
                </div>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setListaAlunos(p => p.map(a => ({ ...a, presente: true })))}
                className="gap-1.5 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                <CheckCircle className="w-4 h-4" /> Todos Presentes
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setListaAlunos(p => p.map(a => ({ ...a, presente: false })))}
                className="gap-1.5 text-red-500 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <XCircle className="w-4 h-4" /> Todos Ausentes
              </Button>
            </div>
          </div>

          {/* Lista de alunos */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : listaAlunos.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">Nenhum aluno encontrado para esta série.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listaAlunos.map((aluno, index) => (
                <div
                  key={aluno.aluno_id}
                  className={`rounded-lg border bg-card transition-all ${
                    aluno.presente
                      ? 'border-l-4 border-l-green-500 border-border'
                      : 'border-l-4 border-l-red-500 border-border'
                  }`}
                >
                  <div className="p-4 flex items-start gap-4">
                    {/* Número + checkbox */}
                    <div className="flex items-center gap-3 pt-0.5 flex-shrink-0">
                      <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                        {index + 1}
                      </span>
                      <Checkbox
                        id={`aluno-${aluno.aluno_id}`}
                        checked={aluno.presente}
                        onCheckedChange={() => handleTogglePresenca(aluno.aluno_id)}
                        className="w-5 h-5 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    </div>

                    {/* Dados */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{aluno.aluno_nome}</h4>
                          <p className="text-xs text-muted-foreground">ID: {aluno.aluno_id.slice(0, 8)}</p>
                        </div>

                        <button
                          onClick={() => handleTogglePresenca(aluno.aluno_id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white w-fit transition-colors ${
                            aluno.presente ? 'bg-green-600 dark:bg-green-700' : 'bg-red-600 dark:bg-red-700'
                          }`}
                        >
                          {aluno.presente
                            ? <><CheckCircle className="w-3.5 h-3.5" /> Presente</>
                            : <><XCircle className="w-3.5 h-3.5" /> Ausente</>
                          }
                        </button>
                      </div>

                      <Textarea
                        value={aluno.observacao}
                        onChange={(e) => setListaAlunos(prev =>
                          prev.map(a => a.aluno_id === aluno.aluno_id ? { ...a, observacao: e.target.value } : a)
                        )}
                        placeholder="Observação (opcional)..."
                        className="resize-none text-sm min-h-[48px]"
                        rows={1}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão salvar */}
          {!loading && listaAlunos.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground hidden md:block">
                Registrando frequência de{' '}
                <span className="font-semibold text-foreground">{formatarData(dataFrequencia)}</span>
              </p>
              <Button
                onClick={handleSalvarFrequencia}
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full md:w-auto"
              >
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Save className="w-4 h-4" />Salvar Frequência</>
                }
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}