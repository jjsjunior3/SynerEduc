import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Eye, FileText, Users, GraduationCap, Calendar, Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Chart, ChartContainer } from './ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Se retornar 404 ou erro de servidor, mostrar mensagem informativa
        if (response.status === 404) {
          console.warn('API de relatórios não encontrada - usando dados padrão');
          throw new Error('Backend de relatórios não implementado');
        }
        if (response.status >= 500) {
          console.warn('Erro interno do servidor - usando dados padrão');
          throw new Error('Erro interno do servidor');
        }
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setEstatisticasGerais({
        totalAlunos: data.totalAlunos || 0,
        totalProfessores: data.totalProfessores || 0,
        mediaGeral: data.mediaGeral || 0,
        taxaAprovacao: data.taxaAprovacao || 0
      });

      setDadosDesempenho(data.desempenhoPorSerie || []);
      setDadosFrequencia(data.frequenciaGeral || [
        { name: 'Presença', value: 90, color: '#10b981' },
        { name: 'Faltas', value: 10, color: '#ef4444' }
      ]);
      setDadosDisciplinas(data.mediaPorDisciplina || []);

    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      
      // Tratar diferentes tipos de erro
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        toast.error('🔌 Erro de conexão com o servidor', {
          description: 'Verifique sua conexão com a internet e tente novamente.'
        });
      } else if (error.message.includes('Backend de relatórios não implementado')) {
        toast.info('📊 Relatórios em desenvolvimento', {
          description: 'As funcionalidades de relatório serão implementadas em breve.'
        });
      } else if (error.message.includes('Erro interno do servidor')) {
        toast.warning('⚠️ Servidor temporariamente indisponível', {
          description: 'Tente novamente em alguns minutos.'
        });
      } else {
        toast.error('Erro ao carregar dados dos relatórios');
      }
      
      // Valores padrão em caso de erro
      setEstatisticasGerais({
        totalAlunos: 0,
        totalProfessores: 0,
        mediaGeral: 0,
        taxaAprovacao: 0
      });
      setDadosDesempenho([]);
      setDadosFrequencia([
        { name: 'Sem dados', value: 100, color: '#94a3b8' }
      ]);
      setDadosDisciplinas([]);
    } finally {
      setLoading(false);
    }
  };

  const relatóriosDisponiveis = [
    {
      id: 'alunos-completo',
      titulo: 'Relatório Completo de Alunos',
      descricao: 'Lista completa com dados pessoais, notas e frequência',
      tipo: 'alunos',
      icon: Users
    },
    {
      id: 'alunos-desempenho',
      titulo: 'Desempenho por Série',
      descricao: 'Análise de desempenho acadêmico por série',
      tipo: 'alunos',
      icon: GraduationCap
    },
    {
      id: 'professores-carga',
      titulo: 'Carga Horária dos Professores',
      descricao: 'Distribuição de aulas e turmas por professor',
      tipo: 'professores',
      icon: Calendar
    },
    {
      id: 'professores-avaliacao',
      titulo: 'Avaliação dos Professores',
      descricao: 'Resultados das avaliações docentes',
      tipo: 'professores',
      icon: FileText
    }
  ];

  const estatisticasDisplay = [
    { label: 'Total de Alunos', valor: loading ? '...' : estatisticasGerais.totalAlunos, cor: 'text-blue-600' },
    { label: 'Total de Professores', valor: loading ? '...' : estatisticasGerais.totalProfessores, cor: 'text-green-600' },
    { label: 'Média Geral', valor: loading ? '...' : estatisticasGerais.mediaGeral.toFixed(1), cor: 'text-purple-600' },
    { label: 'Taxa de Aprovação', valor: loading ? '...' : `${estatisticasGerais.taxaAprovacao}%`, cor: 'text-orange-600' },
  ];

  const handleGerarRelatorio = async (relatorioId: string) => {
    try {
      toast.loading('Gerando relatório...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios/gerar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo: relatorioId,
          periodo: periodoSelecionado
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar relatório');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Relatório processado com sucesso!');
        toast.info(`Relatório: ${relatorioId} | Período: ${periodoSelecionado}`);
      } else {
        toast.error('Funcionalidade de PDF será implementada em breve');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao processar relatório');
    }
  };

  const handleVisualizarRelatorio = async (relatorioId: string) => {
    try {
      toast.loading('Carregando visualização...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios/visualizar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo: relatorioId,
          periodo: periodoSelecionado
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao visualizar relatório');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Relatório carregado!');
        
        // Mostrar informações do relatório
        if (data.dados) {
          let resumo = '';
          if (data.dados.alunos) {
            resumo = `${data.dados.alunos.length} alunos encontrados`;
          } else if (data.dados.professores) {
            resumo = `${data.dados.professores.length} professores encontrados`;
          } else {
            resumo = 'Dados carregados com sucesso';
          }
          toast.info(resumo);
        }
        
        console.log('Dados do relatório:', data);
      } else {
        toast.error('Erro ao carregar relatório');
      }
    } catch (error) {
      console.error('Erro ao visualizar relatório:', error);
      toast.error('Erro ao visualizar relatório');
    }
  };

  const relatoriosFiltrados = relatóriosDisponiveis.filter(r => r.tipo === tipoRelatorio);

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
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className={`text-2xl font-bold ${stat.cor}`}>{stat.valor}</div>
                  )}
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Desempenho por Série */}
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por Série</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosDesempenho.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum dado de desempenho disponível</p>
                      <p className="text-sm">Relatórios serão implementados em breve</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosDesempenho}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="serie" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="media" fill="#3b82f6" name="Média" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Frequência */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Frequência Geral</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosFrequencia.length === 0 || dadosFrequencia[0]?.name === 'Sem dados' ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum dado de frequência disponível</p>
                      <p className="text-sm">Relatórios serão implementados em breve</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dadosFrequencia}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dadosFrequencia.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                      {dadosFrequencia.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          ></div>
                          <span className="text-sm">{entry.name}: {entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Desempenho por Disciplina */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Média por Disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosDisciplinas.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum dado de disciplinas disponível</p>
                      <p className="text-sm">Relatórios serão implementados em breve</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosDisciplinas} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} />
                      <YAxis dataKey="disciplina" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="media" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filtros e Relatórios */}
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Disponíveis</CardTitle>
              <div className="flex gap-4">
                <Select value={tipoRelatorio} onValueChange={(value: any) => setTipoRelatorio(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tipo de relatório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alunos">Relatórios de Alunos</SelectItem>
                    <SelectItem value="professores">Relatórios de Professores</SelectItem>
                    <SelectItem value="desempenho">Relatórios de Desempenho</SelectItem>
                    <SelectItem value="frequencia">Relatórios de Frequência</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
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
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleVisualizarRelatorio(relatorio.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Visualizar
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleGerarRelatorio(relatorio.id)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Gerar PDF
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