import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { 
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  File,
  Send,
  History,
  Target,
  Loader2
} from 'lucide-react';
  import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AtividadeSubmissao {
  id: string;
  atividadeId: string;
  arquivo?: File;
  observacoes: string;
  dataEnvio: string;
  status: 'enviado' | 'corrigido' | 'devolvido';
  nota?: number;
  feedback?: string;
}

interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  arquivoBase?: string;
  dataEntrega: string;
  status: 'pendente' | 'enviado' | 'corrigido' | 'atrasado';
  tipo: 'exercicio' | 'prova' | 'trabalho';
  pontuacao: number;
  submissao?: AtividadeSubmissao;
}

interface AtividadesAlunoProps {
  disciplinaId: string;
  nomeDisciplina: string;
}

export function AtividadesAluno({ disciplinaId, nomeDisciplina }: AtividadesAlunoProps) {
  const [modalEnvioAberto, setModalEnvioAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { usuario } = useAuth();

  useEffect(() => {
    carregarAtividades();
  }, [disciplinaId, usuario?.id]);

  const carregarAtividades = async () => {
    if (!usuario?.id || !disciplinaId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/atividades/disciplina/${disciplinaId}/aluno/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setAtividades([]);
          return;
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAtividades(data.atividades || []);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      setError('Erro ao carregar atividades. Tente novamente mais tarde.');
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  };

  const atividadesEnviadas = atividades.filter(atv => atv.submissao);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Upload className="w-4 h-4 text-blue-500" />;
      case 'corrigido':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'atrasado':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'corrigido':
        return <Badge className="bg-green-100 text-green-800">Corrigido</Badge>;
      case 'atrasado':
        return <Badge variant="destructive">Atrasado</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'prova':
        return <Target className="w-4 h-4" />;
      case 'trabalho':
        return <File className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatarDataHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleEnviarAtividade = (atividade: Atividade) => {
    setAtividadeSelecionada(atividade);
    setModalEnvioAberto(true);
  };

  const handleBaixarAtividade = (nomeArquivo: string) => {
    // Em produção, isso seria um download real do arquivo
    console.log('Baixando arquivo:', nomeArquivo);
    // Simular download
    const link = document.createElement('a');
    link.href = '#';
    link.download = nomeArquivo;
    link.click();
  };

  const handleSubmissao = () => {
    // Em produção, isso enviaria os dados para o backend
    console.log('Enviando atividade:', {
      atividadeId: atividadeSelecionada?.id,
      arquivo,
      observacoes
    });
    
    // Resetar formulário
    setArquivo(null);
    setObservacoes('');
    setModalEnvioAberto(false);
    setAtividadeSelecionada(null);
  };

  const atividadesPendentes = atividades.filter(atv => atv.status === 'pendente' || atv.status === 'atrasado');

  return (
    <>
      <div className="space-y-6">
        {/* Atividades Pendentes */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Atividades Pendentes ({atividadesPendentes.length})
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-600">Carregando atividades...</span>
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={carregarAtividades}
                >
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : atividadesPendentes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p>Parabéns! Você está em dia com todas as atividades.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {atividadesPendentes.map((atividade) => {
                const { data, hora } = formatarDataHora(atividade.dataEntrega);
                const isAtrasado = new Date(atividade.dataEntrega) < new Date();
                
                return (
                  <Card key={atividade.id} className={`border-l-4 ${isAtrasado ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTipoIcon(atividade.tipo)}
                            <h4 className="font-semibold">{atividade.titulo}</h4>
                            {getStatusBadge(atividade.status)}
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{atividade.descricao}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Entrega: {data} às {hora}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              <span>{atividade.pontuacao} pontos</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {atividade.arquivoBase && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBaixarAtividade(atividade.arquivoBase!)}
                                className="gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Baixar Enunciado
                              </Button>
                            )}
                            
                            {atividade.tipo !== 'prova' && (
                              <Button
                                onClick={() => handleEnviarAtividade(atividade)}
                                className="gap-2"
                                disabled={isAtrasado}
                              >
                                <Send className="w-4 h-4" />
                                {isAtrasado ? 'Prazo Expirado' : 'Enviar Resposta'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Histórico de Atividades */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Atividades
            </h3>
            <Button
              variant="outline"
              onClick={() => setModalHistoricoAberto(true)}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Ver Histórico Completo
            </Button>
          </div>
          
          <div className="grid gap-3">
            {atividadesEnviadas.slice(0, 3).map((atividade) => {
              const { data, hora } = formatarDataHora(atividade.submissao!.dataEnvio);
              
              return (
                <Card key={atividade.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getTipoIcon(atividade.tipo)}
                          <h4 className="font-medium text-sm">{atividade.titulo}</h4>
                          {getStatusBadge(atividade.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Enviado: {data} às {hora}</span>
                          {atividade.submissao?.nota && (
                            <span className="font-medium text-green-600">
                              Nota: {atividade.submissao.nota}/{atividade.pontuacao}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Envio de Atividade */}
      <Dialog open={modalEnvioAberto} onOpenChange={setModalEnvioAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Enviar Atividade: {atividadeSelecionada?.titulo}
            </DialogTitle>
            <DialogDescription>
              Anexe sua resposta e adicione observações se necessário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="arquivo">Arquivo de Resposta</Label>
              <Input
                id="arquivo"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.zip"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: PDF, DOC, DOCX, TXT, ZIP (máximo 10MB)
              </p>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Adicione comentários sobre sua resposta..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalEnvioAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmissao} disabled={!arquivo}>
                Enviar Atividade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico Completo */}
      <Dialog open={modalHistoricoAberto} onOpenChange={setModalHistoricoAberto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico Completo - {nomeDisciplina}
            </DialogTitle>
            <DialogDescription>
              Todas as suas atividades enviadas e corrigidas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {atividadesEnviadas.map((atividade) => {
              const dataEnvio = formatarDataHora(atividade.submissao!.dataEnvio);
              const dataEntrega = formatarDataHora(atividade.dataEntrega);
              
              return (
                <Card key={atividade.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTipoIcon(atividade.tipo)}
                          <h4 className="font-semibold">{atividade.titulo}</h4>
                          {getStatusBadge(atividade.status)}
                        </div>
                        {atividade.submissao?.nota && (
                          <div className="text-lg font-semibold text-green-600">
                            {atividade.submissao.nota}/{atividade.pontuacao}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-600 text-sm">{atividade.descricao}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Prazo de Entrega:</span>
                          <p>{dataEntrega.data} às {dataEntrega.hora}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Data de Envio:</span>
                          <p>{dataEnvio.data} às {dataEnvio.hora}</p>
                        </div>
                      </div>
                      
                      {atividade.submissao?.observacoes && (
                        <div>
                          <span className="text-gray-500 text-sm">Suas Observações:</span>
                          <p className="text-sm mt-1">{atividade.submissao.observacoes}</p>
                        </div>
                      )}
                      
                      {atividade.submissao?.feedback && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <span className="text-blue-800 font-medium text-sm">Feedback do Professor:</span>
                          <p className="text-blue-700 text-sm mt-1">{atividade.submissao.feedback}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}