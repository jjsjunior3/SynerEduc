import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Upload, Download, Plus, Calendar, FileText, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface AtividadesProfessorProps {
  disciplina: { id: string; nome: string };
  serie: { id: string; nome: string };
}

interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'exercicio' | 'trabalho' | 'prova' | 'projeto';
  data_entrega: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  status: 'ativa' | 'encerrada';
  entregas: number;
  totalAlunos: number;
}

export function AtividadesProfessor({ disciplina, serie }: AtividadesProfessorProps) {
  const { usuario } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Atividade | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [loadingAtividades, setLoadingAtividades] = useState(true);

  const [novaAtividade, setNovaAtividade] = useState({
    titulo: '',
    descricao: '',
    tipo: 'exercicio' as 'exercicio' | 'trabalho' | 'prova' | 'projeto',
    data_entrega: '',
    arquivo: null as File | null
  });

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);

  // ========================================
  // CARREGAR TOTAL DE ALUNOS DA SÉRIE
  // ========================================
  useEffect(() => {
    async function buscarTotalAlunos() {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tipo', 'aluno')
          .eq('serie', serie.nome); // ← Usar nome da série (TEXT)

        if (error) throw error;
        setTotalAlunos(count || 0);
      } catch (error) {
        console.error('Erro ao buscar total de alunos:', error);
        setTotalAlunos(0);
      }
    }

    buscarTotalAlunos();
  }, [serie.nome]);

  // ========================================
  // CARREGAR ATIVIDADES DO BANCO
  // ========================================
  useEffect(() => {
    carregarAtividades();
  }, [disciplina.nome, serie.nome]);

  async function carregarAtividades() {
    try {
      setLoadingAtividades(true);

      // Buscar atividades (usando nome da disciplina e série como TEXT)
      const { data: atividadesData, error: atividadesError } = await supabase
        .from('atividades')
        .select('*')
        .eq('disciplina', disciplina.nome)
        .eq('serie', serie.nome)
        .order('created_at', { ascending: false });

      if (atividadesError) throw atividadesError;

      // Para cada atividade, contar entregas
      const atividadesComEntregas = await Promise.all(
        (atividadesData || []).map(async (atividade) => {
          const { count } = await supabase
            .from('atividades_alunos')
            .select('*', { count: 'exact', head: true })
            .eq('atividade_id', atividade.id)
            .not('status', 'is', null); // Contar apenas entregas feitas

          return {
            id: atividade.id,
            titulo: atividade.titulo,
            descricao: atividade.descricao || '',
            tipo: atividade.tipo || 'exercicio',
            data_entrega: atividade.data_entrega,
            arquivo_url: atividade.arquivo_url,
            arquivo_nome: atividade.arquivo_nome,
            status: atividade.status || 'ativa',
            entregas: count || 0,
            totalAlunos: totalAlunos
          };
        })
      );

      setAtividades(atividadesComEntregas);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      toast.error('Erro ao carregar atividades');
    } finally {
      setLoadingAtividades(false);
    }
  }

  // ========================================
  // UPLOAD DE ARQUIVO PARA O STORAGE
  // ========================================
  async function uploadArquivo(file: File): Promise<{ url: string; nome: string } | null> {
  try {
    const timestamp = Date.now();

    // ✅ CORREÇÃO: Sanitizar nome da disciplina (remover acentos e caracteres especiais)
    const disciplinaSanitizada = disciplina.nome
      .normalize("NFD") // Normaliza caracteres Unicode
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-zA-Z0-9]/g, "_") // Substitui caracteres especiais por _
      .toLowerCase();

    const nomeArquivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${disciplinaSanitizada}/${nomeArquivo}`;

    console.log("📤 Fazendo upload para:", filePath);

    const { data, error } = await supabase.storage
      .from('atividades') // ← Nome do bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("❌ Erro no upload:", error);
      throw error;
    }

    console.log("✅ Upload concluído:", data);

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('atividades')
      .getPublicUrl(filePath);

    console.log("🔗 URL pública:", publicUrl);

    return { url: publicUrl, nome: file.name };
  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error);
    toast.error('Erro ao enviar arquivo');
    return null;
  }
}

  // ========================================
  // SALVAR ATIVIDADE (CRIAR OU EDITAR)
  // ========================================
  async function handleSalvarAtividade() {
    if (!novaAtividade.titulo || !novaAtividade.descricao || !novaAtividade.data_entrega) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!usuario?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    setCarregando(true);

    try {
      let arquivoUrl = editando?.arquivo_url;
      let arquivoNome = editando?.arquivo_nome;

      // Upload de arquivo se houver
      if (novaAtividade.arquivo) {
        const resultado = await uploadArquivo(novaAtividade.arquivo);
        if (resultado) {
          arquivoUrl = resultado.url;
          arquivoNome = resultado.nome;
        }
      }

      const dadosAtividade = {
        titulo: novaAtividade.titulo,
        descricao: novaAtividade.descricao,
        tipo: novaAtividade.tipo,
        data_entrega: novaAtividade.data_entrega,
        arquivo_url: arquivoUrl || null,
        arquivo_nome: arquivoNome || null,
        disciplina: disciplina.nome, // ← Usar nome (TEXT)
        serie: serie.nome, // ← Usar nome (TEXT)
        professor_id: usuario.id,
        status: 'ativa'
      };

      if (editando) {
        // EDITAR
        const { error } = await supabase
          .from('atividades')
          .update(dadosAtividade)
          .eq('id', editando.id);

        if (error) throw error;
        toast.success('Atividade atualizada com sucesso!');
      } else {
        // CRIAR
        const { error } = await supabase
          .from('atividades')
          .insert([dadosAtividade]);

        if (error) throw error;
        toast.success('Atividade criada com sucesso!');
      }

      // Recarregar lista
      await carregarAtividades();

      // Fechar modal e limpar formulário
      setModalAberto(false);
      setEditando(null);
      setNovaAtividade({
        titulo: '',
        descricao: '',
        tipo: 'exercicio',
        data_entrega: '',
        arquivo: null
      });
    } catch (error: any) {
      console.error('Erro ao salvar atividade:', error);
      toast.error(error.message || 'Erro ao salvar atividade');
    } finally {
      setCarregando(false);
    }
  }

  // ========================================
  // EDITAR ATIVIDADE
  // ========================================
  function handleEditar(atividade: Atividade) {
    setEditando(atividade);
    setNovaAtividade({
      titulo: atividade.titulo,
      descricao: atividade.descricao,
      tipo: atividade.tipo,
      data_entrega: atividade.data_entrega.split('T')[0], // Formatar data para input
      arquivo: null
    });
    setModalAberto(true);
  }

  // ========================================
  // EXCLUIR ATIVIDADE
  // ========================================
  async function handleExcluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;

    try {
      const { error } = await supabase
        .from('atividades')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Atividade removida com sucesso!');
      await carregarAtividades();
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      toast.error('Erro ao excluir atividade');
    }
  }

  // ========================================
  // UPLOAD DE ARQUIVO (INPUT)
  // ========================================
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamanho (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande! Máximo 10MB');
        return;
      }
      setNovaAtividade(prev => ({ ...prev, arquivo: file }));
    }
  }

  // ========================================
  // HELPERS
  // ========================================
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'exercicio': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'trabalho': return 'bg-green-100 text-green-700 border-green-200';
      case 'prova': return 'bg-red-100 text-red-700 border-red-200';
      case 'projeto': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ativa' 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'exercicio': return 'Exercício';
      case 'trabalho': return 'Trabalho';
      case 'prova': return 'Prova';
      case 'projeto': return 'Projeto';
      default: return tipo;
    }
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Atividades</h2>
          <p className="text-sm text-gray-600 mt-1">
            {disciplina.nome} • {serie.nome} • {totalAlunos} alunos
          </p>
        </div>

        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editando ? 'Editar Atividade' : 'Criar Nova Atividade'}
              </DialogTitle>
              <DialogDescription>
                {editando 
                  ? 'Atualize as informações da atividade.' 
                  : 'Preencha os dados para criar uma nova atividade para os alunos.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título da Atividade *</Label>
                  <Input
                    id="titulo"
                    value={novaAtividade.titulo}
                    onChange={(e) => setNovaAtividade(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Digite o título"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Atividade *</Label>
                  <Select
                    value={novaAtividade.tipo}
                    onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, tipo: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exercicio">Exercício</SelectItem>
                      <SelectItem value="trabalho">Trabalho</SelectItem>
                      <SelectItem value="prova">Prova</SelectItem>
                      <SelectItem value="projeto">Projeto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={novaAtividade.descricao}
                  onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva a atividade, instruções, objetivos..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 text-right">
                  {novaAtividade.descricao.length}/500 caracteres
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_entrega">Data de Entrega *</Label>
                  <Input
                    id="data_entrega"
                    type="date"
                    value={novaAtividade.data_entrega}
                    onChange={(e) => setNovaAtividade(prev => ({ ...prev, data_entrega: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arquivo">Arquivo da Atividade (PDF, DOC, DOCX)</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt"
                  />
                  {novaAtividade.arquivo && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {novaAtividade.arquivo.name}
                    </p>
                  )}
                  {editando?.arquivo_nome && !novaAtividade.arquivo && (
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Arquivo atual: {editando.arquivo_nome}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setModalAberto(false);
                    setEditando(null);
                    setNovaAtividade({
                      titulo: '',
                      descricao: '',
                      tipo: 'exercicio',
                      data_entrega: '',
                      arquivo: null
                    });
                  }}
                  disabled={carregando}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSalvarAtividade}
                  disabled={carregando}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {carregando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>{editando ? 'Atualizar' : 'Criar'} Atividade</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* LISTA DE ATIVIDADES */}
      {loadingAtividades ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : atividades.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Nenhuma atividade cadastrada</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Comece criando uma nova atividade para seus alunos.
            </p>
            <Button 
              onClick={() => setModalAberto(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Atividade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {atividades.map((atividade) => (
            <Card key={atividade.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {atividade.titulo}
                      </h3>
                      <Badge className={getTipoColor(atividade.tipo)}>
                        {getTipoLabel(atividade.tipo)}
                      </Badge>
                      <Badge className={getStatusColor(atividade.status)}>
                        {atividade.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-3 text-sm line-clamp-2">
                      {atividade.descricao}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Entrega: {new Date(atividade.data_entrega).toLocaleDateString('pt-BR')}
                      </div>
                      {atividade.arquivo_nome && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {atividade.arquivo_nome}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Upload className="w-4 h-4" />
                        {atividade.entregas}/{totalAlunos} entregas
                      </div>
                    </div>

                    {/* PROGRESSO DAS ENTREGAS */}
                    {totalAlunos > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Progresso das entregas:</span>
                          <span className="font-medium text-blue-600">
                            {Math.round((atividade.entregas / totalAlunos) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${(atividade.entregas / totalAlunos) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AÇÕES */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditar(atividade)}
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    {atividade.arquivo_url && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(atividade.arquivo_url, '_blank')}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExcluir(atividade.id)}
                      className="text-red-500 hover:bg-red-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
