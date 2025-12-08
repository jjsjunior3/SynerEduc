import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient'; // Importar supabase
import { useAuth } from '../contexts/AuthContext'; // Importar useAuth
import { Card, CardContent } from './ui/card';
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
import { toast } from 'sonner'; // Importar toast para notificações

interface AtividadeSubmissao {
  id: string;
  atividade_id: string; // Corrigido para corresponder ao banco
  arquivo_url?: string; // URL do arquivo enviado
  arquivo_nome?: string; // Nome do arquivo enviado
  observacoes: string;
  data_entrega: string; // Corrigido para corresponder ao banco
  status: 'enviado' | 'corrigido' | 'devolvido';
  nota?: number;
  feedback?: string;
}

interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  arquivo_url?: string; // URL do arquivo do professor
  arquivo_nome?: string; // Nome do arquivo do professor
  data_entrega: string; // Data de entrega da atividade
  status: 'pendente' | 'enviado' | 'corrigido' | 'atrasado'; // Status calculado
  tipo: 'exercicio' | 'prova' | 'trabalho' | 'projeto';
  pontuacao: number; // Adicionado pontuacao
  submissao?: AtividadeSubmissao;
}

interface AtividadesAlunoProps {
  disciplinaId: string; // ID da disciplina
  nomeDisciplina: string; // Nome da disciplina
  serieNome: string; // Nome da série do aluno (TEXT)
}

export function AtividadesAluno({ disciplinaId, nomeDisciplina, serieNome }: AtividadesAlunoProps) {
  const [modalEnvioAberto, setModalEnvioAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null);
  const [arquivoResposta, setArquivoResposta] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [carregandoEnvio, setCarregandoEnvio] = useState(false);
  const [error, setError] = useState<string>('');
  const { usuario } = useAuth();

  // ========================================
  // CARREGAR ATIVIDADES DO BANCO
  // ========================================
  const carregarAtividades = useCallback(async () => {
    if (!usuario?.id || !nomeDisciplina || !serieNome) return;

    try {
      setLoading(true);
      setError('');

      // 1. Buscar atividades criadas pelo professor
      const { data: atividadesData, error: atividadesError } = await supabase
        .from('atividades')
        .select('*')
        .eq('disciplina', nomeDisciplina) // Usar nome da disciplina (TEXT)
        .eq('serie', serieNome) // Usar nome da série (TEXT)
        .order('data_entrega', { ascending: true });

      if (atividadesError) throw atividadesError;

      // 2. Buscar submissões do aluno para essas atividades
      const { data: submissoesData, error: submissoesError } = await supabase
        .from('atividades_alunos')
        .select('*')
        .eq('aluno_id', usuario.id)
        .in('atividade_id', atividadesData?.map(atv => atv.id) || []);

      if (submissoesError) throw submissoesError;

      const submissoesMap = new Map(submissoesData?.map(sub => [sub.atividade_id, sub]));

      // 3. Combinar dados e calcular status
      const atividadesFormatadas: Atividade[] = (atividadesData || []).map(atv => {
        const submissao = submissoesMap.get(atv.id);
        const dataEntregaAtividade = new Date(atv.data_entrega);
        const agora = new Date();

        let statusAtividade: Atividade['status'] = 'pendente';
        if (submissao) {
          statusAtividade = 'enviado';
          if (submissao.nota !== null) {
            statusAtividade = 'corrigido';
          }
        } else if (agora > dataEntregaAtividade) {
          statusAtividade = 'atrasado';
        }

        return {
          id: atv.id,
          titulo: atv.titulo,
          descricao: atv.descricao || '',
          arquivo_url: atv.arquivo_url || undefined,
          arquivo_nome: atv.arquivo_nome || undefined,
          data_entrega: atv.data_entrega,
          status: statusAtividade,
          tipo: atv.tipo || 'exercicio',
          pontuacao: 100, // TODO: Adicionar coluna de pontuação na tabela atividades
          submissao: submissao ? {
            id: submissao.id,
            atividade_id: submissao.atividade_id,
            arquivo_url: submissao.arquivo_url || undefined,
            arquivo_nome: submissao.arquivo_nome || undefined,
            observacoes: submissao.observacoes || '',
            data_entrega: submissao.data_entrega,
            status: submissao.status || 'enviado',
            nota: submissao.nota || undefined,
            feedback: submissao.feedback || undefined,
          } : undefined,
        };
      });

      setAtividades(atividadesFormatadas);
    } catch (err: any) {
      console.error('Erro ao carregar atividades:', err);
      setError(err.message || 'Erro ao carregar atividades. Tente novamente mais tarde.');
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, nomeDisciplina, serieNome]);

  useEffect(() => {
    carregarAtividades();
  }, [carregarAtividades]);

  // ========================================
  // UPLOAD DE ARQUIVO DE RESPOSTA
  // ========================================
  async function uploadArquivoResposta(file: File, atividadeId: string): Promise<{ url: string; nome: string } | null> {
    try {
      const timestamp = Date.now();
      const alunoIdSanitizado = usuario?.id.replace(/-/g, '') || 'unknown';
      const fileName = `${alunoIdSanitizado}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${atividadeId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('entregas_atividades') // Bucket para entregas dos alunos
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('entregas_atividades')
        .getPublicUrl(filePath);

      return { url: publicUrl, nome: file.name };
    } catch (error) {
      console.error('Erro ao fazer upload da resposta:', error);
      toast.error('Erro ao enviar seu arquivo de resposta');
      return null;
    }
  }

  // ========================================
  // SUBMISSÃO DA ATIVIDADE PELO ALUNO
  // ========================================
  const handleSubmissao = async () => {
    if (!atividadeSelecionada || !arquivoResposta || !usuario?.id) {
      toast.error('Selecione um arquivo e tente novamente.');
      return;
    }

    setCarregandoEnvio(true);

    try {
      // 1. Upload do arquivo de resposta
      const resultadoUpload = await uploadArquivoResposta(arquivoResposta, atividadeSelecionada.id);
      if (!resultadoUpload) {
        throw new Error('Falha no upload do arquivo de resposta.');
      }

      // 2. Registrar/Atualizar submissão no banco
      const submissaoExistente = atividadeSelecionada.submissao;
      const dadosSubmissao = {
        atividade_id: atividadeSelecionada.id,
        aluno_id: usuario.id,
        arquivo_url: resultadoUpload.url,
        arquivo_nome: resultadoUpload.nome, // Salvar nome original do arquivo
        observacoes: observacoes,
        data_entrega: new Date().toISOString(), // Data/hora atual da entrega
        status: 'enviado',
      };

      if (submissaoExistente) {
        // Se já existe, atualiza
        const { error } = await supabase
          .from('atividades_alunos')
          .update(dadosSubmissao)
          .eq('id', submissaoExistente.id);
        if (error) throw error;
        toast.success('Atividade reenviada com sucesso!');
      } else {
        // Se não existe, insere
        const { error } = await supabase
          .from('atividades_alunos')
          .insert([dadosSubmissao]);
        if (error) throw error;
        toast.success('Atividade enviada com sucesso!');
      }

      // 3. Recarregar atividades para atualizar o status
      await carregarAtividades();

      // 4. Limpar e fechar modal
      setArquivoResposta(null);
      setObservacoes('');
      setModalEnvioAberto(false);
      setAtividadeSelecionada(null);

    } catch (err: any) {
      console.error('Erro ao submeter atividade:', err);
      toast.error(err.message || 'Erro ao enviar atividade. Tente novamente.');
    } finally {
      setCarregandoEnvio(false);
    }
  };

  // ========================================
  // HELPERS DE UI
  // ========================================
  const atividadesPendentes = atividades.filter(atv => atv.status === 'pendente' || atv.status === 'atrasado');
  const atividadesEnviadas = atividades.filter(atv => atv.submissao);

  const getStatusIcon = (status: Atividade['status']) => {
    switch (status) {
      case 'enviado': return <Upload className="w-4 h-4 text-blue-500" />;
      case 'corrigido': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'atrasado': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: Atividade['status']) => {
    switch (status) {
      case 'enviado': return <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'corrigido': return <Badge className="bg-green-100 text-green-800">Corrigido</Badge>;
      case 'atrasado': return <Badge variant="destructive">Atrasado</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getTipoIcon = (tipo: Atividade['tipo']) => {
    switch (tipo) {
      case 'prova': return <Target className="w-4 h-4" />;
      case 'trabalho': return <File className="w-4 h-4" />;
      case 'projeto': return <File className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
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
    setArquivoResposta(null); // Limpa arquivo anterior
    setObservacoes(atividade.submissao?.observacoes || ''); // Preenche observações se já enviou
    setModalEnvioAberto(true);
  };

  const handleBaixarArquivoProfessor = (url: string, nome: string) => {
    window.open(url, '_blank');
  };

  const handleBaixarArquivoAluno = (url: string, nome: string) => {
    window.open(url, '_blank');
  };

  return (
    <>
      <div className="space-y-6 p-6"> {/* Adicionado padding aqui */}
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
                const { data, hora } = formatarDataHora(atividade.data_entrega);
                const isAtrasado = new Date(atividade.data_entrega) < new Date();

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
                            {atividade.arquivo_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBaixarArquivoProfessor(atividade.arquivo_url!, atividade.arquivo_nome || 'enunciado')}
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
              const { data, hora } = formatarDataHora(atividade.submissao!.data_entrega);

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
              <Label htmlFor="arquivoResposta">Arquivo de Resposta</Label>
              <Input
                id="arquivoResposta"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.zip"
                onChange={(e) => setArquivoResposta(e.target.files?.[0] || null)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: PDF, DOC, DOCX, TXT, ZIP (máximo 10MB)
              </p>
              {arquivoResposta && (
                <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                  <FileText className="w-3 h-3" />
                  {arquivoResposta.name}
                </p>
              )}
              {atividadeSelecionada?.submissao?.arquivo_nome && !arquivoResposta && (
                <p className="text-sm text-blue-600 flex items-center gap-1 mt-2">
                  <FileText className="w-3 h-3" />
                  Arquivo já enviado: {atividadeSelecionada.submissao.arquivo_nome}
                </p>
              )}
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
              <Button variant="outline" onClick={() => setModalEnvioAberto(false)} disabled={carregandoEnvio}>
                Cancelar
              </Button>
              <Button onClick={handleSubmissao} disabled={!arquivoResposta || carregandoEnvio}>
                {carregandoEnvio ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  atividadeSelecionada?.submissao ? 'Reenviar Atividade' : 'Enviar Atividade'
                )}
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
            {atividadesEnviadas.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma atividade enviada ainda.</p>
              </div>
            ) : (
              atividadesEnviadas.map((atividade) => {
                const dataEnvio = formatarDataHora(atividade.submissao!.data_entrega);
                const dataEntrega = formatarDataHora(atividade.data_entrega);

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
                          {atividade.submissao?.nota !== undefined && (
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

                        {atividade.submissao?.arquivo_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBaixarArquivoAluno(atividade.submissao!.arquivo_url!, atividade.submissao!.arquivo_nome || 'resposta')}
                            className="gap-2 mt-3"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Sua Resposta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
