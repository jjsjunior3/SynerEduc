// src/components/AtividadesProfessor.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Upload, Download, Plus, Calendar, FileText,
  Trash2, Edit2, Loader2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription,
} from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
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
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loadingAtividades, setLoadingAtividades] = useState(true);

  const [novaAtividade, setNovaAtividade] = useState({
    titulo: '',
    descricao: '',
    tipo: 'exercicio' as 'exercicio' | 'trabalho' | 'prova' | 'projeto',
    data_entrega: '',
    arquivo: null as File | null,
  });

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);

  useEffect(() => {
    async function buscarTotalAlunos() {
      try {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tipo', 'aluno')
          .eq('serie', serie.nome);
        setTotalAlunos(count || 0);
      } catch { setTotalAlunos(0); }
    }
    buscarTotalAlunos();
  }, [serie.nome]);

  useEffect(() => { carregarAtividades(); }, [disciplina.nome, serie.nome, totalAlunos]);

  async function carregarAtividades() {
    try {
      setLoadingAtividades(true);
      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .eq('disciplina', disciplina.nome)
        .eq('serie', serie.nome)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const comEntregas = await Promise.all(
        (data || []).map(async (a) => {
          const { count } = await supabase
            .from('atividades_alunos')
            .select('*', { count: 'exact', head: true })
            .eq('atividade_id', a.id)
            .not('status', 'is', null);
          return {
            id: a.id, titulo: a.titulo, descricao: a.descricao || '',
            tipo: a.tipo || 'exercicio', data_entrega: a.data_entrega,
            arquivo_url: a.arquivo_url, arquivo_nome: a.arquivo_nome,
            status: a.status || 'ativa', entregas: count || 0, totalAlunos,
          };
        })
      );
      setAtividades(comEntregas);
    } catch { toast.error('Erro ao carregar atividades'); }
    finally { setLoadingAtividades(false); }
  }

  async function uploadArquivo(file: File): Promise<{ url: string; nome: string } | null> {
    try {
      const disciplinaSanitizada = disciplina.nome
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const nomeArquivo = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${disciplinaSanitizada}/${nomeArquivo}`;

      const { error } = await supabase.storage.from('atividades').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('atividades').getPublicUrl(filePath);
      return { url: publicUrl, nome: file.name };
    } catch { toast.error('Erro ao enviar arquivo'); return null; }
  }

  async function handleSalvarAtividade() {
    if (!novaAtividade.titulo || !novaAtividade.descricao || !novaAtividade.data_entrega) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!usuario?.id) { toast.error('Usuário não autenticado'); return; }

    setCarregando(true);
    try {
      let arquivoUrl = editando?.arquivo_url;
      let arquivoNome = editando?.arquivo_nome;

      if (novaAtividade.arquivo) {
        const r = await uploadArquivo(novaAtividade.arquivo);
        if (r) { arquivoUrl = r.url; arquivoNome = r.nome; }
      }

      const dados = {
        titulo: novaAtividade.titulo, descricao: novaAtividade.descricao,
        tipo: novaAtividade.tipo,
        data_entrega: new Date(novaAtividade.data_entrega).toISOString(),
        arquivo_url: arquivoUrl || null, arquivo_nome: arquivoNome || null,
        disciplina: disciplina.nome, serie: serie.nome,
        professor_id: usuario.id, status: 'ativa',
      };

      const { error } = editando
        ? await supabase.from('atividades').update(dados).eq('id', editando.id)
        : await supabase.from('atividades').insert([dados]);
      if (error) throw error;

      toast.success(editando ? 'Atividade atualizada!' : 'Atividade criada!');
      await carregarAtividades();
      setModalAberto(false);
      setEditando(null);
      setNovaAtividade({ titulo: '', descricao: '', tipo: 'exercicio', data_entrega: '', arquivo: null });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar atividade');
    } finally { setCarregando(false); }
  }

  function handleEditar(a: Atividade) {
    setEditando(a);
    setNovaAtividade({
      titulo: a.titulo, descricao: a.descricao, tipo: a.tipo,
      data_entrega: new Date(a.data_entrega).toISOString().slice(0, 16),
      arquivo: null,
    });
    setModalAberto(true);
  }

  function handleExcluir(id: string) {
    setConfirmId(id);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande! Máximo 10MB'); return; }
    setNovaAtividade(p => ({ ...p, arquivo: file }));
  }

  // Cores fixas via style inline — legíveis em qualquer modo
  const getTipoStyle = (tipo: string) => {
    switch (tipo) {
      case 'exercicio': return { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' };
      case 'trabalho':  return { bg: '#dcfce7', text: '#14532d', border: '#86efac' };
      case 'prova':     return { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' };
      case 'projeto':   return { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd' };
      default:          return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = { exercicio: 'Exercício', trabalho: 'Trabalho', prova: 'Prova', projeto: 'Projeto' };
    return labels[tipo] || tipo;
  };

  const formatarDataHora = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const resetForm = () => {
    setModalAberto(false);
    setEditando(null);
    setNovaAtividade({ titulo: '', descricao: '', tipo: 'exercicio', data_entrega: '', arquivo: null });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Atividades</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {disciplina.nome} • {serie.nome} • {totalAlunos} alunos
          </p>
        </div>

        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nova Atividade
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editando ? 'Atualize as informações da atividade.' : 'Preencha os dados para criar uma nova atividade.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título da Atividade *</Label>
                  <Input
                    id="titulo"
                    value={novaAtividade.titulo}
                    onChange={(e) => setNovaAtividade(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Digite o título"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Atividade *</Label>
                  <Select value={novaAtividade.tipo}
                    onValueChange={(v) => setNovaAtividade(p => ({ ...p, tipo: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  onChange={(e) => setNovaAtividade(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descreva a atividade, instruções, objetivos..."
                  rows={4} maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {novaAtividade.descricao.length}/500
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_entrega">Data e Hora de Entrega *</Label>
                  <Input
                    id="data_entrega"
                    type="datetime-local"
                    value={novaAtividade.data_entrega}
                    onChange={(e) => setNovaAtividade(p => ({ ...p, data_entrega: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Defina a data e hora do prazo final.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arquivo">Arquivo (PDF, DOC — máx. 10MB)</Label>
                  <Input id="arquivo" type="file" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
                  {novaAtividade.arquivo && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {novaAtividade.arquivo.name}
                    </p>
                  )}
                  {editando?.arquivo_nome && !novaAtividade.arquivo && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Atual: {editando.arquivo_nome}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={resetForm} disabled={carregando}>Cancelar</Button>
                <Button
                  onClick={handleSalvarAtividade}
                  disabled={carregando}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {carregando
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                    : <>{editando ? 'Atualizar' : 'Criar'} Atividade</>
                  }
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista */}
      {loadingAtividades ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : atividades.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="font-medium text-foreground mb-2">Nenhuma atividade cadastrada</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie uma nova atividade para seus alunos.</p>
            <Button onClick={() => setModalAberto(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Criar Primeira Atividade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {atividades.map((a) => {
            const tipoStyle = getTipoStyle(a.tipo);
            const pct = totalAlunos > 0 ? Math.round((a.entregas / totalAlunos) * 100) : 0;
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-3">

                      {/* Título + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-base">{a.titulo}</h3>
                        <span
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border"
                          style={{ backgroundColor: tipoStyle.bg, color: tipoStyle.text, borderColor: tipoStyle.border }}
                        >
                          {getTipoLabel(a.tipo)}
                        </span>
                        <span
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border"
                          style={a.status === 'ativa'
                            ? { backgroundColor: '#dcfce7', color: '#14532d', borderColor: '#86efac' }
                            : { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' }
                          }
                        >
                          {a.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                        </span>
                      </div>

                      {/* Descrição */}
                      <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                        {a.descricao}
                      </p>

                      {/* Metadados */}
                      <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Entrega: {formatarDataHora(a.data_entrega)}
                        </span>
                        {a.arquivo_nome && (
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            {a.arquivo_nome}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          {a.entregas}/{totalAlunos} entregas
                        </span>
                      </div>

                      {/* Barra de progresso */}
                      {totalAlunos > 0 && (
                        <div className="pt-4 border-t border-border">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-muted-foreground">Progresso das entregas:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{pct}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 flex-shrink-0 pt-0.5">
                      <Button variant="outline" size="sm" onClick={() => handleEditar(a)} title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {a.arquivo_url && (
                        <Button variant="outline" size="sm"
                          onClick={() => window.open(a.arquivo_url, '_blank')} title="Baixar">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleExcluir(a.id)}
                        className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta atividade?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">Esta ação não pode ser desfeita.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmId) return;
                try {
                  const { error } = await supabase.from('atividades').delete().eq('id', confirmId);
                  if (error) throw error;
                  toast.success('Atividade removida!');
                  await carregarAtividades();
                } catch { toast.error('Erro ao excluir'); }
                setConfirmId(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}