import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Search,
  Loader2
} from 'lucide-react';

interface AtividadesRecebidasProps {
  onVoltar: () => void;
}

// Tipos baseados nas suas tabelas
interface Atividade {
  id: string;
  titulo: string;
  disciplina: string;
  turma: string;
  serie: string;
  data_entrega: string; // Prazo
  // Campos calculados
  totalEntregues: number;
  totalPendentes: number;
  totalCorrigidas: number;
}

interface Submissao {
  id: string;
  atividade_id: string;
  aluno_id: string;
  status: string; // 'entregue', 'atrasado', 'corrigido', 'pendente'
  nota?: number;
  arquivo_url?: string;
  arquivo_nome?: string;
  data_entrega?: string; // Data que o aluno enviou
  feedback?: string;
  // Campos trazidos via join/map
  aluno_nome: string;
  atividade_titulo: string;
  disciplina: string;
  turma: string;
  serie: string;
  prazo: string;
}

export function AtividadesRecebidas({ onVoltar }: AtividadesRecebidasProps) {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);

  // Filtros
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroDisciplina, setFiltroDisciplina] = useState('todas');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarDados();
  }, [usuario?.id]);

  async function carregarDados() {
    if (!usuario?.id) return;
    setLoading(true);

    try {
      // 1. Buscar atividades criadas pelo professor
      const { data: dadosAtividades, error: erroAtiv } = await supabase
        .from('atividades')
        .select('*')
        .eq('professor_id', usuario.id)
        .order('created_at', { ascending: false });

      if (erroAtiv) throw erroAtiv;

      if (!dadosAtividades || dadosAtividades.length === 0) {
        setLoading(false);
        return;
      }

      const idsAtividades = dadosAtividades.map(a => a.id);

      // 2. Buscar submissões (entregas) vinculadas a essas atividades
      const { data: dadosSubmissoes, error: erroSub } = await supabase
        .from('atividades_alunos')
        .select('*')
        .in('atividade_id', idsAtividades);

      if (erroSub) throw erroSub;

      // 3. Buscar nomes dos alunos (já que a tabela atividades_alunos tem aluno_id)
      // Precisamos dos IDs únicos de alunos para buscar na tabela users
      const idsAlunos = Array.from(new Set(dadosSubmissoes?.map(s => s.aluno_id) || []));

      const { data: dadosAlunos } = await supabase
        .from('users') // Ou 'profiles', dependendo do seu banco
        .select('id, nome')
        .in('id', idsAlunos);

      // 4. Processar e montar os objetos completos
      const listaSubmissoes: Submissao[] = (dadosSubmissoes || []).map(sub => {
        const ativ = dadosAtividades.find(a => a.id === sub.atividade_id);
        const aluno = dadosAlunos?.find(u => u.id === sub.aluno_id);

        return {
          ...sub,
          aluno_nome: aluno?.nome || 'Aluno Desconhecido',
          atividade_titulo: ativ?.titulo || '',
          disciplina: ativ?.disciplina || '',
          turma: ativ?.turma || '',
          serie: ativ?.serie || '',
          prazo: ativ?.data_entrega || ''
        };
      });

      setSubmissoes(listaSubmissoes);

      // 5. Calcular estatísticas para os cards de atividades
      const listaAtividades: Atividade[] = dadosAtividades.map(ativ => {
        const subsDaAtividade = listaSubmissoes.filter(s => s.atividade_id === ativ.id);

        return {
          ...ativ,
          totalEntregues: subsDaAtividade.filter(s => s.status === 'entregue' || s.status === 'atrasado').length,
          totalCorrigidas: subsDaAtividade.filter(s => s.status === 'corrigido').length,
          totalPendentes: subsDaAtividade.filter(s => s.status === 'pendente' || !s.status).length
        };
      });

      setAtividades(listaAtividades);

    } catch (error) {
      console.error("Erro ao carregar atividades recebidas:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  const handleBaixarArquivo = async (url: string, nomeArquivo: string) => {
    if (!url) {
      toast.error("URL do arquivo não encontrada.");
      return;
    }

    try {
      // Se a URL for pública direta, abrimos. Se for caminho do storage, baixamos.
      // Assumindo que 'arquivo_url' pode ser um caminho relativo no bucket ou url completa.

      // Tenta abrir direto primeiro
      window.open(url, '_blank');
      toast.success(`Abrindo ${nomeArquivo}...`);

    } catch (error) {
      console.error("Erro ao baixar:", error);
      toast.error("Erro ao baixar arquivo.");
    }
  };

  // Filtros
  const disciplinasUnicas = ['todas', ...Array.from(new Set(atividades.map(a => a.disciplina)))];

  const submissoesFiltradas = submissoes.filter(sub => {
    // Filtra apenas submissões que têm arquivo ou foram entregues (ignora pendentes vazios se quiser ver só entregas)
    const temEntrega = sub.status === 'entregue' || sub.status === 'atrasado' || sub.status === 'corrigido';
    if (!temEntrega) return false;

    if (atividadeSelecionada && sub.atividade_id !== atividadeSelecionada) return false;
    if (filtroStatus !== 'todos' && sub.status !== filtroStatus) return false;
    if (filtroDisciplina !== 'todas' && sub.disciplina !== filtroDisciplina) return false;
    if (busca && !sub.aluno_nome.toLowerCase().includes(busca.toLowerCase())) return false;

    return true;
  });

  // Helpers Visuais
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregue': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'atrasado': return 'bg-red-100 text-red-700 border-red-200';
      case 'corrigido': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'entregue': return <Clock className="w-4 h-4" />;
      case 'atrasado': return <AlertCircle className="w-4 h-4" />;
      case 'corrigido': return <CheckCircle className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusTexto = (status: string) => {
    switch (status) {
      case 'entregue': return 'Aguardando Correção';
      case 'atrasado': return 'Entregue com Atraso';
      case 'corrigido': return 'Corrigido';
      default: return 'Pendente';
    }
  };

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (dataStr?: string) => {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Interno */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Atividades Recebidas</h1>
            <p className="text-sm text-gray-600">Gerencie as entregas e downloads dos alunos</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Cards de Atividades (Resumo) */}
        <Card>
          <CardHeader>
            <CardTitle>Minhas Atividades Criadas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : atividades.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma atividade criada.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {atividades.map((atividade) => (
                  <div
                    key={atividade.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      atividadeSelecionada === atividade.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setAtividadeSelecionada(atividadeSelecionada === atividade.id ? null : atividade.id)}
                  >
                    <div className="mb-3">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-1" title={atividade.titulo}>{atividade.titulo}</h3>
                      <p className="text-sm text-gray-600">
                        {atividade.disciplina} • {atividade.serie} ({atividade.turma})
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-blue-100 rounded">
                        <div className="font-bold text-blue-700">{atividade.totalEntregues}</div>
                        <div className="text-xs text-gray-600">Entregues</div>
                      </div>
                      <div className="text-center p-2 bg-green-100 rounded">
                        <div className="font-bold text-green-700">{atividade.totalCorrigidas}</div>
                        <div className="text-xs text-gray-600">Corrigidas</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Prazo: {formatarData(atividade.data_entrega)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome do aluno..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filtroDisciplina} onValueChange={setFiltroDisciplina}>
                <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                <SelectContent>
                  {disciplinasUnicas.map((disc) => (
                    <SelectItem key={disc} value={disc}>{disc === 'todas' ? 'Todas as Disciplinas' : disc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="entregue">Aguardando Correção</SelectItem>
                  <SelectItem value="atrasado">Entregue com Atraso</SelectItem>
                  <SelectItem value="corrigido">Corrigido</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                setAtividadeSelecionada(null);
                setFiltroStatus('todos');
                setFiltroDisciplina('todas');
                setBusca('');
              }}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Entregas */}
        <Card>
          <CardHeader>
            <CardTitle>Entregas dos Alunos ({submissoesFiltradas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando entregas...</div>
            ) : submissoesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhuma entrega encontrada</h3>
                <p className="text-sm text-gray-600">Aguardando envio dos alunos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissoesFiltradas.map((submissao) => (
                  <div key={submissao.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex flex-col md:flex-row items-start gap-4">

                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {submissao.aluno_nome.charAt(0)}
                      </div>

                      {/* Info Principal */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{submissao.aluno_nome}</h4>
                            <p className="text-sm text-gray-600">{submissao.atividade_titulo}</p>
                            <p className="text-xs text-gray-500">{submissao.serie} - {submissao.turma} • {submissao.disciplina}</p>
                          </div>
                          <Badge className={`${getStatusColor(submissao.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(submissao.status)}
                            {getStatusTexto(submissao.status)}
                          </Badge>
                        </div>

                        {/* Área do Arquivo */}
                        {submissao.arquivo_url && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3 border border-gray-100">
                            <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-600">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {submissao.arquivo_nome || 'Arquivo Anexado'}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBaixarArquivo(submissao.arquivo_url!, submissao.arquivo_nome || 'arquivo')}
                              className="flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" /> Baixar
                            </Button>
                          </div>
                        )}

                        {/* Rodapé do Card */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-gray-500 gap-2">
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Enviado: {formatarDataHora(submissao.data_entrega)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Prazo: {formatarData(submissao.prazo)}
                            </span>
                          </div>

                          {/* Se já corrigido, mostra nota */}
                          {submissao.status === 'corrigido' && submissao.nota !== undefined && (
                            <div className="px-3 py-1 bg-green-100 text-green-800 rounded font-bold">
                              Nota: {submissao.nota}
                            </div>
                          )}

                          {/* Botão de Feedback/Correção (Placeholder para futura implementação) */}
                          {submissao.status !== 'corrigido' && (
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 p-0 h-auto">
                              <MessageSquare className="w-3 h-3 mr-1" /> Adicionar Correção
                            </Button>
                          )}
                        </div>

                        {/* Exibir Feedback se existir */}
                        {submissao.feedback && (
                          <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-100">
                            <strong>Feedback:</strong> {submissao.feedback}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
