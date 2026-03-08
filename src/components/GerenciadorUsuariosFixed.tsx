// GerenciadorUsuariosFixed.tsx - Versão AJUSTADA PARA BUSCAR SÉRIES DO SUPABASE
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, Search, Edit, Trash2, Users, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { supabase } from '../supabase/supabaseClient';

interface GerenciadorUsuariosProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string; // ID do auth.users
  nome: string;
  email: string;
  tipo: 'aluno' | 'professor' | 'coordenador' | 'administrador' | 'professor_conteudista';
  serie?: string;
  disciplinas?: string[]; // Vem da tabela de relacionamento
  series?: string[]; // Vem da tabela de relacionamento
  status: 'ativo' | 'inativo';
  criadoEm: string; // Mapeado de criado_em
  ultimoLogin?: string;
}

const tiposUsuario = [
  { value: 'aluno', label: 'Aluno' },
  { value: 'professor', label: 'Professor' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'professor_conteudista', label: 'Professor Conteudista' }
];

// Mantido apenas como fallback em caso de erro ao buscar do Supabase
const seriesEscolhidasHardcoded = [
  '5º ano (Fundamental)',
  '6º ano (Fundamental)',
  '7º ano (Fundamental)',
  '8º ano (Fundamental)',
  '9º ano (Fundamental)',
  '1ª série (Médio)',
  '2ª série (Médio)',
  '3ª série (Médio)'
];

export function GerenciadorUsuarios({ onVoltar }: GerenciadorUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [mostrarDialogEditarUsuario, setMostrarDialogEditarUsuario] = useState(false);
  const [mostrarSenhas, setMostrarSenhas] = useState<{ [key: string]: boolean }>({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<string[]>([]);
  // AGORA séries vêm do Supabase; mantemos o array hardcoded apenas como fallback
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>(seriesEscolhidasHardcoded);

  const [dadosEdicao, setDadosEdicao] = useState({
    nome: '',
    email: '',
    tipo: 'aluno' as Usuario['tipo'],
    serie: '',
    disciplinas: [] as string[],
    series: [] as string[],
    status: 'ativo' as Usuario['status'],
    novaSenha: ''
  });

  const getAuthToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const carregarDisciplinas = async () => {
    try {
      console.log('[GERENCIADOR] Carregando disciplinas...');
      const { data, error } = await supabase
        .from('disciplinas')
        .select('nome, ativa')
        .order('nome', { ascending: true });

      if (error) throw error;

      const nomesDisciplinas = (data || [])
        .filter((d: any) => d.ativa !== false)
        .map((d: any) => d.nome)
        .filter(Boolean);

      setDisciplinasDisponiveis(nomesDisciplinas);
      console.log('[GERENCIADOR] Disciplinas carregadas:', nomesDisciplinas);
    } catch (error: any) {
      console.error('[GERENCIADOR] Erro ao carregar disciplinas:', error.message);
      toast.error('Erro ao carregar disciplinas.');
      setDisciplinasDisponiveis([]);
    }
  };

  const carregarSeriesDoSupabase = async () => {
    try {
      console.log('[GERENCIADOR] Carregando séries do Supabase...');
      const { data, error } = await supabase
        .from('series')
        .select('nome, ativa')
        .order('nome', { ascending: true });

      if (error) throw error;

      const nomesSeries = (data || [])
        .filter((s: any) => s.ativa !== false)
        .map((s: any) => s.nome)
        .filter(Boolean);

      setSeriesDisponiveis(nomesSeries);
      console.log('[GERENCIADOR] Séries carregadas do Supabase:', nomesSeries);
    } catch (error: any) {
      console.error('[GERENCIADOR] Erro ao carregar séries do Supabase:', error.message);
      toast.error('Erro ao carregar séries.');
      // fallback para não quebrar a tela
      setSeriesDisponiveis(seriesEscolhidasHardcoded);
    }
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      console.log('[GERENCIADOR] Carregando usuários...');
      const token = await getAuthToken();
      if (!token) {
        toast.error('Você precisa estar logado para gerenciar usuários.');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-manage-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GERENCIADOR] Dados de usuários recebidos:', data);

        let usuariosArray = [];
        if (data.success && data.usuarios && Array.isArray(data.usuarios)) {
          usuariosArray = data.usuarios;
        } else {
          console.warn('[GERENCIADOR] Formato de dados de usuários inesperado:', data);
          usuariosArray = [];
        }

        const usuariosMapeados: Usuario[] = usuariosArray.map((u: any) => ({
          id: u.id,
          nome: u.nome || 'Nome não informado',
          email: u.email || 'Email não informado',
          tipo: u.tipo || 'aluno',
          serie: u.serie || '',
          disciplinas: u.disciplinas || [],
          series: u.series || [],
          status: u.status || 'ativo',
          criadoEm: u.criadoEm || new Date().toISOString(),
          ultimoLogin: u.ultimoLogin || ''
        }));

        setUsuarios(usuariosMapeados);
      } else {
        const errorText = await response.text();
        console.error('[GERENCIADOR] Erro na resposta da Edge Function de usuários:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
      }
    } catch (error: any) {
      console.error('[GERENCIADOR] Erro ao carregar usuários:', error);
      toast.error(`Erro ao carregar usuários: ${error.message}`);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const alternarSenhaVisivel = (usuarioId: string) => {
    setMostrarSenhas(prev => ({
      ...prev,
      [usuarioId]: !prev[usuarioId]
    }));
  };

  const abrirEdicaoUsuario = (usuario: Usuario) => {
    console.log('[GERENCIADOR] Abrindo edição para usuário:', usuario);
    setUsuarioEditando(usuario);
    setDadosEdicao({
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      serie: usuario.serie || '',
      disciplinas: usuario.disciplinas || [],
      series: usuario.series || [],
      status: usuario.status,
      novaSenha: ''
    });
    setMostrarDialogEditarUsuario(true);
  };

  const salvarEdicaoUsuario = async () => {
    if (!usuarioEditando) {
      console.error('[GERENCIADOR] Nenhum usuário selecionado para edição');
      return;
    }

    setSalvandoEdicao(true);
    try {
      console.log('[GERENCIADOR] Iniciando edição do usuário:', {
        id: usuarioEditando.id,
        dadosOriginais: usuarioEditando,
        dadosEdicao: dadosEdicao
      });

      const dadosParaEnviar: any = {
        id: usuarioEditando.id,
        nome: dadosEdicao.nome,
        email: dadosEdicao.email,
        tipo: dadosEdicao.tipo,
        serie: dadosEdicao.serie,
        disciplinas: dadosEdicao.disciplinas,
        series: dadosEdicao.series,
        status: dadosEdicao.status
      };

      if (dadosEdicao.novaSenha) {
        dadosParaEnviar.novaSenha = dadosEdicao.novaSenha;
      }

      console.log('[GERENCIADOR] Dados que serão enviados para a Edge Function:', dadosParaEnviar);

      const token = await getAuthToken();
      if (!token) {
        toast.error('Você precisa estar logado para editar usuários.');
        setSalvandoEdicao(false);
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-manage-users`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaEnviar)
      });

      console.log('[GERENCIADOR] Status da resposta da Edge Function:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('[GERENCIADOR] Resposta de sucesso:', responseData);
        toast.success('Usuário atualizado com sucesso!');
        setMostrarDialogEditarUsuario(false);
        setUsuarioEditando(null);
        carregarUsuarios();
      } else {
        const errorData = await response.text();
        console.error('[GERENCIADOR] Erro na resposta da Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData || 'Erro ao atualizar usuário');
      }
    } catch (error: any) {
      console.error('[GERENCIADOR] Erro ao editar usuário:', error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const excluirUsuario = async (usuarioId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação é irreversível.')) {
      return;
    }

    try {
      console.log('[GERENCIADOR] Excluindo usuário:', usuarioId);
      const token = await getAuthToken();
      if (!token) {
        toast.error('Você precisa estar logado para excluir usuários.');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-manage-users`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: usuarioId })
      });

      if (response.ok) {
        toast.success('Usuário excluído com sucesso!');
        carregarUsuarios();
      } else {
        const errorData = await response.text();
        throw new Error(errorData || 'Erro ao excluir usuário');
      }
    } catch (error: any) {
      console.error('[GERENCIADOR] Erro ao excluir usuário:', error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      await Promise.all([
        carregarUsuarios(),
        carregarDisciplinas(),
        carregarSeriesDoSupabase()
      ]);
    };
    carregarDados();
  }, []);

  const mostrarTabelaDeUsuarios = filtro.length > 0 || filtroTipo !== 'todos';

  const usuariosFiltrados = mostrarTabelaDeUsuarios
    ? usuarios.filter(usuario => {
        const matchNome = usuario.nome.toLowerCase().includes(filtro.toLowerCase());
        const matchEmail = usuario.email.toLowerCase().includes(filtro.toLowerCase());
        const matchTipo = filtroTipo === 'todos' || usuario.tipo === filtroTipo;
        return (matchNome || matchEmail) && matchTipo;
      })
    : [];

  const getTipoBadge = (tipo: Usuario['tipo']) => {
    const configs = {
      aluno: { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      professor: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800' },
      coordenador: { variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' },
      administrador: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      professor_conteudista: { variant: 'outline' as const, color: 'bg-orange-100 text-orange-800' }
    };

    const config = configs[tipo] || configs.aluno;

    return (
      <Badge className={config.color}>
        {tiposUsuario.find(t => t.value === tipo)?.label || tipo}
      </Badge>
    );
  };

  const getStatusBadge = (status: Usuario['status']) => {
    return status === 'ativo'
      ? <Badge className="bg-green-100 text-green-800">Ativo</Badge>
      : <Badge variant="secondary">Inativo</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onVoltar}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
              <p className="text-gray-600">Visualizar, editar e gerenciar todos os usuários do sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                carregarUsuarios();
                carregarDisciplinas();
                carregarSeriesDoSupabase();
              }}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposUsuario.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{usuarios.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          {tiposUsuario.map((tipo) => (
            <Card key={tipo.value}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {usuarios.filter(u => u.tipo === tipo.value).length}
                </div>
                <div className="text-sm text-gray-600">{tipo.label}s</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabela de Usuários (condicional) */}
        {mostrarTabelaDeUsuarios && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários ({usuariosFiltrados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Carregando usuários...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Série/Disciplinas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuariosFiltrados.map((usuario) => (
                        <TableRow key={usuario.id}>
                          <TableCell className="font-medium">{usuario.nome}</TableCell>
                          <TableCell>{usuario.email}</TableCell>
                          <TableCell>{getTipoBadge(usuario.tipo)}</TableCell>
                          <TableCell>
                            {usuario.tipo === 'aluno' ? (
                              <Badge variant="outline">{usuario.serie || 'Não definida'}</Badge>
                            ) : (usuario.tipo === 'professor' || usuario.tipo === 'professor_conteudista') ? (
                              <div className="space-y-1">
                                {usuario.disciplinas && usuario.disciplinas.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {usuario.disciplinas.slice(0, 2).map((disc, index) => (
                                      <Badge key={`${disc}-${index}`} variant="secondary" className="text-xs">
                                        {disc}
                                      </Badge>
                                    ))}
                                    {usuario.disciplinas.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{usuario.disciplinas.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Sem disciplinas</Badge>
                                )}
                                {usuario.series && usuario.series.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {usuario.series.length} série{usuario.series.length !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(usuario.status)}</TableCell>
                          <TableCell>
                            {new Date(usuario.criadoEm).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirEdicaoUsuario(usuario)}
                                title="Editar usuário"
                                className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => excluirUsuario(usuario.id)}
                                title="Excluir usuário"
                                className="hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {usuariosFiltrados.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {usuarios.length === 0
                        ? 'Nenhum usuário cadastrado no sistema.'
                        : 'Nenhum usuário encontrado com os filtros aplicados.'
                      }
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog de Edição de Usuário */}
        <Dialog open={mostrarDialogEditarUsuario} onOpenChange={setMostrarDialogEditarUsuario}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Modifique as informações do usuário conforme necessário.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome-edit">Nome Completo</Label>
                <Input
                  id="nome-edit"
                  value={dadosEdicao.nome}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Digite o nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email-edit">Email</Label>
                <Input
                  id="email-edit"
                  type="email"
                  value={dadosEdicao.email}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Digite o email"
                />
              </div>
              <div>
                <Label htmlFor="tipo-edit">Tipo de Usuário</Label>
                <Select value={dadosEdicao.tipo} onValueChange={(value: Usuario['tipo']) => setDadosEdicao(prev => ({ ...prev, tipo: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposUsuario.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* EDIÇÃO DE SÉRIE DO ALUNO – AGORA USANDO séries DO SUPABASE */}
              {dadosEdicao.tipo === 'aluno' && (
                <div>
                  <Label htmlFor="serie-edit">Série</Label>
                  <Select
                    value={dadosEdicao.serie}
                    onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, serie: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesDisponiveis.map((serie) => (
                        <SelectItem key={serie} value={serie}>
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(dadosEdicao.tipo === 'professor' || dadosEdicao.tipo === 'professor_conteudista') && (
                <>
                  <div>
                    <Label>Disciplinas que leciona</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {disciplinasDisponiveis.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma disciplina cadastrada. Crie disciplinas na aba "Gestão Escolar".</p>
                      ) : (
                        disciplinasDisponiveis.map((disciplina) => (
                          <div key={disciplina} className="flex items-center space-x-2">
                            <Checkbox
                              checked={dadosEdicao.disciplinas.includes(disciplina)}
                              onCheckedChange={(checked) => {
                                setDadosEdicao(prev => ({
                                  ...prev,
                                  disciplinas: checked
                                    ? [...prev.disciplinas, disciplina]
                                    : prev.disciplinas.filter(d => d !== disciplina)
                                }));
                              }}
                            />
                            <Label className="text-sm">{disciplina}</Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Séries que leciona</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {seriesDisponiveis.map((serie) => (
                        <div key={serie} className="flex items-center space-x-2">
                          <Checkbox
                            checked={dadosEdicao.series.includes(serie)}
                            onCheckedChange={(checked) => {
                              setDadosEdicao(prev => ({
                                ...prev,
                                series: checked
                                  ? [...prev.series, serie]
                                  : prev.series.filter(s => s !== serie)
                              }));
                            }}
                          />
                          <Label className="text-sm">{serie}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="nova-senha">Nova Senha (opcional)</Label>
                <div className="relative">
                  <Input
                    id="nova-senha"
                    type={mostrarSenhas[usuarioEditando?.id || 'temp'] ? 'text' : 'password'}
                    value={dadosEdicao.novaSenha}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, novaSenha: e.target.value }))}
                    placeholder="Deixe em branco para não alterar"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-1"
                    onClick={() => alternarSenhaVisivel(usuarioEditando?.id || 'temp')}
                  >
                    {mostrarSenhas[usuarioEditando?.id || 'temp'] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="status-edit">Status</Label>
                <Select value={dadosEdicao.status} onValueChange={(value: Usuario['status']) => setDadosEdicao(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={salvarEdicaoUsuario}
                  disabled={!dadosEdicao.nome || !dadosEdicao.email || salvandoEdicao}
                  className="flex-1"
                >
                  {salvandoEdicao ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarDialogEditarUsuario(false);
                    setUsuarioEditando(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}