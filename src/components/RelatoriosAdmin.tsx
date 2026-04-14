import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Eye, FileText, Users, GraduationCap, Calendar, Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '../supabase/supabaseClient';

interface RelatoriosAdminProps {
  onVoltar: () => void;
}

interface EstatisticasGerais {
  totalAlunos: number;
  totalProfessores: number;
  mediaGeral: number;
  taxaAprovacao: number;
}

interface DadosDesempenho {
  serie: string;
  media: number;
  aprovados: number;
}

interface DadosFrequencia {
  name: string;
  value: number;
  color: string;
}

interface DadosDisciplina {
  disciplina: string;
  media: number;
}

export function RelatoriosAdmin({ onVoltar }: RelatoriosAdminProps) {
  const [tipoRelatorio, setTipoRelatorio] = useState<'alunos' | 'professores' | 'desempenho' | 'frequencia'>('alunos');
  const [periodoSelecionado, setPeriodoSelecionado] = useState('2025-1');
  const [loading, setLoading] = useState(true);
  const [estatisticasGerais, setEstatisticasGerais] = useState<EstatisticasGerais>({
    totalAlunos: 0,
    totalProfessores: 0,
    mediaGeral: 0,
    taxaAprovacao: 0
  });
  const [dadosDesempenho, setDadosDesempenho] = useState<DadosDesempenho[]>([]);
  const [dadosFrequencia, setDadosFrequencia] = useState<DadosFrequencia[]>([]);
  const [dadosDisciplinas, setDadosDisciplinas] = useState<DadosDisciplina[]>([]);

  useEffect(() => {
    carregarDadosRelatorios();
  }, [periodoSelecionado]);

  const carregarDadosRelatorios = async () => {
    setLoading(true);
    try {
      // 1. Total de alunos e professores em paralelo
      const [{ count: totalAlunos }, { count: totalProfessores }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('tipo', 'aluno'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('tipo', 'professor')
      ]);

      // 2. Notas com série do aluno e nome da disciplina via join
      const { data: notasData, error: notasError } = await supabase
        .from('notas')
        .select(`
          media,
          media_final,
          users:user_id ( serie ),
          disciplinas:disciplina_id ( nome )
        `);

      if (notasError) throw notasError;

      // 3. Agrupar médias por série
      const seriesMap = new Map<string, number[]>();
      (notasData || []).forEach((n: any) => {
        const serie = n.users?.serie || 'Sem série';
        const media = Number(n.media_final || n.media || 0);
        if (!seriesMap.has(serie)) seriesMap.set(serie, []);
        seriesMap.get(serie)!.push(media);
      });

      const desempenho: DadosDesempenho[] = Array.from(seriesMap.entries())
        .map(([serie, medias]) => ({
          serie,
          media: Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 10) / 10,
          aprovados: medias.filter(m => m >= 7).length
        }))
        .sort((a, b) => a.serie.localeCompare(b.serie));

      // 4. Média geral e taxa de aprovação
      const todasMedias = (notasData || []).map((n: any) => Number(n.media_final || n.media || 0));
      const mediaGeral = todasMedias.length > 0
        ? Math.round((todasMedias.reduce((a, b) => a + b, 0) / todasMedias.length) * 10) / 10
        : 0;
      const aprovadosCount = todasMedias.filter(m => m >= 7).length;
      const taxaAprovacao = todasMedias.length > 0
        ? Math.round((aprovadosCount / todasMedias.length) * 100)
        : 0;

      // 5. Médias por disciplina
      const disciplinasMap = new Map<string, number[]>();
      (notasData || []).forEach((n: any) => {
        const nome = n.disciplinas?.nome || 'Sem disciplina';
        const media = Number(n.media_final || n.media || 0);
        if (!disciplinasMap.has(nome)) disciplinasMap.set(nome, []);
        disciplinasMap.get(nome)!.push(media);
      });

      const dadosDisciplinasCalc: DadosDisciplina[] = Array.from(disciplinasMap.entries())
        .map(([disciplina, medias]) => ({
          disciplina,
          media: Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 10) / 10
        }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 8);

      // 6. Frequência geral
      const { data: freqData, error: freqError } = await supabase
        .from('frequencia_diaria')
        .select('presente');

      if (freqError) throw freqError;

      const totalAulas = freqData?.length || 0;
      const totalPresencas = (freqData || []).filter((f: any) => f.presente).length;
      const pctPresenca = totalAulas > 0 ? Math.round((totalPresencas / totalAulas) * 100) : 0;
      const pctFalta = 100 - pctPresenca;

      // 7. Atualizar todos os estados
      setEstatisticasGerais({
        totalAlunos: totalAlunos || 0,
        totalProfessores: totalProfessores || 0,
        mediaGeral,
        taxaAprovacao
      });
      setDadosDesempenho(desempenho);
      setDadosDisciplinas(dadosDisciplinasCalc);
      setDadosFrequencia(
        totalAulas > 0
          ? [
              { name: 'Presença', value: pctPresenca, color: '#10b981' },
              { name: 'Faltas', value: pctFalta, color: '#ef4444' }
            ]
          : [{ name: 'Sem dados', value: 100, color: '#94a3b8' }]
      );

    } catch (error: any) {
      toast.error('Erro ao carregar dados dos relatórios');
      setEstatisticasGerais({ totalAlunos: 0, totalProfessores: 0, mediaGeral: 0, taxaAprovacao: 0 });
      setDadosDesempenho([]);
      setDadosFrequencia([{ name: 'Sem dados', value: 100, color: '#94a3b8' }]);
      setDadosDisciplinas([]);
    } finally {
      setLoading(false);
    }
  };

  const relatóriosDisponiveis = [
    { id: 'alunos-completo', titulo: 'Relatório Completo de Alunos', descricao: 'Lista completa com dados pessoais, notas e frequência', tipo: 'alunos', icon: Users },
    { id: 'alunos-desempenho', titulo: 'Desempenho por Série', descricao: 'Análise de desempenho acadêmico por série', tipo: 'alunos', icon: GraduationCap },
    { id: 'professores-carga', titulo: 'Carga Horária dos Professores', descricao: 'Distribuição de aulas e turmas por professor', tipo: 'professores', icon: Calendar },
    { id: 'professores-avaliacao', titulo: 'Avaliação dos Professores', descricao: 'Resultados das avaliações docentes', tipo: 'professores', icon: FileText }
  ];

  const estatisticasDisplay = [
    { label: 'Total de Alunos', valor: loading ? '...' : estatisticasGerais.totalAlunos, cor: 'text-blue-600' },
    { label: 'Total de Professores', valor: loading ? '...' : estatisticasGerais.totalProfessores, cor: 'text-green-600' },
    { label: 'Média Geral', valor: loading ? '...' : estatisticasGerais.mediaGeral.toFixed(1), cor: 'text-purple-600' },
    { label: 'Taxa de Aprovação', valor: loading ? '...' : `${estatisticasGerais.taxaAprovacao}%`, cor: 'text-orange-600' },
  ];

  const relatoriosFiltrados = relatóriosDisponiveis.filter(r => r.tipo === tipoRelatorio);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-600">Gerar e visualizar relatórios do sistema</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {estatisticasDisplay.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-4 text-center">
                  {loading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className={`text-2xl font-bold ${stat.cor}`}>{stat.valor}</div>
                  )}
                  <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <Card>
              <CardHeader><CardTitle>Desempenho por Série</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                ) : dadosDesempenho.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center"><FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>Nenhum dado disponível</p></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosDesempenho}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="serie" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 10]} />
                      <Tooltip formatter={(value: number) => [value.toFixed(1), 'Média']} />
                      <Bar dataKey="media" fill="#3b82f6" name="Média" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Taxa de Frequência Geral</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                ) : dadosFrequencia[0]?.name === 'Sem dados' ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center"><Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>Nenhum dado disponível</p></div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={dadosFrequencia} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {dadosFrequencia.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                      {dadosFrequencia.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-sm">{entry.name}: {entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Média por Disciplina</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                ) : dadosDisciplinas.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center"><BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>Nenhum dado disponível</p></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosDisciplinas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} />
                      <YAxis dataKey="disciplina" type="category" width={130} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [value.toFixed(1), 'Média']} />
                      <Bar dataKey="media" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Relatórios Disponíveis */}
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Disponíveis</CardTitle>
              <div className="flex gap-4 mt-2">
                <Select value={tipoRelatorio} onValueChange={(value: any) => setTipoRelatorio(value)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alunos">Relatórios de Alunos</SelectItem>
                    <SelectItem value="professores">Relatórios de Professores</SelectItem>
                    <SelectItem value="desempenho">Relatórios de Desempenho</SelectItem>
                    <SelectItem value="frequencia">Relatórios de Frequência</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-1">1º Bimestre 2025</SelectItem>
                    <SelectItem value="2025-2">2º Bimestre 2025</SelectItem>
                    <SelectItem value="2025-3">3º Bimestre 2025</SelectItem>
                    <SelectItem value="2025-4">4º Bimestre 2025</SelectItem>
                    <SelectItem value="2024-ano">Ano Completo 2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatoriosFiltrados.map((relatorio) => {
                  const Icon = relatorio.icon;
                  return (
                    <div key={relatorio.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{relatorio.titulo}</h3>
                          <p className="text-sm text-gray-600 mb-3">{relatorio.descricao}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => toast.info('Visualização será implementada em breve.')}>
                              <Eye className="w-4 h-4 mr-1" /> Visualizar
                            </Button>
                            <Button size="sm" onClick={() => toast.info('Geração de PDF será implementada em breve.')}>
                              <Download className="w-4 h-4 mr-1" /> Gerar PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}